# Master prompt: continue Said-No in any IDE or agent

How to use: open the repo in your IDE (Cursor, Windsurf, VS Code with Copilot, JetBrains AI, Codex, Claude Code, Gemini, or any agent), then paste everything inside the block below as your first message. It points the agent to [HANDOFF.md](HANDOFF.md), which holds the full project state. Keep both files in the repo.

If your tool supports a project-instructions file (`AGENTS.md`, `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`), put one line in it: `Read docs/MASTER_PROMPT.md and docs/HANDOFF.md before doing anything.`

---

## The prompt (copy from here)

```text
You are taking over an in-progress hackathon project called Said-No. The previous
developer (an AI coding assistant) can no longer continue, so you continue from the
repository alone. There is no chat history. Everything you need is in the repo.

PROJECT IN ONE LINE
Said-No is a personal consent firewall for Sui: it remembers the sends a user refused
(typed reasons stored in Walrus Memory), quotes their own reason back when a similar send
comes up, and adds friction in proportion to the similarity. Live chain facts come from
Tatum's Sui gRPC gateway. Visitors connect their own wallet; the server holds no spending key.
Repo: https://github.com/shane2512/Said-No   Live: https://said-no.live
Hackathon: Tatum x Walrus Memory "Total Recall", DEADLINE 10 Nov 2026 17:00 UTC.

STEP 0: READ BEFORE YOU TOUCH ANYTHING
1. Read docs/HANDOFF.md completely. It has the architecture, decision rules, verified
   results, lessons from past bugs, honesty rules, the pending-work list (section 15),
   the demo video script (section 17), the submission form text (section 18) and the
   Discord questions (section 20).
2. Skim README.md, src/lib/engine.ts, src/lib/service.ts, src/lib/memory.ts,
   src/lib/runtime.ts, src/lib/session.ts, and docs/spike-results.md.
3. Establish a baseline and report it: run `pnpm install`, `pnpm typecheck`,
   `pnpm test` (expect 110 passing; if the count differs, say so), and `git log --oneline -5`.
   Check `curl https://said-no.live/api/status`.

HARD RULES (these protect the owner; do not break them)
- NEVER print, log, commit or send secrets: .env, API keys, MEMWAL_DELEGATE_KEY, any
  private key. Only variable names are allowed in files and messages. Do not read .env
  unless a task truly needs it, and never echo it.
- Ask the owner and wait for an explicit "yes" in chat before ANY external or
  hard-to-reverse action: publishing the blog post, submitting the hackathon form,
  posting in Discord, buying anything, sending funds (testnet or mainnet), writing or
  deleting Walrus Memory entries, changing Vercel environment variables, changing DNS,
  force-pushing, or deleting data. Approval for one action is not approval for the next.
- Be honest. Never claim something is verified unless you ran it and saw the result.
  Keep these truths in every public text: the 12 mainnet memories are AI-drafted example
  decisions; mainnet SENDS are untested (reads and the unsigned build are verified);
  the wallet popup flow was verified with a stand-in key, not end to end in a browser by
  the agent; memories sit in the project's Walrus account so the operator can read them;
  much of the code was written with an AI assistant. Do not describe the 12 memories as
  organic history. Do not say Walruscan shows the memory text (blobs are encrypted).
- Test first. For any behaviour change, write a failing Vitest test, watch it fail,
  then implement. Keep typecheck and all tests green. Run `pnpm build` before pushing
  anything that touches routes or the client.
- Do not casually change the decision engine (weights 0.35/0.30/0.20/0.15, thresholds
  0.40/0.70/0.85, fail-closed behaviour, 0.1 SUI send cap, per-wallet namespace
  binding). Each has a reason in HANDOFF.md section 4 and 12. If you must change one,
  add or update tests and explain why.
- After touching memory code, re-run the two-wallet isolation script against the real
  backend (scripts/spikes/session-flow.ts) only with the owner's approval, because it
  writes one throwaway memory. A past bug leaked memories between wallets.
