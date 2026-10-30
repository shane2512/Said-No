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
