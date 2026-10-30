import { z } from "zod";
import { executeSend } from "@/lib/chain";
import { getRuntime } from "@/lib/runtime";
import { checkSend, executeAllowed, publicView, sendGate } from "@/lib/service";

import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const sendLimit = createLimiter({ limit: 5, windowMs: 60_000 });

const body = z.object({
  recipient: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/),
  amount: z.number().positive().max(1e9),
  acknowledged: z.boolean().default(false),
  hour: z.number().int().min(0).max(23).optional(),
});

export async function POST(req: Request) {
  const tooMany = limited(sendLimit, req);
  if (tooMany) return tooMany;
  const executeOn = executeAllowed(process.env);
  if (!executeOn) return Response.json({ error: "Execution is off on this deployment." }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  const { recipient, amount, acknowledged, hour } = parsed.data;
  try {
    const rt = getRuntime();
    // Re-check on the server: the browser's earlier verdict is not trusted.
    const check = await checkSend(
      { sender: rt.address, recipient, amount },
      { source: rt.source, mem: rt.mem, hour: () => hour ?? new Date().getUTCHours(), publicView: publicView(process.env) },
    );
    const gate = sendGate({ level: check.verdict.level, amount, acknowledged, executeOn, dryRunOk: check.facts?.dryRunOk ?? false });
    if (!gate.ok) return Response.json({ error: gate.reason, level: check.verdict.level }, { status: gate.status });
    const digest = await executeSend(rt.client, rt.keypair, recipient, amount);
    return Response.json({ digest, network: rt.network });
  } catch (e) {
    return Response.json({ error: "send failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
