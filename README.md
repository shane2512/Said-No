# Said-No

A personal consent firewall for Sui. Before a send goes out, Said-No checks it against the sends **you** refused before, in your own words, and adds friction in proportion to how much it resembles them.

Built for the Tatum x Walrus Memory "Total Recall" hackathon. Tracks: Consumer Finance, Best Walrus Memory.

**Live demo:** https://said-no.vercel.app (`/app` is the check, `/lab` the Memory Lab, `/docs` the details)

## What it does

1. You deny a send and type why. The reason is saved to **Walrus Memory**.
2. Next time a send looks like one you refused, Said-No quotes your own reason back, with the receipt (blob id).
3. Facts about the send come live from **Tatum's Sui gRPC gateway**: balance, outgoing history, a dry run. Your usual amount is derived from that history, so "unusual" means unusual for you.
4. Friction scales: `normal` → `reminder` → `reflection` → `hold`. You can forget or override any memory.

## Architecture

```
 send request
      │
      ▼
 Tatum Sui gRPC ──► balance, outgoing history, dry run   (live chain facts)
      │
      ▼
 Walrus Memory  ──► your past decisions + typed reasons  (recall, matched in code)
      │
      ▼
 engine: similarity = 0.35 recipient + 0.30 amount + 0.20 hour + 0.15 interaction
      │
      ▼
 level: normal / reminder / reflection / hold ──► send gate ──► Tatum ExecuteTransaction
```

- Fixed weights, no model in the loop: the same inputs always give the same verdict, and a test pins it.
- **Fails closed.** If Tatum or Memory is unreachable, the verdict is at least `reflection`, never a silent `normal`.
- **Visitors use their own wallet.** The server holds no spending key: it checks the send, builds an unsigned transfer, your wallet signs it, and Tatum broadcasts it. Sends are capped at 0.1 SUI, need an acknowledgement above `normal`, and a passing dry run.
- **Memory is per wallet.** Sign a message once to unlock your own memories, kept in a separate Walrus Memory namespace; no one else's wallet can read them. They sit in the project's Walrus account, so the operator can read them: this is a demo, not a vault.
- Requests are rate-limited per visitor.

## Walrus Memory writes on mainnet

12 writes through the mainnet relayer, signed by the project's delegate key; recall returned 12/12.

