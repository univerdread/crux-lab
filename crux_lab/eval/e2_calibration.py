"""E2 gauntlet calibration on the canonical hiddenness argument (fixture).

(a) 10 published objections whose published replies are in the corpus: correct = labelled
    known_answer AND a claim from the replying paper is cited and verified.
(b) 10 deliberate misreadings (a premise distorted on purpose): correct = labelled misreading."""
from __future__ import annotations

import asyncio
import random

from pydantic import BaseModel

from crux_lab.agents.roles import render
from crux_lab.corpus.build import load_corpus
from crux_lab.eval.common import canonical_argument, canonical_text, model_ids, stamp, write
from crux_lab.graph.index import INDEX_DIR, HybridIndex
from crux_lab.graph.schema import Claim, Objection
from crux_lab.graph.store import Store
from crux_lab.lab.gauntlet import run_trial
from crux_lab.llm.client import LLMClient

N_KNOWN = 10
N_MISREAD = 10


class Pair(BaseModel):
    usable: bool
    objection: str = ""
    target_premise_id: str = ""


class Misread(BaseModel):
    objection: str
    distorted_claim: str


async def build_known(client: LLMClient, store: Store, fx: dict, n: int) -> list[dict]:
    corpus = {p["id"]: p for p in load_corpus() if not p.get("fresh")}
    replies = [c for c in store.all(Claim) if c.kind == "reply" and c.paper_id in corpus and c.level == "abstract"]
    random.Random(11).shuffle(replies)
    text = canonical_text(fx)
    out: list[dict] = []
    for i in range(0, len(replies), 12):
        batch = replies[i:i + 12]

        async def one(c: Claim):
            p = corpus[c.paper_id]
            system, user = render("eval_pair", argument=text, title=p["title"], abstract=p["abstract"][:1800], reply=c.text)
            r, _ = await client.json("reranker", user, Pair, system,
                                     validate=lambda o: None if (not o.usable or o.target_premise_id in fx["premises"])
                                     else f"target_premise_id must be one of {list(fx['premises'])}")
            return c, r
        for c, r in await asyncio.gather(*[one(c) for c in batch]):
            if r and r.usable and r.objection and c.paper_id not in {x["reply_paper"] for x in out}:
                out.append({"objection": r.objection, "target": r.target_premise_id, "reply_paper": c.paper_id,
                            "reply_claim": c.id})
        if len(out) >= n:
            break
    return out[:n]


async def build_misreadings(client: LLMClient, fx: dict, n: int) -> list[dict]:
    text = canonical_text(fx)
    pids = list(fx["premises"])
    variants = ["attack a much stronger claim than the premise states",
                "attack a different notion (e.g. a different kind of belief, love or relationship) than the premise uses"]
    jobs = [(pids[i % len(pids)], variants[(i // len(pids)) % 2]) for i in range(n)]

    async def one(pid, variant):
        system, user = render("eval_misread", argument=text, premise_id=pid, variant=variant)
        r, _ = await client.json("generator", user, Misread, system, spec=client.generator_specs()[0])
        return {"objection": r.objection, "target": pid, "distorted_claim": r.distorted_claim, "variant": variant} if r else None
    res = await asyncio.gather(*[one(p, v) for p, v in jobs])
    return [r for r in res if r]


async def run(client: LLMClient | None = None) -> dict:
    client = client or LLMClient()
    store = Store()
    fx = canonical_argument()
    text = canonical_text(fx)
    ix = HybridIndex.load(INDEX_DIR / "claims")
    known = await build_known(client, store, fx, N_KNOWN)
    mis = await build_misreadings(client, fx, N_MISREAD)
    gen = client.generator_specs()[0]

    async def trial(i: int, item: dict, kind: str):
        o = Objection(id=f"E2.{kind}.{i}", argument_id=fx["id"], target_premise_id=item["target"], kind=kind,
                      text=item["objection"], agent="eval", model=gen.model, family=gen.family)
        return item, await run_trial(client, store, o, text, ix, None, f"trial-E2.{kind}.{i}", gen)

    sem = asyncio.Semaphore(4)

    async def guarded(*a):
        async with sem:
            return await trial(*a)
    res_k = await asyncio.gather(*[guarded(i, it, "known") for i, it in enumerate(known)])
    res_m = await asyncio.gather(*[guarded(i, it, "misread") for i, it in enumerate(mis)])
    items = []
    k_label = k_correct = 0
    for it, t in res_k:
        short = it["reply_paper"].split(":", 1)[-1]
        cited_right = any(c.startswith(short + ".") for c in t.cited_claim_ids)
        k_label += t.outcome == "known_answer"
        k_correct += t.outcome == "known_answer" and cited_right
        items.append({"kind": "known_answer", "source_paper": it["reply_paper"], "objection": it["objection"],
                      "target": it["target"], "outcome": t.outcome, "cited": t.cited_claim_ids,
                      "correct": t.outcome == "known_answer" and cited_right, "status": t.status})
    caught = 0
    for it, t in res_m:
        caught += t.outcome == "misreading"
        items.append({"kind": "misreading", "source_paper": "", "objection": it["objection"], "target": it["target"],
                      "distorted_claim": it["distorted_claim"], "outcome": t.outcome,
                      "correct": t.outcome == "misreading", "status": t.status})
    data = {
        "experiment": "E2 gauntlet calibration", "n": len(items),
        "known_answer": {"n": len(res_k), "labelled_known_answer": k_label, "correct_reply_cited": k_correct},
        "misreading": {"n": len(res_m), "caught": caught},
        "items": items,
        "settings": {"argument": fx["title"], "fixture_note": fx["note"],
                     "known_items": "objections reconstructed by an LLM from corpus claims of kind 'reply' (the replying paper is in the corpus)",
                     "misreading_items": "LLM-written objections that attack a distorted premise (2 variants x 4 premises, round robin)",
                     "gauntlet": "full: pre-screen, two defenders with retrieved literature, referee labels"},
        "models": model_ids(client, ["defender_a", "defender_b", "referee", "reranker"]) | {"misreading_writer": gen.label},
        "timestamp": stamp(),
        "limits": ("Small n (10 + 10). The 'published objections' are reconstructed by an LLM from the replying paper's own "
                   "abstract, so the reply is guaranteed relevant but the objection wording is not the original author's. "
                   "Misreadings are written by a model from the same pool as the defenders. The argument is a paraphrased "
                   "fixture, not a corpus record. No human labels."),
    }
    write("e2", data)
    return data
