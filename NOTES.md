# NOTES — newest entry first

## 2026-10-04 02:47 — P0.1–P0.4 scaffold + LLM layer (Claude)
- Setup done by Claude at the human's request (START-HERE steps): repo at `~/crux-lab`, private
  GitHub repo `univerdread/crux-lab` created and pushed; Crux copied to `reference/crux/` (gitignored,
  rsync with the START-HERE excludes; Crux had no `.env`).
- **Providers — human action wanted:** no API keys exist on this machine (`.env` copied from the
  example, all keys blank). Decision: added two subscription-CLI providers after the API chain:
  `codex_cli` (Codex CLI bundled in ChatGPT.app, ChatGPT plan, OpenAI family) and `claude_cli`
  (`claude -p`, Claude plan, Anthropic family). Both run as isolated completions (no tools, no
  shell, no web, no user config). **`claude -p` fails: "OAuth session expired"** → run `claude`
  in a terminal and `/login` to add the Anthropic family; then `make providers`. Adding
  `DATABRICKS_HOST/TOKEN` to `.env` (sponsor, free edition) would add llama/qwen/gpt-oss/gemma.
- Current: **diversity degraded: 1 family** (openai: gpt-5.6-terra, -sol, -luna). Defender A =
  terra, Defender B = sol, Referee = sol. Shown on /about.
- Budget decision: API providers count estimated USD against `LLM_BUDGET_USD` ($20). CLI providers
  spend no money, so they count calls against `CLI_CALL_BUDGET` (default 4000); notional USD still
  logged in `cache/spend.jsonl`. CLI providers ignore temperature (recorded in cache key anyway).
- `CONTACT_EMAIL` left blank on purpose (not sending the human's address anywhere unasked):
  User-Agent says `mailto:unset`. Human: fill it in `.env` for OpenAlex's polite pool.
- Verified: `make check` 8 passed; MLflow trace recorded locally (sqlite in `mlruns/`); repeat call
  is a cache hit costing $0.

## 2026-10-04 02:30 — kickoff (human)
- Starter kit committed: CLAUDE.md (rules + spec), PROGRESS.md (tasks), .claude/loop.md (loop prompt).
- Human is asleep until ~09:00. Gates: A 05:30, B 06:30, C 08:30. Submission 15:00 Stockholm.
