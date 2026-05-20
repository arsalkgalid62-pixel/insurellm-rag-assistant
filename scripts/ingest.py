#!/usr/bin/env python3
"""Build or rebuild the vector index from knowledge-base/."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from insurellm_rag.ssl_fix import apply_ssl_fix  # noqa: E402

apply_ssl_fix()

from insurellm_rag.ingest import run_ingestion  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest Insurellm knowledge base into Chroma vector store.",
    )
    parser.add_argument(
        "--smart",
        action="store_true",
        help="Use LLM-guided chunking (higher quality, uses more API credits).",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    mode = "smart (LLM chunking)" if args.smart else "fast (text splitter)"
    print(f"Starting ingestion — mode: {mode}")
    count = run_ingestion(smart=args.smart)
    print(f"Done. Indexed {count:,} chunks.")


if __name__ == "__main__":
    main()
