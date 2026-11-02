// Read-only: how Walrus Memory's own similarity scores a typed note against stored reasons.
//   pnpm tsx --env-file=.env scripts/spikes/semantic.ts "a stranger on telegram wants me to send fast"
import { MemWal } from "@mysten-incubation/memwal";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");
const mem = MemWal.create({
  key: clean(process.env.MEMWAL_DELEGATE_KEY),
  accountId: clean(process.env.MEMWAL_ACCOUNT_ID),
  serverUrl: "https://relayer.memory.walrus.xyz",
  namespace: "decisions",
});

async function main() {
for (const q of process.argv.slice(2)) {
  const { results } = await mem.recall({ query: q, limit: 100, namespace: "decisions" });
  console.log(`\nQUERY: ${q}  (${results.length} results)`);
  [...results].sort((a, b) => a.distance - b.distance).slice(0, 5).forEach((r) =>
    console.log(`  ${r.distance.toFixed(3)}  ${r.text.split("\n")[0].slice(0, 100)}`));
}
}
main().catch((e) => console.log("FAIL:", String(e?.message ?? e).slice(0, 300)));
