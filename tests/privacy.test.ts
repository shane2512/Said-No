import { describe, it, expect } from "vitest";
import { checkSend, publicView, visibleDecisions } from "@/lib/service";
import type { MemLike } from "@/lib/memory";
import type { ChainSource } from "@/lib/tatum";
import type { Decision } from "@/lib/types";

const feat = { novelRecipient: true, amountRatio: 1, hour: 14, interactions: 0 };
const dec = (id: string, source: Decision["source"], over: Partial<Decision> = {}): Decision => ({
  id, recipient: "0xsecret", amount: 0.5, reason: `private reason ${id}`, ts: 1,
  features: feat, action: "deny", source, kind: "soft", blobId: `blob-${id}`, ...over,
});

describe("publicView", () => {
  it("is on in production unless private data is explicitly exposed", () => {
    expect(publicView({ NODE_ENV: "production" })).toBe(true);
    expect(publicView({ NODE_ENV: "production", EXPOSE_PRIVATE: "true" })).toBe(false);
  });
  it("is off in development and test", () => {
    expect(publicView({ NODE_ENV: "development" })).toBe(false);
    expect(publicView({})).toBe(false);
  });
});

describe("visibleDecisions", () => {
  const all = [dec("a", "real"), dec("b", "demo"), dec("c", "seeded"), dec("d", "real", { action: "delete", target: "a" })];

  it("hides every real record on a public deployment and only counts them", () => {
    const { decisions, hiddenReal } = visibleDecisions(all, true);
    expect(decisions.map((d) => d.id)).toEqual(["b", "c"]);
    expect(hiddenReal).toBe(2);
  });

  it("leaves nothing out when private", () => {
    const { decisions, hiddenReal } = visibleDecisions(all, false);
    expect(decisions).toHaveLength(4);
    expect(hiddenReal).toBe(0);
  });

  it("never lets a hidden record's text or blob id appear in what it returns", () => {
    const json = JSON.stringify(visibleDecisions(all, true));
    expect(json).not.toContain("private reason a");
    expect(json).not.toContain("blob-a");
  });
});

describe("checkSend on a public deployment", () => {
  const source: ChainSource = { getBalance: async () => 5, listOutgoing: async () => [], dryRun: async () => true };
  const timing = { now: () => 0, sleep: async () => {}, minIntervalMs: 0 };
  const mem = (ds: Decision[]): MemLike => ({
    remember: async () => ({ job_id: "j" }),
    waitForRememberJob: async () => ({ blob_id: "b" }),
    recall: async () => ({
      results: ds.map((d) => ({ blob_id: d.blobId ?? "b", distance: 0.1, text: `x\nDECISION_JSON:${JSON.stringify(d)}` })),
      total: ds.length,
    }),
  });
  const input = { sender: "0xme", recipient: "0xnew", amount: 0.5 };

  it("ignores real denials: no flip, no match, and nothing private in the response", async () => {
    const r = await checkSend(input, { source, mem: mem([dec("r1", "real")]), hour: () => 14, timing, publicView: true });
    expect(r.verdict.level).toBe("normal");
    expect(r.verdict.matches).toHaveLength(0);
    expect(JSON.stringify(r)).not.toContain("private reason r1");
    expect(JSON.stringify(r)).not.toContain("blob-r1");
  });

  it("still uses demo denials on a public deployment", async () => {
    const r = await checkSend(input, { source, mem: mem([dec("m1", "demo")]), hour: () => 14, timing, publicView: true });
    expect(r.verdict.level).toBe("reflection");
  });

  it("uses real denials when private, so the owner's own verdicts keep their memory", async () => {
    const r = await checkSend(input, { source, mem: mem([dec("r1", "real")]), hour: () => 14, timing, publicView: false });
    expect(r.verdict.level).toBe("reflection");
    expect(r.verdict.matches[0].decision.reason).toBe("private reason r1");
  });
});
