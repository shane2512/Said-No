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
};

// Survives dev hot reloads so the local memory backend keeps its contents between edits.
type Store = { owners: Map<string, MemLike>; byNetwork: Partial<Record<Network, Runtime>> };
const g = globalThis as unknown as { __saidNoRuntime?: Store };
const store = (): Store => (g.__saidNoRuntime ??= { owners: new Map(), byNetwork: {} });

const isLocal = () => clean(process.env.MEMORY_BACKEND) === "local";

/**
 * Server-only: builds clients from environment keys. Never import this from client components.
 * One chain client per network; memory is separate (see getMemory).
 */
export function getRuntime(network?: string): Runtime {
  const s = store();
  const env = process.env;
  const cfg = getNetworkConfig(network ?? clean(env.NETWORK));
  const cached = s.byNetwork[cfg.network];
  if (cached) return cached;
  const client = createTatumClient(cfg, clean(cfg.network === "mainnet" ? env.TATUM_API_KEY_MAINNET || env.TATUM_API_KEY : env.TATUM_API_KEY));
  const rt: Runtime = { network: cfg.network, memory: isLocal() ? "local" : "walrus", client, source: createGrpcChainSource(client) };
  s.byNetwork[cfg.network] = rt;
  return rt;
}

/**
 * One memory per wallet, so visitors never see each other's reasons. All of them live in the
 * project's Walrus Memory account, separated by namespace. The relayer is always the mainnet one:
 * Memory has no working testnet relayer.
 */
export function getMemory(owner: string): MemLike {
  const s = store();
  const have = s.owners.get(owner);
  if (have) return have;
  const env = process.env;
  const mem = isLocal()
    ? createLocalMem()
    : fromMemWal(
        MemWal.create({
          key: clean(env.MEMWAL_DELEGATE_KEY),
          accountId: clean(env.MEMWAL_ACCOUNT_ID),
          serverUrl: clean(env.MEMWAL_SERVER_URL) || "https://relayer.memory.walrus.xyz",
          namespace: `wallet-${owner}`,
        }),
        `wallet-${owner}`,
      );
  s.owners.set(owner, mem);
  return mem;
}

/** A memory with nothing in it, for visitors who have not signed in. Never written to. */
export const emptyMemory = (): MemLike => createLocalMem();
