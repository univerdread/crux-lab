import type { Claim, Turn } from "../types";
import { PHASE_LABEL, speakerLabel } from "../lib/format";
import { CitationList, CitedText } from "./text";
import { isOutcome, ModelBadge, outcomeColor } from "./ui";

const SPEAKER_RULE: Record<string, string> = {
  defender_a: "#1F1B16",
  defender_b: "#5B544A",
  attacker: "#B9AE98",
  referee: "#D9CFBC",
};

/** One agent turn: speaker, phase, model badge, content with verified and struck citations. */
export function TurnView({ turn, local, fresh = false }: { turn: Turn; local?: Record<string, Claim>; fresh?: boolean }) {
  const labelOutcome = turn.phase === "label" ? turn.content.split(":", 1)[0].trim() : null;
  const rule = labelOutcome && isOutcome(labelOutcome) ? outcomeColor(labelOutcome) : SPEAKER_RULE[turn.speaker] ?? "#8A8580";
  // Concession text arrives with the revised premise appended; show the premise once, in its own box.
  const body =
    turn.revised_premise && turn.content.includes("\n\nRevised premise:")
      ? turn.content.slice(0, turn.content.lastIndexOf("\n\nRevised premise:"))
      : turn.content;
  return (
    <article className={`border-l-2 pl-3 ${fresh ? "ink-in" : ""}`} style={{ borderColor: rule, borderLeftStyle: turn.speaker === "attacker" ? "dashed" : "solid" }}>
      <header className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-serif text-[0.98rem] font-semibold">{speakerLabel(turn.speaker)}</span>
        <span className="smallcaps text-[0.85rem] text-ink-soft">{PHASE_LABEL[turn.phase] ?? turn.phase}</span>
        <ModelBadge family={turn.family} model={turn.model} />
        {turn.concedes ? (
          <span className="rounded-[2px] border border-revision_required px-1.5 font-mono text-[0.66rem] text-revision_required">
            concedes
          </span>
        ) : null}
      </header>
      <CitedText text={body} struck={turn.struck_claim_ids} local={local} className="turn-body" />
      {turn.revised_premise ? (
        <p className="mt-2 border border-dashed border-revision_required bg-[#C98A1B0f] px-2.5 py-1.5 text-[0.92rem]">
          <span className="smallcaps mr-1 text-revision_required">revised premise</span>
          {turn.revised_premise}
        </p>
      ) : null}
      <div className="mt-1.5">
        <CitationList cited={turn.cited_claim_ids ?? []} struck={turn.struck_claim_ids ?? []} local={local} />
      </div>
    </article>
  );
}
