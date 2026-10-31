import { getRuntime } from "@/lib/runtime";
import { executeAllowed, MAX_SEND_SUI, publicView, writesAllowed } from "@/lib/service";

export const runtime = "nodejs";

/** What this deployment can do, so the UI states it instead of failing later. No secrets. */
export async function GET(req: Request) {
  try {
    const rt = getRuntime(new URL(req.url).searchParams.get("network") ?? undefined);
    return Response.json({
      network: rt.network,
      memory: rt.memory,
      executeOn: executeAllowed(process.env),
      writesOn: writesAllowed(process.env),
      publicView: publicView(process.env),
      maxSend: MAX_SEND_SUI,
    });
  } catch {
    return Response.json({ error: "not configured" }, { status: 503 });
  }
}
