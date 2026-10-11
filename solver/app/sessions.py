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
        import os
        import re

        sid = session_id or str(uuid.uuid4())

        async with self._lock:
            if sid in self._sessions:
                existing = self._sessions[sid]
                if not _browser_stopped(existing.browser):
                    logger.info("Reusing existing session %s", sid)
                    return sid
                else:
                    logger.info("Session %s browser was closed, releasing stale session.", sid)
                    self._sessions.pop(sid, None)
                    self.semaphore.release()

        browser_args = _base_browser_args()
        if proxy:
            browser_args.append(f"--proxy-server={proxy}")

        # Ensure persistent profile directory per session/account
        safe_sid = re.sub(r'[^a-zA-Z0-9_\-]', '_', sid)
        profile_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "browser_profiles", safe_sid)
        )
        os.makedirs(profile_dir, exist_ok=True)
        prune_profile_bloat(profile_dir)

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
                user_data_dir=profile_dir,
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
            logger.info("Created session %s (profile: %s)", sid, profile_dir)
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

        import os
        import re
        safe_sid = re.sub(r'[^a-zA-Z0-9_\-]', '_', session_id)
        profile_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "browser_profiles", safe_sid)
        )
        prune_profile_bloat(profile_dir)

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


def prune_profile_bloat(profile_dir: str) -> None:
    """Removes volatile Chrome cache, metrics, and models to keep profile under 10MB while preserving cookies & sessions."""
    import os
    import shutil
    if not os.path.isdir(profile_dir):
        return

    bloat_subdirs = [
        os.path.join(profile_dir, "Default", "Cache"),
        os.path.join(profile_dir, "Default", "Code Cache"),
        os.path.join(profile_dir, "Default", "GPUCache"),
        os.path.join(profile_dir, "Default", "DawnGraphiteCache"),
        os.path.join(profile_dir, "Default", "DawnWebGPUCache"),
        os.path.join(profile_dir, "Default", "Service Worker", "CacheStorage"),
        os.path.join(profile_dir, "optimization_guide_model_store"),
        os.path.join(profile_dir, "BrowserMetrics"),
        os.path.join(profile_dir, "DeferredBrowserMetrics"),
        os.path.join(profile_dir, "Crashpad"),
        os.path.join(profile_dir, "GrShaderCache"),
        os.path.join(profile_dir, "ShaderCache"),
        os.path.join(profile_dir, "GPUPersistentCache"),
    ]

    for p in bloat_subdirs:
        try:
            if os.path.isdir(p):
                shutil.rmtree(p, ignore_errors=True)
        except Exception:
            pass


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
        # Strict disk cache limits (max 10MB disk cache, 1MB media cache)
        "--disk-cache-size=10485760",
        "--media-cache-size=1048576",
        # Disable heavy ML model downloads and hint stores in Chromium
        "--disable-features=OptimizationGuideModelDownloading,OptimizationHints,OptimizationTargetPrediction,InterestFeedContentSuggestions,Translate",
        # Disable background bloat and telemetry
        "--disable-component-update",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-breakpad",
        "--disable-gpu-shader-disk-cache",
        "--metrics-recording-only=false",
    ]


async def _stop_browser(browser: Browser) -> None:
    import sys
    import subprocess

    pid = None
    try:
        proc = getattr(browser, "_process", None) or getattr(browser, "process", None)
        if proc and hasattr(proc, "pid"):
            pid = proc.pid
        elif getattr(browser, "_process_pid", None):
            pid = getattr(browser, "_process_pid")
        elif getattr(getattr(browser, "connection", None), "browser_pid", None):
            pid = getattr(browser.connection, "browser_pid")
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
