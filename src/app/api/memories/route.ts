import { loadDecisions } from "@/lib/memory";
import { getMemory } from "@/lib/runtime";
import { requestOwner } from "@/lib/session";

import { createLimiter, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;
const memLimit = createLimiter({ limit: 20, windowMs: 60_000 });

export async function GET(req: Request) {
  const tooMany = limited(memLimit, req);
  if (tooMany) return tooMany;
  const owner = requestOwner(req);
  if (!owner) return Response.json({ decisions: [], ignored: 0, realCount: 0, realHidden: false, signedIn: false });
  try {
    const { decisions, ignored } = await loadDecisions({ mem: getMemory(owner) });
    // Each wallet has its own memory, so everything returned here belongs to the signed-in wallet.
    return Response.json({ decisions, ignored, realCount: decisions.filter((d) => d.source === "real").length, realHidden: false, signedIn: true });
  } catch (e) {
    return Response.json({ error: "memory unavailable", detail: String((e as Error).message).slice(0, 200) }, { status: 503 });
  }
}
