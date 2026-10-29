import { describe, it, expect } from "vitest";
import { deriveFeatures } from "@/lib/features";

describe("deriveFeatures", () => {
  it("flags a new recipient and computes the amount ratio against the median", () => {
    const f = deriveFeatures({
      amount: 7,
      medianAmount: 2,
      hour: 14,
      priorTxCount: 20,
      priorToRecipient: 0,
    });
    expect(f).toEqual({ novelRecipient: true, amountRatio: 3.5, hour: 14, interactions: 0 });
  });

  it("marks a known recipient and keeps the interaction count", () => {
    const f = deriveFeatures({
      amount: 1,
      medianAmount: 2,
      hour: 3,
      priorTxCount: 20,
      priorToRecipient: 3,
    });
    expect(f.novelRecipient).toBe(false);
    expect(f.interactions).toBe(3);
    expect(f.amountRatio).toBe(0.5);
  });

  it("does not produce Infinity or NaN when the median is zero", () => {
    const f = deriveFeatures({
      amount: 5,
      medianAmount: 0,
      hour: 9,
      priorTxCount: 0,
      priorToRecipient: 0,
    });
    expect(Number.isFinite(f.amountRatio)).toBe(true);
  });
});
