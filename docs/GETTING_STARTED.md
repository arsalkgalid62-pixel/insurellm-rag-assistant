# Getting Started

## Author

**Arsal Kamran** — [arsalkgalid.62@gmail.com](mailto:arsalkgalid.62@gmail.com)

---

## Windows SSL issues

If you see `CERTIFICATE_VERIFY_FAILED` (Python) or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (npm):

**Python** — `truststore` is included; loaded automatically via `ssl_fix.py`.

**npm** — `frontend/.npmrc` sets `strict-ssl=false` for local development.

---

## Step-by-step

### 1. Python environment

```bash
cd insurellm-rag-assistant
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
pip install truststore          # if SSL errors persist
```

### 2. Environment variables

```bash
cp .env.example .env
```

Add your `OPENAI_API_KEY`. Never commit `.env`.

### 3. Ingest documents

```bash
python scripts/ingest.py
```

Creates `data/chroma_db/` (gitignored).

### 4. Run enterprise dashboard

**API** (port 8000):

```bash
.venv\Scripts\python.exe scripts/run_api.py
```

**Frontend** (port 5173 or 5174):

```bash
cd frontend
npm install
npm run dev
```

### 5. Verify

- Health: http://127.0.0.1:8000/api/health  
- UI: http://localhost:5173  
- Ask: *"Who founded Insurellm?"*

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No module named 'api'` | Run API via `python scripts/run_api.py` from project root |
| `Index not built` | Run `python scripts/ingest.py` |
| Gradio `type` error | Use React dashboard or update Gradio to 6.x patterns |
| npm SSL errors | Use `frontend/.npmrc` (already included) |
| Empty analytics | Ask questions in Chat first — metrics are session-based |

---

## Example questions

- Who founded Insurellm and when?
- What is Carllm and its main features?
- Which employees work in engineering?
- Summarize the Metropolitan Life Group contract for Lifellm.
