import { MemWal } from "@mysten-incubation/memwal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createGrpcChainSource, createTatumClient } from "./chain";
import { getNetworkConfig } from "./config";
import { fromMemWal, type MemLike } from "./memory";
import type { ChainSource } from "./tatum";
import type { SuiGrpcClient } from "@mysten/sui/grpc";

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "");

export type Runtime = {
  network: "testnet" | "mainnet";
  address: string;
  keypair: Ed25519Keypair;
  client: SuiGrpcClient;
  source: ChainSource;
  mem: MemLike;
};

let cached: Runtime | undefined;

/** Server-only: builds clients from environment keys. Never import this from client components. */
export function getRuntime(): Runtime {
  if (cached) return cached;
  const env = process.env;
  const cfg = getNetworkConfig(clean(env.NETWORK));
  // Memory has no working testnet relayer, so it always uses the mainnet relayer (see docs/spike-results.md).
  const memwal = MemWal.create({
    key: clean(env.MEMWAL_DELEGATE_KEY),
    accountId: clean(env.MEMWAL_ACCOUNT_ID),
    serverUrl: clean(env.MEMWAL_SERVER_URL) || "https://relayer.memory.walrus.xyz",
    namespace: "decisions",
  });
  const keypair = Ed25519Keypair.fromSecretKey(clean(env.DEMO_WALLET_KEY));
  const client = createTatumClient(cfg, clean(env.TATUM_API_KEY));
  cached = {
    network: cfg.network,
    address: keypair.toSuiAddress(),
    keypair,
    client,
    source: createGrpcChainSource(client),
    mem: fromMemWal(memwal),
  };
  return cached;
}
