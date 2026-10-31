import { z } from "zod";
import { buildTransfer } from "@/lib/chain";
import { getRuntime } from "@/lib/runtime";
import { checkSend, executeAllowed, publicView, sendGate } from "@/lib/service";
import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const buildLimit = createLimiter({ limit: 5, windowMs: 60_000 });

const address = z.string().regex(/^0x[0-9a-fA-F]{1,64}$/);
const body = z.object({
  sender: address,
  recipient: address,
  amount: z.number().positive().max(1e9),
  acknowledged: z.boolean().default(false),
  hour: z.number().int().min(0).max(23).optional(),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

/** Re-checks the send, then builds an unsigned transfer for the visitor's own wallet to sign. No key is held here. */
export async function POST(req: Request) {
  const tooMany = limited(buildLimit, req);
  if (tooMany) return tooMany;
  const executeOn = executeAllowed(process.env);
  if (!executeOn) return Response.json({ error: "Sending is off on this deployment." }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const { sender, recipient, amount, acknowledged, hour, network } = parsed.data;
  try {
    const rt = getRuntime(network);
    // The browser's earlier verdict is not trusted: check again before offering anything to sign.
    const check = await checkSend(
      { sender, recipient, amount },
      { source: rt.source, mem: rt.mem, hour: () => hour ?? new Date().getUTCHours(), publicView: publicView(process.env) },
    );
    const gate = sendGate({ level: check.verdict.level, amount, acknowledged, executeOn, dryRunOk: check.facts?.dryRunOk ?? false });
    if (!gate.ok) return Response.json({ error: gate.reason, level: check.verdict.level }, { status: gate.status });
    return Response.json({ transaction: await buildTransfer(rt.client, sender, recipient, amount), network: rt.network });
  } catch (e) {
    return Response.json({ error: "build failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
