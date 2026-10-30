// Development server with the in-process memory backend, so testing never writes to Walrus mainnet.
import { spawn } from "node:child_process";

const child = spawn("pnpm", ["next", "dev", "-p", process.argv[2] ?? "3200"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, MEMORY_BACKEND: "local" },
});
child.on("exit", (code) => process.exit(code ?? 0));
