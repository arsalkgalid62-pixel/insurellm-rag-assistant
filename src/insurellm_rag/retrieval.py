"""Retrieval pipeline: query rewrite, dual search, LLM reranking."""

from __future__ import annotations

import logging

from chromadb import PersistentClient
from litellm import completion
from openai import OpenAI
from tenacity import retry, wait_exponential

from insurellm_rag.ssl_fix import apply_ssl_fix

apply_ssl_fix()

from insurellm_rag.config import (
    CHAT_MODEL,
    COLLECTION_NAME,
    DB_PATH,
    EMBEDDING_MODEL,
    FINAL_K,
    RETRIEVAL_K,
)
from insurellm_rag.models import RankOrder, Result

logger = logging.getLogger(__name__)
wait = wait_exponential(multiplier=1, min=10, max=240)

openai_client = OpenAI()
_chroma = PersistentClient(path=str(DB_PATH))
_collection = _chroma.get_or_create_collection(COLLECTION_NAME)


@retry(wait=wait)
def rewrite_query(question: str, history: list[dict] | None = None) -> str:
    """Rewrite the user question into a concise knowledge-base search query."""
    history = history or []
    message = f"""
You are answering questions about the company Insurellm using a Knowledge Base.

Conversation so far:
{history}

User's current question:
{question}

Respond ONLY with a short, precise search query for the knowledge base. No preamble.
"""
    response = completion(model=CHAT_MODEL, messages=[{"role": "system", "content": message}])
    return response.choices[0].message.content.strip()


@retry(wait=wait)
def rerank(question: str, chunks: list[Result]) -> list[Result]:
    """Reorder retrieved chunks by relevance using an LLM."""
    system_prompt = """
You are a document re-ranker.
Rank the provided chunks by relevance to the question, most relevant first.
Reply only with ranked chunk ids. Include every chunk id you were given.
"""
    user_prompt = f"Question:\n\n{question}\n\nChunks:\n\n"
    for index, chunk in enumerate(chunks):
        user_prompt += f"# CHUNK ID: {index + 1}:\n\n{chunk.page_content}\n\n"
    user_prompt += "Reply only with the list of ranked chunk ids."

    response = completion(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=RankOrder,
    )
    order = RankOrder.model_validate_json(response.choices[0].message.content).order
    return [chunks[i - 1] for i in order]


def _fetch_by_embedding(question: str, k: int = RETRIEVAL_K) -> list[Result]:
    embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL, input=[question]
    ).data[0].embedding
    results = _collection.query(query_embeddings=[embedding], n_results=k)
    chunks: list[Result] = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        chunks.append(Result(page_content=doc, metadata=meta))
    return chunks


def _merge_chunks(primary: list[Result], secondary: list[Result]) -> list[Result]:
    merged = list(primary)
    seen = {c.page_content for c in primary}
    for chunk in secondary:
        if chunk.page_content not in seen:
            merged.append(chunk)
            seen.add(chunk.page_content)
    return merged


def fetch_context(question: str, history: list[dict] | None = None) -> list[Result]:
    """
    Advanced retrieval: rewrite query, dual embedding search, merge, rerank, top-k.
    """
    history = history or []
    rewritten = rewrite_query(question, history)
    logger.debug("Rewritten query: %s", rewritten)

    chunks = _merge_chunks(
        _fetch_by_embedding(question),
        _fetch_by_embedding(rewritten),
    )
    reranked = rerank(question, chunks)
    return reranked[:FINAL_K]
