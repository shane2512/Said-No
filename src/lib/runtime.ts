import { MemWal } from "@mysten-incubation/memwal";
import { createGrpcChainSource, createTatumClient } from "./chain";
import { getNetworkConfig, type Network } from "./config";
import { fromMemWal, type MemLike } from "./memory";
import { createLocalMem } from "./memory-local";
import type { ChainSource } from "./tatum";
import type { SuiGrpcClient } from "@mysten/sui/grpc";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");

export type Runtime = {
  network: Network;
  memory: "walrus" | "local";
  client: SuiGrpcClient;
  source: ChainSource;
  mem: MemLike;
};

// Survives dev hot reloads so the local memory backend keeps its contents between edits.
type Store = { mem?: MemLike; byNetwork: Partial<Record<Network, Runtime>> };
const g = globalThis as unknown as { __saidNoRuntime?: Store };

/**
 * Server-only: builds clients from environment keys. Never import this from client components.
 * One chain client per network; the memory (and so the user's decisions) is shared between them.
 */
export function getRuntime(network?: string): Runtime {
  const store = (g.__saidNoRuntime ??= { byNetwork: {} });
  const env = process.env;
  const cfg = getNetworkConfig(network ?? clean(env.NETWORK));
  const cached = store.byNetwork[cfg.network];
  if (cached) return cached;
  const local = clean(env.MEMORY_BACKEND) === "local";
  // Memory has no working testnet relayer, so the real backend always uses the mainnet relayer.
  const mem = store.mem ?? (local
    ? createLocalMem()
    : fromMemWal(
        MemWal.create({
          key: clean(env.MEMWAL_DELEGATE_KEY),
          accountId: clean(env.MEMWAL_ACCOUNT_ID),
          serverUrl: clean(env.MEMWAL_SERVER_URL) || "https://relayer.memory.walrus.xyz",
          namespace: "decisions",
        }),
      ));
  store.mem = mem;
  const client = createTatumClient(cfg, clean(cfg.network === "mainnet" ? env.TATUM_API_KEY_MAINNET || env.TATUM_API_KEY : env.TATUM_API_KEY));
  const rt: Runtime = {
    network: cfg.network,
    memory: local ? "local" : "walrus",
    client,
    source: createGrpcChainSource(client),
    mem,
  };
  store.byNetwork[cfg.network] = rt;
  return rt;
}
