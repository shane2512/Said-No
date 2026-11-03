# Said-No: Project Handoff

Everything another developer or AI agent needs to continue this project without the original chat history.
Read this file top to bottom once, then use [MASTER_PROMPT.md](MASTER_PROMPT.md) to drive the work.

- **Written:** 3 Nov 2026
- **Hackathon deadline: 10 Nov 2026, 17:00 UTC** (7 days from writing)
- **Repo:** https://github.com/shane2512/Said-No (public, MIT)
- **Live:** https://said-no.live (also https://said-no.vercel.app)
- **Owner GitHub:** `shane2512`

> **Never put secrets in this repo or in chat.** Only variable *names* appear below. Real values live in the owner's local `.env` and in Vercel's environment.

---

## 1. What this is, in one paragraph

**Said-No** is a personal consent firewall for Sui. When a user refuses a send and types why, the reason is saved to **Walrus Memory**. When a later send resembles a past refusal, Said-No quotes the user's own reason back and adds friction in proportion to the similarity. Live chain facts (balance, outgoing history, dry run, scam-list screening, broadcast) come from **Tatum's Sui gRPC gateway**. Visitors connect their **own wallet**; the server holds **no spending key**. Memories are **per wallet**, unlocked by signing a message.

Tagline: *Most wallets remember approvals. Said-No remembers the sends you rejected.*

## 2. The hackathon

**Tatum x Walrus Memory "Total Recall".** Targets: **Track 3 Consumer Finance** and **Best Walrus Memory**. (The AI Builder bounty was deliberately left out.)

Judging weights: Walrus + Tatum integration **30%**, technical quality **30%**, creativity **20%**, presentation **20%**.

Required for submission:
1. At least **10 Walrus Memory writes on mainnet** from the submitted delegate key / account. **Done: 12.**
2. **Tatum Sui RPC** used meaningfully. **Done** (gRPC reads, history, dry run, scam screening, broadcast).
3. A **published blog post**. **Draft written, not published.**
4. A **working demo** (live + a recorded video). **Live works; video not recorded.**
5. A **public repo**. **Done.**

## 3. Problem and solution (use these words in the video, blog and form)

**Problem.** Wallets remember what you approved, not what you refused. On-chain sends are irreversible, and people repeat the same mistakes: a large amount to a stranger, a rushed transfer at 2 am, an address pasted from a chat that felt wrong. Generic scam warnings do not know *you*.

**Solution.**
1. You say no and say why. The reason goes to Walrus Memory.
2. The next similar send is compared with your past decisions.
3. Said-No answers in your own words, with the blob ID as a receipt, and adds friction in proportion to the match.
4. Every verdict shows a **counterfactual**: what the answer would have been without your memory.

## 4. How the decision works (important, do not casually change)

No ML model is in the loop. It is deterministic and unit-tested.

- Each remembered decision is compared with the current send using four factors. **Default weights:** recipient **0.35**, amount **0.30**, hour **0.20**, prior interactions **0.15** (`WEIGHTS` in `src/lib/engine.ts`).
- **Personal weights (`learnWeights`):** with 3 or more of the user's refusals, a factor that is the same across their refusals counts for more. Half of each weight stays on the fixed default so a few refusals cannot swing the score far. Fewer than 3 refusals: default weights.
- **Levels:** similarity below 0.40 = `normal`; 0.40 to 0.69 = `reminder`; 0.70 to 0.84 = `reflection`; `hold` needs a "never this address" (hard) memory for the same recipient, or two matching refusals at 0.85 or higher.
- **Approvals count:** more approvals than denials for a pattern gives `normal`; equal drops one level.
- **Amounts are stored as real amounts and rebased at check time** to the user's current median (one baseline for all memories). Storing a ratio at save time was a real bug (see section 12).
- **Habits (`habits`):** plain-words patterns from the user's own refusals ("You tend to refuse late-night sends"). Needs at least 2 refusals and 60% sharing the pattern.
- **Risk signals (`riskSignals` in `src/lib/service.ts`):** chain-only nudges that only ever raise a send to `reminder`: 3 or more sends in the last hour; a new recipient with an amount 5 times the usual.
- **Tatum scam-list screening:** if Tatum lists the recipient as malicious, the verdict is `hold`. If screening cannot run, the send is still checked and marked "unscreened".
- **Optional note (meaning match):** the user can type what the send is for. Walrus Memory's own semantic distance (`SAME_MEANING = 0.6`, from a small sample; re-check with more memories) finds an earlier refusal that means the same thing and quotes it. It only nudges to `reminder`, never blocks. Deleted refusals never come back through this path.
- **Reflection is a pause, not a quiz:** the Proceed button unlocks after 5 seconds on a `reflection` verdict.
- **Fails closed:** if Tatum or Memory is unreachable, the verdict is at least `reflection`, never a quiet `normal`.
- **Send gate (`sendGate`):** sends capped at **0.1 SUI**, need an acknowledgement above `normal`, and a passing dry run.

