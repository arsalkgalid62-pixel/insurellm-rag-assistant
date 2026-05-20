"""Document ingestion: load knowledge base, chunk, embed, persist to Chroma."""

from __future__ import annotations

import logging
from multiprocessing import Pool
from pathlib import Path

from chromadb import PersistentClient
from litellm import completion
from openai import OpenAI
from tenacity import retry, wait_exponential
from tqdm import tqdm

from insurellm_rag.ssl_fix import apply_ssl_fix

apply_ssl_fix()

from insurellm_rag.config import (
    AVERAGE_CHUNK_SIZE,
    COLLECTION_NAME,
    DB_PATH,
    EMBEDDING_MODEL,
    FAST_CHUNK_OVERLAP,
    FAST_CHUNK_SIZE,
    INGEST_MODEL,
    INGEST_WORKERS,
    KNOWLEDGE_BASE_PATH,
)
from insurellm_rag.models import Chunk, Chunks, Result

logger = logging.getLogger(__name__)
wait = wait_exponential(multiplier=1, min=10, max=240)

openai_client = OpenAI()


def fetch_documents() -> list[dict]:
    """Load all markdown files from the knowledge base directory tree."""
    documents: list[dict] = []
    if not KNOWLEDGE_BASE_PATH.exists():
        raise FileNotFoundError(
            f"Knowledge base not found at {KNOWLEDGE_BASE_PATH}. "
            "Ensure knowledge-base/ is present in the project root."
        )

    for folder in sorted(KNOWLEDGE_BASE_PATH.iterdir()):
        if not folder.is_dir():
            continue
        doc_type = folder.name
        for file in folder.rglob("*.md"):
            documents.append(
                {
                    "type": doc_type,
                    "source": file.as_posix(),
                    "text": file.read_text(encoding="utf-8"),
                }
            )

    logger.info("Loaded %s documents", len(documents))
    return documents


def fast_chunk_documents(documents: list[dict]) -> list[Result]:
    """Split documents with a recursive character splitter (fast, no LLM cost)."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=FAST_CHUNK_SIZE,
        chunk_overlap=FAST_CHUNK_OVERLAP,
    )
    chunks: list[Result] = []
    for doc in documents:
        parts = splitter.split_text(doc["text"])
        for part in parts:
            chunks.append(
                Result(
                    page_content=part,
                    metadata={"source": doc["source"], "type": doc["type"]},
                )
            )
    logger.info("Created %s chunks (fast mode)", len(chunks))
    return chunks


def _smart_chunk_prompt(document: dict) -> str:
    how_many = (len(document["text"]) // AVERAGE_CHUNK_SIZE) + 1
    return f"""
You take a document and split it into overlapping chunks for a Knowledge Base.

The document is from the shared drive of a company called Insurellm.
The document is of type: {document["type"]}
The document has been retrieved from: {document["source"]}

A chatbot will use these chunks to answer questions about the company.
Divide the document as you see fit so the entire document is covered — do not omit content.
This document should probably be split into at least {how_many} chunks.
Use roughly 25% overlap or about 50 words between adjacent chunks for better retrieval.

For each chunk provide: headline, summary, and original_text (verbatim from the document).

Document:

{document["text"]}

Respond with the chunks.
"""


@retry(wait=wait)
def _process_document_smart(document: dict) -> list[Result]:
    messages = [{"role": "user", "content": _smart_chunk_prompt(document)}]
    response = completion(model=INGEST_MODEL, messages=messages, response_format=Chunks)
    reply = response.choices[0].message.content
    doc_chunks = Chunks.model_validate_json(reply).chunks
    return [chunk.as_result(document) for chunk in doc_chunks]


def smart_chunk_documents(documents: list[dict]) -> list[Result]:
    """LLM-guided chunking with headlines and summaries (higher quality, API cost)."""
    chunks: list[Result] = []
    workers = max(1, INGEST_WORKERS)
    with Pool(processes=workers) as pool:
        for result in tqdm(
            pool.imap_unordered(_process_document_smart, documents),
            total=len(documents),
            desc="Smart chunking",
        ):
            chunks.extend(result)
    logger.info("Created %s chunks (smart mode)", len(chunks))
    return chunks


def create_embeddings(chunks: list[Result]) -> int:
    """Embed chunks and persist to Chroma. Returns document count."""
    DB_PATH.mkdir(parents=True, exist_ok=True)
    chroma = PersistentClient(path=str(DB_PATH))

    if COLLECTION_NAME in [c.name for c in chroma.list_collections()]:
        chroma.delete_collection(COLLECTION_NAME)

    texts = [c.page_content for c in chunks]
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    vectors = [e.embedding for e in response.data]

    collection = chroma.get_or_create_collection(COLLECTION_NAME)
    ids = [str(i) for i in range(len(chunks))]
    metas = [c.metadata for c in chunks]
    collection.add(
        ids=ids,
        embeddings=vectors,
        documents=texts,
        metadatas=metas,
    )
    count = collection.count()
    logger.info("Vector store ready: %s chunks, %s dimensions", count, len(vectors[0]))
    return count


def run_ingestion(*, smart: bool = False) -> int:
    """Full ingestion pipeline. Returns number of vectors stored."""
    documents = fetch_documents()
    if not documents:
        raise ValueError("No markdown documents found in knowledge-base/")

    chunks = smart_chunk_documents(documents) if smart else fast_chunk_documents(documents)
    return create_embeddings(chunks)


def index_exists() -> bool:
    """True if a populated Chroma collection is on disk."""
    if not DB_PATH.exists():
        return False
    chroma = PersistentClient(path=str(DB_PATH))
    if COLLECTION_NAME not in [c.name for c in chroma.list_collections()]:
        return False
    return chroma.get_collection(COLLECTION_NAME).count() > 0
