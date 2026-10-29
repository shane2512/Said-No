import type { Decision, Features, Level, Match, Verdict } from "./types";

export const WEIGHTS = { recipient: 0.35, amount: 0.3, hour: 0.2, interaction: 0.15 } as const;
const MATCH_FLOOR = 0.4;
const LEVELS: Level[] = ["normal", "reminder", "reflection", "hold"];

const hourBand = (h: number) => (h >= 0 && h <= 5 ? "night" : "day");
const interactionBucket = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : 2);
const logRatio = (r: number) => Math.log(Math.max(r, 1e-9));

export function similarity(c: Features, d: Features): number {
  const mRecipient = c.novelRecipient === d.novelRecipient ? 1 : 0;
  const mAmount =
    1 - Math.min(1, Math.abs(logRatio(c.amountRatio) - logRatio(d.amountRatio)) / Math.log(4));
  const mHour = hourBand(c.hour) === hourBand(d.hour) ? 1 : 0;
  const mInteraction = interactionBucket(c.interactions) === interactionBucket(d.interactions) ? 1 : 0;
  return (
    WEIGHTS.recipient * mRecipient +
    WEIGHTS.amount * mAmount +
    WEIGHTS.hour * mHour +
    WEIGHTS.interaction * mInteraction
  );
}

function baseLevel(best: number, denialCount: number): Level {
  if (best >= 0.85) return denialCount >= 2 ? "hold" : "reflection";
  if (best >= 0.7) return "reflection";
  return "reminder";
}

function lower(level: Level): Level {
  return LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];
}

export function evaluate(c: Features, recipient: string, decisions: Decision[]): Verdict {
  const deleted = new Set(decisions.filter((d) => d.action === "delete").map((d) => d.target));
  const valid = decisions.filter((d) => d.action !== "delete" && !deleted.has(d.id));

  const matches: Match[] = valid
    .map((decision) => ({ decision, similarity: similarity(c, decision.features) }))
    .filter((m) => m.similarity >= MATCH_FLOOR - 1e-9);
  const denialMatches = matches.filter((m) => m.decision.action === "deny");
  const approvalMatches = matches.length - denialMatches.length;

  const sumDeny = denialMatches.reduce((s, m) => s + m.similarity, 0);
  const sumAll = matches.reduce((s, m) => s + m.similarity, 0);
  const score = (sumDeny + 0.5) / (sumAll + 1);

  const counterfactualLevel: Level = "normal";
  const reasons: string[] = [];

  const hard = valid.find(
    (d) => d.action === "deny" && d.kind === "hard" && d.recipient === recipient,
  );
  if (hard) {
    reasons.push(`You marked this recipient as never send: "${hard.reason}"`);
    return { level: "hold", score, matches, counterfactualLevel, reasons };
  }

  if (denialMatches.length === 0) {
    reasons.push(valid.length === 0 ? "learning (0): no history yet" : "no similar past denials");
    return { level: "normal", score, matches, counterfactualLevel, reasons };
  }

  const best = Math.max(...denialMatches.map((m) => m.similarity));
  let level = baseLevel(best, denialMatches.length);
  reasons.push(`${denialMatches.length} similar denial(s), best similarity ${best.toFixed(2)}`);

  if (approvalMatches > denialMatches.length) {
    level = "normal";
    reasons.push("you approved similar sends more often than you denied them");
  } else if (approvalMatches === denialMatches.length) {
    level = lower(level);
    reasons.push("equal approvals offset one level");
  }

  return { level, score, matches, counterfactualLevel, reasons };
}
