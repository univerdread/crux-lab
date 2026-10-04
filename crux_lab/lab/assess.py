"""The Assessor: grades each research direction on academic quality, like a journal referee reading a
paper proposal. The model gives four 1-5 scores, the strongest objection to the direction and what the paper
would need; the grade itself is computed here in code (robustness is decisive: a direction that dies to an
obvious reply is never "promising"). Runs on a different model family from the brief writer when possible."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from crux_lab.agents.roles import render
from crux_lab.config import BRIEFS, RUNS, TOPIC, settings
from crux_lab.graph.schema import Brief, Objection
from crux_lab.graph.store import Store
from crux_lab.lab.brief import to_markdown
from crux_lab.llm.client import LLMClient, ModelSpec

log = logging.getLogger(__name__)
CRITERIA = ("coherence", "robustness", "significance", "specificity")


class AssessOut(BaseModel):
    coherence: int = Field(ge=1, le=5)
    robustness: int = Field(ge=1, le=5)
    significance: int = Field(ge=1, le=5)
    specificity: int = Field(ge=1, le=5)
    strongest_objection: str = Field(description="the single strongest objection to the proposed paper")
    reply_available: bool = Field(description="does the direction or the transcript contain a viable answer to it?")
    what_it_needs: str = Field(description="one or two sentences: what the paper must do to be publishable")
    reasons: dict[str, str] = Field(description="one sentence per criterion explaining its score")
    summary: str = Field(description="one plain sentence: the verdict a supervisor would give")


def grade(scores: dict[str, int]) -> tuple[str, float]:
    """promising: coherent, robust and solid overall; not yet defensible: incoherent, or dies to an obvious
    reply as framed (robustness <= 2); needs work: everything in between."""
    overall = round(sum(scores[c] for c in CRITERIA) / len(CRITERIA), 2)
    if scores["coherence"] <= 2 or scores["robustness"] <= 2:
        return "not yet defensible", overall
    if scores["coherence"] >= 4 and scores["robustness"] >= 4 and overall >= 3.75:
        return "promising", overall
    return "needs work", overall


def assessor_spec(client: LLMClient) -> ModelSpec:
    """Prefer a strong model from a family that did not write the briefs."""
    brief_family = client.spec_for("brief").family
    if settings.has("claude_cli") and brief_family != "anthropic":
        return ModelSpec("claude_cli", "opus", "anthropic", "high")
    for s in client.generator_specs():
        if s.family != brief_family:
            return s
    return client.spec_for("referee")


def _validate(o: AssessOut) -> str | None:
    if len(o.strongest_objection.split()) < 12:
        return "state the strongest objection in full (at least one real sentence)"
    if set(CRITERIA) - set(o.reasons):
        return f"give one reason for each of {list(CRITERIA)}"
    return None


async def assess_brief(client: LLMClient, spec: ModelSpec, b: Brief) -> dict | None:
    a = b.argument
    premises = "\n".join(f"{p['id']}: {p['text']}" for p in a["premises"])
    if a.get("missing_premise"):
        premises += f"\n{a['missing_premise']['id']} (unstated, found by the lab): {a['missing_premise']['text']}"
    argument = f"{premises}\nTherefore {a['conclusion']['id']}: {a['conclusion']['text']}"
    responses = "\n".join(f"- {r['defender']}: {r['response']} Why it fell short: {r['why_it_failed']}"
                          for r in b.strongest_responses) or "(none recorded)"
    literature = "\n".join(f"- {c.get('verdict', '')}: {c.get('title', c.get('record_id'))}"
                           for c in b.closest_literature if c.get("verdict") != "cited_in_trial") or "(none)"
    system, user = render("assessor", area=TOPIC.get("area", "philosophy"), paper_title=a.get("paper_title", ""),
                          argument=argument, target_id=b.challenged_premise["id"],
                          target_text=b.challenged_premise["text"], objection=b.objection, responses=responses,
                          outcome=b.outcome, question=b.research_question, direction=b.paper_direction,
                          open_questions="\n".join(f"- {q}" for q in b.open_questions), literature=literature)
    out, _ = await client.json("assessor", user, AssessOut, system, spec=spec, validate=_validate, max_tokens=3000)
    if not out:
        return None
    scores = {c: getattr(out, c) for c in CRITERIA}
    g, overall = grade(scores)
    return {"grade": g, "overall": overall, "scores": scores, "reasons": out.reasons,
            "strongest_objection": out.strongest_objection, "reply_available": out.reply_available,
            "what_it_needs": out.what_it_needs, "summary": out.summary,
            "model": spec.label, "assessed_at": datetime.now(timezone.utc).isoformat()}


async def main() -> None:
    client = LLMClient()
    spec = assessor_spec(client)
    store = Store()
    objections = {}
    for f in RUNS.glob("run-*.json"):
        for o in json.loads(f.read_text())["objections"]:
            objections[o["id"]] = Objection(**o)
    files = sorted(BRIEFS.glob("brief-*.json"))
    sem = asyncio.Semaphore(4)

    async def one(f):
        b = Brief.model_validate_json(f.read_text())
        async with sem:
            res = await assess_brief(client, spec, b)
        if res:
            b = b.model_copy(update={"assessment": res})
            f.write_text(b.model_dump_json(indent=2))
            f.with_suffix(".md").write_text(to_markdown(b, objections.get(b.objection_id)))
            store.put(b)
        return f.stem, res

    for bid, res in await asyncio.gather(*[one(f) for f in files]):
        print(f"{bid}: " + (f"{res['grade']} ({res['overall']}) {res['scores']}" if res else "FAILED"))
