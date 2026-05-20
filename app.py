"""
Insurellm Knowledge Assistant — Gradio web interface.

Run: python app.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from insurellm_rag.ssl_fix import apply_ssl_fix

apply_ssl_fix()

import gradio as gr
from dotenv import load_dotenv

from insurellm_rag.answer import answer_question
from insurellm_rag.config import CHAT_MODEL, COMPANY_NAME, DB_PATH, EMBEDDING_MODEL
from insurellm_rag.formatting import empty_sources_html, format_context_html
from insurellm_rag.ingest import index_exists

load_dotenv(override=True)

# (short label for button, full question sent to RAG)
EXAMPLE_PROMPTS: list[tuple[str, str, str]] = [
    ("company", "Founding story", "Who founded Insurellm and when?"),
    ("products", "Carllm product", "What is Carllm and what are its main features?"),
    ("products", "Health products", "What products does Insurellm offer for health insurance?"),
    ("employees", "Engineering team", "Which employees work in engineering?"),
    ("contracts", "Life contract", "Summarize the contract with Metropolitan Life Group for Lifellm."),
    ("company", "Careers & culture", "What is Insurellm's company culture and career opportunities?"),
]

CHAT_PLACEHOLDER = """👋 **Welcome to the Insurellm Knowledge Assistant**

I answer questions using **your company's internal documents** — not guesswork.

**Try asking about:**
- 🏢 Company — history, culture, careers
- 📦 Products — Carllm, Healthllm, Lifellm, pricing
- 👥 People — employees and roles
- 📄 Contracts — client agreements and terms

*Pick a suggested question on the left, or type your own below. Replies take ~20–40 seconds while I search and verify sources.*"""

HINTS_HTML = """
<div class="hints-panel">
  <h3 class="hints-title">How to get great answers</h3>
  <ul class="hints-list">
    <li><strong>Be specific</strong> — "Who founded Insurellm?" beats "tell me about the company"</li>
    <li><strong>Name entities</strong> — products (Carllm), people, or contract partners</li>
    <li><strong>Ask one thing</strong> — one clear question per message works best</li>
    <li><strong>Follow up</strong> — I remember the conversation for context</li>
  </ul>
  <div class="hints-topics">
    <span class="topic-pill company">Company</span>
    <span class="topic-pill products">Products</span>
    <span class="topic-pill employees">People</span>
    <span class="topic-pill contracts">Contracts</span>
  </div>
</div>
"""

ABOUT_MD = f"""
### {COMPANY_NAME} Knowledge Assistant

Production-style **Retrieval-Augmented Generation (RAG)** over a structured corporate knowledge base.

| Capability | Implementation |
|------------|----------------|
| Embeddings | OpenAI `{EMBEDDING_MODEL}` |
| Vector store | ChromaDB (persistent, local) |
| Retrieval | Dual-query search + LLM reranking |
| Generation | LiteLLM → `{CHAT_MODEL}` |
| Grounding | Every answer cites source documents |

