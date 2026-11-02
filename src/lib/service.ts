import { evaluate, habits, learnWeights, type Weights } from "./engine";
import { deriveFeatures } from "./features";
import { loadDecisions, saveDecision, similarRefusals, type MemLike } from "./memory";
import { getChainFacts, type ChainFacts, type ChainSource, type RequestLogEntry, type Timing } from "./tatum";
import type { Decision, Features, Level, Verdict } from "./types";

const ORDER: Level[] = ["normal", "reminder", "reflection", "hold"];
const atLeast = (level: Level, min: Level): Level => (ORDER.indexOf(level) >= ORDER.indexOf(min) ? level : min);

export type CheckDeps = { source: ChainSource; mem: MemLike; hour: () => number; timing?: Timing; publicView?: boolean };

/**
 * A public deployment must not reveal the owner's real decisions (typed reasons, recipients, blob ids).
 * On by default in production; EXPOSE_PRIVATE=true turns it off for a private deployment.
 */
export const publicView = (env: Record<string, string | undefined>) =>
  env.NODE_ENV === "production" && env.EXPOSE_PRIVATE !== "true";

/** Drops every real record when public. Returns only a count of what was hidden. */
export function visibleDecisions(all: Decision[], isPublic: boolean): { decisions: Decision[]; hiddenReal: number } {
  if (!isPublic) return { decisions: all, hiddenReal: 0 };
  const decisions = all.filter((d) => d.source !== "real");
  return { decisions, hiddenReal: all.length - decisions.length };
}

export type CheckResult = {
  verdict: Verdict;
  features: Features;
  facts?: ChainFacts;
  requestLog: RequestLogEntry[];
  ignoredMemories: number;
  /** Plain-words patterns found in the user's own refusals. */
  habits: string[];
  /** The factor weights used for this check: personal once you have 3+ refusals. */
  weights: Weights;
};

const BURST_MIN = 3;
const SPIKE_RATIO = 5;

/**
 * Chain-only warnings that need no past refusal. They only ever raise a send to "reminder",
 * so ordinary sends stay silent and a quiet nudge is the most this can cause.
 */
export function riskSignals(f: Features, facts: ChainFacts): { text: string; level: Level }[] {
  const out: { text: string; level: Level }[] = [];
  if (facts.recentSends >= BURST_MIN) out.push({ text: `${facts.recentSends} sends in the last hour. Slow down?`, level: "reminder" });
  if (f.novelRecipient && f.amountRatio >= SPIKE_RATIO)
    out.push({ text: `New recipient, and ${f.amountRatio.toFixed(1)}× your usual send.`, level: "reminder" });
  return out;
}

/**
 * Combines live chain facts (Tatum) with the user's remembered decisions (Walrus Memory).
 * Fails closed: any unavailable input raises the verdict to at least "reflection".
 */
