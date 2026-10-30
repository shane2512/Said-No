import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";
import type { NetworkConfig } from "./config";
import type { ChainSource } from "./tatum";

const SUI_COIN = "::sui::SUI";
const MIST_PER_SUI = 1_000_000_000;
/** Ordering.DESCENDING in sui.rpc.v2 (newest first). */
const DESCENDING = 1;

type Frame = {
  transaction?: { sender?: string };
  timestamp?: { seconds?: string | number };
  balanceChanges?: { address: string; coinType: string; amount: string }[];
};

/**
 * Turns ListTransactions frames into the sends the user made to OTHER addresses.
 * Faucet fundings (someone else's tx) and self-sends (gas only) are skipped; only SUI is counted.
 */
export function parseOutgoing(
  frames: Frame[],
  sender: string,
): { recipient: string; amount: number; ts: number }[] {
  const me = sender.toLowerCase();
  const out: { recipient: string; amount: number; ts: number }[] = [];
  for (const f of frames) {
    if (f.transaction?.sender?.toLowerCase() !== me) continue;
    const credits = (f.balanceChanges ?? [])
      .filter((c) => c.coinType.endsWith(SUI_COIN) && c.address.toLowerCase() !== me && BigInt(c.amount) > 0n)
      .sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1));
    if (credits.length === 0) continue;
    out.push({
      recipient: credits[0].address,
      amount: Number(BigInt(credits[0].amount)) / MIST_PER_SUI,
      ts: Number(f.timestamp?.seconds ?? 0),
    });
  }
  return out;
}

/** Native gRPC: Tatum's gateway rejects grpc-web (see docs/spike-results.md). */
export function createTatumClient(cfg: NetworkConfig, apiKey: string): SuiGrpcClient {
  const transport = new GrpcTransport({
    host: new URL(cfg.tatumGrpcUrl).host + ":443",
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { "x-api-key": apiKey },
  });
  return new SuiGrpcClient({ network: cfg.network, transport });
}

export function createGrpcChainSource(client: SuiGrpcClient): ChainSource {
  // Full nodes prune old checkpoints; scanning from genesis errors, so start at the lowest available one.
  let lowest: { value: bigint; at: number } | undefined;
  async function lowestAvailableCheckpoint(): Promise<bigint | undefined> {
    if (lowest && Date.now() - lowest.at < 10 * 60_000) return lowest.value;
    const info = await client.ledgerService.getServiceInfo({}).response;
    if (info.lowestAvailableCheckpoint === undefined) return undefined;
    lowest = { value: info.lowestAvailableCheckpoint, at: Date.now() };
    return lowest.value;
  }

  return {
    async getBalance(owner) {
      const b = await client.core.getBalance({ owner });
      return Number(BigInt(b.balance.balance)) / MIST_PER_SUI;
    },

    async listOutgoing(sender, max) {
      const startCheckpoint = await lowestAvailableCheckpoint();
      const call = client.ledgerService.listTransactions({
        startCheckpoint,
        filter: {
          terms: [{ literals: [{ negated: false, predicate: { oneofKind: "sender", sender: { address: sender } } }] }],
        },
        readMask: { paths: ["digest", "transaction", "balance_changes", "timestamp"] },
        options: { limit: max, ordering: DESCENDING },
      });
      const frames: Frame[] = [];
      for await (const msg of (call as unknown as { responses: AsyncIterable<{ transaction?: Frame }> }).responses) {
        if (msg.transaction) frames.push(msg.transaction);
      }
      return parseOutgoing(frames, sender);
    },

    async dryRun(sender, recipient, amount) {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [Math.round(amount * MIST_PER_SUI)]);
      tx.transferObjects([coin], recipient);
      tx.setSender(sender);
      const r = await client.core.simulateTransaction({ transaction: tx, include: { effects: true } });
      return (r as { $kind?: string }).$kind === "Transaction";
    },
  };
}
