import { loadDecisions } from "@/lib/memory";
import { getRuntime } from "@/lib/runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json(await loadDecisions({ mem: getRuntime().mem }));
  } catch (e) {
    return Response.json({ error: "memory unavailable", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
