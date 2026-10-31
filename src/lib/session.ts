import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

type Deps = { secret: string; now: () => number };

import { signInMessage } from "./signin-message";
export { signInMessage };

const mac = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

/** `address.expires.mac`, signed with a server secret so it cannot be forged or moved to another address. */
export const issueToken = (address: string, expires: number, secret: string) => {
  const payload = `${address}.${expires}`;
  return `${payload}.${mac(payload, secret)}`;
};

/** A wallet proves it owns the address by signing the sign-in message; the server answers with a token. */
export async function verifySignIn(
  input: { address: string; expires: number; signature: string },
  deps: Deps,
): Promise<{ token: string } | { error: string }> {
  if (input.expires <= deps.now()) return { error: "expired" };
  if (input.expires > deps.now() + 24 * 3_600_000) return { error: "too long" };
  try {
    const key = await verifyPersonalMessageSignature(new TextEncoder().encode(signInMessage(input.address, input.expires)), input.signature);
    if (key.toSuiAddress() !== input.address) return { error: "bad signature" };
  } catch {
    return { error: "bad signature" };
  }
  return { token: issueToken(input.address, input.expires, deps.secret) };
}

/** The wallet address behind a request's bearer token, or undefined when missing, forged or expired. */
export function ownerFromRequest(req: Request, deps: Deps): string | undefined {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const parts = token?.split(".");
  if (!parts || parts.length !== 3) return undefined;
  const [address, expires, given] = parts;
  const want = mac(`${address}.${expires}`, deps.secret);
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  return Number(expires) > deps.now() ? address : undefined;
}

const SESSION_HOURS = 8;
export const sessionLifetimeMs = SESSION_HOURS * 3_600_000;

/** Signing secret: a dedicated one if set, else the Memory delegate key (already secret). Dev falls back to a fixed value. */
export function sessionSecret(env: Record<string, string | undefined> = process.env): string {
  const s = (env.SESSION_SECRET || env.MEMWAL_DELEGATE_KEY || "").trim();
  if (s) return s;
  if (env.NODE_ENV === "production") throw new Error("no session secret configured");
  return "dev-only-secret";
}

export const requestOwner = (req: Request) => ownerFromRequest(req, { secret: sessionSecret(), now: Date.now });
