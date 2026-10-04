"""`make corpus`: OpenAlex hiddenness corpus + fresh candidates + open-access full texts."""
from __future__ import annotations

import json
import logging
import re

from crux_lab.config import CORPUS, RAW
from crux_lab.corpus import openalex, pdf

log = logging.getLogger(__name__)
FRESH_FROM = "2026-08-01"
FRESH_QUERIES = ['"divine hiddenness"', "hiddenness AND God", "theism", "atheism", '"existence of God"',
                 '"philosophy of religion"', "God AND argument", '"religious belief"']
RELEVANT = re.compile(r"hidden|nonbelie|non-belie|divine|god\b|theis|atheis|religio|faith|silence",
                      re.I)


def harvest_classic() -> list[dict]:
    papers = openalex.harvest(openalex.QUERIES, max_per_query=400)
    keep = [p for p in papers if len(p["abstract"]) >= 200
            and RELEVANT.search(p["title"] + " " + p["abstract"])]
    log.info("classic: %d harvested, %d kept (abstract >= 200 chars and on-topic)", len(papers), len(keep))
    return keep


def harvest_fresh() -> list[dict]:
    seen: dict[str, dict] = {}
    for q in FRESH_QUERIES:
        for w in openalex.search(q, filters={"from_publication_date": FRESH_FROM, "is_oa": "true",
                                             "has_abstract": "true"}, max_records=200):
            p = openalex.to_paper(w, q)
            p["fresh"] = True
            if p["id"] not in seen and len(p["abstract"]) >= 300:
                seen[p["id"]] = p
    log.info("fresh: %d candidates since %s", len(seen), FRESH_FROM)
    return list(seen.values())


def fulltexts(papers: list[dict], limit: int = 50) -> int:
    """Up to `limit` OA full texts: fresh candidates first, then most-cited hiddenness papers."""
    cands = [p for p in papers if p.get("pdf_url")]
    cands.sort(key=lambda p: (not p.get("fresh"), -(p.get("cited_by_count") or 0)))
    got = 0
    for p in cands:
        if got >= limit:
            break
        t = pdf.get_fulltext(p["id"], p["pdf_url"])
        if t:
            p["pdf_path"] = str(pdf.text_path(p["id"]).relative_to(RAW.parent.parent))
            p["fulltext_chars"] = len(t)
            got += 1
    log.info("full texts: %d", got)
    return got


def main(skip_fulltext: bool = False) -> None:
    classic = harvest_classic()
    (RAW / "fresh_candidates.json").write_text(json.dumps(fresh := harvest_fresh(), indent=1))
    by_id = {p["id"]: p for p in classic}
    for p in fresh:
        by_id.setdefault(p["id"], p)
    papers = list(by_id.values())
    if not skip_fulltext:
        fulltexts(papers)
    with CORPUS.open("w", encoding="utf-8") as f:
        for p in papers:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")
    n_abs = sum(1 for p in papers if p["abstract"])
    n_ft = sum(1 for p in papers if p.get("pdf_path"))
    print(f"corpus: {len(papers)} records ({n_abs} with abstracts, {n_ft} full texts, "
          f"{sum(1 for p in papers if p.get('fresh'))} fresh) -> {CORPUS}")


def load_corpus() -> list[dict]:
    if not CORPUS.exists():
        return []
    return [json.loads(line) for line in CORPUS.read_text("utf-8").splitlines() if line.strip()]
