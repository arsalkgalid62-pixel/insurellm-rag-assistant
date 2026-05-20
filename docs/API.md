# API Reference

Base URL: `http://127.0.0.1:8000`

## Endpoints

### `GET /api/health`

Returns index status and default models.

```json
{
  "status": "ok",
  "index_ready": true,
  "company": "Insurellm",
  "default_model": "openai/gpt-4.1-mini",
  "embedding_model": "text-embedding-3-large"
}
```

### `GET /api/stats`

Knowledge base statistics for Analytics / Knowledge pages.

```json
{
  "vector_count": 970,
  "document_count": 76,
  "categories": {
    "company": 3,
    "products": 9,
    "employees": 28,
    "contracts": 36
  }
}
```

### `GET /api/examples`

Example query categories for the sidebar.

### `POST /api/chat`

Full RAG response with sources, pipeline metrics, confidence, follow-ups.

**Body:**

```json
{
  "message": "Who founded Insurellm?",
  "history": [{"role": "user", "content": "..."}],
  "debug": false,
  "model": "openai/gpt-4.1-mini"
}
```

### `POST /api/chat/stream`

Server-Sent Events: `meta` event then `token` chunks then `done`.

Used by the React dashboard for streaming answers.

---

## CORS

Allowed origins: `localhost:5173`, `localhost:5174`, `localhost:3000`.
