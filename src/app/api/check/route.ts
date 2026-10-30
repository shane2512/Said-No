import { z } from "zod";
import { getRuntime } from "@/lib/runtime";
import { checkSend, publicView } from "@/lib/service";

import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const checkLimit = createLimiter({ limit: 10, windowMs: 60_000 });

const body = z.object({
  recipient: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/),
  amount: z.number().positive().max(1e9),
  hour: z.number().int().min(0).max(23).optional(),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

export async function POST(req: Request) {
  const tooMany = limited(checkLimit, req);
  if (tooMany) return tooMany;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const { recipient, amount, hour, network } = parsed.data;
  try {
    const rt = getRuntime(network);
    const result = await checkSend(
      { sender: rt.address, recipient, amount },
      { source: rt.source, mem: rt.mem, hour: () => hour ?? new Date().getUTCHours(), publicView: publicView(process.env) },
    );
    return Response.json({ network: rt.network, memory: rt.memory, sender: rt.address, ...result });
  } catch (e) {
    return Response.json({ error: "check failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
