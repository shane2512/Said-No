# Said-No v2: personal consent firewall for Sui (Total Recall hackathon)

Status: DRAFT, awaiting owner approval. Nothing is built. This is the chosen direction over `2026-10-28-hindsight-design.md` (kept as the alternative; its Tatum/Memory API findings still apply). Deadline: 10 Nov 2026 17:00 UTC. All odds are judgment, not measurement. No honest plan can promise an 80% chance of winning; this one aims to be finishable, judgeable and hard to dismiss.

## Pitch
"Said-No remembers the transactions you rejected, and says it first." Longer: a personal consent firewall that does not decide what is dangerous; it remembers what you decided was not worth the risk. A rejection is not a failed transaction; it is a user-authored policy.
Targets: Track 3 (Consumer Finance Apps) + Best Walrus Memory. No AI Builder claim (a free 30-min check on D1 stays optional).

## Division of labour (the integration story)
- Tatum = current chain facts: sender balance, recipient novelty and history, the user's usual transfer size, `SimulateTransaction` dry-run, `ExecuteTransaction` only after explicit approval. Request-ID/latency panel on screen. gRPC-first (Sui JSON-RPC is decommissioned; Tatum's old JSON-RPC host serves GraphQL only; GraphQL is the in-Tatum fallback).
- Walrus Memory = the user's personal history: each denial with reason, features, timestamp, source.
- Said-No = combines both into a decision and shows why.

## Memory model (negative preference memory)
Three kinds: hard ("never send to this address"), soft ("careful when amount is unusually high"), context ("I rejected this because it was late / new recipient"). One structured record per decision, JSON line + natural-language line, in namespaces `denials`, `approvals`, `rules`:
`{id, recipient, amount, reason, ts, features:{novelty, amount_ratio, hour_band, interactions}, action: deny|approve|override|delete, source: real|seeded|demo, kind}`. Approvals and overrides are stored too (counter-evidence), so it is not a permanent blacklist. Labels are Seal-encrypted by the relayer and private to the user's Memory space; relayer decrypts server-side; delegate keys are account-wide read/write.

## Verdict engine (explainable similarity-weighted memory, not ML)
`similarity(c, d) = 0.35*m_recipient + 0.30*m_amount + 0.20*m_hour + 0.15*m_interaction` for a candidate send c and each stored decision d, where each m_* in [0,1] measures how closely c matches d on that feature (m_recipient = 1 if both are new recipients; m_amount = 1 - clipped |log amount-ratio difference|; m_hour = same time-of-day band; m_interaction = same interaction-history bucket). Weights fixed and printed. Match the candidate send against stored denials and approvals in code (recall is semantic only; JSON fields are matched in code, schema-validated). Friction ladder:
1. Normal: no relevant memory.
2. Reminder: one similar past denial ("You rejected a similar send").
3. Reflection: several similar denials; ask the user to reconsider.
4. Hold: strong repeated pattern; explicit confirmation (cooldown optional).
Level = function of best similarity and the count of matching denials, minus matching approvals. Language is never "dangerous": it is "You previously rejected similar transactions. Do you still want to proceed?" Bands: 0-0.39 none, 0.40-0.69 reminder, 0.70-0.84 reflection, 0.85-1.00 hold.

## Proof moments (what makes the memory visible)
- "Your memory changed this decision": banner with the user's own reason, date, memory blob id.
- Counterfactual proof: "Without this memory the send would have been allowed" (run the engine with memory ignored and show both verdicts).
- Regret Replay card: the original denial (recipient, amount, reason, "never executed") shown before the new confirmation; shareable image for the social bonus.
- "Why am I seeing this?" drawer: matched features, similarity score, previous denial count, your reason, Tatum dry-run result, Walrus memory id, the formula.
- User control: proceed once, update the rule, delete the lesson, always reject similar. Delete flips the verdict back (proves it is not a blacklist).
- A denied send has no transaction; its proof is the memory blob id.

## Memory Lab (judge-operable)
A page where a judge can add a denial (prefilled examples + typed reason), inspect stored memories (type, source badge, blob id), change the threshold, delete a lesson, and replay the same send. This solves "the judge has no regrets": they create one in 20 seconds. Include 10 varied REAL mainnet memories (high amount, new recipient, late night, unusual token, first interaction, recipient changed, overrode warning, deleted warning, confirmed after reflection, permanently blocked address) and use 1-2 in the main demo.

