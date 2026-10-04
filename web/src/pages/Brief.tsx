import { QualityPanel } from "../components/Quality";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { VerdictTag } from "../components/NoveltyPanel";
import { useDrawer } from "../components/drawer";
import { ClaimRef } from "../components/text";
import { DataState, Disclaimer, Empty, Label, Marginal, OutcomeChip } from "../components/ui";
import { fetchText, useJSON } from "../lib/data";
import { displayTitle, num, shortId } from "../lib/format";
import type { Brief, BriefSummary, LiteratureRef } from "../types";

export default function BriefPage() {
  const { id = "" } = useParams();
  const brief = useJSON<Brief>(`briefs/${id}.json`);
  const summaries = useJSON<BriefSummary[]>("briefs.json");
  const runId = summaries.status === "ready" ? summaries.data.find((b) => b.id === id)?.run_id ?? null : null;
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <DataState load={brief} what={`brief ${id}`}>
        {(b) => <BriefView b={b} runId={runId} />}
      </DataState>
    </div>
  );
}

function DownloadMarkdown({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "busy" | "missing">("idle");
  const go = async () => {
    setState("busy");
    try {
      const md = await fetchText(`briefs/${id}.md`);
      const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState("idle");
    } catch {
      setState("missing");
    }
  };
  return (
    <>
      <button className="btn" onClick={go} disabled={state === "busy"}>
        Download Markdown
      </button>
      {state === "missing" ? (
        <span className="font-mono text-[0.72rem] text-ink-soft" role="status">
          the Markdown file for this brief was not exported
        </span>
      ) : null}
    </>
  );
}

function Reference({ r }: { r: LiteratureRef }) {
  const { openRecord, openClaim } = useDrawer();
  const isClaim = /\.(c\d+|a\d+|r\d+|mp)$/.test(r.record_id);
  return (
    <li className="print-break-avoid border-t border-rule py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <VerdictTag verdict={r.verdict} />
        {r.similarity !== undefined ? <span className="font-mono text-[0.7rem] text-ink-faint">similarity {num(r.similarity)}</span> : null}
      </div>
      <p className="mt-1 text-[1.02rem] leading-snug">
        {r.authors?.length ? <span>{r.authors.slice(0, 3).join(", ")}{r.authors.length > 3 ? " et al." : ""}. </span> : null}
        {r.year ? <span>({r.year}). </span> : null}
        <span className="font-medium">{r.title || "(record without a title)"}</span>
        {r.url ? (
          <>
            {" "}
            <a href={r.url} className="link font-mono text-[0.75rem] text-ink-soft" target="_blank" rel="noreferrer">
              link ↗
            </a>
          </>
        ) : null}
      </p>
      {r.quote ? <blockquote className="mt-1 border-l border-rule pl-3 text-[0.95rem] italic text-ink-soft">“{r.quote}”</blockquote> : null}
      <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[0.7rem] text-ink-faint">
        record{" "}
        {isClaim ? (
          <ClaimRef id={r.record_id} />
        ) : (
          <button type="button" className="link" onClick={() => openRecord(r.paper_id ?? r.record_id, { quote: r.quote, title: r.title, recordId: r.record_id })}>
            {r.record_id}
          </button>
        )}
        {isClaim && r.paper_id ? (
          <button type="button" className="link" onClick={() => (r.paper_id ? openRecord(r.paper_id) : openClaim(r.record_id))}>
            {r.paper_id}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function BriefView({ b, runId }: { b: Brief; runId: string | null }) {
  const a = b.argument;
  const trialId = `trial-${b.objection_id}`;
  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>research brief</Label>
          <div className="no-print flex flex-wrap items-center gap-2">
            <DownloadMarkdown id={b.id} />
            <button className="btn btn-quiet" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </div>
        <h1 className="font-serif text-[2.1rem] font-medium leading-tight sm:text-[2.5rem]">{b.research_question}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.95rem]">
          <span className="inline-flex items-center gap-2">
            <span className="smallcaps text-ink-soft">outcome in the gauntlet</span>
            <OutcomeChip outcome={b.outcome || null} />
          </span>
          <span>
            <span className="smallcaps mr-1 text-ink-soft">novelty score</span>
            <span className="font-mono">{num(b.novelty)}</span>
          </span>
          <span>
            <span className="smallcaps mr-1 text-ink-soft">records searched</span>
            <span className="font-mono">{b.records_searched}</span>
          </span>
        </div>
        <Disclaimer text={b.disclaimer} />
        <p className="text-[0.92rem] text-ink-soft">
          From <cite className="not-italic">{displayTitle(a.paper_title)}</cite> <span className="font-mono text-[0.75rem]">({a.paper_id})</span>
          <span className="no-print">
            {" · "}
            <Link to={`/trial/${encodeURIComponent(trialId)}`} className="link">
              the full trial
            </Link>
            {runId ? (
              <>
                {" · "}
                <Link to={`/lab/${encodeURIComponent(runId)}?at=end`} className="link">
                  the run
                </Link>
              </>
            ) : null}
          </span>
        </p>
      </header>

      {b.assessment ? (
        <div className="mt-6">
          <QualityPanel a={b.assessment} />
        </div>
      ) : null}

      <Marginal label="paper direction">
        {b.paper_direction ? <p className="measure text-[1.2rem] leading-relaxed">{b.paper_direction}</p> : <p className="text-ink-soft">No paper direction was written.</p>}
      </Marginal>

      <Marginal label="open questions">
        {b.open_questions?.length ? (
          <ol className="measure list-decimal space-y-1.5 pl-5">
            {b.open_questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-soft">None recorded.</p>
        )}
      </Marginal>

      <Marginal label="challenged premise">
        <p className="measure text-[1.08rem]">
          <ClaimRef id={b.challenged_premise.id} label={shortId(b.challenged_premise.id)} /> {b.challenged_premise.text}
        </p>
      </Marginal>

      <Marginal label="the objection">
        <p className="measure turn-body whitespace-pre-line border-l-2 border-ink pl-3">{b.objection}</p>
      </Marginal>

      <Marginal label="strongest responses">
        {b.strongest_responses?.length ? (
          <ol className="space-y-4">
            {b.strongest_responses.map((r, i) => (
              <li key={i} className="print-break-avoid measure">
                <div className="font-medium">{r.defender}</div>
                <p className="mt-0.5">{r.response}</p>
                <p className="mt-1 text-[0.98rem]">
                  <span className="smallcaps mr-1 text-ink-soft">why it failed</span>
                  {r.why_it_failed}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-ink-soft">No responses were summarised.</p>
        )}
      </Marginal>

      <Marginal label="the argument">
        <div className="space-y-3">
          <p className="font-medium">{a.title}</p>
          <ol className="measure space-y-2">
            {a.premises.map((p) => (
              <li key={p.id} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 ${p.id === b.challenged_premise.id ? "bg-paper-deep outline outline-1 outline-rule" : ""}`}>
                <ClaimRef id={p.id} label={shortId(p.id)} />
                <div>
                  <p>{p.text}</p>
                  {p.quote ? <p className="mt-0.5 text-[0.9rem] italic text-ink-soft">“{p.quote}”</p> : null}
                </div>
              </li>
            ))}
            {a.missing_premise ? (
              <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 border border-dashed border-revision_required px-2 py-1">
                <span className="font-mono text-[0.8rem] text-revision_required-text">{shortId(a.missing_premise.id)}</span>
                <p>
                  <span className="smallcaps mr-1 text-revision_required-text">hidden premise, found by the Formalizer</span>
                  {a.missing_premise.text}
                </p>
              </li>
            ) : null}
            <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 border-t border-ink pt-2">
              <ClaimRef id={a.conclusion.id} label={shortId(a.conclusion.id)} />
              <p>
                <span className="smallcaps mr-1 text-ink-soft">therefore</span>
                {a.conclusion.text}
              </p>
            </li>
          </ol>
          <p className="font-mono text-[0.8rem]">
            {a.skeleton}{" "}
            <span className="text-ink-soft">
              ({a.valid === true ? "valid" : a.valid === false ? "invalid as stated" : "validity not determined"})
            </span>
          </p>
        </div>
      </Marginal>

      <Marginal label="closest literature">
        {b.closest_literature?.length ? (
          <>
            <p className="mb-1 text-[0.88rem] text-ink-soft">
              Rendered from corpus records only. Verdicts come from the prior-art reranker: same move, related, or
              different.
            </p>
            <ol>
              {b.closest_literature.map((r, i) => (
                <Reference key={`${r.record_id}-${i}`} r={r} />
              ))}
            </ol>
          </>
        ) : (
          <Empty>No corpus record came close enough to list.</Empty>
        )}
      </Marginal>

      <Disclaimer text={b.disclaimer} />
    </article>
  );
}
