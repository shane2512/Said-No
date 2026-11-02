import type { Decision, Features, Level, Match, Verdict } from "./types";

export type Weights = { recipient: number; amount: number; hour: number; interaction: number };
export const WEIGHTS: Weights = { recipient: 0.35, amount: 0.3, hour: 0.2, interaction: 0.15 };
const MATCH_FLOOR = 0.4;
const LEVELS: Level[] = ["normal", "reminder", "reflection", "hold"];

const hourBand = (h: number) => (h >= 0 && h <= 5 ? "night" : "day");
const interactionBucket = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : 2);
const logRatio = (r: number) => Math.log(Math.max(r, 1e-9));

/** How much each factor adds to the similarity of two sends. Shown to the user as the "why". */
export function breakdown(c: Features, d: Features, w: Weights = WEIGHTS) {
  const mAmount =
    1 - Math.min(1, Math.abs(logRatio(c.amountRatio) - logRatio(d.amountRatio)) / Math.log(4));
  return {
    recipient: w.recipient * (c.novelRecipient === d.novelRecipient ? 1 : 0),
    amount: w.amount * mAmount,
    hour: w.hour * (hourBand(c.hour) === hourBand(d.hour) ? 1 : 0),
    interaction: w.interaction * (interactionBucket(c.interactions) === interactionBucket(d.interactions) ? 1 : 0),
  };
}

export function similarity(c: Features, d: Features, w: Weights = WEIGHTS): number {
  const b = breakdown(c, d, w);
  return b.recipient + b.amount + b.hour + b.interaction;
}

const live = (decisions: Decision[]) => {
  const deleted = new Set(decisions.filter((d) => d.action === "delete").map((d) => d.target));
  return decisions.filter((d) => d.action !== "delete" && !deleted.has(d.id));
};

const modalShare = (xs: (string | number)[]) => {
  const n = new Map<string | number, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return Math.max(...n.values()) / xs.length;
};

/**
 * Personal weights. A factor that is the same across your refusals (always night, always a new
 * recipient) is what you actually react to, so it counts for more. Half stays on the fixed
 * weights so a few refusals cannot swing the score far. Needs 3+ refusals, else the fixed weights.
 */
export function learnWeights(decisions: Decision[]): Weights {
  const fs = live(decisions).filter((d) => d.action === "deny").map((d) => d.features);
  if (fs.length < 3) return WEIGHTS;
  const logs = fs.map((f) => logRatio(f.amountRatio)).sort((a, b) => a - b);
  const med = logs[Math.floor(logs.length / 2)];
  const raw: Weights = {
    recipient: modalShare(fs.map((f) => String(f.novelRecipient))),
    amount: logs.filter((l) => Math.abs(l - med) <= Math.log(2)).length / logs.length,
    hour: modalShare(fs.map((f) => hourBand(f.hour))),
    interaction: modalShare(fs.map((f) => interactionBucket(f.interactions))),
  };
  const total = raw.recipient + raw.amount + raw.hour + raw.interaction;
  const mix = (k: keyof Weights) => 0.5 * WEIGHTS[k] + 0.5 * (raw[k] / total);
  return { recipient: mix("recipient"), amount: mix("amount"), hour: mix("hour"), interaction: mix("interaction") };
}

/**
 * Patterns in the user's own refusals, stated in plain words. A pattern needs at least
 * two refusals and 60% of them to share it, so one bad night does not become a rule.
 */
export function habits(decisions: Decision[]): string[] {
  const denials = live(decisions).filter((d) => d.action === "deny");
  if (denials.length < 2) return [];
  const mostly = (p: (f: Features) => boolean) => denials.filter((d) => p(d.features)).length / denials.length >= 0.6;
  const out: string[] = [];
  if (mostly((f) => hourBand(f.hour) === "night")) out.push("You tend to refuse late-night sends.");
  if (mostly((f) => f.novelRecipient)) out.push("You tend to refuse sends to addresses you have never paid.");
  if (mostly((f) => f.amountRatio >= 3)) out.push("You tend to refuse sends well above your usual amount.");
  return out;
}

function baseLevel(best: number, denialCount: number): Level {
  if (best >= 0.85) return denialCount >= 2 ? "hold" : "reflection";
  if (best >= 0.7) return "reflection";
  return "reminder";
}

function lower(level: Level): Level {
  return LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];
}

export function evaluate(c: Features, recipient: string, decisions: Decision[], w: Weights = WEIGHTS): Verdict {
  const valid = live(decisions);

  const matches: Match[] = valid
    .map((decision) => {
      const parts = breakdown(c, decision.features, w);
      return { decision, similarity: parts.recipient + parts.amount + parts.hour + parts.interaction, parts };
    })
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
