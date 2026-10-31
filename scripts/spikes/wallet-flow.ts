// Simulates the browser wallet: server builds JSON, "wallet" signs the bytes, server broadcasts via Tatum. Testnet only.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { broadcastSigned, buildTransfer, createTatumClient } from "../../src/lib/chain";
import { getNetworkConfig } from "../../src/lib/config";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
async function main() {
  const cfg = getNetworkConfig("testnet");
  const client = createTatumClient(cfg, clean(process.env.TATUM_API_KEY));
  const wallet = Ed25519Keypair.fromSecretKey(clean(process.env.DEMO_WALLET_KEY));
  const me = wallet.toSuiAddress();
  const json = await buildTransfer(client, me, me, 0.001);
  const bytes = await Transaction.from(json).build({ client });
  const { signature } = await wallet.signTransaction(bytes);
  const digest = await broadcastSigned(client, toBase64(bytes), signature);
  console.log("PASS digest", digest);
}
main().catch((e) => { console.log("FAIL:", e?.name, String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; });
