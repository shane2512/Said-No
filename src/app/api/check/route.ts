import { z } from "zod";
import { getRuntime } from "@/lib/runtime";
import { checkSend } from "@/lib/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({ recipient: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/), amount: z.number().positive().max(1e9) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid input" }, { status: 400 });
  try {
    const rt = getRuntime();
    const result = await checkSend(
      { sender: rt.address, ...parsed.data },
      { source: rt.source, mem: rt.mem, hour: () => new Date().getUTCHours() },
    );
    return Response.json({ network: rt.network, ...result });
  } catch (e) {
    return Response.json({ error: "check failed", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
