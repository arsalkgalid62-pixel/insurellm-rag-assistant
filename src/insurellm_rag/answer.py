"""Answer generation with retrieved context."""

from __future__ import annotations

from litellm import completion
from tenacity import retry, wait_exponential

from insurellm_rag.config import CHAT_MODEL, COMPANY_NAME
from insurellm_rag.models import Result
from insurellm_rag.retrieval import fetch_context

wait = wait_exponential(multiplier=1, min=10, max=240)

SYSTEM_PROMPT = """
You are a knowledgeable, professional assistant representing {company}.
Answer the user's question using ONLY the context below when it is relevant.
Be accurate, complete, and concise. If the context does not contain the answer, say so clearly.
Do not invent facts about employees, contracts, or products.

Relevant knowledge base extracts:
{context}
"""


@retry(wait=wait)
def answer_question(
    question: str,
    history: list[dict] | None = None,
) -> tuple[str, list[Result]]:
    """Run RAG and return (answer_text, source_chunks)."""
    history = history or []
    chunks = fetch_context(question, history)

    context = "\n\n".join(
        f"[{chunk.metadata.get('type', 'doc')}] {chunk.metadata.get('source', 'unknown')}:\n"
        f"{chunk.page_content}"
        for chunk in chunks
    )
    system = SYSTEM_PROMPT.format(company=COMPANY_NAME, context=context)
    messages = [{"role": "system", "content": system}] + history + [
        {"role": "user", "content": question}
    ]

    response = completion(model=CHAT_MODEL, messages=messages)
    return response.choices[0].message.content, chunks
