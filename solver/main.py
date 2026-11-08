import logging
import os
import socket
import sys

# Ensure solver directory is on sys.path so app module is importable
solver_dir = os.path.dirname(os.path.abspath(__file__))
if solver_dir not in sys.path:
    sys.path.insert(0, solver_dir)

import uvicorn
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# Silence uvicorn access logs completely to keep background polling silent
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").propagate = False

def get_bindable_port(host: str, initial_port: int) -> int:
    """Finds an available TCP port, avoiding Windows reserved/excluded port ranges."""
    candidates = [initial_port, 8192, 8195, 8199, 8787, 38191]
    for p in candidates:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, p))
                return p
        except Exception:
            continue
    return initial_port

if __name__ == "__main__":
    active_port = get_bindable_port(settings.HOST, settings.PORT)
    port_file = os.path.join(solver_dir, ".solver_port")
    try:
        with open(port_file, "w", encoding="utf-8") as f:
            f.write(str(active_port))
    except Exception:
        pass

    if active_port != settings.PORT:
        print(
            f"[TurnstileSolver] Port {settings.PORT} was unavailable/reserved on Windows, switched to available port {active_port}",
            flush=True,
        )

    print(f"[TurnstileSolver] Initializing uvicorn on {settings.HOST}:{active_port}...", flush=True)

    from app.api import app
    uvicorn.run(
        app,
        host=settings.HOST,
        port=active_port,
        log_level="info",
        access_log=False,
    )

