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
  });
  it("caches each network", () => {
    expect(getRuntime("mainnet")).toBe(getRuntime("mainnet"));
  });
});

import { getMemory } from "@/lib/runtime";
describe("getMemory per wallet", () => {
  it("gives each wallet its own memory and the same wallet the same one", () => {
    const a = getMemory("0xa");
    expect(getMemory("0xa")).toBe(a);
    expect(getMemory("0xb")).not.toBe(a);
  });
});
