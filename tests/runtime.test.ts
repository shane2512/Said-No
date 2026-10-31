import { describe, it, expect, beforeEach } from "vitest";
import { getRuntime } from "@/lib/runtime";

beforeEach(() => {
  delete (globalThis as { __saidNoRuntime?: unknown }).__saidNoRuntime;
  process.env.MEMORY_BACKEND = "local";
  process.env.TATUM_API_KEY = "t";
  process.env.TATUM_API_KEY_MAINNET = "m";
  process.env.NETWORK = "testnet";
});

describe("getRuntime per network", () => {
  it("uses the configured network when none is asked for", () => {
    expect(getRuntime().network).toBe("testnet");
  });
  it("returns a separate chain client for each network but one shared memory", () => {
    const t = getRuntime("testnet");
    const m = getRuntime("mainnet");
    expect(t.network).toBe("testnet");
    expect(m.network).toBe("mainnet");
    expect(m.client).not.toBe(t.client);
    expect(m.mem).toBe(t.mem);
  });
  it("caches each network", () => {
    expect(getRuntime("mainnet")).toBe(getRuntime("mainnet"));
  });
});
