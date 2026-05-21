"""
Production entry point for Render / Railway / etc.

Start command:
  uvicorn main:app --host 0.0.0.0 --port $PORT
"""

from api.main import app

__all__ = ["app"]
