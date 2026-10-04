import { Link } from "react-router";
import { DirectionItem } from "../components/DirectionItem";
import { LoopRing } from "../components/LoopRing";
import { OutcomeBar, OutcomeLegend } from "../components/OutcomeBar";
import { Code, DataState, Disclaimer, Empty, Label, Stat } from "../components/ui";
import { useJSON } from "../lib/data";
import { displayTitle, when } from "../lib/format";
import type { BriefSummary, Index } from "../types";

const TOP = 5;

export default function Landing() {
  const index = useJSON<Index>("index.json");
  const briefs = useJSON<BriefSummary[]>("briefs.json");

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <section className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:py-16">
        <div>
          <h1 className="font-serif text-[3.4rem] font-medium leading-[1.02] tracking-tight sm:text-[4.6rem]">Crux Lab</h1>
          <p className="measure mt-5 text-[1.32rem] leading-snug">
            An autonomous research lab for philosophy: it reconstructs arguments from new papers, attacks them, defends
            them, checks the literature, and hands you the open questions.
          </p>
          <p className="measure mt-4 text-[1.02rem] text-ink-soft">
            For philosophers and students deciding what to research and write next. Each lead below names the premise
            it challenges, the replies it survived, the closest passages the lab could find, and how many records it
            searched. None of it is a claim of novelty: further human review is always required.
          </p>
          <p className="measure mt-3 text-[0.95rem] text-ink-soft">
            This build studies divine hiddenness and nearby philosophy of religion.
            {index.status === "ready" && index.data.targets.length ? (
              <>
                {" "}
                {index.data.targets.filter((t) => t.kind === "fresh").length} of {index.data.targets.length} target papers
                were published after 1 August 2026, so the models cannot have read published replies to them.
              </>
            ) : null}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#directions" className="btn">
              Research directions ↓
            </a>
            <Link to="/lab" className="btn btn-quiet">
              Watch a run replay
            </Link>
          </div>
        </div>
        <LoopRing className="mx-auto w-full max-w-[480px]" />
      </section>

      <section aria-labelledby="headline-h" className="pt-2">
        <h2 id="headline-h" className="sr-only">
          Headline numbers
        </h2>
        <DataState load={index} what="the index">
          {(ix) =>
            ix.headline?.length ? (
              <div className="grid gap-8 sm:grid-cols-3">
                {ix.headline.map((h) => (
                  <Stat key={h.label} value={h.value} label={h.label} source={h.source} />
                ))}
              </div>
            ) : (
              <Empty>No headline numbers yet: they appear once runs or evaluations have been exported.</Empty>
            )
          }
        </DataState>
      </section>

      <section id="directions" aria-labelledby="directions-h" className="scroll-mt-6 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Label>where to write next</Label>
            <h2 id="directions-h" className="font-serif text-[2.2rem] font-medium leading-tight">
              Research directions
            </h2>
            <p className="measure mt-1 text-[1rem] text-ink-soft">
              Objections that survived the gauntlet, in the order the lab exported them: each paper’s strongest direction
              (by survival × novelty) first, then the next from each paper. Each opens a printable brief with the argument,
              the strongest replies and why they failed, and the closest literature.
            </p>
          </div>
          <OutcomeLegend />
        </div>
        <div className="mt-6">
          <DataState load={briefs} what="research briefs">
            {(list) =>
              list.length ? (
                <>
                  <ol>
                    {list.slice(0, TOP).map((b, i) => (
                      <DirectionItem key={b.id} brief={b} rank={i + 1} />
                    ))}
                  </ol>
                  {list.length > TOP ? (
                    <p className="border-t border-rule pt-4">
                      <Link to="/briefs" className="link">
                        All {list.length} research directions →
                      </Link>
                    </p>
                  ) : null}
                  <Disclaimer className="mt-6" />
                </>
              ) : (
                <Empty>
                  No research briefs yet. A brief is written when an objection survives both defenders (or, failing
                  that, for the best rebutted one). Run <Code>make runs</Code> then <Code>make export</Code>.
                </Empty>
              )
            }
          </DataState>
        </div>
      </section>

      <section aria-labelledby="runs-h" className="pt-16">
        <Label>the experiments</Label>
        <h2 id="runs-h" className="font-serif text-[2.2rem] font-medium leading-tight">
          Runs
        </h2>
        <p className="measure mt-1 text-[1rem] text-ink-soft">
          One run per target paper: the reconstructed argument, every objection, every trial. Open one to replay it
          turn by turn.
        </p>
        <div className="mt-6">
          <DataState load={index} what="the index">
            {(ix) =>
              ix.runs?.length ? (
                <ul>
                  {ix.runs.map((r) => (
                    <li key={r.run_id} className="grid gap-x-6 gap-y-2 border-t border-rule py-5 md:grid-cols-[minmax(0,1fr)_16rem_8rem]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[0.7rem] text-ink-soft">
                          <span className="rounded-[2px] border border-rule px-1.5">{r.kind}</span>
                          <span>{r.paper_id}</span>
                          {r.finished_at ? <span>· finished {when(r.finished_at)}</span> : null}
                        </div>
                        <h3 className="mt-1 font-serif text-[1.18rem] font-medium leading-snug">
                          <Link to={`/lab/${encodeURIComponent(r.run_id)}`} className="link decoration-transparent hover:decoration-ink">
                            {displayTitle(r.title)}
                          </Link>
                        </h3>
                        {r.argument_title ? <p className="text-[0.95rem] text-ink-soft">Argument: {r.argument_title}</p> : null}
                        <p className="mt-1 font-mono text-[0.72rem] text-ink-soft">
                          {r.objections} objections · {r.trials} trials · {r.briefs?.length ?? 0} briefs · families:{" "}
                          {r.families?.join(", ") || "—"}
                        </p>
                        {r.stop_reason ? <p className="font-mono text-[0.7rem] text-ink-faint">stopped: {r.stop_reason}</p> : null}
                      </div>
                      <OutcomeBar outcomes={r.outcomes ?? {}} />
                      <div>
                        <Link to={`/lab/${encodeURIComponent(r.run_id)}`} className="btn btn-quiet">
                          Replay →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>
                  No runs exported yet. Run <Code>make runs</Code> then <Code>make export</Code>.
                </Empty>
              )
            }
          </DataState>
        </div>
      </section>
    </div>
  );
}
