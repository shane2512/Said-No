import type { Decision, Features, Level, Verdict } from "@/lib/types";
import type { ChainFacts, RequestLogEntry } from "@/lib/tatum";

export type Status = {
  network: "testnet" | "mainnet";
  memory: "walrus" | "local";
  sender: string;
  executeOn: boolean;
  writesOn: boolean;
  publicView: boolean;
  maxSend: number;
};

export type CheckResponse = {
  network: string;
  memory: "walrus" | "local";
  sender: string;
  verdict: Verdict;
  features: Features;
  facts?: ChainFacts;
  requestLog: RequestLogEntry[];
  ignoredMemories: number;
};

export type { Decision, Features, Level };

export const LEVELS: { id: Level; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "reminder", label: "Reminder" },
  { id: "reflection", label: "Reflection" },
  { id: "hold", label: "Hold" },
];

export const short = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a);

export const blobUrl = (id?: string) =>
  id && !id.startsWith("local-") ? `https://walruscan.com/mainnet/blob/${encodeURIComponent(id)}` : undefined;

export const when = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export async function getStatus(): Promise<Status | null> {
  const r = await fetch("/api/status").catch(() => null);
  return r?.ok ? r.json() : null;
}

export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/** Writes take about 25 s on the relayer. Resolves with the blob id, or null if it never lands. */
export async function waitForBlob(jobId: string, tries = 8): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`).catch(() => null);
    if (res?.status === 200) return (await res.json()).blobId as string;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return null;
}
