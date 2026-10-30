import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getRuntime } from "@/lib/runtime";
import { recordDecision, writesAllowed } from "@/lib/service";

import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const decideLimit = createLimiter({ limit: 10, windowMs: 60_000 });

const features = z.object({
  novelRecipient: z.boolean(),
  amountRatio: z.number().finite(),
  hour: z.number().int().min(0).max(23),
  interactions: z.number().int().min(0),
});

const body = z.object({
  id: z.string().min(1).max(100).optional(),
  action: z.enum(["deny", "approve", "override", "delete"]),
  recipient: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/),
  amount: z.number().positive().max(1e9),
  reason: z.string().max(500),
  kind: z.enum(["hard", "soft", "context"]),
  features,
  source: z.enum(["real", "seeded", "demo"]).default("demo"),
  target: z.string().optional(),
});

export async function POST(req: Request) {
  const tooMany = limited(decideLimit, req);
  if (tooMany) return tooMany;
  if (!writesAllowed(process.env)) return Response.json({ error: "Saving decisions is off on this deployment." }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  try {
    const rt = getRuntime();
    const out = await recordDecision(parsed.data, {
      mem: rt.mem,
      now: () => Math.floor(Date.now() / 1000),
      newId: () => randomUUID(),
    });
    // 202: the write is saved in the background (about 25 s); poll /api/jobs/<jobId> for the blob id.
    return "retry" in out ? Response.json(out, { status: 429 }) : Response.json(out, { status: 202 });
  } catch (e) {
    return Response.json({ error: "save failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
