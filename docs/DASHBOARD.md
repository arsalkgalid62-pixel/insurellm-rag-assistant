# Enterprise SaaS Dashboard

Production-grade **React + Tailwind + Framer Motion** UI with a **FastAPI** backend.

## Architecture

```
frontend/ (React, port 5173)
    ↓ proxy /api
api/main.py (FastAPI, port 8000)
    ↓
src/insurellm_rag/pipeline.py (instrumented RAG)
```

## Run locally

**Terminal 1 — API**

```bash
cd insurellm-rag-assistant
.venv/Scripts/activate
pip install fastapi uvicorn  # if needed

# Use the project venv Python (important on Windows):
.venv/Scripts/python.exe scripts/run_api.py
```

Do **not** use bare `uvicorn api.main:app` unless `PYTHONPATH` includes the project root.

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Features

- Left sidebar: logo, nav, example query cards, dark/light toggle
- Top bar: source filter, model selector, latency & token indicators
- Chat: bubbles, streaming, typing indicator, copy/regenerate, follow-ups
- Sources: relevance %, chunk #, highlighted matches, filter
- Pipeline viz: Query → Embedding → Search → Rerank → LLM
- Debug mode: prompt, scores, chunk counts
- Gradio UI still available via `python app.py` (legacy)
