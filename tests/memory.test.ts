import { describe, it, expect } from "vitest";
import { saveDecision, finishDecision, loadDecisions, type MemLike } from "@/lib/memory";
import type { Decision } from "@/lib/types";

const features = { novelRecipient: true, amountRatio: 3.5, hour: 23, interactions: 0 };
const base: Decision = {
  id: "d1",
  recipient: "0xabc",
  amount: 7,
  reason: "amount too high",
  ts: 1_700_000_000,
  features,
  action: "deny",
  source: "demo",
  kind: "soft",
};

type Stored = { text: string; blob_id: string; namespace: string };

function fakeMem(opts: { failFirstWrites?: number } = {}) {
  const stored: Stored[] = [];
  let writes = 0;
  let failures = opts.failFirstWrites ?? 0;
  const mem: MemLike = {
    async remember(text, namespace) {
      writes += 1;
      if (failures > 0) {
        failures -= 1;
        throw Object.assign(new Error("rate limited"), { name: "MemWalRateLimitedError" });
      }
      const job_id = `job${stored.length + 1}`;
      stored.push({ text, blob_id: `blob${stored.length + 1}`, namespace: namespace ?? "default" });
      return { job_id, status: "pending" };
    },
    async waitForRememberJob(jobId) {
      const i = Number(jobId.replace("job", "")) - 1;
      return { blob_id: stored[i].blob_id };
    },
    async recall({ namespace }) {
      const results = stored
        .filter((s) => s.namespace === (namespace ?? "default"))
        .map((s) => ({ blob_id: s.blob_id, text: s.text, distance: 0.1 }));
      return { results, total: results.length };
    },
  };
  return { mem, stored, writeCount: () => writes };
}

describe("memory layer", () => {
  it("stores a natural-language line plus a JSON line in the memory client's own namespace", async () => {
    const { mem, stored } = fakeMem();
    const res = await saveDecision(base, { mem });
    expect(res).toEqual({ jobId: "job1" });
    expect(stored[0].namespace).toBe("default"); // never an explicit shared namespace
    expect(stored[0].text).toContain("amount too high");
    expect(stored[0].text).toContain("DECISION_JSON:");
  });

  it("loads valid decisions back with their blob id", async () => {
    const { mem } = fakeMem();
    await saveDecision(base, { mem });
    const { decisions, ignored } = await loadDecisions({ mem });
    expect(ignored).toBe(0);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ id: "d1", reason: "amount too high", blobId: "blob1" });
  });

  it("ignores and counts malformed memories without throwing", async () => {
    const { mem, stored } = fakeMem();
    stored.push(
      { text: "just a note", blob_id: "b1", namespace: "default" },
      { text: "DECISION_JSON:{not json", blob_id: "b2", namespace: "default" },
      { text: 'DECISION_JSON:{"id":"x"}', blob_id: "b3", namespace: "default" },
    );
    const { decisions, ignored } = await loadDecisions({ mem });
    expect(decisions).toHaveLength(0);
    expect(ignored).toBe(3);
  });

  it("returns a retry state on a rate limit and loses nothing on the retry", async () => {
    const { mem, stored } = fakeMem({ failFirstWrites: 1 });
    expect(await saveDecision(base, { mem })).toEqual({ retry: true });
    expect(stored).toHaveLength(0);
    expect(await saveDecision(base, { mem })).toEqual({ jobId: "job1" });
    expect(stored).toHaveLength(1);
  });

  it("writes a decision only once when the same id is saved twice", async () => {
    const { mem, stored, writeCount } = fakeMem();
    const a = await saveDecision({ ...base, id: "dup" }, { mem });
    const b = await saveDecision({ ...base, id: "dup" }, { mem });
    expect(a).toEqual(b);
    expect(stored).toHaveLength(1);
    expect(writeCount()).toBe(1);
  });

  it("finishDecision resolves the blob id of a saved job", async () => {
    const { mem } = fakeMem();
    const saved = await saveDecision({ ...base, id: "fin" }, { mem });
    if (!("jobId" in saved)) throw new Error("expected a job");
    expect(await finishDecision(saved.jobId, { mem })).toEqual({ blobId: "blob1" });
  });

  it("keeps delete decisions (append-only) and the target they remove", async () => {
    const { mem } = fakeMem();
    await saveDecision({ ...base, id: "del", action: "delete", target: "d1" }, { mem });
    const { decisions } = await loadDecisions({ mem });
    expect(decisions[0]).toMatchObject({ action: "delete", target: "d1" });
  });
});

import { fromMemWal } from "@/lib/memory";
describe("fromMemWal", () => {
  it("always uses its own namespace, even if a caller passes another", async () => {
    const seen: (string | undefined)[] = [];
    const fake = {
      remember: async (_t: string, ns?: string) => { seen.push(ns); return { job_id: "1" }; },
      recall: async (p: { namespace?: string }) => { seen.push(p.namespace); return { results: [], total: 0 }; },
      waitForRememberJob: async () => ({ blob_id: "b" }),
    };
    const mem = fromMemWal(fake as never, "wallet-0xa");
    await mem.remember("x", "someone-elses");
    await mem.recall({ query: "q", namespace: "someone-elses" });
    expect(seen).toEqual(["wallet-0xa", "wallet-0xa"]);
  });
});