## 5. Architecture

```
Browser (Sui wallet, Slush etc.)
   │ sign-in message / transaction signature
   ▼
Next.js 15 (App Router) on Vercel
   /api/session    sign-in → HMAC token bound to one address
   /api/check      verdict (facts + memory + engine + counterfactual)
   /api/decide     save a decision to the wallet's own memory (~25 s)
   /api/jobs/:id   blob id once saved (202 until then)
   /api/memories   the wallet's own decisions
   /api/build      re-check, then build an UNSIGNED transfer
   /api/broadcast  submit the wallet-signed transaction via Tatum
   /api/status     what this deployment can do (no secrets)
   │                          │
   ▼                          ▼
Tatum Sui gRPC             Walrus Memory (mainnet relayer)
  balance, history,          remember / recall / waitForRememberJob
  dry run, execute           per-wallet namespace `wallet-<address>`
Tatum REST (scam list)
```

Send flow: server builds an unsigned transfer, **the user's wallet signs it**, Tatum broadcasts it. The server never holds a spending key.

## 6. Tech stack

Next.js 15, React 19, TypeScript, Zod, Vitest (tests first), pnpm 11, Node 26 (works on 20+).
Tatum: `@mysten/sui` v2 `SuiGrpcClient` + `@protobuf-ts/grpc-transport` + `@grpc/grpc-js`.
Memory: `@mysten-incubation/memwal` 0.1.11.
Wallet: `@mysten/dapp-kit-react` (Wallet Standard; Slush web wallet registered via `slushWalletConfig`).
Front end: GSAP + ScrollTrigger + ScrambleText, Lenis, three.js. Fonts: Roboto Mono.
Hosting: Vercel (project `shane-joans-vs-projects/said-no`). Domain `said-no.live` bought at Name.com via the GitHub Student Pack; DNS `A @ 64.29.17.1`.

## 7. Repository map

```
src/lib/
  engine.ts        similarity, breakdown, evaluate, learnWeights, habits   (pure)
  features.ts      deriveFeatures (amount ratio, hour, interactions)
  tatum.ts         getChainFacts (paced, retried, fail-closed), ChainSource
  chain.ts         gRPC client, listOutgoing, dryRun, screen (REST), buildTransfer, broadcastSigned
  memory.ts        fromMemWal(namespace bound), saveDecision, loadDecisions, similarRefusals
  memory-local.ts  in-memory backend for tests / no-keys dev
  service.ts       checkSend, riskSignals, recordDecision, sendGate, gating helpers
  session.ts       wallet sign-in → HMAC token; requestOwner
  signin-message.ts / identity.ts   the one app name + site URL used everywhere
  runtime.ts       per-network chain clients; per-wallet memory (getMemory)
  ratelimit.ts     per-visitor fixed-window limiter
  config.ts        network URLs (testnet / mainnet)
  replay.ts + fixtures/replay.json   the recorded real run shown on /app
  seed-data.ts     the 12 mainnet proof memories (authored examples)
src/app/api/       check, decide, build, broadcast, session, jobs/[id], memories, status
src/app/           / (landing), /app (check), /lab (Memory Lab), /docs, icon.svg
src/components/landing/   cinematic landing (GSAP, Lenis, three.js)
src/components/site/      CheckApp, LabApp, DocsPage, RecordedRun, wallet.ts, useSession.ts
tests/             17 files, 110 tests (Vitest)
scripts/           seed-mainnet.ts, vercel-env.mjs, dev-local.mjs, dev-testnet-send.mjs,
                   spikes/ (live checks), brand/build.mjs
brand/             logos (SVG), posters + brand board (PNG), logos/ sources
docs/              HANDOFF.md, MASTER_PROMPT.md, spike-results.md (verified-results log),
                   blog-post.md, superpowers/{specs,plans}/
```

