import type { Features } from "./types";

export type FeatureInput = {
  amount: number;
  medianAmount: number;
  hour: number;
  priorTxCount: number;
  priorToRecipient: number;
};

export function deriveFeatures(i: FeatureInput): Features {
  return {
    novelRecipient: i.priorToRecipient === 0,
    // With no sending history there is no baseline, so treat the amount as typical (ratio 1).
    amountRatio: i.medianAmount > 0 ? i.amount / i.medianAmount : 1,
    hour: i.hour,
    interactions: i.priorToRecipient,
  };
}
