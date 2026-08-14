from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import zendriver as zd
from zendriver import Browser

from .config import settings

logger = logging.getLogger(__name__)


@dataclass
class SessionEntry:
    session_id: str
    browser: Browser
    created_at: float = field(default_factory=time.monotonic)
    last_used_at: float = field(default_factory=time.monotonic)
    ttl_minutes: Optional[int] = None

    @property
    def is_expired(self) -> bool:
        if self.ttl_minutes is None:
            return False
        return (time.monotonic() - self.last_used_at) / 60 > self.ttl_minutes

    def touch(self) -> None:
        self.last_used_at = time.monotonic()


class SessionManager:
    def __init__(self) -> None:
        self._sessions: Dict[str, SessionEntry] = {}
        self._lock = asyncio.Lock()
        self.semaphore = asyncio.Semaphore(settings.MAX_BROWSERS)
        self._cleanup_task: Optional[asyncio.Task] = None

    async def startup(self) -> None:
        self._cleanup_task = asyncio.create_task(
            self._cleanup_loop(), name="session-cleanup"
        )

    async def shutdown(self) -> None:
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        async with self._lock:
            for entry in list(self._sessions.values()):
                await _stop_browser(entry.browser)
            self._sessions.clear()

    async def create(
        self,
        session_id: Optional[str] = None,
        proxy: Optional[str] = None,
        ttl_minutes: Optional[int] = None,
    ) -> str:
        sid = session_id or str(uuid.uuid4())

        async with self._lock:
            if sid in self._sessions:
                logger.info("Reusing existing session %s", sid)
                return sid

        browser_args = _base_browser_args()
        if proxy:
            browser_args.append(f"--proxy-server={proxy}")

        acquired = False
        try:
            await self.semaphore.acquire()
            acquired = True
        except asyncio.CancelledError:
            raise

        browser = None
        stored = False
        try:
            config = zd.Config(
                headless=settings.HEADLESS,
                browser_executable_path=settings.BROWSER_EXECUTABLE_PATH,
                browser_args=browser_args,
                sandbox=False,
            )
            config.no_sandbox = True
            config.browser_connection_timeout = 10  # 10s timeout per connect attempt
            config.browser_connection_max_tries = 12  # Try 12 times (total 120s)
            
            browser = await zd.start(config=config)
            
            entry = SessionEntry(session_id=sid, browser=browser, ttl_minutes=ttl_minutes)
            async with self._lock:
                self._sessions[sid] = entry
            stored = True
            logger.info("Created session %s", sid)
            return sid
        finally:
            if not stored:
                try:
                    if browser is not None:
                        await _stop_browser(browser)
                finally:
                    if acquired:
                        self.semaphore.release()

    async def get(self, session_id: str) -> SessionEntry:
        async with self._lock:
            entry = self._sessions.get(session_id)

        if entry is None:
            raise KeyError(f"The session doesn't exist.")

        if _browser_stopped(entry.browser):
            await self.destroy(session_id)
            raise RuntimeError(f"Session {session_id!r} browser stopped unexpectedly.")

        entry.touch()
        return entry

    async def destroy(self, session_id: str) -> bool:
        async with self._lock:
            entry = self._sessions.pop(session_id, None)

        if entry is None:
            return False

        await _stop_browser(entry.browser)
        self.semaphore.release()
        logger.info("Destroyed session %s", session_id)
        return True

    async def list_ids(self) -> List[str]:
        async with self._lock:
            return list(self._sessions.keys())

    async def _cleanup_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(60)
                await self._sweep_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Session cleanup error: %s", e)

    async def _sweep_expired(self) -> None:
        async with self._lock:
            expired = [sid for sid, e in self._sessions.items() if e.is_expired]
        for sid in expired:
            logger.info("Expiring session %s (TTL exceeded)", sid)
            await self.destroy(sid)


def _base_browser_args() -> list:
    return [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-extensions",
        "--no-zygote",
        "--disable-software-rasterizer",
        "--disable-setuid-sandbox",
        "--no-first-run",
    ]


async def _stop_browser(browser: Browser) -> None:
    import sys
    import subprocess

    pid = None
    try:
        proc = getattr(browser, "_process", None)
        if proc and hasattr(proc, "pid"):
            pid = proc.pid
    except Exception:
        pass

    try:
        await asyncio.wait_for(browser.stop(), timeout=5.0)
    except Exception as e:
        logger.debug("Browser stop error or timeout: %s", e)

    if pid is not None:
        if sys.platform == "win32":
            try:
                # Force terminate the process tree on Windows to clean up GPU/renderers
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=3,
                )
            except Exception as e:
                logger.debug("Failed to taskkill process %s: %s", pid, e)
        else:
            try:
                import os
                import signal
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass


def _browser_stopped(browser: Browser) -> bool:
    try:
        return browser.stopped
    except Exception:
        return False


session_manager = SessionManager()
