import { evaluate } from "./engine";
import { deriveFeatures } from "./features";
import { loadDecisions, saveDecision, type MemLike } from "./memory";
import { getChainFacts, type ChainFacts, type ChainSource, type RequestLogEntry, type Timing } from "./tatum";
import type { Decision, Features, Level, Verdict } from "./types";

const ORDER: Level[] = ["normal", "reminder", "reflection", "hold"];
const atLeast = (level: Level, min: Level): Level => (ORDER.indexOf(level) >= ORDER.indexOf(min) ? level : min);

export type CheckDeps = { source: ChainSource; mem: MemLike; hour: () => number; timing?: Timing };

export type CheckResult = {
  verdict: Verdict;
  features: Features;
  facts?: ChainFacts;
  requestLog: RequestLogEntry[];
  ignoredMemories: number;
};

/**
 * Combines live chain facts (Tatum) with the user's remembered decisions (Walrus Memory).
 * Fails closed: any unavailable input raises the verdict to at least "reflection".
 */
export async function checkSend(
  input: { sender: string; recipient: string; amount: number },
  deps: CheckDeps,
): Promise<CheckResult> {
  const facts = await getChainFacts(input.sender, input.recipient, input.amount, deps.source, deps.timing);

  let decisions: Decision[] = [];
  let ignoredMemories = 0;
  let memoryOk = true;
  try {
    const loaded = await loadDecisions({ mem: deps.mem });
    decisions = loaded.decisions;
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

  const verdict = evaluate(features, input.recipient, decisions);
  const extra: string[] = [];
  if (!available) extra.push(`Tatum check unavailable: ${facts.reason}`);
  if (!memoryOk) extra.push("memory unavailable: could not read your past decisions");
  if (available && !facts.dryRunOk) extra.push("simulation failed: the dry-run of this send did not succeed");
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

/** Upper bound on any send from the demo wallet. */
export const MAX_SEND_SUI = 0.1;

export type GateInput = { level: Level; amount: number; acknowledged: boolean; executeOn: boolean; dryRunOk: boolean };
export type GateResult = { ok: true } | { ok: false; status: number; reason: string };

/** The last check before a send. The user stays in control, but friction must be acknowledged. */
export function sendGate(g: GateInput): GateResult {
  if (!g.executeOn) return { ok: false, status: 403, reason: "Execution is off on this deployment." };
  if (g.amount > MAX_SEND_SUI) return { ok: false, status: 400, reason: `The demo wallet sends at most ${MAX_SEND_SUI} SUI.` };
  if (!g.dryRunOk) return { ok: false, status: 409, reason: "The dry-run did not succeed, so this send was not submitted." };
  if (g.level !== "normal" && !g.acknowledged) return { ok: false, status: 409, reason: "Confirm that this send is intentional first." };
  return { ok: true };
}
