"""Instrumented RAG pipeline with timing, scores, and debug payloads."""

from __future__ import annotations

import re
import time
from pathlib import Path

from litellm import completion

from insurellm_rag.config import CHAT_MODEL, COMPANY_NAME, FINAL_K, RETRIEVAL_K
from insurellm_rag.models import Result
from insurellm_rag.retrieval import (
    _collection,
    _fetch_by_embedding,
    _merge_chunks,
    openai_client,
    rewrite_query,
    rerank,
)
from insurellm_rag.answer import SYSTEM_PROMPT

from insurellm_rag.config import EMBEDDING_MODEL


def _distance_to_score(distance: float | None) -> float:
    if distance is None:
        return 85.0
    return round(max(0.0, min(100.0, (1.0 / (1.0 + float(distance))) * 100)), 1)


def _short_filename(path: str) -> str:
    p = Path(path)
    parts = p.parts
    if "knowledge-base" in parts:
        idx = parts.index("knowledge-base")
        return "/".join(parts[idx + 1 :])
    return p.name


def _highlight_excerpt(text: str, query: str) -> str:
    words = [w for w in re.findall(r"\w+", query.lower()) if len(w) > 3][:6]
    excerpt = text[:700]
    for word in words:
        pattern = re.compile(re.escape(word), re.IGNORECASE)
        excerpt = pattern.sub(lambda m: f"<mark>{m.group(0)}</mark>", excerpt)
    return excerpt


def _fetch_scored(question: str, k: int = RETRIEVAL_K) -> list[tuple[Result, float]]:
    embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL, input=[question]
    ).data[0].embedding
    results = _collection.query(
        query_embeddings=[embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )
    out: list[tuple[Result, float]] = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        out.append((Result(page_content=doc, metadata=meta), _distance_to_score(dist)))
    return out


def _confidence_from_scores(scores: list[float]) -> tuple[float, str]:
    if not scores:
        return 0.0, "low"
    avg = sum(scores[:3]) / min(3, len(scores))
    if avg >= 78:
        return avg, "high"
    if avg >= 55:
        return avg, "medium"
    return avg, "low"


def _follow_up_questions(question: str, answer: str) -> list[str]:
    try:
        prompt = f"""Based on this Q&A about Insurellm, suggest exactly 3 short follow-up questions the user might ask next.
Return one question per line, no numbering.

Question: {question}
Answer: {answer[:500]}
"""
        resp = completion(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
        )
        lines = [
            ln.strip().lstrip("0123456789.-) ")
            for ln in resp.choices[0].message.content.strip().split("\n")
            if ln.strip()
        ]
        return lines[:3]
    except Exception:
        return []


def run_rag_pipeline(
    question: str,
    history: list[dict] | None = None,
    *,
    debug: bool = False,
    model: str | None = None,
) -> dict:
    """Full RAG with metrics for the SaaS API."""
    history = history or []
    model = model or CHAT_MODEL
    t0 = time.perf_counter()
    stages: list[dict] = []

    t_rewrite = time.perf_counter()
    rewritten = rewrite_query(question, history)
    rewrite_ms = (time.perf_counter() - t_rewrite) * 1000
    stages.append({"name": "Query rewrite", "status": "done", "ms": round(rewrite_ms, 1)})

    t_ret = time.perf_counter()
    raw_a = _fetch_scored(question)
    raw_b = _fetch_scored(rewritten)
    merged: dict[str, tuple[Result, float]] = {}
    for item, score in raw_a + raw_b:
        key = item.page_content
        if key not in merged or score > merged[key][1]:
            merged[key] = (item, score)
    chunks_with_scores = list(merged.values())
    chunks_only = [c for c, _ in chunks_with_scores]
    retrieve_ms = (time.perf_counter() - t_ret) * 1000
    stages.append(
        {
            "name": "Vector search",
            "status": "done",
            "ms": round(retrieve_ms, 1),
            "detail": f"{len(chunks_only)} chunks",
        }
    )

    t_rerank = time.perf_counter()
    reranked = rerank(question, chunks_only)
    score_map = {c.page_content: s for c, s in chunks_with_scores}
    reranked_scored = [(c, score_map.get(c.page_content, 70.0)) for c in reranked]
    final = reranked_scored[:FINAL_K]
    rerank_ms = (time.perf_counter() - t_rerank) * 1000
    stages.append({"name": "Reranking", "status": "done", "ms": round(rerank_ms, 1)})

    context = "\n\n".join(
        f"[{c.metadata.get('type', 'doc')}] {c.metadata.get('source', '')}:\n{c.page_content}"
        for c, _ in final
    )
    system = SYSTEM_PROMPT.format(company=COMPANY_NAME, context=context)
    messages = [{"role": "system", "content": system}] + history + [
        {"role": "user", "content": question}
    ]

    t_gen = time.perf_counter()
    response = completion(model=model, messages=messages)
    answer = response.choices[0].message.content
    generate_ms = (time.perf_counter() - t_gen) * 1000
    usage = getattr(response, "usage", None)
    tokens = 0
    if usage:
        if isinstance(usage, dict):
            tokens = (usage.get("prompt_tokens") or 0) + (usage.get("completion_tokens") or 0)
        else:
            tokens = (getattr(usage, "prompt_tokens", None) or 0) + (
                getattr(usage, "completion_tokens", None) or 0
            )
    stages.append(
        {
            "name": "LLM response",
            "status": "done",
            "ms": round(generate_ms, 1),
            "detail": f"{tokens} tokens",
        }
    )

    scores = [s for _, s in final]
    confidence, confidence_label = _confidence_from_scores(scores)
    follow_ups = _follow_up_questions(question, answer)

    sources = []
    for i, (chunk, score) in enumerate(final, 1):
        src = chunk.metadata.get("source", "unknown")
        sources.append(
            {
                "id": f"src-{i}",
                "filename": _short_filename(src),
                "doc_type": chunk.metadata.get("type", "document"),
                "chunk_index": i,
                "relevance_score": score,
                "excerpt": chunk.page_content[:600],
                "highlighted_html": _highlight_excerpt(chunk.page_content, question),
            }
        )

    total_ms = (time.perf_counter() - t0) * 1000
    payload = {
        "answer": answer,
        "sources": sources,
        "follow_ups": follow_ups,
        "confidence": round(confidence, 1),
        "confidence_label": confidence_label,
        "pipeline": {
            "stages": [
                {"key": "query", "label": "Query", "icon": "message"},
                {"key": "embedding", "label": "Embedding", "icon": "binary"},
                {"key": "search", "label": "Vector Search", "icon": "search"},
                {"key": "rerank", "label": "Reranking", "icon": "layers"},
                {"key": "llm", "label": "LLM Response", "icon": "sparkles"},
            ],
            "timeline": stages,
            "rewritten_query": rewritten,
            "chunks_retrieved": len(chunks_only),
            "chunks_used": len(final),
            "latency_ms": round(total_ms, 0),
            "tokens_used": tokens,
            "model": model,
        },
    }
    if debug:
        payload["debug"] = {
            "prompt_system": system[:4000],
            "prompt_messages": messages,
            "raw_chunk_count": len(chunks_only),
            "reranked_scores": [s for _, s in final],
        }
    return payload
