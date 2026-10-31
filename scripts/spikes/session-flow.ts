// End to end against a running server (default http://localhost:3201): two wallets, sign-in, save, recall, isolation.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { signInMessage } from "../../src/lib/signin-message";

const base = process.env.BASE ?? "http://localhost:3201";
const post = async (path: string, body: unknown, token?: string) => {
  const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const get = async (path: string, token?: string) => {
  const r = await fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
async function login(kp: Ed25519Keypair) {
  const address = kp.toSuiAddress();
  const expires = Date.now() + 3_600_000;
  const { signature } = await kp.signPersonalMessage(new TextEncoder().encode(signInMessage(address, expires)));
  const r = await post("/api/session", { address, expires, signature });
  return { address, token: r.data.token as string, status: r.status };
}
const ok = (name: string, cond: boolean, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`); if (!cond) process.exitCode = 1; };

async function main() {
  const a = await login(Ed25519Keypair.generate());
  const b = await login(Ed25519Keypair.generate());
  ok("sign-in returns tokens", a.status === 200 && b.status === 200);
  const forged = await post("/api/session", { address: a.address, expires: Date.now() + 1000, signature: (await Ed25519Keypair.generate().signPersonalMessage(new Uint8Array([1]))).signature });
  ok("forged sign-in refused", forged.status === 401);
  ok("decide without token refused", (await post("/api/decide", {})).status === 401);

  const recipient = "0x" + "ab".repeat(32);
  const feat = { novelRecipient: true, amountRatio: 1, hour: 14, interactions: 0 };
  const saved = await post("/api/decide", { action: "deny", recipient, amount: 0.5, reason: "wallet A private reason", kind: "soft", features: feat }, a.token);
  ok("A saves a refusal", saved.status === 202, JSON.stringify(saved.data).slice(0, 80));
  await get(`/api/jobs/${saved.data.jobId}`, a.token);

  const memA = await get("/api/memories", a.token);
  const memB = await get("/api/memories", b.token);
  ok("A sees own memory", memA.data.decisions?.length === 1);
  ok("B does not see A's memory", memB.data.decisions?.length === 0);
  ok("no token sees nothing", (await get("/api/memories")).data.decisions?.length === 0);

  const chk = (w: { address: string; token: string }) => post("/api/check", { sender: w.address, recipient, amount: 0.5, hour: 14, network: "testnet" }, w.token);
  const ca = await chk(a);
  const cb = await chk(b);
  ok("A's check quotes A's reason", JSON.stringify(ca.data.verdict).includes("wallet A private reason"), ca.data.verdict?.level);
  ok("B's check does not", !JSON.stringify(cb.data).includes("wallet A private reason"), cb.data.verdict?.level);
}
main().catch((e) => { console.log("FAIL:", String(e?.message ?? e)); process.exitCode = 1; });