| id | action | blob id |
|---|---|---|
| mainnet-01 | deny | [`ybIaw2ZXRsEHcJzWvBna-j3K7fsfcGoJL7uo0IBcf0Y`](https://walruscan.com/mainnet/blob/ybIaw2ZXRsEHcJzWvBna-j3K7fsfcGoJL7uo0IBcf0Y) |
| mainnet-02 | deny | [`OxQbNb0UJ3v82LocWUumD7R9TYxt7L5x0dXQpV9-acI`](https://walruscan.com/mainnet/blob/OxQbNb0UJ3v82LocWUumD7R9TYxt7L5x0dXQpV9-acI) |
| mainnet-03 | deny | [`HvvyYDikARil0S5U81hnYKAFvMzs1ntCRNnqiq9Wnyw`](https://walruscan.com/mainnet/blob/HvvyYDikARil0S5U81hnYKAFvMzs1ntCRNnqiq9Wnyw) |
| mainnet-04 | deny | [`a42nGp1RgdLv5bSYX0rs_Uk0IZ48d0vgoVDH0kqczSA`](https://walruscan.com/mainnet/blob/a42nGp1RgdLv5bSYX0rs_Uk0IZ48d0vgoVDH0kqczSA) |
| mainnet-05 | deny (hard) | [`CDidQc6C3sjZXXlur2UYScztwEYUxlZRNKo1YPsmG_E`](https://walruscan.com/mainnet/blob/CDidQc6C3sjZXXlur2UYScztwEYUxlZRNKo1YPsmG_E) |
| mainnet-06 | deny | [`orq4vy9PmWXemMcyKiVKpEWWvStfOQ9dEVObGbjVpBw`](https://walruscan.com/mainnet/blob/orq4vy9PmWXemMcyKiVKpEWWvStfOQ9dEVObGbjVpBw) |
| mainnet-07 | approve | [`MbJSvApnqBAena960rT0uOUk5EysaEunKcW0dNAS4Yw`](https://walruscan.com/mainnet/blob/MbJSvApnqBAena960rT0uOUk5EysaEunKcW0dNAS4Yw) |
| mainnet-08 | override | [`jDJMFl5P_v-ss4-D31qrW_kGt2xxpRbtDHdL1Kfcv94`](https://walruscan.com/mainnet/blob/jDJMFl5P_v-ss4-D31qrW_kGt2xxpRbtDHdL1Kfcv94) |
| mainnet-09 | approve | [`ktRPVNYOr4HcuoUWPSAF6uErNa-YKHvajyWTcBXyZCw`](https://walruscan.com/mainnet/blob/ktRPVNYOr4HcuoUWPSAF6uErNa-YKHvajyWTcBXyZCw) |
| mainnet-10 | deny | [`qZCafu7p7nMGTvpmeBBeHcBt6AxgiDL0Oz6WynDse7I`](https://walruscan.com/mainnet/blob/qZCafu7p7nMGTvpmeBBeHcBt6AxgiDL0Oz6WynDse7I) |
| mainnet-11 | deny | [`I9PI0ts-e3CVv2XV2FIGX2-DlpKefRkYSs5ZlWr_RYk`](https://walruscan.com/mainnet/blob/I9PI0ts-e3CVv2XV2FIGX2-DlpKefRkYSs5ZlWr_RYk) |
| mainnet-12 | delete of mainnet-04 | [`WokGBWkO1fQuz17MkscRPUOHbPLMhqifca1-IABhlas`](https://walruscan.com/mainnet/blob/WokGBWkO1fQuz17MkscRPUOHbPLMhqifca1-IABhlas) |

## Honesty notes

- **These 12 entries are example decisions drafted with an AI assistant**, not reasons typed while deciding a live send. They are labelled `real` at the account owner's choice, so the public site hides them by design; the table above is the proof. Their script is [`scripts/seed-mainnet.ts`](scripts/seed-mainnet.ts) and the text is in [`src/lib/seed-data.ts`](src/lib/seed-data.ts).
- The recorded run on `/app` is one genuine end-to-end run: a memory saved to Walrus (label `demo`, blob [`eutRS0w3RLXgPFFuGHPK5BcsCzr_Vs7PDP7PUaLQV0k`](https://walruscan.com/mainnet/blob/eutRS0w3RLXgPFFuGHPK5BcsCzr_Vs7PDP7PUaLQV0k)) and a 0.01 SUI testnet send through Tatum (digest `BB3vxaoX2AsfnoeDoHkddFZ6emrmTXi1XHDDubxXq1Po`). The page re-runs the engine over the recorded inputs; it does not replay stored verdicts.
- The check page has a **testnet / mainnet toggle**. It switches the Tatum reads and the network your wallet signs on. Memory always uses Walrus's mainnet relayer (the staging relayer is down), so the same memories apply on either chain. Mainnet sends have not been tested yet.
- The 12 mainnet memories above were written to the project's own Walrus namespace as proof of the writes. Visitors get their own per-wallet namespaces, so they do not appear in the app.
- Sui JSON-RPC is decommissioned, so Tatum is used through its native gRPC gateway. Free-plan limit is 3 requests/second; calls are paced and retried.
- Memory recall is semantic only, so each decision is stored as a sentence plus a JSON line and matched in code.
- Details of every verified result: [docs/spike-results.md](docs/spike-results.md).

## Run it

```bash
pnpm install
cp .env.example .env     # fill in TATUM_API_KEY (+ TATUM_API_KEY_MAINNET), MEMWAL_ACCOUNT_ID, MEMWAL_DELEGATE_KEY
pnpm dev                 # http://localhost:3000
pnpm test                # 84 tests
```

No keys? `MEMORY_BACKEND=local` (see `scripts/dev-local.mjs`) keeps decisions in memory so nothing touches Walrus.

## Stack

Next.js 15, TypeScript, `@mysten/sui` v2 over Tatum gRPC, `@mysten-incubation/memwal`, Vitest (tests written first), GSAP + Lenis + three.js for the site. Deployed on Vercel.

## Docs

- Design: [docs/superpowers/specs/2026-10-28-said-no-v2-design.md](docs/superpowers/specs/2026-10-28-said-no-v2-design.md)
- Plan: [docs/superpowers/plans/2026-10-29-said-no-v2.md](docs/superpowers/plans/2026-10-29-said-no-v2.md)

MIT licensed.
