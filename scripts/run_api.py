#!/usr/bin/env python3
"""
Start the FastAPI backend for the SaaS dashboard.

Run from project root:
  .venv/Scripts/python.exe scripts/run_api.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

os.chdir(ROOT)
paths = [str(ROOT), str(ROOT / "src")]
for p in paths:
    if p not in sys.path:
        sys.path.insert(0, p)

# Child reload workers inherit this — fixes "No module named 'api'"
existing = os.environ.get("PYTHONPATH", "")
os.environ["PYTHONPATH"] = os.pathsep.join(paths + ([existing] if existing else []))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(ROOT / "api"), str(ROOT / "src")],
    )
