"""Shared eval helpers: results files always carry n, settings, model ids, timestamp and limits."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from crux_lab.config import RESULTS
from crux_lab.llm.client import LLMClient

FIXTURES = Path(__file__).parent / "fixtures"


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def model_ids(client: LLMClient, roles: list[str]) -> dict[str, str]:
    return {r: client.spec_for(r).label for r in roles}


def write(name: str, data: dict) -> Path:
    RESULTS.mkdir(parents=True, exist_ok=True)
    p = RESULTS / f"{name}.json"
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return p


def canonical_argument() -> dict:
    return json.loads((FIXTURES / "schellenberg.json").read_text())


def canonical_text(fx: dict) -> str:
    lines = [f"{k}: {v}" for k, v in fx["premises"].items()]
    (cid, ctext), = fx["conclusion"].items()
    return "\n".join(lines + [f"Therefore {cid}: {ctext}"])
