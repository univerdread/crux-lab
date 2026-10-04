"""Same-work detection. OpenAlex often lists one paper several times (Zenodo/figshare versions,
preprint + article). A work key is the normalised title + the first author's surname; different
papers that merely share a title (e.g. several titled "Divine Hiddenness") stay distinct."""
from __future__ import annotations

import re


def _norm(t: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (t or "").lower()).strip()


def work_key(paper: dict) -> str:
    first = _norm((paper.get("authors") or [""])[0]).split()
    return f"{_norm(paper.get('title'))}|{first[-1] if first else ''}"


def work_ids(corpus: list[dict]) -> dict[str, str]:
    """paper id -> canonical id of its work (the first record seen with that work key)."""
    canon: dict[str, str] = {}
    out: dict[str, str] = {}
    for p in corpus:
        out[p["id"]] = canon.setdefault(work_key(p), p["id"])
    return out