**Author:** [Arsal Kamran](mailto:arsalkgalid.62@gmail.com) · LLM Engineering Week 5 portfolio project
"""


def _status_html() -> str:
    if index_exists():
        return """
        <div class="status-pill status-ready">
          <span class="status-dot"></span>
          Knowledge base ready — ask anything below
        </div>
        """
    return """
    <div class="status-pill status-warn">
      <span class="status-dot"></span>
      Index not built — run <code>python scripts/ingest.py</code> first
    </div>
    """


def _message_text(content) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    if isinstance(content, dict) and "text" in content:
        return str(content["text"])
    return str(content)


def _normalize_history(history) -> list[dict]:
    if not history:
        return []
    normalized = []
    for msg in history:
        if isinstance(msg, dict):
            role = msg.get("role", "user")
            content = _message_text(msg.get("content", ""))
        else:
            role = getattr(msg, "role", "user")
            content = _message_text(getattr(msg, "content", ""))
        normalized.append({"role": role, "content": content})
    return normalized


def chat(history) -> tuple[list[dict], str]:
    history = _normalize_history(history)

    if not history:
        return history, empty_sources_html()

    if not index_exists():
        history.append(
            {
                "role": "assistant",
                "content": "The knowledge base index is missing. Please run "
                "`python scripts/ingest.py` and try again.",
            }
        )
        return history, empty_sources_html()

    last_message = history[-1]["content"]
    if not last_message.strip():
        return history, empty_sources_html()

    prior = history[:-1]

    try:
        answer, context = answer_question(last_message, prior)
        history.append({"role": "assistant", "content": answer})
        return history, format_context_html(context)
    except Exception as exc:
        history.append(
            {"role": "assistant", "content": f"Sorry, something went wrong: {exc}"}
        )
        return history, empty_sources_html()


def put_message_in_chatbot(message: str, history) -> tuple[str, list[dict]]:
    history = _normalize_history(history)
    if not message or not message.strip():
        return "", history
    return "", history + [{"role": "user", "content": message.strip()}]


def use_example(question: str, history) -> tuple[str, list[dict]]:
    history = _normalize_history(history)
    return "", history + [{"role": "user", "content": question}]


def _wire_submit(ui_event, message, chatbot, context_panel):
    return ui_event(
        put_message_in_chatbot,
        inputs=[message, chatbot],
        outputs=[message, chatbot],
    ).then(
        chat,
        inputs=chatbot,
        outputs=[chatbot, context_panel],
        show_progress="full",
    )


def _theme() -> gr.themes.Theme:
    return gr.themes.Soft(
        primary_hue=gr.themes.colors.teal,
        secondary_hue=gr.themes.colors.slate,
        neutral_hue=gr.themes.colors.slate,
        font=[gr.themes.GoogleFont("DM Sans"), "system-ui", "sans-serif"],
        font_mono=[gr.themes.GoogleFont("JetBrains Mono"), "monospace"],
    ).set(
        body_background_fill="*neutral_50",
        block_background_fill="white",
        block_border_width="1px",
        block_border_color="*neutral_200",
        block_radius="12px",
        button_primary_background_fill="*primary_600",
        button_primary_background_fill_hover="*primary_700",
    )


APP_CSS = """
/* ---- Layout & hero ---- */
.gradio-container { max-width: 1280px !important; margin: 0 auto; }
.hero {
  text-align: center;
  padding: 1.75rem 1.5rem 1.25rem;
  margin-bottom: 0.5rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f766e 0%, #134e4a 45%, #1e293b 100%);
  color: #f0fdfa;
  box-shadow: 0 4px 24px rgba(15, 118, 110, 0.25);
}
.hero h1 { margin: 0; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; color: #fff !important; }
.hero p { margin: 0.5rem 0 0; opacity: 0.92; font-size: 0.95rem; color: #ccfbf1 !important; }
.hero-badge {
  display: inline-block;
  margin-top: 0.75rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.15);
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.25);
}

