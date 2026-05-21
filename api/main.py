"""FastAPI backend for the Insurellm SaaS dashboard."""

from __future__ import annotations

import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from insurellm_rag.ssl_fix import apply_ssl_fix

apply_ssl_fix()

from insurellm_rag.config import CHAT_MODEL, COMPANY_NAME, EMBEDDING_MODEL
from insurellm_rag.ingest import index_exists
from insurellm_rag.pipeline import run_rag_pipeline

logger = logging.getLogger(__name__)


def _cors_origins() -> list[str]:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
    frontend = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend:
        origins.append(frontend)
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build vector index on startup if missing (e.g. Render without ingest in build)."""
    if not index_exists():
        logger.warning("Index missing — running ingestion (may take a few minutes)...")
        try:
            from insurellm_rag.ingest import run_ingestion

            run_ingestion(smart=False)
            logger.info("Ingestion complete.")
        except Exception as exc:
            logger.error("Startup ingestion failed: %s", exc)
    yield


app = FastAPI(
    title="Insurellm Knowledge API",
    version="2.0.0",
    description="Production RAG API for the Insurellm enterprise assistant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root URL — API lives under /api (browsers often open / only)."""
    return {
        "service": "Insurellm Knowledge API",
        "status": "running",
        "index_ready": index_exists(),
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "health": "GET /api/health",
            "stats": "GET /api/stats",
            "chat": "POST /api/chat",
            "stream": "POST /api/chat/stream",
        },
        "frontend": "Deploy React UI on Vercel — set VITE_API_URL to this service URL.",
    }


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = Field(default_factory=list)
    debug: bool = False
    model: str | None = None


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "index_ready": index_exists(),
        "company": COMPANY_NAME,
        "default_model": CHAT_MODEL,
        "embedding_model": EMBEDDING_MODEL,
    }


@app.get("/api/stats")
def stats():
    """Knowledge base and index statistics for Analytics / Knowledge pages."""
    from insurellm_rag.config import COLLECTION_NAME, DB_PATH, KNOWLEDGE_BASE_PATH
    from chromadb import PersistentClient

    categories: dict[str, int] = {}
    document_count = 0
    if KNOWLEDGE_BASE_PATH.exists():
        for folder in KNOWLEDGE_BASE_PATH.iterdir():
            if folder.is_dir():
                count = len(list(folder.rglob("*.md")))
                categories[folder.name] = count
                document_count += count

    vector_count = 0
    if index_exists():
        chroma = PersistentClient(path=str(DB_PATH))
        if COLLECTION_NAME in [c.name for c in chroma.list_collections()]:
            vector_count = chroma.get_collection(COLLECTION_NAME).count()

    return {
        "vector_count": vector_count,
        "document_count": document_count,
        "categories": categories,
    }


@app.get("/api/examples")
def examples():
    return {
        "categories": [
            {
                "id": "company",
                "label": "Company",
                "icon": "building",
                "queries": [
                    "Who founded Insurellm and when?",
                    "What is Insurellm's company culture?",
                ],
            },
            {
                "id": "products",
                "label": "Products",
                "icon": "package",
                "queries": [
                    "What is Carllm and its main features?",
                    "What health insurance products does Insurellm offer?",
                ],
            },
            {
                "id": "people",
                "label": "People",
                "icon": "users",
                "queries": ["Which employees work in engineering?"],
            },
            {
                "id": "contracts",
                "label": "Contracts",
                "icon": "file-text",
                "queries": [
                    "Summarize the Metropolitan Life Group contract for Lifellm."
                ],
            },
        ]
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not index_exists():
        raise HTTPException(
            503,
            "Vector index not built. Run: python scripts/ingest.py",
        )
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    history = [m.model_dump() for m in req.history]
    try:
        return run_rag_pipeline(
            req.message.strip(),
            history,
            debug=req.debug,
            model=req.model,
        )
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    """Stream answer text after pipeline completes (simulated token stream)."""
    if not index_exists():
        raise HTTPException(503, "Index not ready")

    history = [m.model_dump() for m in req.history]
    result = run_rag_pipeline(
        req.message.strip(),
        history,
        debug=req.debug,
        model=req.model,
    )

    def generate():
        meta = {
            "type": "meta",
            "sources": result["sources"],
            "pipeline": result["pipeline"],
            "confidence": result["confidence"],
            "confidence_label": result["confidence_label"],
            "follow_ups": result["follow_ups"],
            "debug": result.get("debug"),
        }
        yield f"data: {json.dumps(meta)}\n\n"
        text = result["answer"]
        chunk_size = 12
        for i in range(0, len(text), chunk_size):
            piece = text[i : i + chunk_size]
            yield f"data: {json.dumps({'type': 'token', 'content': piece})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