## 8. Environment variables (names only)

| Name | Purpose |
|---|---|
| `NETWORK` | default chain: `testnet` or `mainnet` (visitor can toggle) |
| `TATUM_API_KEY` | Tatum key for testnet (also fallback) |
| `TATUM_API_KEY_MAINNET` | Tatum key for mainnet |
| `MEMWAL_ACCOUNT_ID` | Walrus Memory account object id |
| `MEMWAL_DELEGATE_KEY` | delegate private key (server only) |
| `SESSION_SECRET` | optional; session HMAC secret, falls back to the delegate key |
| `ALLOW_EXECUTE` | `true` lets the server build/broadcast sends |
| `ALLOW_WRITES` | `true` lets visitors save decisions in production |
| `MEMORY_BACKEND` | `local` = in-memory instead of Walrus |
| `NEXT_PUBLIC_DAPP_NAME`, `NEXT_PUBLIC_SITE_URL` | public identity (defaults: `Said-No`, `https://said-no.live`) |

Production currently has `NETWORK=mainnet`, `ALLOW_EXECUTE=true`, `ALLOW_WRITES=true`. The owner copies `.env` to Vercel by running `node scripts/vercel-env.mjs` themself (it never prints values; an AI agent was blocked from writing secrets to Vercel, correctly). After changing any env var, **redeploy**.

## 9. Public identifiers (safe to publish)

- Walrus Memory account: `0x9cde8e86a1ec3d9eb94ccd67dbe724fd22efea262611ff5dc1816c6ac903ebba`
- Delegate public key (`MEMWAL_AGENT_ID` for the form): `0aa4807d2454583e5059f38b8c6edde18d193d3c22479c6b70c57bb0c49e7d39`
- Delegate address: `0x75f0cd348b6fa757807d13f751ce05ab329fedaaae5aa67281393be00109c296`
- Mainnet relayer: `https://relayer.memory.walrus.xyz` (the staging relayer is dead; always use mainnet)
- Tatum gRPC: `https://sui-{testnet|mainnet}-grpc.gateway.tatum.io`; scam list `GET https://api.tatum.io/v3/security/address/{address}`
- **12 mainnet proof memories** (walruscan: `https://walruscan.com/mainnet/blob/<id>`): mainnet-01 `ybIaw2ZXRsEHcJzWvBna-j3K7fsfcGoJL7uo0IBcf0Y`, 02 `OxQbNb0UJ3v82LocWUumD7R9TYxt7L5x0dXQpV9-acI`, 03 `HvvyYDikARil0S5U81hnYKAFvMzs1ntCRNnqiq9Wnyw`, 04 `a42nGp1RgdLv5bSYX0rs_Uk0IZ48d0vgoVDH0kqczSA`, 05 `CDidQc6C3sjZXXlur2UYScztwEYUxlZRNKo1YPsmG_E`, 06 `orq4vy9PmWXemMcyKiVKpEWWvStfOQ9dEVObGbjVpBw`, 07 `MbJSvApnqBAena960rT0uOUk5EysaEunKcW0dNAS4Yw`, 08 `jDJMFl5P_v-ss4-D31qrW_kGt2xxpRbtDHdL1Kfcv94`, 09 `ktRPVNYOr4HcuoUWPSAF6uErNa-YKHvajyWTcBXyZCw`, 10 `qZCafu7p7nMGTvpmeBBeHcBt6AxgiDL0Oz6WynDse7I`, 11 `I9PI0ts-e3CVv2XV2FIGX2-DlpKefRkYSs5ZlWr_RYk`, 12 (delete of 04) `WokGBWkO1fQuz17MkscRPUOHbPLMhqifca1-IABhlas`. All 12 were verified to exist on the Walrus mainnet aggregator.
- Recorded-run demo blob `eutRS0w3RLXgPFFuGHPK5BcsCzr_Vs7PDP7PUaLQV0k`; testnet send digests `BB3vxaoX2AsfnoeDoHkddFZ6emrmTXi1XHDDubxXq1Po`, `9pn2dtKyv6qweKAyHB7sAYVVsEfBDkxTA7vwdxwf9Cd5`, `ARM89U3zryGyfMXNUMkeNkZF12aE4m4Cy4aAPquN9yRf`.
- The 12 memories live in the project's own namespace `decisions`. Visitor memories use `wallet-<address>` namespaces.

