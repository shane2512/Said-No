type Opts = { limit: number; windowMs: number; now?: () => number; maxKeys?: number };

/**
 * Fixed-window counter per visitor. It lives in one server instance's memory, so on serverless
 * hosting it is best-effort: it slows a single visitor down but is not a hard global cap.
 */
export function createLimiter({ limit, windowMs, now = Date.now, maxKeys = 5000 }: Opts) {
  const hits = new Map<string, { start: number; count: number }>();

  function prune(t: number) {
    for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
    // Still too many live visitors: drop the oldest so memory cannot grow without bound.
    while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
  }

  return {
    allow(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      if (hits.size >= maxKeys) prune(t);
      const cur = hits.get(key);
      if (!cur || t - cur.start >= windowMs) {
        hits.set(key, { start: t, count: 1 });
        return { ok: true, retryAfterSec: 0 };
      }
      if (cur.count >= limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((cur.start + windowMs - t) / 1000)) };
      cur.count += 1;
      return { ok: true, retryAfterSec: 0 };
    },
    size: () => hits.size,
  };
}

/** The visitor's address as the host reports it. Unknown visitors share one bucket instead of skipping the limit. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || "unknown";
}

/** Returns a 429 response when the visitor is over the limit, otherwise null. */
export function limited(limiter: ReturnType<typeof createLimiter>, req: Request): Response | null {
  const r = limiter.allow(clientKey(req));
  if (r.ok) return null;
  return Response.json(
    { error: `Too many requests. Try again in ${r.retryAfterSec} seconds.` },
    { status: 429, headers: { "retry-after": String(r.retryAfterSec) } },
  );
}
