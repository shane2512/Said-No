import { loadDecisions } from "@/lib/memory";
import { getRuntime } from "@/lib/runtime";
import { publicView, visibleDecisions } from "@/lib/service";

import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const memLimit = createLimiter({ limit: 20, windowMs: 60_000 });

export async function GET(req: Request) {
  const tooMany = limited(memLimit, req);
  if (tooMany) return tooMany;
  try {
    const { decisions, ignored } = await loadDecisions({ mem: getRuntime().mem });
    // Public deployments never return real records; they only report how many exist.
    const { decisions: visible, hiddenReal } = visibleDecisions(decisions, publicView(process.env));
    const realTotal = decisions.filter((d) => d.source === "real").length;
    return Response.json({ decisions: visible, ignored, realCount: realTotal, realHidden: hiddenReal > 0 });
  } catch (e) {
    return Response.json({ error: "memory unavailable", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
