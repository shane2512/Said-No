# HINDSIGHT: design (Tatum x Walrus "Total Recall" hackathon)

Status: ALTERNATIVE. The owner prefers Said-No; see `2026-10-28-said-no-v2-design.md` for the chosen direction. Nothing is built. Supersedes `2026-10-28-said-no-design.md`. Produced by two rounds of 10 generator/contradictor/validator loops (40 subagent passes). Deadline: 10 Nov 2026 17:00 UTC. All odds are judgment, not measurement.

## Pitch
Name: HINDSIGHT. Hook: "Check the stranger before you send. Your wallet remembers what you regretted."
One noun to the judge: memory is what we compete on; the dossier is "the check". Do not lead with the word "dossier".

## Targets (honest)
- Track: Track 3, Consumer Finance Apps.
- Best Walrus Memory: the real target (about 25% if the flip works, about 14% unconditional).
- Best Tatum AI Builder: free option, about 5%. Never write "primarily". Decision rule below.
- Any prize about 40%; finishing with a submittable entry about 88%; shipping a weaker product than planned about 45%.

## What it does
1. Paste a Sui address (or pick a prefilled recent mainnet one). The app builds a dossier from live Tatum reads: account age, activity (capped, "50+"), holdings, interactions with you, name, contract flag, and a `SimulateTransaction` dry-run of the pending send.
2. You can mark any address "I regret this" (or "fine") with a typed reason. Labels go to Walrus Memory (Seal-encrypted by the relayer) with `source: real | suggested-accepted | seeded`.
3. The verdict is similarity-weighted counted evidence: features = counterparty novelty, amount vs the wallet's own median, hour band, gas ratio, round trip, failed tx (use 3-4). `score = (sum(s*regret) + 0.5k) / (sum(s) + k)`, k = 1, printed fixed weights. WARN when score >= 0.6 and top neighbour similarity >= 0.5. Verdict quotes your typed reason and the memory blob id. Claim: counted statistics with a stated prior, not ML.
4. Approved sends go through Tatum `ExecuteTransaction`. A flagged or declined send never touches the chain; its proof is the blob, not a transaction.
5. Second client: a different key (own delegate) reads the owner's `labels` namespace and reaches the same verdict. This is the answer to "rows in a DB".

## Goals
1. Before/after flip test: empty labels = quiet "learning (0)"; 3 matching labels = warn citing 3 whys and blob ids; forget one = score drops; dissimilar control stays quiet. Vitest and live.
2. At least 10 (aim 12-15) REAL mainnet memories written by the submitted delegate key in the submitted account.
3. Real Tatum gRPC usage: `ListTransactions` (affected_address / sender filters), `GetBalance`/`ListBalances`, `ListOwnedObjects`, `GetObject`/`GetPackage`, `ReverseLookupName`, `GetTransaction`, `SimulateTransaction`, `ExecuteTransaction`, plus the Data API Storage upload. Request-log panel on screen. Fail closed on 429/errors.
4. Hosted demo that never dies on the one click: baked replay JSON is the default view, no login, prefilled real addresses; live paths degrade to replay.
5. Presentation: README with hook, ASCII diagram, "who built what" and honesty tables; blog ("how it learned over time"); recorded unedited real mainnet take (dated) plus a reproducible `replay` script; Suiscan and Walrus links; social posts.

## Non-goals / anti-goals
No Move package (hex::encode anchor is a COULD), no x402, no Seal policies, no shared or public blocklist, no "scammer" wording, no "primarily built with" claim, no claim of zero-trust, scoped delegates, instant revoke, or ML. Anti-goal: a demo that looks staged.

## Honesty labels (README)
1. Counted statistics with support; rule shape fixed; evidence, thresholds and your words are learned.
2. A denied send has no transaction; proof = Memory blob id. Delegate keys are account-wide read/write; the relayer decrypts server-side; authorise only agents you trust.
3. Labels are private to your Memory space and are your opinion, not an accusation; only dossier facts (never labels or whys) go to the public Storage API blob.
4. Real vs seeded badge on every row; core demo is a recorded real run. Old history may be incomplete (pruning); Tatum gRPC for reads and sends, Tatum GraphQL as fallback, archival (non-Tatum) only if stated.
5. "UI shell generated with ai.tatum.io; engine and Memory layer hand-written" ONLY if true.

