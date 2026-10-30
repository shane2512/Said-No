"use client";

import { Corners, Display } from "../landing/Display";
import Shell from "./Shell";

const TOC = [
  ["what", "What it is"],
  ["arch", "Architecture"],
  ["verdict", "How a verdict is made"],
  ["api", "API"],
  ["run", "Run it"],
  ["honest", "What we do not claim"],
];

export default function DocsPage() {
  return (
    <Shell>
      <div className="row">
        <div className="panel" style={{ gridColumn: "span 2", height: "220rem" }}><Display text="DOCS" className="title" /></div>
        <div className="tcell">
          <div className="bullet" data-scramble style={{ fontSize: "25rem", lineHeight: "34rem" }}>How it works</div>
          <div className="sub">Including what we will not claim.</div>
        </div>
        <div className="tile" style={{ width: "237rem", height: "220rem" }}><canvas data-tile="star2" aria-hidden /><Corners /></div>
      </div>

      <div className="row row-line">
        <div className="col"><nav className="toc" aria-label="On this page">{TOC.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav></div>
        <article className="doc">
          <section id="what">
            <h2>What it is</h2>
            <p>Said-No is a personal consent firewall for Sui. Most wallets remember approvals; Said-No remembers the sends you rejected, with your own reason, and raises the friction on similar sends later.</p>
            <p>It does not decide what is dangerous. It asks whether you still agree with a decision you already made, and you stay in control.</p>
          </section>

          <section id="arch">
            <h2>Architecture</h2>
            <pre>{`            pending send (recipient, amount)
                        │
      ┌─────────────────┴─────────────────┐
      ▼                                   ▼
 Tatum Sui gRPC                     Walrus Memory
 balance, history,                  your past decisions
 dry-run, execute                   with typed reasons
      │                                   │
      └─────────────────┬─────────────────┘
                        ▼
           similarity + friction ladder
                        │
         normal · reminder · reflection · hold
                        │
             you approve, or you say no
                        │
          a refusal becomes a new memory`}</pre>
            <p>Tatum is reached over native gRPC, because its gateway does not serve grpc-web. Sui JSON-RPC has been shut down. Walrus Memory is reached through its managed relayer, and has no working testnet relayer, so it always uses mainnet.</p>
          </section>

          <section id="verdict">
            <h2>How a verdict is made</h2>
            <p>Each stored decision is compared with the pending send using fixed, printed weights:</p>
            <pre>{`similarity = 0.35 × recipient   (both new, or both known)
           + 0.30 × amount      (closeness of size against your usual send)
           + 0.20 × hour        (same band: night 00-05, or day)
           + 0.15 × interaction (same bucket: 0, 1-2, or 3+ past sends)`}</pre>
            <table>
              <thead><tr><th>Level</th><th>When</th></tr></thead>
              <tbody>
                <tr><td>Normal</td><td>No similar refusal (similarity below 0.40)</td></tr>
                <tr><td>Reminder</td><td>Best similar refusal between 0.40 and 0.69</td></tr>
                <tr><td>Reflection</td><td>Best between 0.70 and 0.84, or a single refusal at 0.85 and above</td></tr>
                <tr><td>Hold</td><td>Two or more refusals with one at 0.85 and above, or a hard memory on this recipient</td></tr>
              </tbody>
            </table>
            <p>Approvals count against refusals. More approvals than refusals returns Normal; equal numbers drop one level. Any missing input (Tatum down, Memory unreadable, failed dry-run) raises the verdict to at least Reflection.</p>
          </section>

          <section id="api">
            <h2>API</h2>
            <table>
              <thead><tr><th>Route</th><th>Does</th><th>Body</th></tr></thead>
              <tbody>
                <tr><td><code>GET /api/status</code></td><td>Network, memory backend, what is enabled</td><td>None</td></tr>
                <tr><td><code>POST /api/check</code></td><td>Verdict, chain facts, request log. Sends nothing.</td><td><code>recipient, amount, hour?</code></td></tr>
                <tr><td><code>POST /api/decide</code></td><td>Saves a decision. Returns a job, about 25 s on Walrus.</td><td><code>action, recipient, amount, reason, kind, features, source?, target?</code></td></tr>
                <tr><td><code>GET /api/jobs/:id</code></td><td>Blob id once saved; 202 until then</td><td>None</td></tr>
                <tr><td><code>GET /api/memories</code></td><td>Recalled decisions, the count of unreadable ones, and the real count. Real entries are hidden on a public deployment.</td><td>None</td></tr>
                <tr><td><code>POST /api/send</code></td><td>Re-checks on the server, then executes. Needs <code>ALLOW_EXECUTE=true</code>, 0.1 SUI maximum.</td><td><code>recipient, amount, acknowledged, hour?</code></td></tr>
              </tbody>
            </table>
            <pre>{`curl -X POST http://localhost:3200/api/check \\
  -H "content-type: application/json" \\
  -d '{"recipient":"0xabab...","amount":0.5}'`}</pre>
          </section>

          <section id="run">
            <h2>Run it</h2>
            <pre>{`cp .env.example .env   # fill in the keys
pnpm install
pnpm test
pnpm dev -p 3200       # real Walrus Memory: writes go to mainnet
node scripts/dev-local.mjs 3201   # local memory: nothing leaves the machine`}</pre>
            <p>Saving decisions is off in production unless <code>ALLOW_WRITES=true</code>, and sending is off unless <code>ALLOW_EXECUTE=true</code>, so a public visitor can never write to your memory account or spend from the demo wallet.</p>
          </section>

          <section id="honest">
            <h2>What we do not claim</h2>
            <ul>
              <li>This is counted statistics with fixed weights, not machine learning.</li>
              <li>It does not detect scams or say a transaction is unsafe. A label is your opinion, not an accusation.</li>
              <li>A denied send has no transaction. The proof is the memory blob, not a digest.</li>
              <li>Memories are Seal-encrypted by the relayer, which also decrypts them server-side. This is not zero-trust.</li>
              <li>A public deployment never shows or uses entries labelled real: it ignores them and reports only a count. Set <code>EXPOSE_PRIVATE=true</code> on a private deployment to see and use them.</li>
              <li>Delegate keys are account-wide and can read and write. Authorise only agents you trust.</li>
              <li>Requests are rate limited per visitor (for example 10 checks a minute). The counter lives in one server instance, so on serverless hosting it slows a single visitor but is not a hard global cap.</li>
              <li>The recorded run on the check page is a recording of one real session, not a live demo. Its verdicts are re-computed by the real engine on every page load, so it cannot drift from the code.</li>
              <li>Transaction history starts at the node&apos;s earliest available data, so it may be incomplete.</li>
              <li>Demo data is labelled. Only memories marked real count toward the hackathon&apos;s requirement.</li>
            </ul>
          </section>
        </article>
      </div>
    </Shell>
  );
}
