import { describe, it, expect } from "vitest";
import replay from "../fixtures/replay.json";
import { runReplay } from "@/lib/replay";

describe("recorded run", () => {
  const out = runReplay(replay as never);

  it("has a step for each moment and every step's real verdict matches what was recorded", () => {
    expect(out).toHaveLength(replay.steps.length);
    out.forEach((s, i) => {
      expect(s.level, `step ${i + 1}: ${s.title}`).toBe(replay.steps[i].expect.level);
    });
  });

  it("reproduces the recorded similarity scores from the printed formula", () => {
    out.forEach((s, i) => {
      const want = replay.steps[i].expect.similarity;
      if (want === null) expect(s.similarity).toBeNull();
      else expect(s.similarity).toBeCloseTo(want, 2);
    });
  });

  it("shows the counterfactual: the remembered steps would have been normal without memory", () => {
    out.filter((s) => s.remembered).forEach((s) => expect(s.counterfactual).toBe("normal"));
  });

  it("quotes the recorded reason only once memory is in play", () => {
    out.forEach((s) => (s.remembered ? expect(s.quote).toContain("too large") : expect(s.quote).toBeNull()));
  });

  it("is labelled as recorded demo data, never as the owner's real memory", () => {
    expect(replay.decision.source).toBe("demo");
  });
});
