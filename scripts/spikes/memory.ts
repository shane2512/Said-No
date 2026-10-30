// Spike 1: can we write a Walrus Memory and read it back? Prints no secrets.
import { MemWal } from "@mysten-incubation/memwal";
import { getNetworkConfig } from "../../src/lib/config";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const cfg = getNetworkConfig(clean(process.env.NETWORK));
const key = clean(process.env.MEMWAL_DELEGATE_KEY);
const accountId = clean(process.env.MEMWAL_ACCOUNT_ID);

async function main() {
  console.log(`network=${cfg.network} relayer=${cfg.memwalServerUrl}`);
  console.log(`key chars=${key.length} accountId=${accountId.slice(0, 8)}…${accountId.slice(-4)}`);
  const memwal = MemWal.create({ key, accountId, serverUrl: cfg.memwalServerUrl, namespace: "spike" });

  const health = await memwal.health();
  console.log("health:", JSON.stringify(health));

  if (process.env.SPIKE_WRITE !== "true") {
    // Read-only auth check: no write, no cost.
    const probe = await memwal.recall({ query: "auth probe", limit: 1, namespace: "spike" });
    console.log(`READ-ONLY OK: key and account authenticated; recall total=${probe.total}`);
    return;
  }

  const marker = `spike-${Date.now()}`;
  const t0 = Date.now();
  const written = await memwal.rememberAndWait(`Said-No spike memory ${marker}`);
  console.log(`remember ok in ${Date.now() - t0}ms blob_id=${written.blob_id} namespace=${written.namespace}`);

  const t1 = Date.now();
  const recalled = await memwal.recall({ query: marker, limit: 5, namespace: "spike" });
  const hit = recalled.results.find((r) => r.text.includes(marker));
  console.log(`recall in ${Date.now() - t1}ms total=${recalled.total} found=${Boolean(hit)}`);
  if (hit) console.log("hit fields:", Object.keys(hit).join(","), `distance=${hit.distance}`);
  console.log(hit ? "PASS: memory round trip" : "FAIL: written memory not recalled");
  process.exitCode = hit ? 0 : 1;
}

main().catch((e) => {
  console.log("FAIL:", e?.name ?? "Error", String(e?.message ?? e).slice(0, 300));
  process.exitCode = 1;
});
