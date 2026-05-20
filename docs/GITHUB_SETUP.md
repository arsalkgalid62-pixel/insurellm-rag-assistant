# Publish to GitHub

**Author:** Arsal Kamran · arsalkgalid.62@gmail.com

Your project is committed locally. Follow these steps to push.

## 1. Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `insurellm-rag-assistant`
3. Visibility: **Public** (recommended for portfolio)
4. Do **not** add README, .gitignore, or license (already in this project)
5. Click **Create repository**

## 2. Connect and push

Repository URL: `https://github.com/arsalkgalid62-pixel/insurellm-rag-assistant`

Replace `YOUR_GITHUB_USERNAME` if using a fork:

```bash
cd insurellm-rag-assistant

git branch -M main
git remote remove origin 2>/dev/null
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/insurellm-rag-assistant.git

# If you get SSL certificate errors on Windows:
GIT_SSL_NO_VERIFY=true git push -u origin main
```

Or without SSL workaround (if your network allows):

```bash
git push -u origin main
```

## 3. Verify

- Open `https://github.com/YOUR_GITHUB_USERNAME/insurellm-rag-assistant`
- Confirm README renders correctly
- Confirm `.env` is **not** in the file list

## 4. Optional — improve discoverability

**Topics:** `rag`, `chromadb`, `openai`, `fastapi`, `react`, `langchain`, `retrieval-augmented-generation`, `llm`, `portfolio`

**About:** Enterprise RAG assistant with React dashboard — query rewrite, reranking, source citations.

## Already committed locally

- 128 files, full docs, no secrets (`.env` gitignored)
- Commit: `Add Insurellm enterprise RAG assistant portfolio project`
