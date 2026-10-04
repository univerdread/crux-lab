import { useMemo, useState } from "react";
import { DirectionItem } from "../components/DirectionItem";
import { OutcomeLegend } from "../components/OutcomeBar";
import { Code, DataState, Disclaimer, Empty, Label } from "../components/ui";
import { useJSON } from "../lib/data";
import { OUTCOME_LABELS, type BriefSummary, type Outcome } from "../types";

export default function Briefs() {
  const briefs = useJSON<BriefSummary[]>("briefs.json");
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <Label>where to write next</Label>
      <h1 className="font-serif text-[2.6rem] font-medium leading-tight">Research directions</h1>
      <p className="measure mt-2 text-[1.05rem] text-ink-soft">
        Each direction is an objection the lab generated without seeing the literature, then put through two defenders
        and a referee, then checked against the corpus. Listed in the exported order, which favours breadth: the strongest
        direction for each paper (by survival × novelty) first, then the second, and so on. Open one for the printable
        brief.
      </p>
      <div className="mt-4">
        <OutcomeLegend />
      </div>
      <div className="mt-8">
        <DataState load={briefs} what="research briefs">
          {(list) => <BriefList list={list} />}
        </DataState>
      </div>
    </div>
  );
}

function BriefList({ list }: { list: BriefSummary[] }) {
  const [filter, setFilter] = useState<Outcome | "all">("all");
  const present = useMemo(() => [...new Set(list.map((b) => b.outcome).filter(Boolean))] as Outcome[], [list]);
  const shown = filter === "all" ? list : list.filter((b) => b.outcome === filter);
  if (!list.length)
    return (
      <Empty>
        No research briefs yet. Run <Code>make runs</Code> then <Code>make export</Code>.
      </Empty>
    );
  return (
    <>
      {present.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by outcome">
          <button className="btn btn-quiet" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            all ({list.length})
          </button>
          {present.map((o) => (
            <button key={o} className="btn btn-quiet" aria-pressed={filter === o} onClick={() => setFilter(o)}>
              {OUTCOME_LABELS[o].toLowerCase()} ({list.filter((b) => b.outcome === o).length})
            </button>
          ))}
        </div>
      ) : null}
      <ol>
        {shown.map((b) => (
          <DirectionItem key={b.id} brief={b} rank={list.indexOf(b) + 1} />
        ))}
      </ol>
      <Disclaimer className="mt-6" />
    </>
  );
}
