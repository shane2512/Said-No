// Spike 3: capture real ListTransactions frames so the parser is built against real data. No secrets printed.
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { getNetworkConfig } from "../../src/lib/config";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const cfg = getNetworkConfig(clean(process.env.NETWORK));
const keypair = Ed25519Keypair.fromSecretKey(clean(process.env.DEMO_WALLET_KEY));
const address = keypair.toSuiAddress();
const transport = new GrpcTransport({
  host: new URL(cfg.tatumGrpcUrl).host + ":443",
  channelCredentials: ChannelCredentials.createSsl(),
  meta: { "x-api-key": clean(process.env.TATUM_API_KEY) },
});
const client = new SuiGrpcClient({ network: cfg.network, transport });

const bigintSafe = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

async function main() {
  const call = client.ledgerService.listTransactions({
    filter: {
      terms: [{ literals: [{ negated: false, predicate: { oneofKind: "affectedAddress", affectedAddress: { address } } }] }],
    },
    readMask: { paths: ["digest", "transaction", "balance_changes", "timestamp", "effects.status"] },
  });
  const frames: unknown[] = [];
  for await (const msg of (call as any).responses) {
    if (msg.transaction) frames.push(msg.transaction);
  }
  mkdirSync("fixtures", { recursive: true });
  writeFileSync("fixtures/history-frames.testnet.json", JSON.stringify(frames, bigintSafe, 2));
  console.log(`captured ${frames.length} transaction frames`);
  const first: any = frames[0];
  console.log("top-level keys:", Object.keys(first).join(","));
  console.log("sender:", first?.transaction?.sender, "ts:", JSON.stringify(first?.timestamp, bigintSafe));
  console.log("balanceChanges:", JSON.stringify(first?.balanceChanges, bigintSafe));
}

main().catch((e) => {
  console.log("FAIL:", e?.name ?? "Error", String(e?.message ?? e).slice(0, 300));
  process.exitCode = 1;
});