## 10. Run it

```bash
pnpm install
cp .env.example .env        # fill in values
pnpm dev                    # http://localhost:3000
pnpm test                   # 110 tests
pnpm typecheck
pnpm build
node scripts/dev-local.mjs 3201     # no keys: in-memory memory backend
node scripts/dev-testnet-send.mjs 3202
node scripts/brand/build.mjs        # regenerate logos/posters (needs Chrome or Edge)
```

Live checks (read-only unless stated), all under `scripts/spikes/`: `chain-live.ts`, `mainnet-audit.ts`, `session-flow.ts` (two-wallet isolation; writes one memory to a throwaway wallet namespace when pointed at the live site), `wallet-flow.ts` and `live-send.ts` (**testnet** transfers; spend testnet SUI), `semantic.ts` (read-only recall distances). Run with `pnpm tsx --env-file=.env scripts/spikes/<file>`.

## 11. Verified results (what is actually proven)

Full log with digests: `docs/spike-results.md`. Summary:

- **Tatum gRPC works** on testnet and mainnet from Vercel serverless (calls about 15 to 140 ms). grpc-web is rejected by the gateway; native gRPC only. `ListTransactions` is a server stream that needs `startCheckpoint` from `getServiceInfo().lowestAvailableCheckpoint`. Free plan is 3 requests per second (paced + retried).
- **Walrus Memory** write and recall verified on mainnet; writes take about 25 s; recall is semantic only, so each decision is stored as a sentence plus a `DECISION_JSON:` line and matched in code.
- **Wallet flow** verified on testnet end to end with a local key standing in for the wallet: live `/api/build` → sign → `/api/broadcast` (digest above).
- **Per-wallet isolation** verified live on real Walrus: two wallets, a forged sign-in refused, B cannot see A.
- **Mainnet audit** (31 Oct): reads, unsigned build, send cap, garbage broadcast rejection, history parsing on a real mainnet sender, all 12 blobs exist.
- **Wallet connects on `said-no.live`** (the "malicious site" warning on the `vercel.app` address went away on the custom domain; the owner confirmed).
- 110 tests pass; typecheck clean; production build clean.

## 12. Hard-won lessons (do not repeat these bugs)

1. **Frozen amount ratios:** storing "3× your usual" at save time made old memories wrong as the median moved. Store real amounts, rebase at check time.
2. **No history:** a new wallet has no median, ratio became 10,000,000. Now neutral.
3. **Namespace leak:** an explicit `"decisions"` namespace in `saveDecision`/`loadDecisions` overrode each wallet's own namespace, so all wallets shared one pool. Fixed by binding the namespace inside `fromMemWal(m, namespace)`. A regression test guards it. **Always test isolation against the real backend after touching memory code.**
4. **Public privacy:** an early build leaked "real" memories on the public site. Per-wallet memory replaced that model.
5. **Dev-server stale runtime:** the runtime object is cached on `globalThis`; after changing `runtime.ts`, **restart the dev server**.
6. **`pnpm build` overwrites `.next`** and breaks a running `pnpm dev`; restart dev after a build. Delete `.next/types` if typecheck complains about removed routes.
7. **Tatum rate limit** (429) on rapid calls; keep the 400 ms spacing and retry.

## 13. Honesty rules (the submission is judged, and the owner wants it truthful)

- The **12 mainnet memories were drafted with an AI assistant** as example decisions. They are labelled `real` at the owner's explicit choice. They prove the writes; they are not months of real use. The README says so. Never describe them as organic user history.
- **Mainnet sends are untested.** Reads and the unsigned build were verified on mainnet; a real mainnet send needs the owner's wallet with real SUI (blocked: funds frozen on the owner's exchange as of 3 Nov). Say "reads on testnet and mainnet, sends verified on testnet".
- A real **wallet popup** approve flow has been verified only with a local key standing in for the wallet, plus the owner confirming that connecting works. Do not claim more.
- Memories sit in the project's Walrus account, so the operator can read them. This is a demo, not a vault.
- Much of the code was written with an AI coding assistant (Claude Code). Check the event's AI-assisted-coding rule before submitting.
- Memory blobs are **encrypted**, so Walruscan shows no readable content. The recorded demo should not claim "see the text on Walruscan".

