// Read-only audit against live mainnet. Never signs or broadcasts.
import { createTatumClient } from "../../src/lib/chain";
import { getNetworkConfig } from "../../src/lib/config";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const cfg = getNetworkConfig("mainnet");
const client = createTatumClient(cfg, clean(process.env.TATUM_API_KEY_MAINNET));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const info = await client.ledgerService.getServiceInfo({}).response;
  console.log("chain:", info.chainId ?? info.chain, "epoch:", String(info.epoch), "checkpoint:", String(info.checkpointHeight));
  // Find a recent sender that holds a decent balance, to use as an unsigned-build sender.
  const cp = await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: "sequenceNumber", sequenceNumber: info.checkpointHeight! - 3n }, readMask: { paths: ["transactions.transaction.sender"] } }).response;
  const senders = [...new Set((cp.checkpoint?.transactions ?? []).map((t) => t.transaction?.sender).filter((s): s is string => !!s))].filter((s) => !s.startsWith("0x00000000")).slice(0, 25);
  for (const s of senders) {
    await sleep(450);
    const b = await client.core.getBalance({ owner: s });
    const sui = Number(BigInt(b.balance.balance)) / 1e9;
    if (sui >= 5) { console.log("SENDER", s, "balanceSUI", sui.toFixed(2)); return; }
  }
  console.log("NO_FUNDED_SENDER among", senders.length);
}
main().catch((e) => { console.log("FAIL:", e?.name, String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; });