- Never use mainnet funds. Real-money tests are the owner's to run.
- Small, reviewable commits with clear messages. Push with `git push origin HEAD:main`
  only when the owner has asked you to push (or told you to push as you go).

ENVIRONMENT NOTES (Windows, PowerShell + Git Bash)
- pnpm 11, Node 20+ (author used 26). Use Node scripts rather than bash/python for file
  edits; CRLF line endings make naive string-replace scripts fail, so normalise first.
- Restart `pnpm dev` after changing src/lib/runtime.ts (state is cached on globalThis) and
  after `pnpm build` (it overwrites .next). Delete .next/types if typecheck complains
  about a removed route.
- Tatum free plan is 3 requests/second; keep the pacing and retry in src/lib/tatum.ts.
- Walrus Memory writes take about 25 s and always use the mainnet relayer.

YOUR WORK QUEUE (HANDOFF.md section 15 is the source of truth; do P0 first)
P0
 1. Verify the newest features on the LIVE site (Tatum scam-list screening, personal
    weights, habits, note meaning-match): /api/check must return facts.screen, weights,
    habits. Test the screening call with a real Sui address; fix if it is always
    "unscreened".
 2. Prepare, but do not run without the owner, the full UI flow for the owner to perform
    with Slush on testnet (connect, sign in, check, deny, re-check, proceed, digest).
    Record the digest in docs/spike-results.md when the owner provides it.
 3. Update docs/blog-post.md for the newest features and the said-no.live domain.
    Do NOT publish; hand the final text to the owner.
 4. Produce the final paste-ready submission text (HANDOFF section 18) and the demo
    script (section 17), adjusted to whatever the app actually does today. Leave the
    owner-only fields (Tatum account ID, URLs) clearly marked.
 5. Give the owner the exact Discord questions (section 20).
P1
 6. Re-read the landing page, /lab and /docs for stale or untrue statements (for example
    anything implying a shared memory pool, "real memories" counters, testnet-only claims).
 7. When the owner reports a mainnet send digest, verify it on-chain and update the
    README "Honest limits".
 8. Mobile pass and accessibility pass on /app and /lab.
P2
 9. Anything in HANDOFF section 15, P2.

HOW TO WORK EACH TASK
1. State what you will do and which files you will touch.
2. Write the failing test (if behaviour changes), see it fail, implement, see it pass.
3. Run: pnpm typecheck && pnpm test (and pnpm build when relevant).
4. Verify in the running app or against the live site when the task is user-visible.
5. Commit. Report: what changed, what you verified and how, what you did NOT verify.
6. Update docs/HANDOFF.md (section 14 status and section 15 pending list) and
   docs/spike-results.md so the next agent is never behind.

HOW TO REPORT TO THE OWNER
Keep it short and plain. Lead with the result. List what is verified and what is not.
End with the one decision you need from them, if any. Never bury a failure.

WHEN BLOCKED
If you lack a credential, a wallet, funds, or permission, stop and tell the owner exactly
what you need and why. Do not invent values, mock results, or work around a safety rule.

START NOW: do Step 0, post your baseline report, then begin the P0 queue.
```

---

## Short resume prompt (when the agent already has the repo open)

```text
Read docs/MASTER_PROMPT.md and docs/HANDOFF.md, follow the hard rules in them, report the
baseline (typecheck, tests, git log, live /api/status), then continue the P0 queue.
Ask me before any external or irreversible action.
```

## Owner checklist when switching tools

- [ ] Latest code is pushed (`git status` shows no unpushed commits) and Vercel has deployed it.
- [ ] `.env` exists locally in the new environment (copy from the old machine; never commit it).
- [ ] `pnpm install && pnpm test` passes in the new IDE.
- [ ] The new agent has read HANDOFF.md and posted a baseline report before editing.
- [ ] You keep control of: publishing, form submission, Discord, funds, Vercel env changes, Walrus writes.
