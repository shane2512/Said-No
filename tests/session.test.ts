import { describe, it, expect } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { issueToken, ownerFromRequest, signInMessage, verifySignIn } from "@/lib/session";

const secret = "test-secret";
const now = 1_800_000_000_000;

describe("wallet sessions", () => {
  it("accepts a sign-in signed by the address owner and returns a token for it", async () => {
    const kp = Ed25519Keypair.generate();
    const address = kp.toSuiAddress();
    const expires = now + 3_600_000;
    const { signature } = await kp.signPersonalMessage(new TextEncoder().encode(signInMessage(address, expires)));
    const out = await verifySignIn({ address, expires, signature }, { secret, now: () => now });
    expect("token" in out).toBe(true);
    if ("token" in out) expect(ownerFromRequest(new Request("http://x", { headers: { authorization: `Bearer ${out.token}` } }), { secret, now: () => now })).toBe(address);
  });

  it("rejects a signature from a different wallet", async () => {
    const victim = Ed25519Keypair.generate().toSuiAddress();
    const attacker = Ed25519Keypair.generate();
    const expires = now + 1000;
    const { signature } = await attacker.signPersonalMessage(new TextEncoder().encode(signInMessage(victim, expires)));
    expect(await verifySignIn({ address: victim, expires, signature }, { secret, now: () => now })).toEqual({ error: "bad signature" });
  });

  it("rejects an expired sign-in and an expired or forged token", async () => {
    const kp = Ed25519Keypair.generate();
    const address = kp.toSuiAddress();
    const { signature } = await kp.signPersonalMessage(new TextEncoder().encode(signInMessage(address, now - 1)));
    expect(await verifySignIn({ address, expires: now - 1, signature }, { secret, now: () => now })).toEqual({ error: "expired" });
    const old = issueToken(address, now - 1, secret);
    const req = (t: string) => new Request("http://x", { headers: { authorization: `Bearer ${t}` } });
    expect(ownerFromRequest(req(old), { secret, now: () => now })).toBeUndefined();
    const good = issueToken(address, now + 1000, secret);
    expect(ownerFromRequest(req(good + "x"), { secret, now: () => now })).toBeUndefined();
    expect(ownerFromRequest(req(good), { secret: "other", now: () => now })).toBeUndefined();
    expect(ownerFromRequest(new Request("http://x"), { secret, now: () => now })).toBeUndefined();
  });
});
