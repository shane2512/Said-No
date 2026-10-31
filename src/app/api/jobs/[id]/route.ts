import { finishDecision } from "@/lib/memory";
import { getMemory } from "@/lib/runtime";
import { requestOwner } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = requestOwner(req);
  if (!owner) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return Response.json(await finishDecision(id, { mem: getMemory(owner) }));
  } catch (e) {
    return Response.json({ error: "job not ready", detail: String((e as Error).message).slice(0, 200) }, { status: 202 });
  }
}
