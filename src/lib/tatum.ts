export type RequestLogEntry = { method: string; ms: number; ok: boolean };

/** What the app needs from the chain. A gRPC-backed implementation is supplied separately. */
export type ChainSource = {
  getBalance(owner: string): Promise<number>;
  listOutgoing(sender: string, max: number): Promise<{ recipient: string; amount: number; ts: number }[]>;
  dryRun(sender: string, recipient: string, amount: number): Promise<boolean>;
  /** Tatum's malicious-address list. Optional: a source without it leaves the address unscreened. */
  screen?(address: string): Promise<{ flagged: boolean; why?: string }>;
};

export type ChainFacts = {
  balance: number;
  medianAmount: number;
  priorTxCount: number;
  priorToRecipient: number;
  /** Sends in the last hour, for spotting a rapid burst. */
  recentSends: number;
  /** "flagged" if Tatum lists the recipient as malicious; "unscreened" if the check could not run. */
  screen: { status: "clear" | "flagged" | "unscreened"; why?: string };
  dryRunOk: boolean;
  requestLog: RequestLogEntry[];
};

export type Unavailable = { unavailable: true; reason: string; requestLog: RequestLogEntry[] };

export type Timing = {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Free plan allows about 3 requests/second. */
  minIntervalMs?: number;
  retries?: number;
};

const HISTORY_CAP = 50;

const isRateLimit = (e: unknown) =>
  (e as { status?: number })?.status === 429 ||
  /429|RESOURCE_EXHAUSTED|too many requests/i.test(String((e as Error)?.message ?? e));

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Reads the chain facts for one pending send. Fails closed: any error that survives
 * the retries returns `{unavailable: true}`, never partial facts.
 */
export async function getChainFacts(
  sender: string,
  recipient: string,
  amount: number,
  source: ChainSource,
  timing: Timing = {},
): Promise<ChainFacts | Unavailable> {
  const now = timing.now ?? Date.now;
  const sleep = timing.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const minInterval = timing.minIntervalMs ?? 400;
  const retries = timing.retries ?? 2;
  const requestLog: RequestLogEntry[] = [];
  let lastStart = Number.NEGATIVE_INFINITY;

  async function call<T>(method: string, fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const wait = lastStart + minInterval - now();
      if (wait > 0) await sleep(wait);
      lastStart = now();
      try {
        const out = await fn();
        requestLog.push({ method, ms: now() - lastStart, ok: true });
        return out;
      } catch (e) {
        requestLog.push({ method, ms: now() - lastStart, ok: false });
        if (isRateLimit(e) && attempt < retries) {
          await sleep(minInterval * 2 ** attempt);
          continue;
        }
        throw Object.assign(new Error(isRateLimit(e) ? `Tatum rate limit (${method})` : `Tatum error (${method}): ${(e as Error)?.message}`), {
          rateLimited: isRateLimit(e),
        });
      }
    }
  }

  try {
    const balance = await call("getBalance", () => source.getBalance(sender));
    const history = await call("listOutgoing", () => source.listOutgoing(sender, HISTORY_CAP));
    const dryRunOk = await call("dryRun", () => source.dryRun(sender, recipient, amount));
    // Screening is extra safety, so if it cannot run the send is still checked, just marked unscreened.
    let screen: ChainFacts["screen"] = { status: "unscreened" };
    if (source.screen) {
      try {
        const r = await call("screen", () => source.screen!(recipient));
        screen = r.flagged ? { status: "flagged", why: r.why } : { status: "clear" };
      } catch {
        /* stays unscreened */
      }
    }
    return {
      balance,
      medianAmount: median(history.map((h) => h.amount)),
      priorTxCount: history.length,
      priorToRecipient: history.filter((h) => h.recipient === recipient).length,
      recentSends: history.filter((h) => h.ts <= now() / 1000 && h.ts >= now() / 1000 - 3600).length,
      screen,
      dryRunOk,
      requestLog,
    };
  } catch (e) {
    return { unavailable: true, reason: (e as Error).message, requestLog };
  }
}
