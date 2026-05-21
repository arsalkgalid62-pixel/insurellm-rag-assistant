# Deploy: Vercel (frontend) + Render (backend)

**Author:** Arsal Kamran · [arsalkgalid.62@gmail.com](mailto:arsalkgalid.62@gmail.com)

Live stack:

| Part | Platform | URL |
|------|----------|-----|
| React dashboard | [Vercel](https://vercel.com) | `https://your-app.vercel.app` |
| FastAPI + RAG | [Render](https://render.com) | `https://insurellm-rag-api.onrender.com` |

---

## Part 1 — Render (API)

### Option A: Blueprint (easiest)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub: `arsalkgalid62-pixel/insurellm-rag-assistant`
3. Render reads `render.yaml` from the repo
4. Add **Environment variables** when prompted:
   - `OPENAI_API_KEY` = your OpenAI key (**required**)
   - `FRONTEND_URL` = leave empty for now; set after Vercel deploy
5. Click **Apply** — first deploy runs `pip install` + `ingest` (5–15 min)
6. Copy your service URL, e.g. `https://insurellm-rag-api.onrender.com`

### Option B: Manual web service

1. **New** → **Web Service** → connect repo
2. **Name:** `insurellm-rag-api`
3. **Root directory:** (leave blank = repo root)
4. **Runtime:** Python 3
5. **Build command:**
   ```bash
   pip install --upgrade pip && pip install -r requirements.txt && python scripts/ingest.py
   ```
6. **Start command:**
   ```bash
   uvicorn api.main:app --host 0.0.0.0 --port $PORT
   ```
7. **Health check path:** `/api/health`
8. **Environment variables:**
   - `OPENAI_API_KEY`
   - `FRONTEND_URL` (your Vercel URL, after step 2)

### Verify API

| URL | Expected |
|-----|----------|
| `https://YOUR-SERVICE.onrender.com/` | Service info JSON (not `Not Found`) |
| `https://YOUR-SERVICE.onrender.com/api/health` | `"index_ready": true` |
| `https://YOUR-SERVICE.onrender.com/docs` | Swagger UI |

**Note:** Opening only the root used to show `{"detail":"Not Found"}` — use **`/api/health`** for health checks.

**Note:** Free tier **sleeps** after ~15 min idle. First request after sleep may take 30–60s (cold start).

---

## Part 2 — Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import `arsalkgalid62-pixel/insurellm-rag-assistant`
3. **Important settings:**

   | Setting | Value |
   |---------|--------|
   | Root Directory | `frontend` |
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. **Environment variables:**

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | `https://insurellm-rag-api.onrender.com` (your Render URL, **no** trailing slash) |

5. **Deploy**

6. Copy your Vercel URL, e.g. `https://insurellm-rag-assistant.vercel.app`

---

## Part 3 — Link frontend ↔ backend

1. In **Render** → your service → **Environment**
2. Set `FRONTEND_URL` = your full Vercel URL (e.g. `https://insurellm-rag-assistant.vercel.app`)
3. **Save** → Render redeploys (updates CORS)

4. In **Vercel** → **Settings** → **Environment Variables**
5. Confirm `VITE_API_URL` points to Render API
6. **Redeploy** Vercel if you changed the variable

---

## Test live app

1. Open your Vercel URL
2. Wait for green **Index live** in the top bar (API must be awake)
3. Ask: *Who founded Insurellm?*
4. Check **Analytics** after a few questions

---

## Costs

| Service | Free tier |
|---------|-----------|
| Vercel | Hobby — static hosting free |
| Render | Free web service — sleeps when idle |
| OpenAI | Paid per API usage |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Set `FRONTEND_URL` on Render to exact Vercel URL |
| `index_ready: false` | Check Render logs; ensure `OPENAI_API_KEY` is set; wait for ingest |
| Vercel build fails | Root must be `frontend`; run `npm install` locally first |
| Slow first query | Render cold start + RAG pipeline (~30–60s) |
| API 503 | Index not built — check build logs for ingest errors |

---

## Update README with live links

After deploy, add to GitHub README:

```markdown
## Live demo

- **App:** https://your-app.vercel.app
- **API:** https://insurellm-rag-api.onrender.com/api/health
```
