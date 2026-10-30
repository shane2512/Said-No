// Live check of createGrpcChainSource + getChainFacts against Tatum. Prints no secrets.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createGrpcChainSource, createTatumClient } from "../../src/lib/chain";
import { getNetworkConfig } from "../../src/lib/config";
import { getChainFacts } from "../../src/lib/tatum";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const cfg = getNetworkConfig(clean(process.env.NETWORK));
const me = Ed25519Keypair.fromSecretKey(clean(process.env.DEMO_WALLET_KEY)).toSuiAddress();
const recipient = "0x" + "ab".repeat(32);

async function main() {
  const source = createGrpcChainSource(createTatumClient(cfg, clean(cfg.network === "mainnet" ? process.env.TATUM_API_KEY_MAINNET || process.env.TATUM_API_KEY : process.env.TATUM_API_KEY)));
  const facts = await getChainFacts(me, recipient, 0.01, source);
  if ("unavailable" in facts) {
    console.log("FAIL unavailable:", facts.reason, JSON.stringify(facts.requestLog));
    process.exitCode = 1;
    return;
  }
  console.log(
    `PASS balance=${facts.balance} median=${facts.medianAmount} priorTx=${facts.priorTxCount} priorToRecipient=${facts.priorToRecipient} dryRunOk=${facts.dryRunOk}`,
  );
  console.log("requestLog:", facts.requestLog.map((r) => `${r.method}:${r.ms}ms:${r.ok ? "ok" : "fail"}`).join(" "));
}

main().catch((e) => {
  console.log("FAIL:", e?.name ?? "Error", String(e?.message ?? e).slice(0, 300));
  process.exitCode = 1;
});