## 13. Decisions already made (do not re-litigate without the owner)

- **Said-No over "Hindsight"** (the other candidate idea): chosen for a clearer consumer story and the counterfactual proof. Specs for both are in `docs/superpowers/specs/`.
- **Native gRPC, not JSON-RPC or grpc-web:** JSON-RPC is decommissioned and the gateway rejects grpc-web.
- **Walrus Memory always on the mainnet relayer:** the staging relayer is dead, and the relayer pays storage, so writes cost the owner nothing. Tatum reads can still target testnet or mainnet.
- **No server-held spending key:** the original design signed sends with a server demo wallet; it was replaced by build, wallet-sign, broadcast so visitors use their own wallets. `DEMO_WALLET_KEY` is no longer used.
- **Per-wallet memory with a signed sign-in** (HMAC token, expiry 8 h), not a shared pool.
- **Fixed, explainable weights** (with a bounded personal adjustment), not a learned model, so verdicts are reproducible and testable.
- **Friction, not control:** Said-No never takes the decision away; the user can always override.
- **The 12 mainnet memories are labelled `real` at the owner's explicit choice** after being told they were AI-drafted examples. Keep the disclosure in the README.
- **Brand:** black `#0e0e0e` canvas, one orange accent `#ff7120`, Roboto Mono only. Logo: octagon (stop sign) + slash (the refusal) + small block (the memory that stays). One identity module (`src/lib/identity.ts`) feeds the Slush wallet name, page titles and sign-in message; a test keeps them consistent.
- **Domain:** `said-no.live`. The `vercel.app` address triggered a wallet "malicious site" warning; the custom domain cleared it.

## 14. Current status snapshot (3 Nov 2026)

- Git: branch `feat/said-no-v2` tracks `origin/main`; push with `git push origin HEAD:main`.
- Latest feature commits: `0ea3aa8` (burst/new-address signals, per-factor why, learned habits, personal weights, softer friction) and `25e5f64` (Tatum scam-list screening, meaning match on an optional note). These were pushed with the handoff commit `a480d04` and are **deployed**. Verified live on 3 Nov: `/api/check` (mainnet) returned `facts.screen = {status:"clear"}` (the Tatum scam-list call succeeded with a Sui address), `weights` (default 0.35/0.30/0.20/0.15 for a fresh wallet) and `habits` (empty). **Not yet verified:** a *flagged* address (no known flagged Sui address was available), the personal-weights path with 3+ real refusals on the live site, and the note meaning-match against real memories in a wallet namespace.
- Brand kit exists in `brand/`. README is professional and embeds the posters.

## 15. PENDING WORK (priority order)

### P0: required to submit (owner-only items marked **[OWNER]**)
1. **Finish verifying the newest features live.** Done: the response shape and a `clear` screening result. Still to do: (a) find or construct a Tatum-flagged address to see `hold`; (b) with a test wallet, save 3 refusals and confirm personal weights and `habits` appear; (c) type a note similar to a saved reason and confirm the quote appears. Steps (b) and (c) write to Walrus, so ask the owner first.
2. **Run the full UI flow once for real [OWNER, with an agent watching]:** connect Slush on `said-no.live/app` (testnet), sign in, check, deny with a reason, re-check and see the quote, then Proceed and approve a small testnet send. Capture the digest and record it in `docs/spike-results.md`.
3. **Record the 90-second demo video [OWNER]** using section 17. Upload it (YouTube unlisted or similar) and keep the URL.
4. **Publish the blog post [OWNER]:** `docs/blog-post.md` is a draft. Update it for the new features (screening, personal weights, note matching, said-no.live), then publish on dev.to, Medium or Mirror and keep the URL.
5. **Fill and submit the form [OWNER]** using section 18. Needs the owner's **Tatum dashboard account ID** (not in the repo).
6. **Discord questions [OWNER]:** ask whether AI-assisted coding is allowed and what disclosure is required; whether the licence (MIT) is acceptable; whether one person may submit one project; find the Event Rules page.

