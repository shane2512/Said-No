"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { signInMessage } from "@/lib/signin-message";
import { setAuthToken } from "./api";

const LIFETIME_MS = 8 * 3_600_000;

/** Connected wallet plus a signed sign-in that unlocks that wallet's own memories. */
export function useSession() {
  const account = useCurrentAccount();
  const kit = useDAppKit();
  const [signedAs, setSignedAs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const address = account?.address;

  // Switching or disconnecting a wallet drops the previous wallet's access.
  useEffect(() => {
    if (signedAs && signedAs !== address) {
      setAuthToken(null);
      setSignedAs(null);
    }
  }, [address, signedAs]);

  async function signIn(): Promise<boolean> {
    if (!address) return false;
    if (signedAs === address) return true;
    setBusy(true);
    setError("");
    try {
      const expires = Date.now() + LIFETIME_MS;
      const { signature } = await kit.signPersonalMessage({ message: new TextEncoder().encode(signInMessage(address, expires)) });
      const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, expires, signature }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error ?? "sign-in failed");
      setAuthToken(data.token);
      setSignedAs(address);
      return true;
    } catch (e) {
      setError((e as Error).message || "Sign-in was cancelled.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { address, signedIn: !!address && signedAs === address, signIn, busy, error };
}