## Demo (90s) and resilience
Scenes: A empty memory, 2 SUI to a new recipient = Proceed (balance check, recipient lookup, dry-run). B 7 SUI to a new recipient, user denies "amount too high", memory written (id, timestamp, reason, fingerprint). C a similar send now escalates: "Your memory changed this decision". D "Why am I seeing this?" panel. E delete/override, repeat, verdict changes. Close: "Said-No does not decide what is dangerous. It remembers what you decided was not worth the risk." Opening line: "Most wallets remember approvals. Said-No remembers rejections."
Three modes with a visible status chip: `LIVE: Tatum gRPC + Walrus Mainnet`, `REPLAY: recorded Tatum/Walrus responses, memory writes disabled`, `TEST: deterministic fixtures`. Baked replay JSON is the default view; no login; the hosted page must never be dead on the judge's one click. Labels on every row: live mainnet memory / user-created / demo setup / recorded fallback. The execute path is gated by a server flag so visitors cannot spend.

## Tests (the technical-quality evidence)
Empty memory = allow; one matching denial = reminder; threshold escalation (reflection, hold); unrelated recipient stays quiet; amount similarity; deleted memory flips back; explicit override recorded; failed dry-run; failed memory write (no lost write, retry state); 429 fails closed (escalate, never allow); malformed recalled memory ignored; replay fallback reproduces stored verdicts; second client with its own delegate key reads the same denials and reaches the same verdict (SHOULD).

## Architecture
Next.js on Vercel (server routes only; keys never in the browser), Dockerfile hatch to Fly. `@mysten/sui` v2 `SuiGrpcClient` with `GrpcWebFetchTransport({baseUrl: https://sui-mainnet-grpc.gateway.tatum.io, meta:{'x-api-key': KEY}})` (option name and grpc-web support UNVERIFIED) then `@grpc/grpc-js`, then Tatum GraphQL, then a shrunk check (balance + dry-run). Memory: `@mysten-incubation/memwal` 0.0.x, Node >= 22.23.4, mainnet relayer `https://relayer.memory.walrus.xyz`; `remember` returns `{job_id}` then poll; `recall({query, limit, namespace, sort})` returns `{results:[{blob_id,text,distance,created_at?}]}`; do not depend on `ask()`. Limits: Memory 60/min per account, 30/min per delegate; Tatum free 3 rps. Build on mainnet (Tatum testnet is gRPC-only; Storage API needs a mainnet key). Repo: `src/app/{page,lab,explain}`, `src/app/api/{check,deny,approve,memories,replay,send}/route.ts`, `src/lib/{tatum,memory,features,engine,ladder}.ts`, `tests/`, `scripts/{replay,spikes/*}.ts`, `fixtures/replay.json`, `Dockerfile`, `README.md`, `LICENSE` (MIT), `.env.example`.

## Scope and hours (104h = 13 days x 8h)
MUST: spikes 14 (D1-2); Tatum client + fail-closed limiter 6 (D3); features (novelty, median, hour, interactions) 6 (D3-4); Memory layer + schema validation 6 (D4); engine + ladder + flip/ladder tests 12 (D5-6, gate green by end D6); Send/Explain/Memory Lab UI 16 (D7-8); replay JSON + live/replay chip 6 (D7-8); >=12 real mainnet memories + one real execute 6 (D8-9); counterfactual proof + Regret Replay card 5 (D9-10); README/honesty table/blog 8 (D10-11); 90s real recorded take 4 (D10-11). SHOULD: second-client read test 5 (kill D9), social posts + form 2, Event Rules check 1. Buffer ~10. CUT from earlier plans: Storage API snapshot, MCP tool, Move anchor, extra dossier signals. No new features after D11; submit D12.

## Gates and aborts
D1 hour 1: mainnet Memory account + remember -> recall round trip (no round trip after two attempts: escalate to organisers and stop). D2: authed `ListTransactions`/`GetBalance`, `SimulateTransaction`, `ExecuteTransaction` (tiny self-send) via grpc-web, grpc-js or GraphQL; else shrink the check to balance + dry-run and tell Tatum. D6: ladder/flip tests green, else ship the single-threshold version. D9: fewer than 10 real mainnet memories from the submitted delegate key freezes everything else. Ask on Discord D1: AI-coding policy, licence, one submission per person.

## Honest odds (judgment)
Finishing a submittable entry ~85-90%. Best Walrus Memory ~30-35% if the live proof works. Track 3 top 3 ~30%. Any prize ~45-50%. Biggest levers: the live "memory changed this decision" proof, a hosted page that never dies, the Memory Lab, real mainnet memories.

## README honesty labels
Counted/similarity-weighted statistics, not ML; fixed weights printed. Denied send has no transaction. Delegate keys account-wide read/write; relayer decrypts server-side. Labels are your opinion, not an accusation. Real vs seeded vs demo badges. Old history may be incomplete (pruning). No "primarily built with ai.tatum.io" claim.

## Calls the author made (check these)
Said-No over HINDSIGHT per owner preference; dossier reduced to the four facts the verdict needs; Memory Lab and counterfactual proof added; second rule dimension is now core (it is the similarity features); Storage API/MCP/Move cut.
