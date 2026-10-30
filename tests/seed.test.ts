import { describe, it, expect } from "vitest";
import { buildMainnetSet } from "@/lib/seed-data";
import { saveDecision, finishDecision, loadDecisions } from "@/lib/memory";
import { createLocalMem } from "@/lib/memory-local";
import { evaluate } from "@/lib/engine";

describe("mainnet memory set", () => {
  const set = buildMainnetSet("seeded", 1_800_000_000);

  it("has at least 12 entries so the hackathon's 10 are cleared with margin", () => {
    expect(set.length).toBeGreaterThanOrEqual(12);
  });

  it("uses unique ids, spaced timestamps and the requested label on every entry", () => {
    expect(new Set(set.map((d) => d.id)).size).toBe(set.length);
    expect(new Set(set.map((d) => d.ts)).size).toBe(set.length);
    expect(set.every((d) => d.source === "seeded")).toBe(true);
    expect(buildMainnetSet("real", 1)[0].source).toBe("real");
  });

  it("covers every kind of memory and every action, not twelve copies of one denial", () => {
    expect(new Set(set.map((d) => d.kind))).toEqual(new Set(["hard", "soft", "context"]));
    expect(new Set(set.map((d) => d.action))).toEqual(new Set(["deny", "approve", "override", "delete"]));
    expect(new Set(set.map((d) => d.reason)).size).toBeGreaterThanOrEqual(10);
  });

  it("varies the situations: new and known recipients, day and night, small and large", () => {
    expect(set.some((d) => d.features.novelRecipient)).toBe(true);
    expect(set.some((d) => !d.features.novelRecipient)).toBe(true);
    expect(set.some((d) => d.features.hour <= 5)).toBe(true);
    expect(set.some((d) => d.features.hour >= 10)).toBe(true);
    expect(Math.max(...set.map((d) => d.amount))).toBeGreaterThan(10 * Math.min(...set.map((d) => d.amount)));
  });

  it("deletes only something that exists in the same set", () => {
    const ids = new Set(set.map((d) => d.id));
    set.filter((d) => d.action === "delete").forEach((d) => expect(ids.has(d.target!)).toBe(true));
  });

  it("round-trips through the real memory layer and keeps every entry readable", async () => {
    const mem = createLocalMem();
    for (const d of set) {
      const saved = await saveDecision(d, { mem });
      if (!("jobId" in saved)) throw new Error("expected a job");
      await finishDecision(saved.jobId, { mem });
    }
    const { decisions, ignored } = await loadDecisions({ mem });
    expect(ignored).toBe(0);
    expect(decisions).toHaveLength(set.length);
  });

  it("gives the engine something real to learn from: a repeated pattern escalates", () => {
    const denials = set.filter((d) => d.action === "deny");
    const probe = { novelRecipient: true, amountRatio: 3.5, hour: 14, interactions: 0 };
    const v = evaluate(probe, "0xnew", set);
    expect(denials.length).toBeGreaterThanOrEqual(6);
    expect(["reminder", "reflection", "hold"]).toContain(v.level);
  });
});
