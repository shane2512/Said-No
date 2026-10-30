// Spike 2: Tatum Sui gRPC through @mysten/sui v2. Prints no secrets. Testnet only for execute.
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";
import { getNetworkConfig } from "../../src/lib/config";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const cfg = getNetworkConfig(clean(process.env.NETWORK));
const apiKey = clean(process.env.TATUM_API_KEY);
const keypair = Ed25519Keypair.fromSecretKey(clean(process.env.DEMO_WALLET_KEY));
const address = keypair.toSuiAddress();

// Tatum serves native gRPC (application/grpc), not grpc-web, so use the grpc-js transport.
const transport = new GrpcTransport({
  host: new URL(cfg.tatumGrpcUrl).host + ":443",
  channelCredentials: ChannelCredentials.createSsl(),
  meta: { "x-api-key": apiKey },
});
const client = new SuiGrpcClient({ network: cfg.network, transport });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function step(name: string, fn: () => Promise<unknown>) {
  await sleep(1200); // stay well under the free plan's 3 requests/second
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`PASS ${name} (${Date.now() - t}ms)${out ? " " + String(out) : ""}`);
    return true;
  } catch (e: any) {
    console.log(`FAIL ${name} (${Date.now() - t}ms): ${e?.name ?? "Error"} ${String(e?.message ?? e).slice(0, 240)}`);
    return false;
  }
}

async function main() {
  console.log(`network=${cfg.network} grpc=${cfg.tatumGrpcUrl} address=${address.slice(0, 8)}…${address.slice(-4)}`);

  await step("llms.txt reachable (no key)", async () => {
    const r = await fetch(`${cfg.tatumGrpcUrl}/llms.txt`);
    return `http=${r.status}`;
  });

  await step("getBalance (StateService)", async () => {
    const b = await client.core.getBalance({ owner: address });
    return `SUI balance (MIST)=${b.balance.balance}`;
  });

  await step("listTransactions affectedAddress filter (LedgerService)", async () => {
    const call = client.ledgerService.listTransactions({
      filter: {
        terms: [
          { literals: [{ negated: false, predicate: { oneofKind: "affectedAddress", affectedAddress: { address } } }] },
        ],
      },
      readMask: { paths: ["digest"] },
    });
    let count = 0;
    let ended = false;
    const digests: string[] = [];
    for await (const msg of (call as any).responses) {
      if (msg.transaction) {
        count += 1;
        digests.push(String(msg.transaction.digest).slice(0, 8));
      }
      if (msg.end) ended = true;
      if (count >= 5) break;
    }
    return `transactions=${count} digests=${digests.join(",")} streamEnded=${ended}`;
  });

  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [1_000_000]);
  tx.transferObjects([coin], address);
  tx.setSender(address);

  await step("simulateTransaction dry-run (self-send 0.001 SUI)", async () => {
    const r = await client.core.simulateTransaction({
      transaction: tx,
      include: { effects: true, balanceChanges: true },
    });
    const kind = (r as any).$kind ?? "?";
    const status = (r as any).Transaction?.effects?.status?.success ?? (r as any).Transaction?.status?.success;
    return `result=${kind} success=${status}`;
  });

  if (process.env.SPIKE_EXECUTE === "true" && cfg.network === "testnet") {
    await step("executeTransaction self-send on testnet", async () => {
      const r = await client.core.signAndExecuteTransaction({ transaction: tx, signer: keypair });
      const digest = (r as any).Transaction?.digest ?? (r as any).digest;
      return `digest=${digest}`;
    });
  } else {
    console.log("SKIP execute (set SPIKE_EXECUTE=true on testnet to run it)");
  }
}

main().catch((e) => {
  console.log("FAIL:", e?.name ?? "Error", String(e?.message ?? e).slice(0, 300));
  process.exitCode = 1;
});
