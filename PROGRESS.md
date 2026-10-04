# PROGRESS — Crux Lab overnight build

Work top to bottom. Tick `[x]` and add the evidence after the task (e.g. `→ 412 records`).
Blocked: mark `[!]` with a one-line reason and continue; revisit `[!]` tasks about once an hour.
Times are Europe/Stockholm targets. Gates are hard: if one is missed, cut scope until it is met.

## P0 Scaffold — target 03:00

- [x] P0.1 Python package skeleton, `requirements.txt`, `Makefile` + `crux_lab/cli.py` with all
  targets from CLAUDE.md (stubs allowed), `.gitignore` verified (.env, .venv, cache/, data/raw/,
  data/*.sqlite, logs/, mlruns/, node_modules/, web/dist/).
  **Check:** `make setup && make check` passes.
  → done: 8 tests pass; venv py3.11 via uv.
- [x] P0.2 LLM client: provider chain, disk cache, budget guard, JSON-mode helper with Pydantic
  validation and 2 retries, fake provider for tests.
  **Check:** unit tests pass; cache hit on a repeated call costs $0.
  → test_cache_hit_costs_zero + live codex repeat call cached=True cost 0.0.
- [x] P0.3 `make providers`: probe candidates from `config/models.yaml`, write
  `config/resolved_models.json`, assign roles with family diversity.
  **Check:** at least 1 working model resolved, or NOTES.md says clearly that no provider works
  (then continue with every non-LLM task).
  → 3 working (codex_cli gpt-5.6-terra/sol/luna, OpenAI family); claude_cli OAuth expired; no API keys → diversity degraded: 1 family.
- [x] P0.4 MLflow tracing wrapper (Databricks experiment if creds, else local `mlruns/`).
  **Check:** one traced call recorded.
  → local sqlite in mlruns/, search_traces found 1.
- [x] P0.5 Crux inventory (15 min max): if `reference/crux/` exists, write
  `docs/CRUX_INVENTORY.md` classifying every file as ADAPT / REFERENCE / IGNORE per
  "Reusing Crux" in CLAUDE.md. Copy nothing yet.
  **Check:** the file exists, or NOTES.md says no Crux reference was provided.
  → docs/CRUX_INVENTORY.md: 227 files, ADAPT 2 (backend/debate.py, backend/prompts.py steelman wording), REFERENCE 10, IGNORE 215.

## P1 Corpus — target 03:45

- [x] P1.1 OpenAlex harvester (queries: divine hiddenness; nonresistant nonbelief; divine silence;
  hiddenness of God; skeptical theism hiddenness; Schellenberg hiddenness argument), abstracts
  rebuilt from the inverted index → `data/corpus.jsonl`.
  **Check:** ≥ 300 records with abstracts, or the true count noted.
  → 577 classic hiddenness records with abstracts + 635 fresh (1212 total, all with abstracts).
- [!] P1.2 PhilArchive OAI-PMH client: Identify, ListRecords (`oai_dc`, `from`/`until`,
  resumptionToken), GetRecord; 1 req/s; raw XML to `data/raw/oai/`.
  **Check:** records from 2026-08-01 onward fetched and parsed.
  → BLOCKED: api.philpapers.org needs an API key; philarchive.org/oai.pl is behind Cloudflare bot checks for our client (403); not circumvented. Client + parser built; the one page fetched while testing (999 records since 2026-08-01) parsed fine but was all deletion stubs. Fresh targets come from OpenAlex (from_publication_date ≥ 2026-08-01) instead.
- [x] P1.3 Full texts: up to 50 open-access PDFs relevant to hiddenness / philosophy of religion,
  text via PyMuPDF.
  **Check:** ≥ 20 full texts extracted, or the true count noted.
  → 75 (50 fresh + 25 classic hiddenness), 67 in English.
- [x] P1.4 Target selection → `data/targets.json`: 3 fresh targets (deposited ≥ 2026-08-01;
  prefer hiddenness, then philosophy of religion, then any paper whose abstract says it argues
  for a thesis; full text required) + 2 classic fallback targets from the corpus, each with a
  reason. Include `data/manual_targets/*.md` if present.
  **Check:** 3–5 targets with reasons.
  → 5 targets (3 fresh, 2 classic hiddenness), LLM screen of 75 full-text papers + code checks; no fresh paper on hiddenness itself.

## P2 Mapping — target 04:30

- [ ] P2.1 SQLite store + Pydantic schemas for every object in CLAUDE.md.
  **Check:** round-trip tests pass.
- [ ] P2.2 Cartographer: chunked claim + argument extraction; quote verification drops
  ungrounded claims. Map all targets, plus abstracts-level claims for the whole corpus.
  **Check:** each target has ≥ 1 argument with ≥ 2 premises; drop rate logged.
- [ ] P2.3 `graph/logic.py` + Formalizer: parser, truth-table validity, missing-premise proposal
  re-checked.
  **Check:** tests (modus ponens valid; affirming the consequent invalid; added premise fixes
  an invalid form); every target argument has a skeleton and validity flag.
- [ ] P2.4 Index: embeddings (provider or local fallback) + BM25, over claims and over abstracts
  (both needed for E1).
  **Check:** query "God would ensure everyone capable of relationship believes" returns
  hiddenness claims in the top 5.

## P3 Thin slice — target 05:30 · GATE A

- [ ] P3.1 Generators: blind thought-experimenter, hidden-premise attacker, tradition lens, with
  code-enforced constraints.
  **Check:** 6 objections stored for target 1, each naming a real premise id.
- [ ] P3.2 Novelty check: 3 restatements, hybrid search, live OpenAlex query, rerank verdicts,
  novelty score, records_searched.
  **Check:** runs on all 6 objections.
- [ ] P3.3 Gauntlet: `lab/debate.py` exchange engine (adapt the ADAPT items from the Crux
  inventory, with origin headers; 30-minute timebox, else write fresh), then pre-screen, two
  defenders, rejoinders, Referee labels, citation verification.
  **Check:** ≥ 2 trials end in valid outcomes with only verified citations.
- [ ] P3.4 Brief generator (JSON + Markdown).
  **Check:** `make run TARGET=<first target>` ends with `data/briefs/<id>.md` and
  `data/runs/<run_id>.json`. **GATE A.**

## P4 Website v1 — target 06:30 · GATE B

- [ ] P4.1 `make export`: runs index, run details, trials, briefs, cited corpus records →
  `web/public/data/`.
  **Check:** schema test on exported JSON.
- [ ] P4.2 Vite + React + TS + Tailwind scaffold, routing, design tokens from CLAUDE.md.
  **Check:** `npm run build` passes.
- [ ] P4.3 `/lab/:run` replay: argument map (React Flow), trial feed with autoplay/step,
  Director queue, outcome chips, family badges.
  **Check:** renders real run data; Playwright smoke screenshot in `docs/screens/`.
- [ ] P4.4 `/trial/:id`, `/briefs`, `/brief/:id`; citations open a corpus-record drawer.
  **Check:** smoke test passes. **GATE B.**

## P5 Full lab — target 07:30

- [ ] P5.1 Director: priority formula, queue, recursion on revision_required (max depth 2),
  per-target budget; queue snapshots saved per step for the replay.
  **Check:** unit test of ordering; a run log shows the queue reordering.
- [ ] P5.2 Mixed families across all roles; Naive Questioner if ≥ 2 families (else skip, note).
  **Check:** run JSON shows the families used.
- [ ] P5.3 Run all targets in the background, then export.
  **Check:** ≥ 3 runs and ≥ 3 briefs exported.
- [ ] P5.4 Live mode: FastAPI `/api/run` (SSE) + `/api/prior-art`; frontend switches on
  `VITE_API_URL`.
  **Check:** SSE emits events for a cached run.

## P6 Evaluation — target 08:30 · GATE C (feature freeze)

- [ ] P6.1 E1 prior-art recall → `results/e1.json`.
- [ ] P6.2 E2 gauntlet calibration → `results/e2.json`.
- [ ] P6.3 E3 diversity ablation → `results/e3.json`. (First to cut if behind.)
- [ ] P6.4 `/results` page: E1 grouped bars, E2 and E3 compact tables, limits text, all read from
  `results/*.json` via export.
  **Check:** build + smoke screenshot. **GATE C — after this, no new features.**

## P7 Polish — from 08:30

- [ ] P7.1 Landing page: one-liner, loop ring, 3 headline numbers pulled from results.
- [ ] P7.2 `/atlas`: claim graph + "Has this move been made?" box (live API, else client-side
  BM25 over exported claims).
- [ ] P7.3 `/about`: how it works, stack, Databricks components, honest limits, diversity status.
- [ ] P7.4 README: what, why, quickstart, architecture, results with real numbers, limits,
  screenshots, and "Prior work" listing every file adapted from Crux.
- [ ] P7.5 `docs/DEMO.md`: the 2-minute script with real numbers filled in and the exact
  run/trial/brief ids to show, in order.
- [ ] P7.6 `make demo-video`: Playwright walkthrough of the DEMO.md path → `docs/demo.webm`.
- [ ] P7.7 Databricks wiring, only if creds exist: MLflow traces to a Databricks experiment;
  `claims` Delta table + AI Search Delta Sync index; `app.yaml` for Databricks Apps. Document
  in README. Never block on this.

## Polish forever (when everything above is ticked; never stop)

- Run the full pipeline from a clean clone of the repo; fix whatever breaks.
- Read every brief and trial: anything ungrounded gets fixed or removed.
- Mobile layout and accessibility pass (contrast, focus, alt text).
- Lazy-load large JSON; check bundle size.
- Tests for any untested module.
- Better README screenshots; tighten copy on every page.

## Scope cuts, in order, if behind a gate

1. E3 → 2. Atlas → 3. Naive Questioner → 4. Defender B (single defender, say so on /about)
→ 5. Targets 3 → 1 → 6. Full texts → abstracts only.
