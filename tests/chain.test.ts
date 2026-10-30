import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseOutgoing } from "@/lib/chain";

const SUI = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
const A = "0xaaaa";
const B = "0xbbbb";
const C = "0xcccc";

const frame = (sender: string, changes: [string, string, string][], seconds = "1793374558") => ({
  digest: "dig",
  transaction: { sender },
  timestamp: { seconds, nanos: 0 },
  balanceChanges: changes.map(([address, coinType, amount]) => ({ address, coinType, amount })),
});

describe("parseOutgoing", () => {
  it("returns the recipient, SUI amount and time of a send to someone else", () => {
    const out = parseOutgoing(
      [frame(A, [[A, SUI, "-5001000000"], [B, SUI, "5000000000"]])],
      A,
    );
    expect(out).toEqual([{ recipient: B, amount: 5, ts: 1793374558 }]);
  });

  it("skips transactions sent by someone else (for example a faucet funding)", () => {
    expect(parseOutgoing([frame(C, [[C, SUI, "-1001000000"], [A, SUI, "1000000000"]])], A)).toEqual([]);
  });

  it("skips self-sends, which only change the sender's balance by gas", () => {
    expect(parseOutgoing([frame(A, [[A, SUI, "-1000000"]])], A)).toEqual([]);
  });

  it("ignores non-SUI coins", () => {
    const other = "0xdead::foo::FOO";
    expect(parseOutgoing([frame(A, [[A, other, "-10"], [B, other, "10"]])], A)).toEqual([]);
  });

  it("picks the largest positive recipient when a transaction pays several addresses", () => {
    const out = parseOutgoing(
      [frame(A, [[A, SUI, "-9001000000"], [B, SUI, "2000000000"], [C, SUI, "7000000000"]])],
      A,
    );
    expect(out[0]).toMatchObject({ recipient: C, amount: 7 });
  });

  it("parses the real frames captured from Tatum testnet without throwing", () => {
    const frames = JSON.parse(readFileSync("fixtures/history-frames.testnet.json", "utf8"));
    // frames: 0 faucet A -> demo, 1 faucet B -> demo, 2 demo self-send
    const demo = frames[2].transaction.sender as string;
    expect(parseOutgoing(frames, demo)).toEqual([]); // the demo wallet only received and self-sent
    const faucetB = frames[1].transaction.sender as string;
    expect(parseOutgoing(frames, faucetB)).toEqual([
      { recipient: demo, amount: 1, ts: Number(frames[1].timestamp.seconds) },
    ]);
  });
});
