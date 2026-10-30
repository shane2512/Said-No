import { describe, it, expect } from "vitest";
import { checkSend, recordDecision, executeAllowed } from "@/lib/service";
import type { ChainSource } from "@/lib/tatum";
import type { MemLike } from "@/lib/memory";
import type { Decision } from "@/lib/types";

const timing = { now: (() => { let t = 0; return () => t; })(), sleep: async () => {}, minIntervalMs: 0 };

const outgoing = (n: number, amount = 2) =>
  Array.from({ length: n }, (_, i) => ({ recipient: `0xknown${i}`, amount, ts: i }));

const source = (over: Partial<ChainSource> = {}): ChainSource => ({
  getBalance: async () => 10,
  listOutgoing: async () => outgoing(5),
  dryRun: async () => true,
  ...over,
});

const feat = { novelRecipient: true, amountRatio: 3.5, hour: 23, interactions: 0 };
const denial = (i: number): Decision => ({
  id: `d${i}`, recipient: "0xold", amount: 7, reason: "amount too high", ts: i,
  features: feat, action: "deny", source: "demo", kind: "soft",
});

function memWith(decisions: Decision[]): MemLike {
  const results = decisions.map((d, i) => ({
    blob_id: `blob${i}`, distance: 0.1,
    text: `x\nDECISION_JSON:${JSON.stringify(d)}`,
  }));
  return {
    remember: async () => ({ job_id: "job1" }),
    waitForRememberJob: async () => ({ blob_id: "blob1" }),
    recall: async () => ({ results, total: results.length }),
  };
}

const input = { sender: "0xme", recipient: "0xnew", amount: 7 };
const deps = (s: ChainSource, mem: MemLike) => ({ source: s, mem, hour: () => 23, timing });

describe("checkSend", () => {
  it("is normal with no memory", async () => {
    const r = await checkSend(input, deps(source(), memWith([])));
    expect(r.verdict.level).toBe("normal");
  });

  it("holds after five matching denials and shows the counterfactual", async () => {
    const r = await checkSend(input, deps(source(), memWith([1, 2, 3, 4, 5].map(denial))));
    expect(r.verdict.level).toBe("hold");
    expect(r.verdict.counterfactualLevel).toBe("normal");
    expect(r.verdict.matches[0].decision.blobId).toBeDefined();
  });

  it("fails closed when Tatum is unavailable: at least reflection, never normal", async () => {
    const rl = Object.assign(new Error("429"), { status: 429 });
    const r = await checkSend(input, deps(source({ getBalance: async () => { throw rl; } }), memWith([])));
    expect(r.verdict.level).toBe("reflection");
    expect(r.verdict.reasons.join(" ")).toMatch(/unavailable/i);
  });

  it("fails closed when Memory cannot be read", async () => {
    const broken: MemLike = { ...memWith([]), recall: async () => { throw new Error("relayer down"); } };
    const r = await checkSend(input, deps(source(), broken));
    expect(r.verdict.level).toBe("reflection");
    expect(r.verdict.reasons.join(" ")).toMatch(/memory unavailable/i);
  });

  it("raises a failed dry-run to at least reflection", async () => {
    const r = await checkSend(input, deps(source({ dryRun: async () => false }), memWith([])));
    expect(r.verdict.level).toBe("reflection");
    expect(r.verdict.reasons.join(" ")).toMatch(/simulation/i);
  });
});

describe("checkSend amount comparison", () => {
  // Saved before any history existed, so its stored ratio is the neutral 1, not its real size.
  const frozen: Decision = { ...denial(9), amount: 0.5, features: { ...feat, amountRatio: 1, hour: 14 } };
  const small = source({ listOutgoing: async () => [{ recipient: "0xother", amount: 0.01, ts: 1 }] });
  const run = (amount: number) =>
    checkSend({ ...input, amount }, { source: small, mem: memWith([frozen]), hour: () => 14, timing });

  it("compares real amounts, not ratios frozen when the decision was saved", async () => {
    const same = await run(0.5);
    const tiny = await run(0.01);
    expect(same.verdict.matches[0].similarity).toBeCloseTo(1, 5);
    expect(tiny.verdict.matches[0].similarity).toBeLessThan(same.verdict.matches[0].similarity);
  });

  it("still reports the send's own ratio against the user's usual size", async () => {
    expect((await run(0.5)).features.amountRatio).toBeCloseTo(50, 5);
  });

  it("tells amounts apart even before any history exists", async () => {
    const empty = source({ listOutgoing: async () => [] });
    const go = (amount: number) =>
      checkSend({ ...input, amount }, { source: empty, mem: memWith([frozen]), hour: () => 14, timing });
    expect((await go(0.5)).verdict.matches[0].similarity).toBeCloseTo(1, 5);
    expect((await go(0.01)).verdict.matches[0].similarity).toBeLessThan(0.75);
  });
});

describe("recordDecision", () => {
  it("saves a denial with a generated id and returns a pending job", async () => {
    const r = await recordDecision(
      { action: "deny", recipient: "0xnew", amount: 7, reason: "too big", kind: "soft", features: feat, source: "real" },
      { mem: memWith([]), now: () => 1_700_000_000, newId: () => "id-1" },
    );
    expect(r).toEqual({ id: "id-1", jobId: "job1" });
  });

  it("returns a retry state when Memory is rate limited", async () => {
    const limited: MemLike = {
      ...memWith([]),
      remember: async () => { throw Object.assign(new Error("rl"), { name: "MemWalRateLimitedError" }); },
    };
    const r = await recordDecision(
      { action: "deny", recipient: "0xnew", amount: 7, reason: "x", kind: "soft", features: feat, source: "real" },
      { mem: limited, now: () => 1, newId: () => "id-2" },
    );
    expect(r).toEqual({ id: "id-2", retry: true });
  });
});

describe("executeAllowed", () => {
  it("only allows execution when ALLOW_EXECUTE is exactly 'true'", () => {
    expect(executeAllowed({ ALLOW_EXECUTE: "true" })).toBe(true);
    expect(executeAllowed({ ALLOW_EXECUTE: "false" })).toBe(false);
    expect(executeAllowed({ ALLOW_EXECUTE: "TRUE " })).toBe(false);
    expect(executeAllowed({})).toBe(false);
  });
});