### P1: strongly recommended
7. **Mainnet send test [OWNER, blocked by funds]:** when funds are available, send about 0.001 SUI from the owner's wallet to their own second address on mainnet via `said-no.live/app`; verify the digest on-chain. Then update the README "Honest limits" line.
8. **Mainnet UI click-through:** toggle MAINNET on the live page, run a check, confirm facts load (verified by API only so far).
9. **Landing "Real memories, 10 needed" tile and any copy that still implies a shared pool.** Re-read the landing, `/lab` and `/docs` for statements that are stale after per-wallet memory.
10. **Clean the project namespace (optional):** a test memory ("wallet A private reason") sits in the shared `decisions` namespace from the isolation incident. Removing it needs a delete write; only do this with the owner's approval.

### P2: nice to have
11. Landing hardening / similarity-risk hedge: the landing's layout and motion were modelled on a reference video; vary accent colour or section order if originality is a concern. Assets are original.
12. Optional `AGENTS.md`/`CLAUDE.md` at the repo root pointing to this file.
13. Check the domain renewal date and price at Name.com before the free period ends.
14. Mobile pass on `/app` and `/lab` with a mobile wallet.
15. Roadmap ideas (do not promise): encrypt memories to the wallet so the operator cannot read them; import/export; reason-aware generalisation.

### Acceptance checklist before you press submit
- [ ] Live site loads at `https://said-no.live`, `/app`, `/lab`, `/docs` return 200
- [ ] `/api/status` shows `executeOn: true`, `writesOn: true`
- [ ] Newest features verified live (item 1)
- [ ] README blob table and honesty notes unchanged and accurate
- [ ] Blog post URL, video URL, repo URL, Tatum account ID, delegate public key all in the form
- [ ] No secrets in git (`git grep` for `suiprivkey`, long hex; `.env` is ignored)

## 16. Operating notes for the Windows + AI-agent environment

- Shell is PowerShell with Git Bash available. `bash` may try WSL (not installed); use Node scripts. `python3` can hang. Git Bash `/tmp` is not the same path Node sees; use Node `fs` with project paths.
- Git prints CRLF warnings on every commit; harmless.
- Scripted multi-file edits are fragile with CRLF; normalise with `\r\n` → `\n` before string replace, then restore.
- The in-app browser pane can fail to render; prefer DOM/JS inspection or headless Chrome screenshots (`scripts/brand/build.mjs` shows the Chrome invocation).
- The owner's `.env` is local. An agent must never print it or send it anywhere.
- External, hard-to-reverse actions (publishing, submitting, buying, sending funds, Walrus writes, deleting) need the owner's explicit yes in chat.

## 17. 90-second demo video script

**Setup before recording**
- Browser with the Slush extension on **testnet**, holding a little testnet SUI (faucet.sui.io). Close other tabs. 1080p, hide bookmarks, mute notifications.
- Open `https://said-no.live`. Do one dry rehearsal. The memory save takes about 25 s, so talk through it.
- Use a **fresh** wallet or a wallet with no saved refusals so the first check is empty, then the second check shows the quote.
- Record screen + voice (OBS or Win+G). Keep the cursor slow.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Landing hero, then scroll slightly | "Most wallets remember what you approved. Said-No remembers what you refused." |
| 0:08 | Click into `/app`. Connect Slush, then Sign in. | "I connect my own wallet and sign one message. It moves no funds. It only unlocks my own memories." |
| 0:20 | Pick "A new recipient", 0.5 SUI. Add the note "a stranger says the offer ends today". Press Check. | "Tatum reads my balance, my history and runs a dry run, and screens the address against its scam list. Nothing is remembered yet, so Said-No stays quiet." |
| 0:34 | Click Deny, type "Too large for someone I have never paid", save. | "I refuse and say why. That reason is saved to Walrus Memory. It is encrypted and takes about 25 seconds." |
| 0:48 | While saving, click the MAINNET toggle then back to TESTNET. | "Meanwhile: the same check runs against Sui testnet and mainnet through Tatum." |
| 0:58 | Run the same check again. Show the verdict card and the quoted reason + blob ID. | "Same send again. Now Said-No quotes my own words back, with the blob ID as a receipt." |
| 1:08 | Point at the counterfactual line and open the "Why" panel. | "It also shows its work: without this memory the answer would be normal; with it, reflection. Every factor and weight is visible. No black box." |
| 1:18 | Press Proceed after the 5-second pause, approve in Slush, show the digest. | "If I still want to send, my wallet signs it and Tatum broadcasts it. The server never holds a key." |
| 1:26 | Cut to README blob table (or `/lab`). | "Twelve mainnet Walrus writes, every blob linked. If Tatum or Memory fails, it fails closed. Said-No." |

