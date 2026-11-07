import { describe, it, expect } from "vitest";
import { createLocalMem } from "@/lib/memory-local";
import { loadDecisions, saveDecision, finishDecision } from "@/lib/memory";
import { sendGate, writesAllowed } from "@/lib/service";
import type { Decision } from "@/lib/types";

const d = (id: string): Decision => ({
  id, recipient: "0xabc", amount: 7, reason: "too big", ts: 1,
  features: { novelRecipient: true, amountRatio: 3.5, hour: 2, interactions: 0 },
  action: "deny", source: "demo", kind: "soft",
});

describe("local memory backend", () => {
  it("round-trips decisions through the real memory layer with a fake blob id", async () => {
    const mem = createLocalMem();
    const saved = await saveDecision(d("a"), { mem });
    if (!("jobId" in saved)) throw new Error("expected a job");
    const { blobId } = await finishDecision(saved.jobId, { mem });
    expect(blobId).toMatch(/^local-/);
    const { decisions } = await loadDecisions({ mem });
    expect(decisions.map((x) => x.id)).toEqual(["a"]);
    expect(decisions[0].blobId).toBe(blobId);
  });

  it("keeps separate instances separate", async () => {
    const a = createLocalMem();
    const b = createLocalMem();
    await saveDecision(d("only-a"), { mem: a });
    expect((await loadDecisions({ mem: b })).decisions).toHaveLength(0);
  });
});

describe("writesAllowed", () => {
  it("is on in development and off in production unless explicitly enabled", () => {
    expect(writesAllowed({ NODE_ENV: "development" })).toBe(true);
    expect(writesAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(writesAllowed({ NODE_ENV: "production", ALLOW_WRITES: "true" })).toBe(true);
  });
});

describe("sendGate", () => {
  it("lets a normal send through when execution is enabled", () => {
    expect(sendGate({ level: "normal", amount: 0.01, acknowledged: false, executeOn: true, dryRunOk: true })).toEqual({ ok: true });
  });

  it("refuses when execution is disabled", () => {
    expect(sendGate({ level: "normal", amount: 0.01, acknowledged: true, executeOn: false, dryRunOk: true })).toMatchObject({ ok: false, status: 403 });
  });

  it("requires explicit acknowledgement at reminder level or above", () => {
    for (const level of ["reminder", "reflection", "hold"] as const) {
      expect(sendGate({ level, amount: 0.01, acknowledged: false, executeOn: true, dryRunOk: true })).toMatchObject({ ok: false, status: 409 });
      expect(sendGate({ level, amount: 0.01, acknowledged: true, executeOn: true, dryRunOk: true })).toEqual({ ok: true });
    }
  });

  it("refuses when the dry-run did not succeed, even if acknowledged", () => {
    expect(sendGate({ level: "reflection", amount: 0.01, acknowledged: true, executeOn: true, dryRunOk: false })).toMatchObject({ ok: false, status: 409 });
  });
});
