#!/usr/bin/env python3
"""Run the Agastya Learning Universe backend API server."""

import os
import sys
from pathlib import Path

# Ensure backend package is in python path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🌟 Starting Agastya Backend on http://{host}:{port} ...")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
