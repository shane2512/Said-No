# Said-No: a wallet that remembers what you refused

> Publish checklist (delete before posting): add the poster image `brand/png/poster-16x9.png` as the cover; paste the demo video link where marked; keep the "Honest limits" section as written.

Most wallets remember approvals. They keep a list of contracts you allowed and addresses you paid. Almost none remember the sends you *didn't* make, and those are the ones that tell you the most about yourself.

**Said-No** is a consent firewall for Sui. When you refuse a send, it saves your reason, in your own words, to **Walrus Memory**. The next time a send looks like one you refused, it quotes you back to yourself and adds friction in proportion to how similar the two are. Live chain facts come from **Tatum's Sui gRPC gateway**. It is built for the Tatum x Walrus Memory "Total Recall" hackathon.

Live demo: https://said-no.live · Code: https://github.com/shane2512/Said-No · Video: **[VIDEO LINK]**

## What it looks like

You are about to send 7 SUI to an address you have never paid. Said-No checks the chain through Tatum, recalls your past refusals from Walrus Memory, and answers:

> You refused something like this before: "Too large for someone I have never paid. If this is real they can take a small test first." Without this memory the send would be **normal**. With it: **reflection**.

That last line is the counterfactual, and it is the point. The memory changed the decision, and the page shows by how much.

## How it decides

No model sits in the loop. Each remembered decision is compared with the send in front of you using four factors: whether the recipient is new, the amount (relative to *your* usual amount), the hour of day, and how often you have paid that address. The default weights are 0.35, 0.30, 0.20 and 0.15. The score picks a level:

- below 0.40: **normal**
- 0.40 to 0.69: **reminder**
- 0.70 to 0.84: **reflection**
- a memory marked "never this address", or two matching refusals at 0.85 or above: **hold**

Approvals count too. If you have approved this kind of send more often than you refused it, the friction drops. You can forget any memory, and you can override any warning. The same inputs always give the same verdict, and a test pins that down.

**It learns you, within limits.** Once you have three refusals, a factor that is the same across them counts for more. If you always refuse at night, the hour matters more for you. Half of each weight stays on the fixed default, so a few refusals can't swing the score far. Said-No also states the patterns it found in plain words ("You tend to refuse late-night sends"), but only when at least two refusals and 60 percent of them agree, so one bad night never becomes a rule. The "Why" panel shows every factor's contribution, so there is no black box.

**Reflection is a pause, not a quiz.** On a reflection verdict the Proceed button unlocks after five seconds. Nothing is taken away from you.

## Where Tatum and Walrus fit

**Tatum** supplies the live facts about the send:

- your balance, and your outgoing history, so "unusual amount" means unusual *for you*;
- a dry run before anything is offered to your wallet;
- a check of the recipient against Tatum's malicious-address list. A listed address is held. If the screen can't run, the send is still checked and shown as "unscreened";
- the broadcast of the transaction your wallet signed.

Sui JSON-RPC is gone, so this goes through Tatum's native gRPC gateway. Two things we learned the hard way: the gateway speaks native gRPC only (grpc-web is rejected), and `ListTransactions` is a server stream that needs a start checkpoint taken from `getServiceInfo`, because nodes prune old history. The free plan allows three requests per second, so calls are paced and retried.

Two chain-only nudges need no past refusal: three or more sends in an hour, and a new recipient with an amount five times your usual. Both can only raise a send to a reminder, so ordinary sends stay silent.

**Walrus Memory** holds the decisions. Each is stored as a plain sentence plus a JSON line, and the matching happens in code. Memory's own semantic search adds one more thing: you can type what a send is for ("a stranger says the offer ends today"), and if that means roughly what a past refusal meant, Said-No quotes that refusal. It is a nudge, never a block. Writes take about 25 seconds, which the UI shows honestly instead of hiding. The blobs are encrypted, so a block explorer shows no readable text.

## Your wallet, your memory

Visitors connect their own Sui wallet. The server holds **no spending key**: it checks the send, builds an unsigned transfer, your wallet signs it, and Tatum broadcasts it. You sign one message to unlock your memories, which live in a separate namespace per wallet. If Tatum or Memory is unreachable, Said-No does not quietly say "normal". It treats the send as at least a reflection. A safety tool that goes silent when it breaks is worse than none.

## What it learned from being built

Memory is only useful if it is correct. Three bugs taught us that:

1. **Frozen ratios.** We first stored "this amount was 3x your usual" at save time. As your usual changed, old memories went wrong: a 0.5 SUI send scored 0.70 and a 0.01 SUI send scored 1.00. We now store real amounts and rebase them at check time.
2. **No history.** A brand-new wallet has no median, so the amount ratio came out as 10,000,000. Now it is neutral.
3. **Shared memory.** When we made memories per wallet, an explicit namespace in the save call overrode each wallet's own, so every visitor shared one pool. A live two-wallet test against real Walrus caught it within minutes, and we bound the namespace inside the client so no caller can override it.

## Honest limits

- The 12 memories we wrote to Walrus mainnet for the hackathon were drafted with an AI assistant as example decisions. They prove the writes, not months of real use. The README lists every blob ID.
- Tatum reads and sends work on testnet and mainnet. Testnet sends were run repeatedly, and **one real mainnet send** (0.0000001 SUI, [digest](https://suiscan.xyz/mainnet/tx/2xVuyxj3L4YGVxKVbaVrfkwGJNrDww61GFtd7ondLDGy)) was made from the live app and checked on-chain. The recipient got exactly that amount; the sender also paid the roughly 0.001 SUI network fee. One small transaction, not a load test.
- The meaning-match cutoff came from a small sample of memories and will need re-tuning with more. The scam-list check has been confirmed live only for a clean address.
- Memories sit in the project's Walrus account, so the operator can read them. This is a demo, not a vault.
- Said-No adds friction. It cannot stop a determined user, and it is not financial advice.
- Much of this code was written with an AI coding assistant (Claude Code). Every behaviour change was test-first, and the tests are in the repo.

## Try it

Open https://said-no.live/app, connect a Sui wallet (testnet is free from the faucet), deny a send with a reason, then check the same send again and watch it quote you back.
