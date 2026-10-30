import { evaluate } from "./engine";
import type { Decision, Features, Level } from "./types";

export type ReplayFile = {
  recordedOn: string;
  note: string;
  recipient: string;
  blobId: string;
  digest: string;
  decision: Omit<Decision, "features">;
  steps: {
    title: string;
    caption: string;
    candidate: Features;
    amount: number;
    remembered: boolean;
    saved?: boolean;
    expect: { level: Level; similarity: number | null };
  }[];
};

export type ReplayStep = {
  title: string;
  caption: string;
  amount: number;
  level: Level;
  counterfactual: Level;
  similarity: number | null;
  remembered: boolean;
  saved: boolean;
  quote: string | null;
};

/**
 * Re-runs the real engine over the recorded run. Each step puts the send and the stored
 * decision on one baseline, exactly as the live check does, so the recording cannot drift
 * from what the code actually decides.
 */
export function runReplay(r: ReplayFile): ReplayStep[] {
  return r.steps.map((s) => {
    const baseline = s.amount / s.candidate.amountRatio;
    const stored: Decision = {
      ...r.decision,
      blobId: r.blobId,
      features: { novelRecipient: true, amountRatio: r.decision.amount / baseline, hour: s.candidate.hour, interactions: 0 },
    };
    const v = evaluate(s.candidate, r.recipient, s.remembered ? [stored] : []);
    const top = v.matches.filter((m) => m.decision.action === "deny").sort((a, b) => b.similarity - a.similarity)[0];
    return {
      title: s.title,
      caption: s.caption,
      amount: s.amount,
      level: v.level,
      counterfactual: v.counterfactualLevel,
      similarity: top ? top.similarity : null,
      remembered: s.remembered,
      saved: Boolean(s.saved),
      quote: s.remembered ? r.decision.reason : null,
    };
  });
}
