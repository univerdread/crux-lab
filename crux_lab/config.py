"""Environment loading, paths and budget settings. The only module that reads `.env`."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env", override=False)

DATA = ROOT / "data"
RAW = DATA / "raw"
RUNS = DATA / "runs"
BRIEFS = DATA / "briefs"
CORPUS = DATA / "corpus.jsonl"
TARGETS = DATA / "targets.json"
DB_PATH = DATA / "crux.sqlite"
MANUAL_TARGETS = DATA / "manual_targets"
RESULTS = ROOT / "results"
CACHE = ROOT / "cache"
LLM_CACHE = CACHE / "llm"
LOGS = ROOT / "logs"
CONFIG = ROOT / "config"
MODELS_YAML = CONFIG / "models.yaml"
RESOLVED_MODELS = CONFIG / "resolved_models.json"
WEB_DATA = ROOT / "web" / "public" / "data"
PROMPTS = Path(__file__).resolve().parent / "agents" / "prompts"


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


@dataclass(frozen=True)
class Settings:
    databricks_host: str
    databricks_token: str
    openrouter_key: str
    anthropic_key: str
    budget_usd: float
    cli_call_budget: int
    contact_email: str
    codex_bin: str
    claude_bin: str
    enable_cli: bool

    @property
    def user_agent(self) -> str:
        mail = self.contact_email or "unset"
        return f"crux-lab-hackathon (mailto:{mail})"

    def has(self, provider: str) -> bool:
        return {
            "databricks": bool(self.databricks_host and self.databricks_token),
            "openrouter": bool(self.openrouter_key),
            "anthropic": bool(self.anthropic_key),
            "codex_cli": self.enable_cli,
            "claude_cli": self.enable_cli,
        }.get(provider, False)


def _codex_default() -> str:
    app = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"
    for d in os.environ.get("PATH", "").split(os.pathsep):
        if d and (Path(d) / "codex").exists():
            return str(Path(d) / "codex")
    return app if Path(app).exists() else "codex"


def load_settings() -> Settings:
    host = _env("DATABRICKS_HOST").rstrip("/")
    if host and not host.startswith("http"):
        host = "https://" + host
    return Settings(
        databricks_host=host,
        databricks_token=_env("DATABRICKS_TOKEN"),
        openrouter_key=_env("OPENROUTER_API_KEY"),
        anthropic_key=_env("ANTHROPIC_API_KEY"),
        budget_usd=float(_env("LLM_BUDGET_USD", "20") or 20),
        cli_call_budget=int(_env("CLI_CALL_BUDGET", "4000") or 4000),
        contact_email=_env("CONTACT_EMAIL"),
        codex_bin=_env("CODEX_BIN") or _codex_default(),
        claude_bin=_env("CLAUDE_BIN", "claude"),
        enable_cli=_env("ENABLE_CLI_PROVIDERS", "1") not in ("0", "false", "no"),
    )


settings = load_settings()

for _d in (DATA, RAW, RUNS, BRIEFS, RESULTS, LLM_CACHE, LOGS):
    _d.mkdir(parents=True, exist_ok=True)
