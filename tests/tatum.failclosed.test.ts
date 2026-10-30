import { describe, it, expect } from "vitest";
import { getChainFacts, type ChainSource } from "@/lib/tatum";

function fakeClock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

const rateLimited = () => Object.assign(new Error("Received HTTP status code 429"), { status: 429 });

function okSource(overrides: Partial<ChainSource> = {}): ChainSource {
  return {
    getBalance: async () => 10,
    listOutgoing: async () => [
      { recipient: "0xaaa", amount: 1, ts: 1 },
      { recipient: "0xbbb", amount: 3, ts: 2 },
      { recipient: "0xaaa", amount: 2, ts: 3 },
    ],
    dryRun: async () => true,
    ...overrides,
  };
}

describe("getChainFacts", () => {
  it("derives balance, median amount, history counts and a request log", async () => {
    const facts = await getChainFacts("0xme", "0xaaa", 5, okSource(), fakeClock());
    expect(facts).toMatchObject({
      balance: 10,
      medianAmount: 2,
      priorTxCount: 3,
      priorToRecipient: 2,
      dryRunOk: true,
    });
    if ("unavailable" in facts) throw new Error("expected facts");
    expect(facts.requestLog.map((r) => r.method)).toEqual(["getBalance", "listOutgoing", "dryRun"]);
    expect(facts.requestLog.every((r) => r.ok)).toBe(true);
  });

  it("reports unavailable (never partial facts) when Tatum keeps rate limiting", async () => {
    const source = okSource({
      listOutgoing: async () => {
        throw rateLimited();
      },
    });
    const facts = await getChainFacts("0xme", "0xaaa", 5, source, fakeClock());
    expect(facts).toMatchObject({ unavailable: true });
    expect((facts as { reason: string }).reason).toMatch(/rate limit/i);
  });

  it("retries a transient 429 and then succeeds", async () => {
    let calls = 0;
    const source = okSource({
      getBalance: async () => {
        calls += 1;
        if (calls < 2) throw rateLimited();
        return 7;
      },
    });
    const facts = await getChainFacts("0xme", "0xaaa", 5, source, fakeClock());
    expect(calls).toBe(2);
    expect(facts).toMatchObject({ balance: 7 });
  });

  it("spaces consecutive requests by at least the minimum interval", async () => {
    const clock = fakeClock();
    const stamps: number[] = [];
    const source = okSource({
      getBalance: async () => (stamps.push(clock.now()), 1),
      listOutgoing: async () => (stamps.push(clock.now()), []),
      dryRun: async () => (stamps.push(clock.now()), true),
    });
    await getChainFacts("0xme", "0xaaa", 1, source, { ...clock, minIntervalMs: 400 });
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(400);
    expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(400);
  });

  it("treats an empty history as median 0 without throwing", async () => {
    const facts = await getChainFacts("0xme", "0xaaa", 1, okSource({ listOutgoing: async () => [] }), fakeClock());
    expect(facts).toMatchObject({ medianAmount: 0, priorTxCount: 0, priorToRecipient: 0 });
  });
});
