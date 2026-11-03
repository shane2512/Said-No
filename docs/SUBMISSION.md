# Submission pack: Tatum x Walrus Memory "Total Recall"

Paste-ready text for the submission form. Items marked **[OWNER]** need you. **Deadline: 10 Nov 2026, 17:00 UTC.** Nothing here has been submitted or posted.

## 1. Form fields

| Field | Value |
|---|---|
| Project name | Said-No |
| Tracks | Track 3 Consumer Finance; Best Walrus Memory |
| Repo (public, MIT) | https://github.com/shane2512/Said-No |
| Live demo | https://said-no.live (`/app` check, `/lab` Memory Lab, `/docs`) |
| Blog post | **[OWNER: published URL, see docs/blog-post.md]** |
| Demo video | **[OWNER: video URL, see docs/HANDOFF.md section 17]** |
| Tatum dashboard account ID | **[OWNER: from the Tatum dashboard]** |
| Walrus Memory account ID | `0x9cde8e86a1ec3d9eb94ccd67dbe724fd22efea262611ff5dc1816c6ac903ebba` |
| Delegate public key (MEMWAL_AGENT_ID) | `0aa4807d2454583e5059f38b8c6edde18d193d3c22479c6b70c57bb0c49e7d39` |
| Delegate address | `0x75f0cd348b6fa757807d13f751ce05ab329fedaaae5aa67281393be00109c296` |
| Mainnet Walrus Memory writes | 12 (blob IDs below) |

## 2. Pitch at three lengths

**One line.** Most wallets remember approvals. Said-No remembers the sends you refused, quotes your own reason back, and adds friction in proportion to how much a new send resembles them.

**About 50 words.** Said-No is a consent firewall for Sui. It saves the reasons you gave when you refused a send to Walrus Memory, reads live chain facts through Tatum's Sui gRPC gateway, and quotes your own words back before a similar send, with a counterfactual showing what the answer would have been without your memory.

**About 130 words.** Said-No is a personal consent firewall for Sui. Before a send, it reads live chain facts through Tatum's Sui gRPC gateway (balance, your outgoing history, a dry run, and a scam-list check) and recalls your past refusals from Walrus Memory. A deterministic similarity score over recipient, amount, hour and history, tuned to your own refusals, picks one of four friction levels: normal, reminder, reflection, hold. When a memory changes the outcome, the page shows a counterfactual: what the verdict would have been without it. Visitors connect their own wallet; the server holds no spending key, and each wallet's memories sit in their own namespace behind a signed sign-in. If Tatum or Memory is unreachable, it fails closed. You can forget any memory or override any warning.

## 3. How it uses each sponsor

**Tatum (Sui gRPC and REST)**
- Native gRPC on testnet and mainnet: balance, outgoing history (to derive your usual amount), dry run, and broadcast of the wallet-signed transaction.
- The malicious-address list (`/v3/security/address/{address}`) screens the recipient; a listed address is held.
- Paced and retried for the 3 requests-per-second free plan. Verified live on testnet and mainnet.

**Walrus Memory**
- Every decision (deny, approve, override, delete) is stored with the user's typed reason and recalled to drive the verdict.
- Memory's semantic search matches an optional typed note to a past refusal that means the same thing.
- One namespace per wallet, bound inside the client so no request can read another wallet's memories (regression-tested, and verified against the real backend).
- 12 mainnet writes from the submitted delegate key; every blob ID is linked in the README and below.

## 4. Mapping to the judging criteria

| Criterion (weight) | Evidence |
|---|---|
| Walrus + Tatum integration (30%) | Tatum drives every chain fact, the scam screen and the broadcast; Walrus holds every decision and powers recall and the counterfactual. Neither is decorative: remove either and the product stops working. |
| Technical quality (30%) | Deterministic, explainable engine; fail-closed design; no server-held spending key; per-wallet memory with signed sessions; 110 passing tests written first; live two-wallet isolation test against real Walrus caught and fixed a real leak; mainnet audit logged in `docs/spike-results.md`. |
| Creativity (20%) | Memory of what you *refused*, not what you approved. The counterfactual line proves the memory changed the decision. It learns your own pattern within bounded limits. |
| Presentation (20%) | Live site on its own domain, Memory Lab, in-app docs, recorded run, professional README with architecture and flow posters, blog post, demo video. |

## 5. The 12 mainnet Walrus writes

Explorer link pattern: `https://walruscan.com/mainnet/blob/<id>` (blobs are encrypted, so the explorer proves existence, not content).

