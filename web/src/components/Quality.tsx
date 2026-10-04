import type { Assessment, QualityGrade } from "../types";
import { Label } from "./ui";

// The Assessor's academic-quality grade (crux_lab/lab/assess.py). Ink tones only: outcome colours stay
// reserved for trial outcomes. solid = promising, dashed = needs work, dotted = not yet defensible.
const STYLE: Record<QualityGrade, { border: string; note: string }> = {
  promising: { border: "solid", note: "coherent, and survives the strongest obvious objection" },
  "needs work": { border: "dashed", note: "a real question, but the answer to the main objection needs work" },
  "not yet defensible": { border: "dotted", note: "as framed, it falls to an obvious objection; see what it needs" },
};

export function GradeChip({ grade, overall }: { grade: QualityGrade; overall?: number }) {
  const st = STYLE[grade] ?? STYLE["needs work"];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border border-ink px-1.5 py-[1px] font-mono text-[0.7rem]"
      style={{ borderStyle: st.border }}
      title={`Assessor: ${grade} — ${st.note}`}
    >
      {grade}
      {overall !== undefined ? <span className="text-ink-soft">{overall.toFixed(1)}/5</span> : null}
    </span>
  );
}

const CRITERIA: { key: keyof Assessment["scores"]; label: string; q: string }[] = [
  { key: "coherence", label: "Coherence", q: "Is the objection consistent and aimed at the premise as stated?" },
  { key: "robustness", label: "Robustness", q: "Does the direction survive the strongest objection to it?" },
  { key: "significance", label: "Significance", q: "Would it matter for the debate?" },
  { key: "specificity", label: "Specificity", q: "Is it concrete enough to write?" },
];

export function QualityPanel({ a }: { a: Assessment }) {
  return (
    <section aria-labelledby="quality-h" className="border border-ink p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>academic quality check</Label>
          <h2 id="quality-h" className="font-serif text-[1.35rem] font-medium leading-tight">
            What a journal referee would say
          </h2>
        </div>
        <GradeChip grade={a.grade} overall={a.overall} />
      </div>
      <p className="measure mt-2 text-[1.02rem] italic">{a.summary}</p>
      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {CRITERIA.map((c) => (
          <div key={c.key}>
            <dt className="flex items-baseline justify-between gap-2 text-[0.92rem]">
              <span className="font-medium">{c.label}</span>
              <span className="font-mono text-[0.78rem]" aria-label={`${a.scores[c.key]} out of 5`}>
                {"●".repeat(a.scores[c.key])}
                <span className="text-rule">{"●".repeat(5 - a.scores[c.key])}</span> {a.scores[c.key]}/5
              </span>
            </dt>
            <dd className="text-[0.86rem] text-ink-soft">{a.reasons?.[c.key] ?? c.q}</dd>
          </div>
        ))}
      </dl>
      {a.strongest_objection ? (
        <div className="mt-4">
          <Label>strongest objection to this direction</Label>
          <p className="measure text-[0.97rem]">{a.strongest_objection}</p>
          {a.reply_available !== undefined ? (
            <p className="mt-1 text-[0.86rem] text-ink-soft">
              A viable answer {a.reply_available ? "is" : "is not yet"} in the brief or the debate.
            </p>
          ) : null}
        </div>
      ) : null}
      {a.what_it_needs ? (
        <div className="mt-3">
          <Label>what the paper would need</Label>
          <p className="measure text-[0.97rem]">{a.what_it_needs}</p>
        </div>
      ) : null}
      <p className="mt-3 text-[0.8rem] text-ink-soft">
        An AI assessment{a.model ? ` (${a.model})` : ""}, not peer review. The grade is computed from the four scores:
        a direction is “promising” only if it is coherent and robust (both 4+) and averages 3.75+; it is “not yet
        defensible” if coherence or robustness is 2 or lower.
      </p>
    </section>
  );
}
