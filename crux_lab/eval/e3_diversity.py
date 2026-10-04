"""E3 diversity ablation: objections to the same 5 target arguments under three conditions:
plain prompt / one model; constrained roles / one model; constrained roles / mixed families.
Metrics: distinct premises targeted, mean pairwise embedding distance, share passing the
Referee's misreading pre-screen, share with novelty > 0.5. Full-trial survival is not run here
(cost), so share_surviving is null and the limits say so."""
from __future__ import annotations

import asyncio
import itertools

import numpy as np
from pydantic import BaseModel

from crux_lab.agents.roles import render
from crux_lab.eval.common import model_ids, stamp, write
from crux_lab.graph.index import INDEX_DIR, HybridIndex
from crux_lab.graph.schema import Argument, Claim, Objection
from crux_lab.graph.store import Store
from crux_lab.lab import generators, novelty
from crux_lab.lab.gauntlet import PrescreenOut
from crux_lab.lab.run import argument_text
from crux_lab.llm.client import LLMClient, ModelSpec

PER_ARG = 4


class Plain(BaseModel):
    target_premise_id: str
    objection: str


async def plain(client, arg, own, spec: ModelSpec) -> list[Objection]:
    allowed = set(arg.premise_ids) | ({arg.missing_premise_id} if arg.missing_premise_id else set())
    ctx = generators.argument_context(arg, own)

    async def one(k):
        system, user = render("eval_plain", argument=ctx, k=k + 1, n=PER_ARG)
        o, _ = await client.json("generator", user, Plain, system, spec=spec,
                                 validate=lambda o: None if o.target_premise_id in allowed else f"use one of {sorted(allowed)}")
        return Objection(id=f"E3.plain.{arg.id}.{k}", argument_id=arg.id, target_premise_id=o.target_premise_id,
                         kind="plain", text=o.objection, agent="plain", model=spec.model, family=spec.family) if o else None
    return [o for o in await asyncio.gather(*[one(k) for k in range(PER_ARG)]) if o]


async def constrained(client, arg, own, specs: list[ModelSpec]) -> list[Objection]:
    s = itertools.cycle(specs)
    first = await generators.blind(client, arg, own, next(s))
    tasks = [generators.blind(client, arg, own, next(s), taken=[first.target_premise_id] if first else [])]
    if arg.missing_premise_id:
        tasks.append(generators.hidden(client, arg, own, next(s)))
    else:
        tasks.append(generators.blind(client, arg, own, next(s), taken=["(any)"]))
    tasks.append(generators.tradition(client, arg, own, next(s), generators._schools_for(arg.id)[0]))
    rest = await asyncio.gather(*tasks, return_exceptions=True)
    return [o for o in [first, *rest] if isinstance(o, Objection)]


def pairwise_distance(vecs: np.ndarray) -> float:
    if len(vecs) < 2:
        return 0.0
    sims = [float(vecs[i] @ vecs[j]) for i in range(len(vecs)) for j in range(i + 1, len(vecs))]
    return 1 - float(np.mean(sims))


async def run(client: LLMClient | None = None) -> dict:
    client = client or LLMClient()
    store = Store()
    claims_ix = HybridIndex.load(INDEX_DIR / "claims")
    abstracts_ix = HybridIndex.load(INDEX_DIR / "abstracts", embedder=claims_ix.embedder)
    gens = client.generator_specs()
    one = next((g for g in gens if g.family == "openai"), gens[0])
    args = store.all(Argument)[:5]
    conds = {
        "plain prompt, one model": lambda a, own: plain(client, a, own, one),
        "constrained roles, one model": lambda a, own: constrained(client, a, own, [one]),
        "constrained roles, mixed families": lambda a, own: constrained(client, a, own, gens),
    }
    referee = client.spec_for("referee")
    out_rows = []
    per_obj = []
    for name, fn in conds.items():
        objs_by_arg = {}
        for a in args:
            own = {c.id: c for c in store.all(Claim, parent=a.paper_id)}
            objs_by_arg[a.id] = (await fn(a, own), own, a)
        distinct, dists, pass_pre, novel, n = [], [], 0, 0, 0
        for aid, (objs, own, a) in objs_by_arg.items():
            if not objs:
                continue
            distinct.append(len({o.target_premise_id for o in objs}))
            dists.append(pairwise_distance(claims_ix.embedder.encode([o.text for o in objs])))
            atext = argument_text(a, own, {})

            async def assess(o):
                system, user = render("referee_prescreen", argument=atext, objection=o.text,
                                      target_id=o.target_premise_id)
                pre, _ = await client.json("referee", user, PrescreenOut, system, spec=referee)
                nv = await novelty.check(client, o.id, o.text, atext, o.target_premise_id,
                                         own[o.target_premise_id].text if o.target_premise_id in own else "",
                                         claims_ix, abstracts_ix, use_live=False, exclude_paper=a.paper_id)
                return o, pre, nv
            for o, pre, nv in await asyncio.gather(*[assess(o) for o in objs]):
                n += 1
                ok_pre = bool(pre and not pre.misreading)
                pass_pre += ok_pre
                novel += nv.novelty > 0.5
                per_obj.append({"condition": name, "objection_id": o.id, "argument_id": aid, "target": o.target_premise_id,
                                "family": o.family, "model": o.model, "passes_prescreen": ok_pre,
                                "novelty": round(nv.novelty, 3), "text": o.text})
        out_rows.append({"name": name, "n": n,
                         "distinct_premises": round(float(np.mean(distinct)), 2) if distinct else 0,
                         "mean_pairwise_distance": round(float(np.mean(dists)), 3) if dists else 0,
                         "share_surviving": None,
                         "share_passing_prescreen": round(pass_pre / max(1, n), 3),
                         "share_novelty_gt_05": round(novel / max(1, n), 3)})
    data = {
        "experiment": "E3 diversity ablation", "conditions": out_rows, "objections": per_obj,
        "settings": {"arguments": [a.id for a in args], "objections_per_argument": PER_ARG,
                     "one_model": one.label, "mixed": [g.label for g in gens],
                     "distinct_premises": "mean per argument of distinct premise ids targeted (out of 4 objections)",
                     "embedder": claims_ix.embedder.name, "novelty": "lab novelty check without live OpenAlex"},
        "models": model_ids(client, ["referee", "reranker"]) | {"one_model": one.label},
        "timestamp": stamp(),
        "limits": ("Only 2 model families were available (anthropic, openai), so 'mixed families' means 2 families. "
                   "share_surviving would need full trials for all 60 objections and was not run (cost); "
                   "share_passing_prescreen (the Referee's misreading check) is reported instead. "
                   "CLI providers ignore temperature, so 'plain' variation comes from the 'objection k of n' prompt. "
                   "5 arguments x 4 objections per condition."),
    }
    write("e3", data)
    return data