**Do not say:** that the 12 memories are organic history; that a mainnet send was run; that Walruscan shows the memory text; "AI-powered".
**Fallback if saving is slow:** open `/app#recorded` (the recorded run) and narrate that, then cut back.
**After recording:** trim to about 90 s, add captions, upload, set unlisted, test the link in a private window.

## 18. Submission form text (paste-ready; owner fills the marked fields)

| Field | Value |
|---|---|
| Project name | Said-No |
| Tracks | Track 3 Consumer Finance; Best Walrus Memory |
| Repo | https://github.com/shane2512/Said-No |
| Live demo | https://said-no.live (`/app` check, `/lab` Memory Lab, `/docs`) |
| Blog post | **[OWNER: published URL]** |
| Demo video | **[OWNER: video URL]** |
| Tatum dashboard account ID | **[OWNER: from the Tatum dashboard]** |
| Walrus Memory account ID | `0x9cde8e86a1ec3d9eb94ccd67dbe724fd22efea262611ff5dc1816c6ac903ebba` |
| Delegate public key (MEMWAL_AGENT_ID) | `0aa4807d2454583e5059f38b8c6edde18d193d3c22479c6b70c57bb0c49e7d39` |
| Mainnet memory writes | 12, blob IDs in the README table |

**One-line pitch.** Most wallets remember approvals. Said-No remembers the sends you refused, quotes your own reason back, and adds friction in proportion to how much a new send resembles them.

**Short description (about 130 words).** Said-No is a personal consent firewall for Sui. Before a send, it reads live chain facts through Tatum's Sui gRPC gateway (balance, your outgoing history, a dry run, and a scam-list check) and recalls your past refusals from Walrus Memory. A deterministic similarity score over recipient, amount, hour and history, tuned to your own refusals, picks one of four friction levels: normal, reminder, reflection, hold. When a memory changes the outcome the page shows a counterfactual: what the verdict would have been without it. Visitors connect their own wallet; the server holds no spending key, and each wallet's memories sit in their own namespace behind a signed sign-in. If Tatum or Memory is unreachable, it fails closed. You can forget any memory or override any warning.

**How it uses each sponsor.** *Tatum:* gRPC balance, outgoing history (to derive your usual amount), dry run, broadcast of the wallet-signed transaction, plus the malicious-address list; native gRPC on testnet and mainnet, paced for the 3 rps free plan. *Walrus Memory:* every decision (deny, approve, override, delete) is stored with the user's typed reason and recalled to drive the verdict, including a semantic match on an optional note; 12 mainnet writes with blob IDs in the README.

**Honest notes for judges.** The 12 mainnet memories were drafted with an AI assistant as example decisions; they prove the writes, not months of use. Reads work on testnet and mainnet; a send has been run on testnet only. Memories live in the project's Walrus account, separated per wallet by namespace, so the operator can read them. Much of the code was written with an AI coding assistant (Claude Code).

## 19. Blog post checklist

`docs/blog-post.md` exists (about 700 words, honest). Before publishing: add the new features (scam-list screening, personal weights and habits, note meaning-match, reflection pause), keep the "Honest limits" section, include the live link `https://said-no.live`, the repo link, and a screenshot or the poster `brand/png/poster-16x9.png`. Title idea: "Said-No: a wallet that remembers what you refused". Do not claim a mainnet send.

## 20. Discord questions to post (owner)

1. "Is AI-assisted coding allowed for Total Recall submissions, and is any disclosure required? Ours was built with an AI coding assistant and says so in the README."
2. "Is the MIT licence acceptable for the public repo requirement?"
3. "Can one person submit one project to two tracks (Consumer Finance and Best Walrus Memory)?"
4. "Where are the Event Rules, and is there anything beyond the listed requirements we should include in the submission?"

## 21. Design documents

`docs/superpowers/specs/2026-10-28-said-no-v2-design.md` is the chosen design. `...hindsight-design.md` is the alternative that lost; `...said-no-design.md` is superseded. The implementation plan is `docs/superpowers/plans/2026-10-29-said-no-v2.md`. `docs/spike-results.md` is the running log of every verified result, including the mainnet audit.
