import { describe, it, expect } from "vitest";
import { breakdown, habits, learnWeights, similarity, WEIGHTS } from "@/lib/engine";
import { checkSend, riskSignals } from "@/lib/service";
import type { ChainFacts } from "@/lib/tatum";
import type { MemLike } from "@/lib/memory";
import type { Decision, Features } from "@/lib/types";

const f = (over: Partial<Features> = {}): Features => ({ novelRecipient: true, amountRatio: 1, hour: 14, interactions: 0, ...over });
const facts = (over: Partial<ChainFacts> = {}): ChainFacts => ({
  balance: 10, medianAmount: 1, priorTxCount: 5, priorToRecipient: 0, recentSends: 0, screen: { status: "clear" }, dryRunOk: true, requestLog: [], ...over,
});
const denial = (i: number, features: Features): Decision => ({
  id: `d${i}`, recipient: "0x1", amount: 1, reason: "no", ts: i, features, action: "deny", source: "demo", kind: "soft",
});

describe("breakdown", () => {
  it("parts add up to the similarity", () => {
    const a = f(), b = f({ amountRatio: 2, hour: 2, interactions: 1 });
    const p = breakdown(a, b);
    expect(p.recipient + p.amount + p.hour + p.interaction).toBeCloseTo(similarity(a, b), 10);
  });
});

describe("habits", () => {
  it("needs two refusals before it says anything", () => {
    expect(habits([denial(1, f({ hour: 2 }))])).toEqual([]);
  });
  it("names a late-night pattern and a big-amount pattern", () => {
    const night = [1, 2, 3].map((i) => denial(i, f({ hour: 2, amountRatio: 6 })));
    const out = habits(night).join(" ");
    expect(out).toMatch(/late-night/);
    expect(out).toMatch(/above your usual/);
  });
  it("ignores refusals that were deleted", () => {
    const ds = [1, 2].map((i) => denial(i, f({ hour: 2 })));
    const gone: Decision = { ...denial(9, f()), action: "delete", target: "d1" };
    expect(habits([...ds, gone])).toEqual([]);
  });
});

describe("riskSignals", () => {
  it("stays silent for an ordinary send", () => {
    expect(riskSignals(f({ amountRatio: 1 }), facts())).toEqual([]);
  });
  it("nudges on a burst of sends", () => {
    expect(riskSignals(f({ novelRecipient: false }), facts({ recentSends: 3 }))[0].level).toBe("reminder");
  });
  it("nudges on a new recipient with a large amount, never above reminder", () => {
    const s = riskSignals(f({ amountRatio: 8 }), facts());
    expect(s).toHaveLength(1);
    expect(s[0].level).toBe("reminder");
  });
});

describe("learnWeights", () => {
  it("keeps the fixed weights under three refusals", () => {
    expect(learnWeights([1, 2].map((i) => denial(i, f())))).toEqual(WEIGHTS);
  });
  it("sums to 1 and leans on the factor your refusals share", () => {
    const ds = [1, 2, 3, 4].map((i) => denial(i, f({ hour: 2, novelRecipient: i % 2 === 0, interactions: i * 2 })));
    const w = learnWeights(ds);
    expect(w.recipient + w.amount + w.hour + w.interaction).toBeCloseTo(1, 10);
    expect(w.hour).toBeGreaterThan(WEIGHTS.hour);
  });
});

describe("screening and meaning match", () => {
  const timing = { now: () => 0, sleep: async () => {}, minIntervalMs: 0 };
  const base = { getBalance: async () => 10, listOutgoing: async () => [], dryRun: async () => true };
  const noMem: MemLike = { remember: async () => ({ job_id: "j" }), waitForRememberJob: async () => ({ blob_id: "b" }), recall: async () => ({ results: [], total: 0 }) };
  const run = (source: object, mem = noMem, note?: string) =>
    checkSend({ sender: "0xme", recipient: "0xr", amount: 1, note }, { source: { ...base, ...source }, mem, hour: () => 14, timing });

  it("holds a send to an address Tatum lists as malicious", async () => {
    const r = await run({ screen: async () => ({ flagged: true, why: "Trust trading scam site" }) });
    expect(r.verdict.level).toBe("hold");
    expect(r.verdict.reasons.join(" ")).toMatch(/malicious.*scam site/);
  });
  it("still checks the send when screening fails, and says it is unscreened", async () => {
    const r = await run({ screen: async () => { throw new Error("500"); } });
    expect(r.verdict.level).toBe("normal");
    expect(r.facts?.screen.status).toBe("unscreened");
  });
  it("quotes a past refusal whose reason sounds like the typed note", async () => {
    const d = denial(1, f());
    const text = `deny 1 to 0xold: ${d.reason}\nDECISION_JSON:${JSON.stringify({ ...d, reason: "They said the offer ends today" })}`;
    const mem: MemLike = { ...noMem, recall: async ({ query }) => ({ results: query === "offer ends today" ? [{ blob_id: "b1", distance: 0.5, text }] : [], total: 1 }) };
    const r = await run({}, mem, "offer ends today");
    expect(r.verdict.level).toBe("reminder");
    expect(r.verdict.reasons.join(" ")).toMatch(/offer ends today/);
  });
  it("ignores a note that is far from every past reason", async () => {
    const d = denial(1, f());
    const text = `x\nDECISION_JSON:${JSON.stringify(d)}`;
    const mem: MemLike = { ...noMem, recall: async ({ query }) => ({ results: query === "weather in Paris" ? [{ blob_id: "b1", distance: 0.85, text }] : [], total: 1 }) };
    expect((await run({}, mem, "weather in Paris")).verdict.level).toBe("normal");
  });
});
