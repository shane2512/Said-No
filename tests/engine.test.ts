import { describe, it, expect } from "vitest";
import { evaluate, similarity } from "@/lib/engine";
import type { Decision, Features } from "@/lib/types";

const candidate: Features = { novelRecipient: true, amountRatio: 3.5, hour: 23, interactions: 0 };
const control: Features = { novelRecipient: false, amountRatio: 0.2, hour: 12, interactions: 5 };

let n = 0;
function decision(
  action: Decision["action"],
  features: Features,
  extra: Partial<Decision> = {},
): Decision {
  n += 1;
  return {
    id: `d${n}`,
    recipient: "0xdeadbeef",
    amount: 7,
    reason: "amount too high",
    ts: 1_700_000_000 + n,
    features,
    action,
    source: "demo",
    kind: "soft",
    ...extra,
  };
}
const denials = (k: number, f: Features = candidate) =>
  Array.from({ length: k }, () => decision("deny", f));

describe("similarity", () => {
  it("is 1 for identical features", () => {
    expect(similarity(candidate, candidate)).toBeCloseTo(1, 10);
  });

  it("is symmetric and stays within [0,1]", () => {
    const a = similarity(candidate, control);
    const b = similarity(control, candidate);
    expect(a).toBeCloseTo(b, 10);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("weights recipient 0.35, amount 0.30, hour 0.20, interaction 0.15", () => {
    const sameRecipientOnly: Features = { ...control, novelRecipient: true };
    // control differs on amount (0), interactions (0); hour matches (both daytime) => 0.35 + 0.20
    expect(similarity(candidate, sameRecipientOnly)).toBeCloseTo(0.55, 10);
  });
});

describe("evaluate", () => {
  it("is normal with a 'learning (0)' reason when there is no history", () => {
    const v = evaluate(candidate, "0xabc", []);
    expect(v.level).toBe("normal");
    expect(v.reasons.join(" ")).toContain("learning (0)");
    expect(v.counterfactualLevel).toBe("normal");
  });

  it("caps a single very similar denial at reflection", () => {
    const v = evaluate(candidate, "0xabc", denials(1));
    expect(v.level).toBe("reflection");
  });

  it("holds after five matching denials and shows the counterfactual without memory", () => {
    const v = evaluate(candidate, "0xabc", denials(5));
    expect(v.level).toBe("hold");
    expect(v.matches).toHaveLength(5);
    expect(v.counterfactualLevel).toBe("normal");
  });

  it("lowers the score and the match count when a denial is deleted", () => {
    const ds = denials(5);
    const before = evaluate(candidate, "0xabc", ds);
    const del = decision("delete", candidate, { target: ds[0].id });
    const after = evaluate(candidate, "0xabc", [...ds, del]);
    expect(after.matches).toHaveLength(4);
    expect(after.score).toBeLessThan(before.score);
  });

  it("returns to normal when every denial is deleted", () => {
    const ds = denials(2);
    const dels = ds.map((d) => decision("delete", candidate, { target: d.id }));
    expect(evaluate(candidate, "0xabc", [...ds, ...dels]).level).toBe("normal");
  });

  it("keeps a dissimilar control send quiet", () => {
    expect(evaluate(candidate, "0xabc", denials(5, control)).level).toBe("normal");
  });

  it("is not a permanent blacklist: more approvals than denials is normal", () => {
    const ds = [
      ...denials(1),
      decision("approve", candidate),
      decision("approve", candidate),
      decision("override", candidate),
    ];
    expect(evaluate(candidate, "0xabc", ds).level).toBe("normal");
  });

  it("drops one level when approvals equal denials", () => {
    const ds = [...denials(2), decision("approve", candidate), decision("approve", candidate)];
    // 2 denials at similarity 1 => hold; equal approvals => one level lower
    expect(evaluate(candidate, "0xabc", ds).level).toBe("reflection");
  });

  it("holds on a hard memory for the same recipient regardless of features", () => {
    const hard = decision("deny", control, { kind: "hard", recipient: "0xabc" });
    expect(evaluate(candidate, "0xabc", [hard]).level).toBe("hold");
  });

  it("ignores a hard memory for a different recipient when features differ", () => {
    const hard = decision("deny", control, { kind: "hard", recipient: "0xother" });
    expect(evaluate(candidate, "0xabc", [hard]).level).toBe("normal");
  });
});
