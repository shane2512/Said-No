// Saves the 12 hackathon memories to Walrus Memory (mainnet relayer).
//   pnpm tsx --env-file=.env scripts/seed-mainnet.ts --label=seeded            (dry run: prints the plan, writes nothing)
//   pnpm tsx --env-file=.env scripts/seed-mainnet.ts --label=seeded --write    (writes)
// Prints no secrets.
import { MemWal } from "@mysten-incubation/memwal";
import { finishDecision, fromMemWal, loadDecisions, saveDecision } from "../src/lib/memory";
import { buildMainnetSet } from "../src/lib/seed-data";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const label = arg("label") as "seeded" | "real" | "demo" | undefined;
const write = process.argv.includes("--write");

if (!label || !["seeded", "real", "demo"].includes(label)) {
  console.log("Pass --label=seeded|real|demo (what these entries honestly are).");
  process.exit(1);
}

const set = buildMainnetSet(label, Math.floor(Date.now() / 1000) - 12 * 3 * 3600 * 2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`${write ? "WRITE" : "DRY RUN"}: ${set.length} entries, label "${label}", Walrus Memory mainnet relayer`);
  set.forEach((d) => console.log(`  ${d.id} ${d.action.padEnd(8)} ${d.kind.padEnd(7)} ${String(d.amount).padStart(5)} SUI  ${d.reason.slice(0, 70)}`));
  if (!write) return console.log("Nothing written. Add --write to save these.");

  const mem = fromMemWal(
    MemWal.create({
      key: clean(process.env.MEMWAL_DELEGATE_KEY),
      accountId: clean(process.env.MEMWAL_ACCOUNT_ID),
      serverUrl: "https://relayer.memory.walrus.xyz",
      namespace: "decisions",
    }),
    "decisions",
  );

  const jobs: { id: string; job: string }[] = [];
  for (const d of set) {
    // Stay well under the relayer's 30 writes/minute per delegate key.
    for (let attempt = 0; ; attempt++) {
      const r = await saveDecision(d, { mem });
      if ("jobId" in r) {
        jobs.push({ id: d.id, job: r.jobId });
        console.log(`queued ${d.id}`);
        break;
      }
      if (attempt >= 4) throw new Error(`rate limited on ${d.id}`);
      console.log(`rate limited on ${d.id}, waiting`);
      await sleep(15000);
    }
    await sleep(3000);
  }

  console.log("waiting for each blob (about 25 s each, in parallel)");
  const blobs: { id: string; blob: string }[] = [];
  for (const j of jobs) {
    const { blobId } = await finishDecision(j.job, { mem });
    blobs.push({ id: j.id, blob: blobId });
    console.log(`saved ${j.id} -> ${blobId}`);
  }

  await sleep(5000);
  const { decisions, ignored } = await loadDecisions({ mem });
  const mine = decisions.filter((d) => d.id.startsWith("mainnet-"));
  console.log(`recall: ${mine.length}/${set.length} of this set found, ${ignored} unreadable`);
  console.log("BLOBS " + JSON.stringify(blobs));
  process.exitCode = mine.length >= 10 ? 0 : 1;
}

main().catch((e) => {
  console.log("FAIL:", e?.name ?? "Error", String(e?.message ?? e).slice(0, 300));
  process.exitCode = 1;
});