| id | action | blob id |
|---|---|---|
| mainnet-01 | deny | `ybIaw2ZXRsEHcJzWvBna-j3K7fsfcGoJL7uo0IBcf0Y` |
| mainnet-02 | deny | `OxQbNb0UJ3v82LocWUumD7R9TYxt7L5x0dXQpV9-acI` |
| mainnet-03 | deny | `HvvyYDikARil0S5U81hnYKAFvMzs1ntCRNnqiq9Wnyw` |
| mainnet-04 | deny | `a42nGp1RgdLv5bSYX0rs_Uk0IZ48d0vgoVDH0kqczSA` |
| mainnet-05 | deny (hard) | `CDidQc6C3sjZXXlur2UYScztwEYUxlZRNKo1YPsmG_E` |
| mainnet-06 | deny | `orq4vy9PmWXemMcyKiVKpEWWvStfOQ9dEVObGbjVpBw` |
| mainnet-07 | approve | `MbJSvApnqBAena960rT0uOUk5EysaEunKcW0dNAS4Yw` |
| mainnet-08 | override | `jDJMFl5P_v-ss4-D31qrW_kGt2xxpRbtDHdL1Kfcv94` |
| mainnet-09 | approve | `ktRPVNYOr4HcuoUWPSAF6uErNa-YKHvajyWTcBXyZCw` |
| mainnet-10 | deny | `qZCafu7p7nMGTvpmeBBeHcBt6AxgiDL0Oz6WynDse7I` |
| mainnet-11 | deny | `I9PI0ts-e3CVv2XV2FIGX2-DlpKefRkYSs5ZlWr_RYk` |
| mainnet-12 | delete of mainnet-04 | `WokGBWkO1fQuz17MkscRPUOHbPLMhqifca1-IABhlas` |

All 12 were confirmed to exist on the Walrus mainnet aggregator on 31 Oct 2026.

## 6. Honest notes for judges (include these)

- The 12 mainnet memories were drafted with an AI assistant as example decisions. They prove the writes; they are not months of real use. The README says so.
- Tatum reads and sends work on testnet and mainnet. One small real mainnet send (0.0000001 SUI, digest `2xVuyxj3L4YGVxKVbaVrfkwGJNrDww61GFtd7ondLDGy`) was made from the live app and verified on-chain; testnet sends were run repeatedly. It is one transaction, not a load test.
- The meaning-match cutoff came from a small sample, and the scam-list check has been confirmed live only for a clean address.
- Memories live in the project's Walrus account, separated per wallet by namespace, so the operator can read them. A demo, not a vault.
- Much of the code was written with an AI coding assistant (Claude Code), test-first. **Check the event rules on AI-assisted coding before submitting** (question 1 in section 8).

## 7. Social post drafts (do not post until you choose to)

Replace bracketed handles and links yourself.

**Short post.**
> Wallets remember what you approved. Said-No remembers what you refused. It quotes your own reason back before a similar send, using @[Tatum handle] Sui gRPC for live chain facts and @[Walrus handle] Memory for the reasons. Live: https://said-no.live · Video: [VIDEO LINK] #TotalRecall

**Thread outline (4 posts).** (1) The problem: wallets forget refusals. (2) The demo clip with the counterfactual line. (3) How it works: Tatum gives facts, Walrus gives memory, a fixed explainable score decides. (4) Honest limits and the repo link.

## 8. Questions to post in the hackathon Discord

1. "Is AI-assisted coding allowed for Total Recall submissions, and is any disclosure required? Ours was built with an AI coding assistant and says so in the README."
2. "Is the MIT licence acceptable for the public repo requirement?"
3. "Can one person submit one project to two tracks (Consumer Finance and Best Walrus Memory)?"
4. "Where are the Event Rules, and is there anything beyond the listed requirements to include in the submission?"

## 9. Final checklist before you press submit

- [ ] `https://said-no.live`, `/app`, `/lab`, `/docs` all load; `/api/status` shows `executeOn: true`, `writesOn: true`
- [ ] Blog post published and the URL works in a private window
- [ ] Demo video uploaded (unlisted is fine) and the URL works in a private window
- [ ] Tatum dashboard account ID, delegate public key and Walrus account ID entered
- [ ] README still states the honest limits
- [ ] No secrets in git: `git grep -nE "suiprivkey|[0-9a-f]{64}"` shows only public identifiers
- [ ] Discord questions answered, or the AI-assistance rule confirmed from the Event Rules
