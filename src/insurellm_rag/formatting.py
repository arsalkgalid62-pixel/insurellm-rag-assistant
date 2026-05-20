"""Format retrieval results for the Gradio UI."""

from __future__ import annotations

import html
from pathlib import Path

from insurellm_rag.models import Result

_TYPE_COLORS = {
    "company": "#0d9488",
    "products": "#2563eb",
    "employees": "#7c3aed",
    "contracts": "#d97706",
}


def _short_source(path: str) -> str:
    p = Path(path)
    parts = p.parts
    if "knowledge-base" in parts:
        idx = parts.index("knowledge-base")
        return "/".join(parts[idx + 1 :])
    return p.name


def empty_sources_html() -> str:
    return """
    <div class="sources-panel sources-empty">
      <div class="sources-empty-icon">📄</div>
      <p class="sources-empty-title">Sources will appear here</p>
      <p class="sources-empty-hint">After each answer, you'll see the exact documents
      retrieved from the knowledge base — products, employees, contracts, and more.</p>
    </div>
    """


def format_context_html(chunks: list[Result]) -> str:
    if not chunks:
        return empty_sources_html()

    html_parts = [
        '<div class="sources-panel">',
        f'<p class="sources-count">{len(chunks)} source{"s" if len(chunks) != 1 else ""} cited</p>',
    ]
    for i, chunk in enumerate(chunks, 1):
        doc_type = chunk.metadata.get("type", "document")
        source = html.escape(_short_source(chunk.metadata.get("source", "unknown")))
        badge_color = _TYPE_COLORS.get(doc_type, "#64748b")
        preview = html.escape(chunk.page_content[:500])
        if len(chunk.page_content) > 500:
            preview += "…"

        html_parts.append(
            f"""
        <details class="source-card" open>
          <summary class="source-summary">
            <span class="source-num">{i}</span>
            <span class="source-badge" style="background:{badge_color}">{html.escape(doc_type)}</span>
            <span class="source-path">{source}</span>
          </summary>
          <pre class="source-excerpt">{preview}</pre>
        </details>
        """
        )
    html_parts.append("</div>")
    return "".join(html_parts)