export async function checkSend(
  input: { sender: string; recipient: string; amount: number; note?: string },
  deps: CheckDeps,
): Promise<CheckResult> {
  const facts = await getChainFacts(input.sender, input.recipient, input.amount, deps.source, deps.timing);

  let decisions: Decision[] = [];
  let ignoredMemories = 0;
  let memoryOk = true;
  try {
    const loaded = await loadDecisions({ mem: deps.mem });
    decisions = visibleDecisions(loaded.decisions, deps.publicView ?? false).decisions;
    ignoredMemories = loaded.ignored;
  } catch {
    memoryOk = false;
  }

  const available = !("unavailable" in facts);
  const features = deriveFeatures({
    amount: input.amount,
    medianAmount: available ? facts.medianAmount : 0,
    hour: deps.hour(),
    priorTxCount: available ? facts.priorTxCount : 0,
    priorToRecipient: available ? facts.priorToRecipient : 0,
  });

  // Stored ratios are frozen at save time and the user's usual size moves on, so compare real
  // amounts by putting the send and every past decision on one baseline.
  const baseline = available && facts.medianAmount > 0 ? facts.medianAmount : 1;
  const rebased = decisions.map((d) => ({ ...d, features: { ...d.features, amountRatio: d.amount / baseline } }));
  // Forgotten refusals must not come back through the meaning search.
  const deletedIds = new Set(decisions.filter((d) => d.action === "delete").map((d) => d.target));
  const weights = learnWeights(rebased);
  const verdict = evaluate({ ...features, amountRatio: input.amount / baseline }, input.recipient, rebased, weights);
  const extra: string[] = [];
  if (!available) extra.push(`Tatum check unavailable: ${facts.reason}`);
  if (!memoryOk) extra.push("memory unavailable: could not read your past decisions");
  if (available && !facts.dryRunOk) extra.push("simulation failed: the dry-run of this send did not succeed");
  if (available) {
    for (const s of riskSignals(features, facts)) {
      verdict.level = atLeast(verdict.level, s.level);
      verdict.reasons.push(s.text);
    }
    if (facts.screen.status === "flagged") {
      verdict.level = "hold";
      verdict.reasons.push(`Tatum lists this address as malicious${facts.screen.why ? `: ${facts.screen.why}` : ""}.`);
    }
  }
  // Optional note: if it means what an earlier refusal meant, quote that refusal. A nudge, never a block.
  if (input.note?.trim() && memoryOk) {
    try {
      const [near] = (await similarRefusals(input.note.trim(), { mem: deps.mem })).filter((d) => !deletedIds.has(d.id));
      if (near) {
        verdict.level = atLeast(verdict.level, "reminder");
        verdict.reasons.push(`This sounds like something you refused before: "${near.reason}"`);
      }
    } catch {
      /* the note is a bonus; the check stands without it */
    }
  }
  if (extra.length > 0) {
    verdict.level = atLeast(verdict.level, "reflection");
    verdict.reasons.push(...extra);
  }

  return {
    verdict,
    features,
    facts: available ? facts : undefined,
    requestLog: facts.requestLog,
    ignoredMemories,
    habits: habits(decisions),
    weights,
  };
}

export type DecisionRequest = Pick<
  Decision,
  "action" | "recipient" | "amount" | "reason" | "kind" | "features" | "source" | "target"
> & { id?: string };

export async function recordDecision(
  req: DecisionRequest,
  deps: { mem: MemLike; now: () => number; newId: () => string },
): Promise<{ id: string; jobId: string } | { id: string; retry: true }> {
  const id = req.id ?? deps.newId();
  const decision: Decision = { ...req, id, ts: deps.now() };
  const saved = await saveDecision(decision, { mem: deps.mem });
  return "retry" in saved ? { id, retry: true } : { id, jobId: saved.jobId };
}

/** Execution is off unless explicitly enabled, so a public visitor can never spend. */
export const executeAllowed = (env: Record<string, string | undefined>) => env.ALLOW_EXECUTE === "true";

/** A hosted page must not let anonymous visitors write into the owner's memory account. */
export const writesAllowed = (env: Record<string, string | undefined>) =>
  env.ALLOW_WRITES === "true" || env.NODE_ENV !== "production";

/** Upper bound on any send through this demo. */
export const MAX_SEND_SUI = 0.1;

export type GateInput = { level: Level; amount: number; acknowledged: boolean; executeOn: boolean; dryRunOk: boolean };
export type GateResult = { ok: true } | { ok: false; status: number; reason: string };

/** The last check before a send. The user stays in control, but friction must be acknowledged. */
export function sendGate(g: GateInput): GateResult {
  if (!g.executeOn) return { ok: false, status: 403, reason: "Execution is off on this deployment." };
  if (g.amount > MAX_SEND_SUI) return { ok: false, status: 400, reason: `This demo limits each send to ${MAX_SEND_SUI} SUI.` };
  if (!g.dryRunOk) return { ok: false, status: 409, reason: "The dry-run did not succeed, so this send was not submitted." };
  if (g.level !== "normal" && !g.acknowledged) return { ok: false, status: 409, reason: "Confirm that this send is intentional first." };
  return { ok: true };
}