/* ---- Status ---- */
.status-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}
.status-ready { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.status-warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}
.status-ready .status-dot { background: #10b981; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

/* ---- Hints sidebar ---- */
.hints-panel { padding: 0.25rem 0; }
.hints-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: #64748b; margin: 0 0 0.75rem 0; font-weight: 600; }
.hints-list { margin: 0 0 1rem 0; padding-left: 1.1rem; font-size: 0.82rem; color: #475569; line-height: 1.55; }
.hints-list li { margin-bottom: 0.35rem; }
.hints-topics { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.topic-pill {
  font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.55rem;
  border-radius: 6px; text-transform: capitalize;
}
.topic-pill.company { background: #ccfbf1; color: #0f766e; }
.topic-pill.products { background: #dbeafe; color: #1d4ed8; }
.topic-pill.employees { background: #ede9fe; color: #6d28d9; }
.topic-pill.contracts { background: #ffedd5; color: #c2410c; }

.examples-title {
  font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: #64748b; margin: 1rem 0 0.5rem 0; font-weight: 600;
}
.example-btn button {
  width: 100% !important;
  justify-content: flex-start !important;
  text-align: left !important;
  font-size: 0.8rem !important;
  padding: 0.5rem 0.65rem !important;
  border-radius: 8px !important;
  border: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  color: #334155 !important;
  box-shadow: none !important;
  transition: all 0.15s ease !important;
}
.example-btn button:hover {
  background: #f0fdfa !important;
  border-color: #5eead4 !important;
  color: #0f766e !important;
  transform: translateX(2px);
}
.example-btn .category-tag {
  display: none;
}

/* ---- Section headers ---- */
.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #94a3b8;
  margin: 0 0 0.35rem 0.15rem;
}

/* ---- Sources panel (HTML) ---- */
.sources-panel { font-family: inherit; }
.sources-count {
  font-size: 0.75rem; font-weight: 600; color: #0f766e;
  margin: 0 0 0.75rem 0; text-transform: uppercase; letter-spacing: 0.05em;
}
.sources-empty { text-align: center; padding: 2rem 1rem; color: #64748b; }
.sources-empty-icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.6; }
.sources-empty-title { font-weight: 600; color: #475569; margin: 0 0 0.35rem 0; }
.sources-empty-hint { font-size: 0.8rem; line-height: 1.5; margin: 0; }
.source-card {
  margin-bottom: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafafa;
  overflow: hidden;
}
.source-summary {
  cursor: pointer;
  padding: 0.55rem 0.75rem;
  font-size: 0.78rem;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.source-num {
  font-weight: 700; color: #94a3b8; min-width: 1.2rem;
}
.source-badge {
  color: white; font-size: 0.65rem; font-weight: 600;
  padding: 0.15rem 0.45rem; border-radius: 4px;
  text-transform: capitalize;
}
.source-path { color: #334155; font-weight: 500; flex: 1; word-break: break-all; }
.source-excerpt {
  margin: 0; padding: 0.65rem 0.75rem;
  font-size: 0.72rem; line-height: 1.45; color: #475569;
  background: white; border-top: 1px solid #f1f5f9;
  white-space: pre-wrap; word-break: break-word;
}

/* ---- Chat area ---- */
#chat-panel { min-height: 520px; }
#chat-input textarea { font-size: 0.95rem !important; }
.footer-tip {
  text-align: center; font-size: 0.75rem; color: #94a3b8;
  margin-top: 0.5rem; padding: 0.25rem;
}
"""


def build_ui() -> gr.Blocks:
    with gr.Blocks(title=f"{COMPANY_NAME} Knowledge Assistant") as ui:
        gr.HTML(
            f"""
            <div class="hero">
              <h1>{COMPANY_NAME} Knowledge Assistant</h1>
              <p>Grounded answers from products, people, contracts &amp; company docs</p>
              <span class="hero-badge">RAG · Semantic search · Source citations</span>
            </div>
            """
        )

        status = gr.HTML(_status_html())

        with gr.Tab("💬 Chat"):
            with gr.Row(equal_height=False):
                # Left sidebar — hints & examples
                with gr.Column(scale=2, min_width=260):
                    gr.HTML(HINTS_HTML)
                    gr.HTML('<p class="examples-title">Try these questions</p>')
                    example_btns: list[tuple[gr.Button, str]] = []
                    for category, label, question in EXAMPLE_PROMPTS:
                        with gr.Row(elem_classes=["example-btn"]):
                            btn = gr.Button(
                                f"💡 {label}",
                                size="sm",
                                variant="secondary",
                            )
                            example_btns.append((btn, question))

                # Center — conversation
                with gr.Column(scale=4, elem_id="chat-panel"):
                    gr.Markdown('<p class="section-label">Conversation</p>')
                    chatbot = gr.Chatbot(
                        label="",
                        height=480,
                        show_label=False,
                        placeholder=CHAT_PLACEHOLDER,
                        layout="bubble",
                        buttons=["copy"],
                    )
                    with gr.Row():
                        message = gr.Textbox(
                            label="",
                            placeholder="Ask about products, employees, contracts, or company info…",
                            show_label=False,
                            scale=5,
                            lines=1,
                            max_lines=3,
                            elem_id="chat-input",
                        )
                        send = gr.Button(
                            "Send →",
                            variant="primary",
                            scale=1,
                            min_width=100,
                        )
                    gr.Markdown(
                        '<p class="footer-tip">Press Enter to send · First reply may take 20–40s while sources are retrieved</p>'
                    )

                # Right — sources
                with gr.Column(scale=3, min_width=280):
                    gr.Markdown('<p class="section-label">Evidence & sources</p>')
                    context_panel = gr.HTML(value=empty_sources_html())

            ui.load(lambda: _status_html(), outputs=status)

            _wire_submit(message.submit, message, chatbot, context_panel)
            _wire_submit(send.click, message, chatbot, context_panel)

            for btn, question in example_btns:
                btn.click(
                    lambda h, q=question: use_example(q, h),
                    inputs=chatbot,
                    outputs=[message, chatbot],
                ).then(
                    chat,
                    inputs=chatbot,
                    outputs=[chatbot, context_panel],
                    show_progress="full",
                )

        with gr.Tab("ℹ️ About"):
            gr.Markdown(ABOUT_MD)
            gr.Markdown(
                f"""
**Local data:** `{DB_PATH}` (created by ingest, not committed to git)

**Setup**
1. `pip install -r requirements.txt`
2. Copy `.env.example` → `.env` and add your API key
3. `python scripts/ingest.py`
4. `python app.py`
                """
            )

    return ui


def main() -> None:
    ui = build_ui()
    ui.queue(default_concurrency_limit=1)
    ui.launch(
        server_name="127.0.0.1",
        server_port=7860,
        inbrowser=True,
        show_error=True,
        theme=_theme(),
        css=APP_CSS,
    )


if __name__ == "__main__":
    main()
