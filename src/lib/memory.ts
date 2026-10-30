import { z } from "zod";
import type { MemWal } from "@mysten-incubation/memwal";
import type { Decision } from "./types";

export const NAMESPACE = "decisions";
const PREFIX = "DECISION_JSON:";

/** The subset of the Walrus Memory SDK this app uses; lets tests inject a fake. */
export type MemLike = {
  remember(text: string, namespace?: string): Promise<{ job_id: string; status?: string }>;
  waitForRememberJob(jobId: string): Promise<{ blob_id: string }>;
  recall(params: {
    query: string;
    limit?: number;
    namespace?: string;
  }): Promise<{ results: { blob_id: string; text: string; distance: number; created_at?: string }[]; total: number }>;
};

export function fromMemWal(m: MemWal): MemLike {
  return {
    remember: (text, namespace) => m.remember(text, namespace),
    waitForRememberJob: (jobId) => m.waitForRememberJob(jobId),
    recall: (params) => m.recall(params),
  };
}

const featuresSchema = z.object({
  novelRecipient: z.boolean(),
  amountRatio: z.number().finite(),
  hour: z.number().int().min(0).max(23),
  interactions: z.number().int().min(0),
});

const decisionSchema = z.object({
  id: z.string().min(1),
  recipient: z.string(),
  amount: z.number().finite(),
  reason: z.string(),
  ts: z.number(),
  features: featuresSchema,
  action: z.enum(["deny", "approve", "override", "delete"]),
  source: z.enum(["real", "seeded", "demo"]),
  kind: z.enum(["hard", "soft", "context"]),
  target: z.string().optional(),
});

const isRateLimited = (e: unknown) =>
  (e as Error)?.name === "MemWalRateLimitedError" || (e as { status?: number })?.status === 429;

/** Decision ids already accepted by a given memory client, so a repeated click never double-writes. */
const accepted = new WeakMap<MemLike, Map<string, string>>();

export async function saveDecision(
  d: Decision,
  deps: { mem: MemLike },
): Promise<{ jobId: string } | { retry: true }> {
  const seen = accepted.get(deps.mem) ?? new Map<string, string>();
  accepted.set(deps.mem, seen);
  const existing = seen.get(d.id);
  if (existing) return { jobId: existing };

  const { blobId: _omit, ...payload } = d;
  const text = `${d.action} ${d.amount} to ${d.recipient}: ${d.reason}\n${PREFIX}${JSON.stringify(payload)}`;
  try {
    const { job_id } = await deps.mem.remember(text, NAMESPACE);
    seen.set(d.id, job_id);
    return { jobId: job_id };
  } catch (e) {
    if (isRateLimited(e)) return { retry: true };
    throw e;
  }
}

export async function finishDecision(jobId: string, deps: { mem: MemLike }): Promise<{ blobId: string }> {
  const { blob_id } = await deps.mem.waitForRememberJob(jobId);
  return { blobId: blob_id };
}

export async function loadDecisions(deps: {
  mem: MemLike;
}): Promise<{ decisions: Decision[]; ignored: number }> {
  const { results } = await deps.mem.recall({ query: "said-no decision", limit: 100, namespace: NAMESPACE });
  const byId = new Map<string, Decision>();
  let ignored = 0;
  for (const r of results) {
    const line = r.text.split("\n").find((l) => l.startsWith(PREFIX));
    if (!line) {
      ignored += 1;
      continue;
    }
    try {
      const parsed = decisionSchema.safeParse(JSON.parse(line.slice(PREFIX.length)));
      if (!parsed.success) {
        ignored += 1;
        continue;
      }
      byId.set(parsed.data.id, { ...parsed.data, blobId: r.blob_id });
    } catch {
      ignored += 1;
    }
  }
  return { decisions: [...byId.values()], ignored };
}
