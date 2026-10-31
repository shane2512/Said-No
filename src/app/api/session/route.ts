import { z } from "zod";
import { verifySignIn, sessionSecret } from "@/lib/session";
import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
const limit = createLimiter({ limit: 10, windowMs: 60_000 });

const body = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/),
  expires: z.number().int(),
  signature: z.string().min(1).max(2_000),
});

/** Trades a signed sign-in message for a token that unlocks this wallet's own memories. */
export async function POST(req: Request) {
  const tooMany = limited(limit, req);
  if (tooMany) return tooMany;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const out = await verifySignIn(parsed.data, { secret: sessionSecret(), now: Date.now });
  return "token" in out ? Response.json(out) : Response.json(out, { status: 401 });
}
