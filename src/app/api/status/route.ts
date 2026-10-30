import { getRuntime } from "@/lib/runtime";
import { executeAllowed, MAX_SEND_SUI, writesAllowed } from "@/lib/service";

export const runtime = "nodejs";

/** What this deployment can do, so the UI states it instead of failing later. No secrets. */
export async function GET() {
  try {
    const rt = getRuntime();
    return Response.json({
      network: rt.network,
      memory: rt.memory,
      sender: rt.address,
      executeOn: executeAllowed(process.env),
      writesOn: writesAllowed(process.env),
      maxSend: MAX_SEND_SUI,
    });
  } catch {
    return Response.json({ error: "not configured" }, { status: 503 });
  }
}
