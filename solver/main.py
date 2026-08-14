import logging
import os
import sys

# Ensure solver directory is on sys.path so app module is importable
solver_dir = os.path.dirname(os.path.abspath(__file__))
if solver_dir not in sys.path:
    sys.path.insert(0, solver_dir)

import uvicorn
from app.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

if __name__ == "__main__":
    uvicorn.run(
        "app.api:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        workers=1,
    )
