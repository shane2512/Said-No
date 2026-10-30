import type { Decision } from "./types";

type Row = Omit<Decision, "ts" | "source" | "recipient" | "id"> & { n: number; to: string };

const SUI_HI = 2;
const f = (novelRecipient: boolean, amountRatio: number, hour: number, interactions: number) => ({ novelRecipient, amountRatio, hour, interactions });

const ROWS: Row[] = [
  { n: 1, to: "a1", amount: 7, action: "deny", kind: "soft", reason: "Too large for someone I have never paid. If this is real they can take a small test first.", features: f(true, 3.5, 14, 0) },
  { n: 2, to: "b2", amount: 12, action: "deny", kind: "context", reason: "Random address from Discord and it is 2am. I do not make decisions like this at night.", features: f(true, 6, 2, 0) },
  { n: 3, to: "c3", amount: 5, action: "deny", kind: "context", reason: "First time I am sending to this wallet and I was told to hurry. Nobody who means well needs an answer in five minutes.", features: f(true, 2.5, 16, 0) },
  { n: 4, to: "d4", amount: 20, action: "deny", kind: "soft", reason: "Ten times what I normally send. Make me look at this twice.", features: f(true, 10, 11, 0) },
  { n: 5, to: "e5", amount: 3, action: "deny", kind: "hard", reason: "Never send to this address again. It asked me twice for a refund and then went quiet.", features: f(false, 1.5, 15, 2) },
  { n: 6, to: "f6", amount: 4, action: "deny", kind: "context", reason: "The address is different from the one they gave me last week. Confirm it with them another way first.", features: f(true, 2, 13, 0) },
  { n: 7, to: "07", amount: 0.1, action: "approve", kind: "context", reason: "My landlord, same address every month. Safe, stop asking about this one.", features: f(false, 0.5, 10, 4) },
  { n: 8, to: "08", amount: 1, action: "override", kind: "context", reason: "It is my own second wallet. I know the warning is about size and I want it anyway.", features: f(false, 1, 12, 3) },
  { n: 9, to: "09", amount: 2, action: "approve", kind: "context", reason: "Flagged as unusual, then I confirmed the address on a call. Fine to go ahead.", features: f(true, 1, 17, 0) },
  { n: 10, to: "0a", amount: 50, action: "deny", kind: "soft", reason: "A round fifty to a brand new address late in the day. That is how a mistake feels at the time.", features: f(true, 25, 23, 0) },
  { n: 11, to: "0b", amount: 6, action: "deny", kind: "context", reason: "They said the offer ends tonight. Urgency from a stranger is a reason to wait, not to send.", features: f(true, 3, 19, 0) },
  // The last entry removes number 4, to show that a warning can be forgotten.
  { n: 12, to: "d4", amount: 20, action: "delete", kind: "soft", reason: "Deleted by the user", features: f(true, 10, 11, 0) },
];

const addr = (tag: string) => `0x${tag.repeat(32).slice(0, 64)}`;
export const seedId = (n: number) => `mainnet-${String(n).padStart(2, "0")}`;

/**
 * The twelve decisions saved to Walrus Memory for the hackathon run. They are authored examples
 * of a person's refusals and approvals; `label` states what they are, so nothing passes as more.
 */
export function buildMainnetSet(label: Decision["source"], startTs: number): Decision[] {
  return ROWS.map((r) => ({
    id: seedId(r.n),
    recipient: addr(r.to),
    amount: r.amount,
    reason: r.reason,
    ts: startTs + (r.n - 1) * 3600 * SUI_HI,
    features: r.features,
    action: r.action,
    source: label,
    kind: r.kind,
    ...(r.action === "delete" ? { target: seedId(4) } : {}),
  }));
}
