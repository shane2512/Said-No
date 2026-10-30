import { finishDecision } from "@/lib/memory";
import { getRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return Response.json(await finishDecision(id, { mem: getRuntime().mem }));
  } catch (e) {
    return Response.json({ error: "job not ready", detail: String((e as Error).message).slice(0, 200) }, { status: 202 });
  }
}
