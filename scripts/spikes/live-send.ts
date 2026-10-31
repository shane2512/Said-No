// Live server path for a send, with a local key standing in for the visitor's wallet. Testnet only.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { SuiGrpcClient } from "@mysten/sui/grpc";

const base = process.env.BASE ?? "https://said-no.vercel.app";
const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const post = async (p: string, b: unknown) => { const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { status: r.status, data: await r.json().catch(() => ({})) }; };

async function main() {
  const wallet = Ed25519Keypair.fromSecretKey(clean(process.env.DEMO_WALLET_KEY));
  const me = wallet.toSuiAddress();
  const built = await post("/api/build", { sender: me, recipient: me, amount: 0.001, acknowledged: true, network: "testnet" });
  console.log("build", built.status, built.data.error ?? "ok", built.data.level ?? "");
  if (built.status !== 200) return void (process.exitCode = 1);
  // The wallet resolves the transaction JSON to bytes with its own client and signs them.
  const client = new SuiGrpcClient({ network: "testnet", baseUrl: "https://fullnode.testnet.sui.io:443" });
  const bytes = await Transaction.from(built.data.transaction).build({ client });
  const { signature } = await wallet.signTransaction(bytes);
  const sent = await post("/api/broadcast", { bytes: toBase64(bytes), signature, network: "testnet" });
  console.log("broadcast", sent.status, sent.data.digest ?? sent.data.detail ?? sent.data.error);
  if (sent.status !== 200) process.exitCode = 1;
}
main().catch((e) => { console.log("FAIL:", String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; });
