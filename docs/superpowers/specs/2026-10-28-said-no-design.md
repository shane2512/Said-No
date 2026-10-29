# Said-No: design (Tatum x Walrus "Total Recall" hackathon)

> SUPERSEDED by `2026-10-28-hindsight-design.md`. Wrong now: Tatum can submit transactions (the "public fullnode" caveat), Sui JSON-RPC is gone (all `sui_*`/`suix_*` names are legacy; build gRPC-first), "build on testnet first" (Storage API needs mainnet), "CLI plus static page" (hosted Next.js), AI Builder "not entering" (now a free option).

Status: DRAFT, awaiting owner approval. Nothing is built yet. Produced from a 10-loop generator / contradictor / validator process (20 subagent passes). Deadline: submissions close 10 Nov 2026 17:00 UTC.

## Intent
A wallet guardian for Sui that remembers every time you said no. When you deny a flagged send, your typed reason is stored in Walrus Memory and becomes a counted lesson. The next similar send is escalated with your own words and a receipt.

Pitch: "Your wallet remembers every time you said no."
Tagline: "Your wallet remembers every time you said no, and says it first."

## Strategy (locked)
- Track: Track 3, Consumer Finance Apps. Special: Best Walrus Memory only.
- Not entering Best Tatum AI Builder (an honest "built primarily with ai.tatum.io" claim isn't defensible) or Best Agent Payments (no official x402 SDK for Sui, about 2 days of work for about a 5% chance).
- Build on testnet first, port to mainnet. Mainnet account and first real memory happen on D1 (de-risking), features developed against testnet.

## Goals
1. Visible, provable behaviour change driven by Memory: the before/after test.
2. At least 10 real mainnet memories (aim 15), written by the submitted delegate key in the submitted account.
3. Real Tatum Sui RPC use: `sui_dryRunTransactionBlock`, `sui_getTransactionBlock`, `suix_getBalance`, `suix_queryTransactionBlocks`.
4. Strong first 15 seconds of the demo, blog post, public MIT repo, recorded real mainnet run.

## Non-goals / anti-goals
- No Move package, no x402/MPP, no React/Vite UI, no wallet-standard interception, no multi-rule engine, no shareable card.
- No "AI learned" claims, no "forgets" wording, no zero-trust claim, no revoke-latency claim beyond what is measured.
- Anti-goal: a demo that looks faked. Seeded data is a labelled footnote, not the demo.

## Behaviour
- Intent is written to Memory BEFORE the action. Approved sends are submitted via a public Sui fullnode (Tatum's Sui list has no executeTransactionBlock) and joined to the tx digest via Tatum `sui_getTransactionBlock`.
- A denied send never touches the chain. Its receipt is blob_id + created_at + Tatum dry-run result + balance snapshot.
- Namespaces as typed indexes: `intents`, `overrides`, `lessons` (seeded data in separate namespaces; CI uses throwaway namespaces).
- Each memory text = one JSON line + one natural-language line, with `source: "real" | "seeded"`. All memories are schema-validated on parse; unparseable or mismatched ones are ignored.
- Lessons are computed in code (LLM `analyze()` optional, first cut): `{dim, bucket, n, denied, approved, amount_floor, ts, evidence_ids}`.
  - Dimensions: `recipient_age` (new/known), `hour` (night 0-6 / day). Amount is a learned parameter (`amount_floor` = lowest amount denied in the bucket).
  - A bucket counts only if n >= 3. Risk p = (denied+1)/(n+2). Matched buckets combine by noisy-OR, p = 1 - prod(1 - p_i). Escalate at p >= 0.6.
  - Lesson diff (old vs new JSON) is shown when a threshold shifts (e.g. 5 SUI to 2 SUI after 3 low-amount denials).
- Policy: recall lessons, parse, evaluate deterministically, allow / escalate. UI quotes the user's own typed reason with date, memory id and (for approved sends) the verified tx digest. Cold start: conservative defaults plus a visible "learning" state until n >= 3.
- Tatum failures (429, credit exhaustion, outage) fail closed: escalate, never allow. Retry/backoff wrapper, 3 req/s, relayer 60 points/min (30/min per delegate).
- Optional agent B: a second process with its own delegate key reads the same account's lessons and is blocked by a lesson it never saw; owner revokes the key, access ends. Delegates are account-wide read/write (trust model: agents you trust). Cut at end of D9 unless it passes; claim only the measured revoke latency.

## Demo (90 seconds)
0:00-0:15 send screen, then card: "Last time you said no to this." + your quote + receipt line + big Deny / small Send anyway; Hall of No's ticks up. 0:15-0:30 honesty beat + before/after test (empty = allow, 5 denials = escalate citing blob ids, forget = allow). 0:30-0:50 live new denial with a typed reason; blob opened in the Walrus explorer. 0:50-1:10 threshold shift with lesson diff. Optional agent B beat, then Postgres answer (portable owner-controlled space, pre-commit timestamp, index `restore()`), revoke, end on Hall of No's. Submit a pre-recorded real mainnet run from a dedicated demo wallet (tiny 0.01-0.1 SUI sends), plus a reproducible local run.

## Architecture
TypeScript on Node >= 22.23 (verify), pnpm. CLI + policy engine + one well-styled static HTML page (Hall of No's, opening card, Tatum request-count badge, Suiscan/Walrus links). SDK `@mysten-incubation/memwal` (unverified, spike 1), peers `@mysten/sui @mysten/seal @mysten/walrus`. Tatum JSON-RPC `https://sui-mainnet.gateway.tatum.io` with `x-api-key` (verify). Vitest for the policy and the before/after test.

## Plan (13 days from 28 Oct) and kill criteria
D1 spikes + mainnet account + first real memory | D2 spikes 4-7, repo, intents written before action | D3 overrides + dry-run verdict | D4 diary slice done, tag `diary-ok` | D5-D6 lessons, policy, second dimension, before/after test GREEN (gate: if not green by end D6, drop second dimension + analyze(), ship diary) | D7 static page | D8-D9 agent B/revoke (hard kill end D9), mainnet run with 12-15 real memories | D10-11 recorded takes, README, blog (outline from D6) | no new features after D11 | D12-13 fixes, social post, submit a day early.
Switch ideas entirely only if: no mainnet Memory account is possible, recall never returns new memories after two attempts, or Tatum mainnet is unusable with no fallback (Tatum-only failure: use the gRPC testnet endpoint and tell organisers).
Fallback: Flight Recorder diary-only (intent in Memory, joined to tx via Tatum, `ask()`), a strict subset of this build.

## Five non-negotiables (top of README)
1. The before/after test ships first and stays green.
2. At least 10 real mainnet memories from the submitted delegate key and account.
3. Tatum is called for dry-run, getTransactionBlock and getBalance; failures fail closed.
4. Every claim is measured or labelled.
5. No new features after D11; submit by D12-13 with a recorded real mainnet run.

## README honesty labels
1. Demo data is seeded and labelled (real/seeded badge per memory; the 10+ mainnet count uses real memories only).
2. Transactions are submitted via a public fullnode; Tatum supplies dry-runs, effects and balances.
3. "Learned" means counted statistics with support; the rule shape is fixed; a denied send never touches the chain, the proof is the memory.

## Day-1 unknowns (spikes, each <= 2h)
Event Rules (AI-assisted coding policy, licence, one submission per person, single account). Mainnet Memory account route/cost/who pays. Tatum mainnet on the free plan, auth header, credits per call, no 429 at 3 rps. SDK real relayer URLs and Node minimum. recall() params from SDK source. Delegate add/remove via SDK vs Dashboard. Revoke latency and error type. analyze()/ask() latency vs quotas. Submit via fullnode, resolve the same digest in Tatum. `@mysten/sui` version vs SDK peer range and Tatum JSON-RPC.

## Odds (guesswork)
About 75% submit a working mainnet entry, about 22% Track 3 top 3, about 30% Best Walrus Memory. Expected value about $150-230.

## Calls the author made (check these)
Track 3 over Track 2; dropping Best Tatum AI Builder and Agent Payments; two rule dimensions (recipient age, hour); noisy-OR combination and 0.6 threshold; static page instead of React; dedicated demo wallet with tiny sends.
