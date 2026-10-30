// Development server with real Walrus Memory and sending enabled, forced to testnet so only test SUI can move.
import { spawn } from "node:child_process";

const child = spawn("pnpm", ["next", "dev", "-p", process.argv[2] ?? "3202"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NETWORK: "testnet", ALLOW_EXECUTE: "true" },
});
child.on("exit", (code) => process.exit(code ?? 0));
