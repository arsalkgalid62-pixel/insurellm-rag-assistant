# Architecture

## Overview

The Insurellm Knowledge Assistant is a **retrieve-then-generate** pipeline. At query time the system never relies on the model’s parametric memory for company facts; it always pulls from an indexed markdown corpus, reranks candidates, and injects them into the system prompt.

## Components

### 1. Ingestion (`insurellm_rag.ingest`)

| Step | Fast mode | Smart mode |
|------|-----------|------------|
| Load | Walk `knowledge-base/<category>/**/*.md` | Same |
| Chunk | `RecursiveCharacterTextSplitter` (500 / 200 overlap) | LLM emits `headline`, `summary`, `original_text` per chunk |
| Embed | OpenAI `text-embedding-3-large` | Same |
| Store | Chroma collection `docs` under `data/chroma_db/` | Same |

Smart mode uses parallel workers (`INGEST_WORKERS`) with retries on rate limits.

### 2. Retrieval (`insurellm_rag.retrieval`)

1. **Rewrite** — LLM condenses the user turn + history into a short search query.
2. **Dual search** — Embed both the original question and the rewritten query; retrieve `RETRIEVAL_K` chunks each.
3. **Merge** — Deduplicate by `page_content`.
4. **Rerank** — LLM orders chunks by relevance (structured `RankOrder` JSON).
5. **Truncate** — Keep top `FINAL_K` for generation.

### 3. Generation (`insurellm_rag.answer`)

System prompt includes company role, grounding rules, and formatted context blocks with file paths. Conversation history is passed through LiteLLM-compatible message lists.

### 4. Interface (`app.py`)

Gradio Blocks:

- Chat tab — message list UI, example prompts, HTML source panel
- About tab — stack table and setup reminder
- Startup check — `index_exists()` banner

## Data flow (query)

```
User message
    → answer_question()
        → fetch_context()
            → rewrite_query()
            → Chroma query × 2
            → merge + rerank()
        → completion() with context
    → format_context_html() for UI
```

## Failure modes

| Situation | Behavior |
|-----------|----------|
| No index | UI shows warning; chat returns ingest instructions |
| Missing API key | LiteLLM/OpenAI error surfaced in Gradio |
| Rate limits | `tenacity` exponential backoff on rewrite, rerank, smart ingest |

## Extension ideas

- Add evaluation harness (MRR, nDCG, LLM-as-judge) from Week 5 `evaluation/`
- Metadata filters (`type == contracts`) before rerank
- Hybrid BM25 + dense retrieval
- Deploy Gradio on Hugging Face Spaces with secrets for `OPENAI_API_KEY`
