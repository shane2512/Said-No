"use client";

import { useState } from "react";
import replay from "../../../fixtures/replay.json";
import { runReplay, type ReplayFile } from "@/lib/replay";
import { LEVELS, short } from "./api";

const FILE = replay as unknown as ReplayFile;
const STEPS = runReplay(FILE);

/** A recorded walk-through of the real run, so the flow can be seen even where saving is off. */
export default function RecordedRun() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const changed = s.level !== s.counterfactual;

  return (
    <div className="row row-line" id="recorded">
      <div className="col">
        <div className="col-h">Recorded run</div>
        <p style={{ fontSize: "15.5rem", lineHeight: "24rem", color: "var(--muted)", marginBottom: "20rem" }}>
          <span className="badge">Recorded, not live</span>
          <br />
          Captured {FILE.recordedOn} from the real app: live Tatum on Sui testnet, and a memory saved to Walrus. The memory is labelled demo, and its reason is tidied here (the original test run used different wording).
        </p>
        <div>
          {STEPS.map((t, n) => (
            <button className="scen" key={t.title} onClick={() => setI(n)} aria-current={n === i ? "step" : undefined} style={n === i ? { background: "var(--panel)", borderColor: "var(--orange)" } : undefined}>
              {n + 1}. {t.title}
              <small>{t.amount} SUI</small>
            </button>
          ))}
        </div>
      </div>

      <div style={{ gridColumn: "span 3", position: "relative", zIndex: 3 }}>
        <div className="verdict" aria-live="polite">
          <div className="ladder">
            {LEVELS.map((l) => (
              <div key={l.id} className={s.level === l.id ? "on" : undefined}>{l.label}</div>
            ))}
          </div>
          <h2 className="v-head" style={{ fontWeight: 400 }}>
            {changed ? "Your memory changed this decision." : s.saved ? "Saved to Walrus Memory." : "No past refusal applies to this send."}
          </h2>
          <p className="v-meta" style={{ fontSize: "17rem", lineHeight: "27rem", color: "var(--text)", marginBottom: "18rem" }}>{s.caption}</p>
          {s.quote && <blockquote className="v-quote">“{s.quote}”</blockquote>}
          {s.saved && (
            <p className="v-meta">
              Memory <a href={`https://walruscan.com/mainnet/blob/${FILE.blobId}`} target="_blank" rel="noreferrer">{FILE.blobId}</a>
            </p>
          )}
          {changed && <p className="v-counter">Without this memory, the same send would be <b>{s.counterfactual}</b>. With it: <b>{s.level}</b>.</p>}
          {s.similarity !== null && (
            <p className="v-meta" style={{ marginTop: "14rem" }}>Similarity to your refusal {s.similarity.toFixed(2)}, from fixed printed weights.</p>
          )}
          {i === 3 && (
            <p className="v-meta" style={{ marginTop: "8rem" }}>
              The real send: <a href={`https://suiscan.xyz/testnet/tx/${FILE.digest}`} target="_blank" rel="noreferrer">{short(FILE.digest)}</a> on Sui testnet.
            </p>
          )}
          <div className="acts">
            <button className="btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
            <button className="cta" onClick={() => setI(Math.min(STEPS.length - 1, i + 1))} disabled={i === STEPS.length - 1}>Next step</button>
            <span style={{ color: "var(--muted)", fontSize: "14rem" }}>Step {i + 1} of {STEPS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
