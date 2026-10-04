# NOTES — newest entry first

## 2026-10-04 04:12 — loop iteration: live mode verified; corrections (Claude)
- Correction: final outcome counts are revision_required 18, misreading 11, known_answer 1 (30 trials).
  The "20 / 9" in the 03:36 entry was from target 1's first attempt, before the final cached re-run.
  The README limits now compute this distribution from the runs and say no trial ended rebutted/standing.
- Live mode tested end to end (`make live-test`): Playwright starts the FastAPI server and a build with
  VITE_API_URL; /lab streams a cached run over SSE, /atlas searches via /api/prior-art. No model calls.
- P1.2 revisited: philarchive.org/oai.pl still answers our client with 403 → stays [!].

## 2026-10-04 04:05 — ⚠️ Codex hit the ChatGPT workspace spend cap; Codex disabled (Claude)
- At ~03:58, while adding full trials to E3 (share_surviving), every `codex exec` call started failing:
  "You hit your spend cap set by the owner of your workspace." **Human: check the ChatGPT workspace
  billing/spend cap** — usage past the plan allowance may have drawn on paid credits up to the cap.
  Ledger (cache/spend.jsonl): 1,171 successful Codex calls + 240 Claude calls tonight (notional API-price
  estimate ≈ $12 Codex, ≈ $4 Claude; each Codex call also carries ~14k tokens of CLI overhead not in that estimate).
- I set `DISABLE_PROVIDERS=codex_cli` in `.env` (new switch; documented in .env.example). Cached calls still
  replay, so every run, brief, export and eval regenerates without calling Codex. Any *new* LLM work would
  need `make providers` (Claude only) or the cap raised. Remove the line from .env to re-enable Codex.
- E3: all earlier metrics unchanged; share_surviving reported n/a because only 3–4/20 trials per condition
  completed; the limits text says exactly that. No other results were affected (runs, E1, E2 finished
  before the cap).
- Polish since 03:47: axe accessibility pass clean on 8 pages, grounding audit 0 problems (docs/AUDIT.md),
  45 tests, docs/SUBMISSION.md draft, lab screenshot at viewport size; `make docs` regenerates all docs.

## 2026-10-04 03:47 — GATES B and C met; everything in PROGRESS ticked except P1.2 (Claude)
- Website built by a subagent against `web/src/types.ts`, verified on the real export: typecheck +
  build pass, 10/10 Playwright smoke tests, screenshots in docs/screens/, 53 s walkthrough in
  docs/demo.webm. Run tests with `make smoke` (needs a Chromium matching Playwright; set
  `PW_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`
  to reuse the one on this Mac).
- Turn events now carry trial_id (cached re-run; outcomes identical).
- README results/limits and docs/DEMO.md are generated from the export (`make docs`). The site and
  README rank research directions round-robin across targets (best per paper first).
- Human, morning checklist: (1) `make demo` and click /, a brief, /lab, a trial, /results;
  (2) read one brief + its trial (`/brief/brief-W7212186029.arg1.o10f4f4` is top); the one
  known_answer is in run-oa-W2072673546 (cites W7168366306.a3 — I checked the quote);
  (3) deploy `web/dist` (static; SPA fallback needed for deep links); (4) optional: Databricks
  token + warehouse → `make providers && make databricks`, which would raise family diversity.

## 2026-10-04 03:36 — all targets run; E1 done; E2 rebuilt (Claude)
- 5 runs / 55 objections / 30 trials / 14 briefs. Outcomes: revision_required 20, misreading 9,
  known_answer 1, rebutted 0, standing 0. I read the revision_required labels: they are genuine
  premise changes (narrowing/strengthening), not mere clarifications, so the Referee prompt stays.
  The one known_answer (W2072673546) cites W7168366306.a3, whose verbatim quote does say what the
  trial claims. Limits mention that this gauntlet produced no rebutted/standing outcomes.
- E1 (n=50) recall@5: BM25 abstracts 12%, embeddings abstracts 18%, embeddings claims 54%,
  claims + 3-way restatement + rerank 86%.
- **E2 v1 discarded (construction bug, kept as results/e2_v1_discarded.json):** the item builder
  restated each theist paper's own response as the objection and then counted that same paper as
  the "published reply", so known_answer-with-correct-citation was 0/10 by construction.
  Misreadings were 10/10. v2 pairs an objection from paper A with replies from other papers B,
  found by retrieval and confirmed by an LLM judge; re-running now (misreading half is cached).
- Product: briefs ranked by survival × novelty lead the site ("Research directions").

## 2026-10-04 03:21 — P2 done, lab running on all targets (Claude)
- Map: 5/5 targets → 1 argument each (3–6 premises), all invalid as stated, each with a truth-table-
  checked missing premise; claims: 303 full-text (drop 5%) + 2615 abstract (drop 1%). Index:
  2918 claims + 1212 abstracts, bge-small-en-v1.5 local + BM25 (RRF). Retrieval check passes 5/5.
- First trials on target 1 (randomness vs divine control): both → revision_required (defenders
  conceded the hidden "explanatory parity ⇒ evidential parity" premise and narrowed it). Philosophy
  quality looks right: likelihood-ratio/predictive-asymmetry cases, Molinist + Reformed lenses.
- Fixes found while watching: (1) blind generators converged on the same hidden premise → each
  blind generator now gets a different stated premise (coverage; Director still ranks); (2) live
  OpenAlex 400s (commas broke filter syntax) → keyword `search=` param; daily cap 45 live searches;
  (3) defenders citing the argument's own claim ids got struck → own-paper ids verify but never
  count toward known_answer. Runs restarted (LLM cache makes restarts cheap).
- Databricks: `crux_lab/databricks_sync.py` (claims Delta table via SQL warehouse + AI Search
  Delta Sync index with managed gte-large embeddings) and `app.yaml` are wired; they print
  "not configured" and skip without DATABRICKS_HOST/TOKEN/WAREHOUSE_ID. MLflow traces locally.
- Frontend is being built by a subagent against `web/src/types.ts` (the export contract).

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
