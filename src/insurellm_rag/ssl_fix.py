"""Use Windows/macOS system trust store when certifi cannot verify HTTPS (common on corporate networks)."""

from __future__ import annotations


def apply_ssl_fix() -> None:
    try:
        import truststore

        truststore.inject_into_ssl()
    except ImportError:
        pass
