# Spike results (2026-10-30)

Environment: Node v26.12.1, pnpm 11.25.0, `@mysten/sui` 2.38.0, `@mysten-incubation/memwal` 0.1.11. Scripts: `scripts/spikes/memory.ts`, `scripts/spikes/tatum.ts`. Run with `pnpm tsx --env-file=.env <script>`. No secrets are printed.

## Tatum Sui gRPC (testnet): PASS
- Chosen transport: **native gRPC** via `@protobuf-ts/grpc-transport` `GrpcTransport` + `@grpc/grpc-js` (`host: sui-testnet-grpc.gateway.tatum.io:443`, `meta: {'x-api-key'}`), passed to `new SuiGrpcClient({network, transport})`.
- The default grpc-web transport FAILS against Tatum ("unexpected response content type: application/grpc"): Tatum serves native gRPC only.
- `StateService.GetBalance` via `client.core.getBalance`: PASS (~0.4-0.7 s).
- `LedgerService.ListTransactions` with an `affectedAddress` filter: PASS. It is a server stream; each frame carries ONE `transaction` plus `watermark`/`end`. After the self-send it returned 3 transactions including the executed digest.
- `SimulateTransaction` (dry-run of a 0.001 SUI self-send) via `client.core.simulateTransaction`: PASS, `success=true`.
- `ExecuteTransaction` via `client.core.signAndExecuteTransaction` (testnet self-send): PASS, digest `AVTQfSbFHqRXwUq5ZExH68e2ybK6Dnu8q7mA7F9aDntP`.
- Free plan rate limit is real: five calls in under a second returned HTTP 429. The client needs a limiter (>= ~400 ms spacing, retry with backoff, fail closed).

## Walrus Memory: PARTIAL
- Staging relayer `https://relayer-staging.memory.walrus.xyz` is DEAD: certificate mismatch (SEC_E_WRONG_PRINCIPAL) and, ignoring TLS, `404 Application not found` (the hostname CNAMEs to a removed Railway app). There is no working testnet Memory.
- Mainnet relayer `https://relayer.memory.walrus.xyz`: health OK (`write_ready: true`), and a READ-ONLY `recall` authenticated successfully with the delegate key and account ID in `.env` (`recall total=0`). So the account is usable on the mainnet relayer.
- NOT yet done: a Memory write + read-back round trip (needs a decision, see below). `rememberAndWait` returns `{blob_id, namespace, ...}`; `recall({query, limit, namespace})` is confirmed in the installed type definitions.

## Plan implications
- Tatum chain work (reads, dry-run, execute) can be developed on testnet; Memory must use the mainnet relayer, so writes are real mainnet memories.
- Native gRPC from Vercel serverless is UNTESTED; keep the Fly/Docker escape hatch.

## Update: Memory write round trip on the mainnet relayer: PASS
- `rememberAndWait` took ~25.7 s (blob_id `boiRl-wozKKKODrlbN2b3hPCM0RcHF6u7EZ3Mx_r22M`, namespace `spike`); `recall` took ~2.6 s and returned the memory (`total=1`, fields `blob_id,text,distance,created_at`, cosine `distance` ~0.30 for an exact-text query).
- No funds were needed from the owner wallet: writes are HTTP requests signed with the delegate key (headers `x-public-key`, `x-signature`, `x-timestamp`, `x-nonce`); the relayer pays storage.
- Implication: writes are slow. The UI must save a decision asynchronously (return a pending state, poll the job) and the demo must default to the baked replay.
