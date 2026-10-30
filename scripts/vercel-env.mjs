// Copies your local .env into the linked Vercel project (production). Run it yourself:
//   node scripts/vercel-env.mjs
// Public safety switches are forced OFF here: nobody can save to your Memory account or spend.
// Values go straight from .env to Vercel on stdin and are never printed.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const clean = (v) => v.replace(/\r/g, "").trim().replace(/^["']|["']$/g, "");
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), clean(l.slice(l.indexOf("=") + 1))]),
);

function add(name, value, sensitive = false) {
  if (!value) return console.log(`SKIP ${name} (empty in .env)`);
  const args = ["env", "add", name, "production", ...(sensitive ? ["--sensitive"] : []), "--force"];
  const r = spawnSync("vercel", args, { input: value, shell: true, encoding: "utf8" });
  if (r.status !== 0) {
    console.log(`FAILED ${name}`);
    console.log((r.stderr || r.stdout || "").split("\n").slice(-4).join("\n"));
    process.exit(1);
  }
  console.log(`set ${name} (${value.length} chars)`);
}

add("NETWORK", "mainnet");
add("ALLOW_EXECUTE", "false");
add("ALLOW_WRITES", "false");
add("TATUM_API_KEY", env.TATUM_API_KEY, true);
add("TATUM_API_KEY_MAINNET", env.TATUM_API_KEY_MAINNET, true);
add("MEMWAL_ACCOUNT_ID", env.MEMWAL_ACCOUNT_ID);
add("MEMWAL_DELEGATE_KEY", env.MEMWAL_DELEGATE_KEY, true);
add("DEMO_WALLET_KEY", env.DEMO_WALLET_KEY, true);

console.log("\nNames now in production:");
const ls = spawnSync("vercel", ["env", "ls", "production"], { shell: true, encoding: "utf8" });
console.log((ls.stdout || "").split("\n").filter((l) => /NETWORK|ALLOW|TATUM|MEMWAL|DEMO/.test(l)).map((l) => l.trim().split(/\s+/)[0]).join("\n"));
