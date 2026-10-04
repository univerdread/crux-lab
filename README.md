# Crux Lab

**An autonomous AI research lab for philosophy.** Crux Lab reads new papers, reconstructs their
arguments, has AI agents attack single premises, makes other agents defend the argument against
each attack, checks whether the objection has been made before, and hands a human philosopher a
research brief: *here is an open question, here is how far it got, here is what a paper on it
would have to show.*

Built for Hack-Nation's 7th Global AI Hackathon, Challenge 3 "Agentic Scientific Discovery"
(sponsor: Databricks). Subfield: **divine hiddenness** and nearby philosophy of religion.

> In philosophy, the debate is the experiment.

**Who it is for:** philosophers and philosophy students looking for what to research and write
next. The site leads with *research directions*: objections that survived two defenders, ranked by
survival × novelty, each traceable to verbatim quotes and corpus records.

<!-- RESULTS -->

## The discovery loop

```
corpus ─▶ argument graph ─▶ objection generation ─▶ gauntlet ─▶ prior-art check ─▶ Director ─▶ research brief
  ▲                                                                                   │
  └──────────────── revised premise becomes a new node and is attacked (depth ≤ 2) ◀──┘
```

1. **Corpus.** OpenAlex: 6 hiddenness queries (phrase matched) plus fresh philosophy-of-religion
   papers published since 2026-08-01 (models cannot recall replies to them). Open-access PDFs are
   downloaded politely (≤ 1 request/second per host) and parsed with PyMuPDF.
2. **Argument graph.** The **Extractor** pulls claims from each target paper chunk by chunk; every
   claim stores a verbatim quote (≤ 2 sentences) that must be found in the source text
   (rapidfuzz `partial_ratio ≥ 90`) or the claim is dropped. It then rebuilds the paper's main
   argument from claim ids. The **Formalizer** writes a propositional skeleton (atoms A–H,
   `~ & | -> <->`); a truth table in `graph/logic.py` decides validity, and a proposed *missing
   premise* is accepted only if the re-check makes the argument valid without making the premises
   inconsistent.
3. **Objections.** Generators never see literature (enforced by construction and tested):
   Blind Thought-Experimenters (one per model), a Hidden-Premise Attacker (must target the
   Formalizer's missing premise), Tradition Lenses (skeptical theism, Molinism, open theism,
   Reformed epistemology, naturalism) and a Naive Questioner whose question only counts once
   another agent sharpens it. Every objection must name a real premise id, give a concrete case,
   stay under 180 words, and cite nothing.
4. **Prior-art check.** Each objection is restated three ways (paper vocabulary, plain English,
   a neighbouring tradition), searched with BM25 + embeddings over claims and abstracts plus a live
   OpenAlex query, and reranked with one question: *does this passage make the same move against
   the same premise?* → `same_move | related | different`, with the passage quoted.
   `novelty = 1 − max similarity among same_move/related matches`. The lab never claims novelty:
   it reports the score, the records searched, the three nearest matches and
   "Further human review required."
5. **Gauntlet.** Referee pre-screen for misreading → retrieved literature for the defenders →
   Defender A replies, the objector rejoins (still without literature), Defender A closes;
   Defender B (more concessive, another model family) repeats independently → the Referee labels
   each defense. The objection keeps the outcome most favourable to the original argument.

   | Outcome | Meaning | Survival S |
   | --- | --- | --- |
   | misreading | Attacks something the argument does not claim | 0.0 |
   | known_answer | A reply in the corpus resolves it, cited by id and verified | 0.1 |
   | rebutted | A defender gave an adequate new reply not found in the corpus | 0.3 |
   | revision_required | The argument survives only by changing or adding a premise | 0.8 |
   | standing | Every defense failed, or a defender conceded | 1.0 |

   Citations are corpus claim ids only; the code verifies each one (it exists and was in the
   literature the defender was shown) and strikes the rest. `known_answer` is impossible without
   a verified citation.
6. **Director** (plain code, no LLM): `priority = S · N · (0.5 + 0.5·C) + 0.1·E`
   (S survival, 0.5 before a trial; N novelty; C share of graph arguments depending on the premise;
   E exploration bonus for an agent/family not yet tried on this argument). Budget per target:
   12 objections, 6 full trials. Queue snapshots are saved for the replay.
7. **Brief.** Research question, the argument, the challenged premise, the objection, the strongest
   responses and why they failed, the closest literature (rendered from corpus records, never from
   model text), novelty, records searched, open questions, and "A paper here would argue…".

## Quickstart

```bash
make setup          # .venv (Python 3.11) + requirements + web deps; copies .env.example → .env
make providers      # probes every candidate model, writes config/resolved_models.json
make corpus         # OpenAlex harvest + open-access full texts → data/corpus.jsonl
make map            # claims, arguments, skeletons, abstract claims, BM25 + embedding indexes
make run TARGET=oa-W2072673546   # one full lab run → data/runs/, data/briefs/
make runs           # all targets in parallel
make eval           # E1–E3 → results/
make export         # → web/public/data/
make demo           # build + preview the site (http://localhost:4680)
make check          # pytest (no network) + web typecheck
```

Without `make`: `python -m crux_lab.cli <cmd>`.

### Model providers

Provider chain, using whatever exists: **Databricks** Model Serving (`DATABRICKS_HOST`,
`DATABRICKS_TOKEN`) → **OpenRouter** → **Anthropic API** → subscription CLIs (`codex` from the
ChatGPT app, `claude -p`). The CLI providers run as isolated completions: no tools, no shell, no
web, no user config. Every call goes through one client with a disk cache keyed on
`sha256(provider, model, messages, params)`, a spend guard, Pydantic-validated JSON with two
retries carrying the validation error, and an MLflow trace (Databricks experiment when credentials
exist, otherwise local `mlruns/`).

## Layout

```
crux_lab/
  config.py  cli.py  export.py
  llm/       client, providers, cache, budget, tracing, resolve
  corpus/    openalex, philarchive_oai, pdf, targets, build
  graph/     schema, store (SQLite), extract, logic, formalize, index, build
  agents/    roles.py, prompts/*.md
  lab/       debate (exchange engine), generators, novelty, gauntlet, director, brief, run
  eval/      e1_prior_art, e2_calibration, e3_diversity
  api/       server.py (FastAPI + SSE live mode)
web/         Vite + React + TypeScript + Tailwind site (replay by default; VITE_API_URL = live)
```

## Prior work

Crux Lab reuses only the debate loop of **Crux**, Univer's earlier project (agents debate a
contested question and a cartographer maps the cruxes, without a verdict). A read-only copy was
inventoried file by file in [`docs/CRUX_INVENTORY.md`](docs/CRUX_INVENTORY.md). Adapted files:

| Crux Lab file | Origin in Crux | What changed |
| --- | --- | --- |
| `crux_lab/lab/debate.py` | `backend/debate.py` | Asymmetric defender/attacker exchange (reply → rejoinder → close) instead of symmetric sides; a structured concession field replaces the convergence judge; turn events kept for replay/SSE. |
| `crux_lab/agents/prompts/defender.md` | `backend/prompts.py` (`steelman_system`) | Steelman wording rewritten for an asymmetric defender: misreading check first, claim-id citations, explicit concession with a stated premise. |

Everything else was written for Crux Lab.

<!-- LIMITS -->
