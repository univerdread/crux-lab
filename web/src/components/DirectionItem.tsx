import { GradeChip } from "./Quality";
import { Link } from "react-router";
import type { BriefSummary } from "../types";
import { displayTitle, excerpt, num, shortId } from "../lib/format";
import { Meter } from "./NoveltyPanel";
import { OutcomeChip } from "./ui";

/** One research direction: the brief's question and paper direction first, the evidence trail after. */
export function DirectionItem({ brief, rank, long = false }: { brief: BriefSummary; rank: number; long?: boolean }) {
  return (
    <li className="grid gap-x-6 gap-y-2 border-t border-rule py-6 md:grid-cols-[3rem_minmax(0,1fr)_14rem]">
      <div className="font-serif text-[1.6rem] leading-none text-ink-faint" aria-hidden>
        {rank}
      </div>
      <div className="min-w-0 space-y-2.5">
        {brief.tier === 0 ? (
          <div className="smallcaps text-[0.88rem] text-ink-soft">top direction for this paper</div>
        ) : null}
        <h3 className="font-serif text-[1.38rem] font-medium leading-snug">
          <Link to={`/brief/${encodeURIComponent(brief.id)}`} className="link decoration-transparent hover:decoration-ink">
            {brief.research_question}
          </Link>
        </h3>
        {brief.paper_direction ? (
          <p className="measure text-[1.02rem] leading-relaxed text-ink">{long ? brief.paper_direction : excerpt(brief.paper_direction, 340)}</p>
        ) : null}
        {brief.revision?.research_question ? (
          <p className="measure mt-2 text-[0.95rem]">
            <span className="smallcaps mr-1 text-ink-soft">revised</span>
            {brief.revision.research_question}
          </p>
        ) : null}
        {(brief.revision?.assessment?.summary ?? brief.assessment?.summary) ? (
          <p className="measure mt-2 border-l-2 border-ink pl-3 text-[0.92rem] italic text-ink-soft">
            Assessor{brief.revision?.assessment ? " (after revision)" : ""}:{" "}
            {brief.revision?.assessment?.summary ?? brief.assessment?.summary}
          </p>
        ) : null}
        <p className="measure text-[0.92rem] text-ink-soft">
          Challenges <span className="font-mono text-[0.8rem]">{shortId(brief.challenged_premise?.id ?? "")}</span>
          {brief.challenged_premise?.text ? <> — “{excerpt(brief.challenged_premise.text, 200)}”</> : null}
          {brief.paper_title ? (
            <>
              {" "}
              in <cite className="not-italic">{displayTitle(brief.paper_title)}</cite>
            </>
          ) : null}
        </p>
        <Link to={`/brief/${encodeURIComponent(brief.id)}`} className="link inline-block text-[0.95rem]">
          Read the brief →
        </Link>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 self-start text-[0.85rem] md:border-l md:border-rule md:pl-4">
        <dt className="smallcaps text-ink-soft">outcome</dt>
        <dd>
          <OutcomeChip outcome={brief.outcome} />
        </dd>
        {brief.assessment ? (
          <>
            <dt className="smallcaps text-ink-soft">quality</dt>
            <dd className="flex flex-wrap items-center gap-1">
              {brief.revision?.assessment ? (
                <>
                  <GradeChip grade={brief.revision.assessment.grade} overall={brief.revision.assessment.overall} />
                  <span className="font-mono text-[0.66rem] text-ink-soft" title="grade before the revision round">
                    was {brief.assessment.grade}
                  </span>
                </>
              ) : (
                <GradeChip grade={brief.assessment.grade} overall={brief.assessment.overall} />
              )}
            </dd>
          </>
        ) : null}
        <dt className="smallcaps text-ink-soft">novelty</dt>
        <dd>
          <Meter value={brief.novelty} label="novelty score" />
        </dd>
        <dt className="smallcaps text-ink-soft">searched</dt>
        <dd className="font-mono text-[0.75rem]">{brief.records_searched} records</dd>
        <dt className="smallcaps text-ink-soft">survival</dt>
        <dd className="font-mono text-[0.75rem]">{num(brief.survival)}</dd>
        {brief.score !== undefined ? (
          <>
            <dt className="smallcaps text-ink-soft">score</dt>
            <dd className="font-mono text-[0.75rem]" title="survival × novelty">
              {num(brief.score, 3)}
            </dd>
          </>
        ) : null}
      </dl>
    </li>
  );
}
