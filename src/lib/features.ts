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
    amountRatio: i.amount / Math.max(i.medianAmount, 1e-9),
    hour: i.hour,
    interactions: i.priorToRecipient,
  };
}
