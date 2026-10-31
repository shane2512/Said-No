import { z } from "zod";
import { broadcastSigned } from "@/lib/chain";
import { getRuntime } from "@/lib/runtime";
import { executeAllowed } from "@/lib/service";
import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const sendLimit = createLimiter({ limit: 5, windowMs: 60_000 });

const body = z.object({
  bytes: z.string().min(1).max(20_000),
  signature: z.string().min(1).max(2_000),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

/** Submits what the visitor's wallet signed, through Tatum. */
export async function POST(req: Request) {
  const tooMany = limited(sendLimit, req);
  if (tooMany) return tooMany;
  if (!executeAllowed(process.env)) return Response.json({ error: "Sending is off on this deployment." }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  try {
    const rt = getRuntime(parsed.data.network);
    return Response.json({ digest: await broadcastSigned(rt.client, parsed.data.bytes, parsed.data.signature), network: rt.network });
  } catch (e) {
    return Response.json({ error: "send failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
