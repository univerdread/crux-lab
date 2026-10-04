import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Run, Turn } from "../../types";
import { attributeTurns, replay } from "../replay";

const turn = (speaker: Turn["speaker"], phase: Turn["phase"], exchange: number, content: string): Turn => ({
  exchange, speaker, phase, content, model: "m", family: "f", cited_claim_ids: [], struck_claim_ids: [],
  concedes: false, revised_premise: null,
});

describe("attributeTurns", () => {
  it("assigns interleaved turns of parallel trials to the right trial", () => {
    const a = turn("defender_a", "reply", 1, "same words");
    const b = turn("defender_a", "reply", 1, "same words");
    const run = {
      trials: [{ id: "trial-1", rounds: [a] }, { id: "trial-2", rounds: [b] }],
      events: [
        { t: 1, type: "turn", turn: b, trial_id: "trial-2" },
        { t: 2, type: "turn", turn: a, trial_id: "trial-1" },
      ],
    } as unknown as Pick<Run, "events" | "trials">;
    const out = attributeTurns(run);
    expect(out.map((x) => x?.trialId)).toEqual(["trial-2", "trial-1"]);
  });
});

// Integration: every exported run replays to the end with every turn attributed and the
// final outcomes equal to the trials stored in the run file.
const RUNS = path.resolve(__dirname, "../../../public/data/runs");
const files = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).filter((f) => f.endsWith(".json")) : [];

describe.skipIf(!files.length)("exported runs replay faithfully", () => {
  for (const f of files) {
    it(f, () => {
      const run = JSON.parse(fs.readFileSync(path.join(RUNS, f), "utf8")) as Run;
      const attribution = attributeTurns(run);
      run.events.forEach((ev, i) => {
        if (ev.type === "turn") expect(attribution[i], `turn event ${i} unattributed`).not.toBeNull();
      });
      const s = replay(run.events, run.events.length, attribution);
      for (const t of run.trials) expect(s.outcomes[t.objection_id]).toBe(t.outcome ?? "failed");
      expect(s.briefs.map((b) => b.brief_id).sort()).toEqual([...run.briefs].sort());
      expect(s.ended).toBe(run.stop_reason);
      expect(replay(run.events, 0, attribution).trials).toEqual([]);
    });
  }
});