## Architecture (gRPC-first; Sui JSON-RPC is decommissioned, Tatum's old JSON-RPC host now serves GraphQL only)
Next.js monolith on Vercel (Node runtime, server routes only; keys never in the browser), Dockerfile escape hatch to Fly. `@mysten/sui` v2 `SuiGrpcClient` with `GrpcWebFetchTransport({baseUrl: https://sui-mainnet-grpc.gateway.tatum.io, meta: {'x-api-key': KEY}})` (option name and grpc-web support UNVERIFIED) -> fallback `@grpc/grpc-js` -> Tatum GraphQL -> shrunk dossier. Memory: `@mysten-incubation/memwal` (0.0.x, Node >= 22.23.4, relayer https://relayer.memory.walrus.xyz); `remember` returns `{job_id}`, poll `waitForRememberJob`; `recall({query, limit, namespace, sort})` returns `{results:[{blob_id,text,distance,created_at?}]}`, semantic only: store features as JSON in text, schema-validate, match in code. `ask()` is not in the SDK reference: do not depend on it. Rate limits: Memory 60/min per account, 30/min per delegate; Tatum free 3 rps. Build on MAINNET (Storage API needs a mainnet key; Tatum testnet is gRPC-only).
Repo: `src/app/page.tsx`, `src/app/api/{dossier,label,verdict,send,replay}/route.ts`, `src/lib/{tatum,memory,features,engine}.ts`, `tests/{engine,failclosed,schema,secondclient}.test.ts`, `scripts/{replay,spikes/*}.ts`, `prompts/`, `fixtures/replay.json`, `Dockerfile`, `README.md`, `LICENSE` (MIT), `.env.example`. The demo wallet key lives only in a server env var; execute is gated by a server flag so visitors cannot spend.

## Scope and hours (104h = 13 days x 8h)
MUST: spikes 14h (D1-2); Tatum client + fail-closed limiter + tests 6h (D3); 4-5 signal dossier 8h (D3-4); Memory labels with schema validation 6h (D4); similarity engine + flip test 10h (D5-6); replay JSON then styled page 10h (D7); 12+ real mainnet memories + execute 6h (D8-9); README + honesty table + blog 8h (D10-11); 90s real take 4h (D10-11).
SHOULD: replay degradation 6h; second-client read test 5h (kill D9); Storage API snapshot 4h; regret card 3h; social posts + form 2h; Event Rules check 1h.
Buffer 11h (D12-13). COULD (buffer only, after D9): hex::encode anchor 2h, `llms.txt` 0.5h, MCP `check_stranger` 3-4h, second rule dimension 4h (cut first if D6 slips), hosted-builder shell 3h. No new features after D11; submit D12.

## Gates and aborts
- D1: mainnet Memory account + remember -> recall round trip within hour 1 (no round trip after two attempts: escalate to organisers and stop spending; no useful idea switch exists, Memory is mandatory).
- D2: authed `ListTransactions` and `SimulateTransaction` (then `ExecuteTransaction` of a tiny self-send) through grpc-web, grpc-js or Tatum GraphQL; if none works, shrink the dossier to balance/GetTransaction/name, tell Tatum, do not switch ideas.
- D2: Discord answer on AI Builder; if unclear, or the hosted builder cannot do Sui/export, remove AI Builder language.
- D6: flip test green, else ship the auto-labelled fallback (suggested regrets from failed tx / round trip / gas overpay as labels; same engine) and drop engine claims.
- D9: fewer than 10 real mainnet memories from the submitted delegate key: freeze everything else.

## Demo (90s, hybrid-recorded)
0:00 banner already on screen: "Last time you flagged this stranger. Your words, the blob, and what the chain says today." Chyron: test result + Tatum request log. By 0:50 the flip (recorded from real mainnet labels), with the typed reason, blob id and lesson diff. Then the second-client read; control and forget toggle as a live replay button; honesty table. Judges can touch only the prefilled "try it" page. Avoid "verified" except for chain facts fetched via Tatum.

## AI Builder (free option, about 3h, decision rule)
D1 (user does it, needs login): 30-minute test at appbuilder.prototype.tatum.dev with "Sui mainnet address dossier page via Tatum Sui gRPC, plus a Walrus upload page"; record whether it emits Sui calls, exports code, runs the dossier. Post the Discord question (below). Claim only if the organisers say Claude Code + /tatum counts, or the builder emits Sui and exports code, AND the generated share is large and documented (prompt log in `prompts/`, tagged commits, script-generated line-count table). Otherwise drop the claim at end of D2 and say only what is true.

Discord text: "Two questions for Total Recall. (1) For Best Tatum AI Builder, does an app scaffolded with Claude Code plus the /tatum skill and Tatum MCP, with a committed prompt log, count as built with ai.tatum.io? Does the hosted builder support Sui and code export, and is a hand-written core allowed? (2) Is AI-assisted coding allowed, and what licence and one-submission-per-person rules apply? Thanks!"

## Submission description (adjust if the AI Builder test fails)
"HINDSIGHT checks a Sui address before you send: it builds a dossier (account age, activity, holdings, interactions with you, dry-run) from live reads through Tatum's Sui gRPC gateway, and sends through Tatum only when you approve, so a flagged or declined send never touches the chain and its proof is a Walrus Memory blob, not a transaction. Each address you mark 'I regret this' is stored with your typed reason in Walrus Memory and re-weights later verdicts by similarity-weighted counted evidence with a stated prior (counted statistics, not ML). It quotes your own words and blob id. Labels are private to your Memory space, but delegate keys have account-wide read/write, so authorise only agents you trust. [Only if true: The UI shell was generated with ai.tatum.io; the engine and Memory layer are hand-written.] Demo data is labelled real or seeded."

## Unknowns to retire on D1-D2
Event Rules (AI-coding policy, licence, one submission per person, single-account requirement); mainnet Memory account route, cost and who pays; Tatum free-plan numbers (100K vs 1M credits) and access to ListTransactions / Simulate / Execute / Storage API; grpc-web support and the `x-api-key` option name; `recall` behaviour in practice; delegate add/remove via SDK and revoke latency (claim only what is measured); `GetTransaction` balance-change field names; Vercel Node patch level vs memwal's floor; `0x2::hex::encode` anchor test (15 min).

## Calls the author made (check these)
Hindsight over Said-No (adds a Tatum-visible dossier); Track 3; Next.js on Vercel with Fly hatch; mainnet-only build; no Move; Storage API as SHOULD; second client replaces "agent B"; AI Builder kept as a free option, not the plan.
