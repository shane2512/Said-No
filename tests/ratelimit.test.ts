import { describe, it, expect } from "vitest";
import { createLimiter, clientKey } from "@/lib/ratelimit";

describe("createLimiter", () => {
  it("allows up to the limit and refuses the next request in the window", () => {
    const t = 0;
    const l = createLimiter({ limit: 3, windowMs: 60_000, now: () => t });
    expect([1, 2, 3].map(() => l.allow("a").ok)).toEqual([true, true, true]);
    const r = l.allow("a");
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("starts fresh after the window passes", () => {
    let t = 0;
    const l = createLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(l.allow("a").ok).toBe(true);
    expect(l.allow("a").ok).toBe(false);
    t = 1001;
    expect(l.allow("a").ok).toBe(true);
  });

  it("tracks visitors separately", () => {
    const l = createLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(l.allow("a").ok).toBe(true);
    expect(l.allow("b").ok).toBe(true);
    expect(l.allow("a").ok).toBe(false);
  });

  it("does not grow without bound when visitors keep changing", () => {
    let t = 0;
    const l = createLimiter({ limit: 1, windowMs: 1000, now: () => t, maxKeys: 50 });
    for (let i = 0; i < 500; i++) {
      t += 5000;
      l.allow(`ip-${i}`);
    }
    expect(l.size()).toBeLessThanOrEqual(50);
  });
});

describe("clientKey", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("uses the first forwarded address", () => {
    expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("falls back to a shared key rather than skipping the limit", () => {
    expect(clientKey(req({}))).toBe("unknown");
  });
});
