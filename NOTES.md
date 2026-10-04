# NOTES — newest entry first

## 2026-10-04 03:06 — product direction from the human (awake at kickoff)
- "The tool is made for philosophers or philosophy students who want help with their research and
  to find some novelty in academia — finding what they should research and write about next."
- Usability consequences (apply to every page): lead with *research directions* (the brief's
  research question + "A paper here would argue…"), ranked by survival × novelty; plain-language
  summaries before agent transcripts; every claim traceable to a quote and a corpus record;
  printable / Markdown-exportable briefs; honest uncertainty ("Further human review required",
  records searched, nearest matches) so a student knows how far to trust a lead.

## 2026-10-04 03:04 — P1 corpus + targets (Claude)
- Human logged `claude -p` back in at ~02:58 → `make providers` now finds **2 families**
  (anthropic: sonnet/opus/haiku via claude_cli; openai: gpt-5.6-terra/sol/luna via codex_cli).
  Roles: Defender A = anthropic:sonnet, Defender B = openai:terra, Referee = openai:sol,
  generators = sonnet, opus, terra, sol; naive questioner = haiku. Still "diversity degraded:
  2 families" (no third family without Databricks/OpenRouter keys). Decision: bulk roles
  (extractor, reranker) run on Codex (`bulk_family: openai` in models.yaml) so the lab does not
  drain the Claude plan that also runs this build session.
- **PhilArchive OAI is blocked** (P1.2 [!]): api.philpapers.org requires an API key now;
  philarchive.org/oai.pl answers curl but returns a Cloudflare 403 page to our Python client.
  That is bot detection, so I did not work around it. Fresh targets come from OpenAlex with
  `from_publication_date ≥ 2026-08-01` (OpenAlex's `from_created_date` is premium-only).
- **OpenAlex without a key = ~$0.10/day ≈ 100 list requests.** Used ~25 so far. Don't waste them:
  `make corpus` re-harvests; the corpus is committed in `data/corpus.jsonl`.
- Corpus: 1212 records with abstracts (577 classic hiddenness, 635 fresh since 2026-08-01),
  75 OA full texts (50 fresh, 25 classic; many publisher PDFs 403 or OJS HTML viewers → skipped).
- Targets (data/targets.json): no fresh full-text paper on hiddenness itself exists in what we can
  reach, so fresh targets fall back to philosophy of religion: W7203761940 (randomness vs visible
  divine control, hiddenness-relevance 2/3), W7203485685 (de se knowledge and omniscience, Sophia),
  W7212186029 (divine simplicity as symmetric parthood, Religious Studies); classic fallbacks
  W2072673546 (critical reflections on the hiddenness argument), W2575351351 (hiddenness, greater
  goods, accommodation). A Russian full text slipped past the LLM screen → added a code check.

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
