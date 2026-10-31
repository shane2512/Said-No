# Said-No: a wallet that remembers what you refused

Most wallets remember approvals. They keep a list of contracts you allowed and addresses you paid. Almost none remember the sends you *didn't* make, and those are the ones that tell you the most about yourself.

Said-No is a consent firewall for Sui. When you refuse a send, it saves your reason, in your own words, to Walrus Memory. The next time a send looks like one you refused, it quotes you back to yourself and adds friction in proportion to how similar the two are. Built for the Tatum x Walrus Memory "Total Recall" hackathon.

## What it looks like

You are about to send 7 SUI to an address you have never paid. Said-No checks the chain through Tatum, recalls your past refusals from Walrus Memory, and answers:

> You refused something like this before: "Too large for someone I have never paid. If this is real they can take a small test first." Without this memory the send would be **normal**. With it: **reflection**.

That last line is the counterfactual, and it is the point. The memory changed the decision, and the page shows by how much.

## How it decides

No model sits in the loop. Each remembered decision is compared with the send in front of you using fixed weights: recipient 0.35, amount 0.30, hour of day 0.20, prior interactions 0.15. The score picks a level:

- below 0.40: normal
- 0.40 to 0.69: reminder
- 0.70 to 0.84: reflection
- a memory marked "never this address", or two matching refusals at 0.85 or above: hold

Approvals count too. If you have approved this kind of send more often than you refused it, the friction drops. You can forget any memory, and you can override a warning. The same inputs always give the same verdict, and a test pins that down.

## Where Tatum and Walrus fit

**Tatum** supplies the live facts about the send: your balance, your outgoing history (so "unusual amount" means unusual *for you*), and a dry run. It also broadcasts the transaction your wallet signed. Sui JSON-RPC is gone, so this goes through Tatum's native gRPC gateway. Two things we learned the hard way: the gateway speaks native gRPC only (grpc-web is rejected), and `ListTransactions` is a server stream that needs a start checkpoint taken from `getServiceInfo`, because nodes prune old history.

**Walrus Memory** holds the decisions. Recall is semantic only, so each decision is stored as a plain sentence plus a JSON line, and the matching happens in code. Writes take about 25 seconds, which the UI shows honestly instead of hiding.

## It fails closed

If Tatum or Memory is unreachable, Said-No does not quietly say "normal". It treats the send as at least a reflection. A safety tool that goes silent when it breaks is worse than none.

## What it learned from being built

Memory is only useful if it is correct. Three bugs taught us that:

1. **Frozen ratios.** We first stored "this amount was 3x your usual" at save time. As your usual changed, old memories went wrong: a 0.5 SUI send scored 0.70 and a 0.01 SUI send scored 1.00. We now store real amounts and rebase them at check time.
2. **No history.** A brand-new wallet has no median, so the amount ratio came out as 10,000,000. Now it is neutral.
3. **Shared memory.** When we made memories per wallet, an explicit namespace in the save call overrode each wallet's own, so every visitor shared one pool. A live two-wallet test caught it within minutes and we bound the namespace inside the client so no caller can override it.

## Honest limits

- The 12 memories we wrote to Walrus mainnet for the hackathon were drafted with an AI assistant as example decisions. They prove the writes, not months of real use. The README lists every blob ID.
- Tatum runs on testnet and mainnet for reads. A send has been run on testnet only.
- Memories sit in the project's Walrus account, so the operator can read them. This is a demo, not a vault.
- Chain facts are read through Tatum, but a wallet-signed send is the user's call: Said-No adds friction, it cannot stop a determined user, and it is not financial advice.

## Try it

Live demo: https://said-no.vercel.app. Connect a Sui wallet on `/app`, deny a send with a reason, then check the same send again.
