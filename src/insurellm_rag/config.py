"""Central configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_BASE_PATH = PROJECT_ROOT / "knowledge-base"
DB_PATH = PROJECT_ROOT / "data" / "chroma_db"

COLLECTION_NAME = "docs"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
CHAT_MODEL = os.getenv("CHAT_MODEL", "openai/gpt-4.1-mini")
INGEST_MODEL = os.getenv("INGEST_MODEL", "openai/gpt-4.1-nano")

RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", "20"))
FINAL_K = int(os.getenv("FINAL_K", "10"))
AVERAGE_CHUNK_SIZE = int(os.getenv("AVERAGE_CHUNK_SIZE", "100"))
INGEST_WORKERS = int(os.getenv("INGEST_WORKERS", "3"))

FAST_CHUNK_SIZE = int(os.getenv("FAST_CHUNK_SIZE", "500"))
FAST_CHUNK_OVERLAP = int(os.getenv("FAST_CHUNK_OVERLAP", "200"))

COMPANY_NAME = "Insurellm"
