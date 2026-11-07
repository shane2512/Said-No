"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DAppKitProvider, useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { dAppKit } from "./wallet";
import { useSession } from "./useSession";
import { Corners, Display } from "../landing/Display";
import { blobUrl, getStatus, LEVELS, postJson, short, waitForBlob, when, type CheckResponse, type Decision, type Status } from "./api";
import RecordedRun from "./RecordedRun";
import Shell from "./Shell";

const SCENARIOS = [
  { label: "A new recipient", sub: "0.5 SUI, right now", recipient: `0x${"ab".repeat(32)}`, amount: 0.5, hour: undefined },
  { label: "A late-night send", sub: "1 SUI at 02:00", recipient: `0x${"cd".repeat(32)}`, amount: 1, hour: 2 },
  { label: "A small test send", sub: "0.01 SUI, right now", recipient: `0x${"ef".repeat(32)}`, amount: 0.01, hour: undefined },
];

const EXAMPLE_SENDER = "0x75f0cd348b6fa757807d13f751ce05ab329fedaaae5aa67281393be00109c296";

type Save = { state: "idle" } | { state: "saving"; what: string } | { state: "saved"; what: string; blobId?: string } | { state: "error"; msg: string };

export default function CheckApp() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <CheckInner />
    </DAppKitProvider>
  );
}

function CheckInner() {
  const account = useCurrentAccount();
  const kit = useDAppKit();
  const session = useSession();
  const sender = account?.address;
  const [status, setStatus] = useState<Status | null>(null);
  const [recipient, setRecipient] = useState("");
  const [guest, setGuest] = useState(EXAMPLE_SENDER);
  const [amount, setAmount] = useState("0.5");
  const [note, setNote] = useState("");
  const [hour, setHour] = useState<number | undefined>(undefined);
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResponse | null>(null);
  const [checkErr, setCheckErr] = useState("");
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState<Decision["kind"]>("soft");
  const [save, setSave] = useState<Save>({ state: "idle" });
  const [sendMsg, setSendMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [why, setWhy] = useState(false);
  const [picked, setPicked] = useState<Status["network"] | null>(null);
  const net = picked ?? status?.network ?? "testnet";
  // Reflection is a short pause, not a quiz: the button simply unlocks after a few seconds.
  const [wait, setWait] = useState(0);
  useEffect(() => {
    setWait(res?.verdict.level === "reflection" ? 5 : 0);
  }, [res]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    getStatus().then(setStatus);
    const to = new URLSearchParams(window.location.search).get("to");
    if (to && /^0x[0-9a-fA-F]{1,64}$/.test(to)) setRecipient(to);
  }, []);

  async function runCheck(override?: { recipient: string; amount: number; hour?: number }): Promise<CheckResponse | null> {
    const to = (override?.recipient ?? recipient).trim();
    const amt = override?.amount ?? Number(amount);
    const from = sender ?? guest.trim();
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(to)) { setFormErr("Enter a Sui address starting with 0x."); return null; }
    if (!Number.isFinite(amt) || amt <= 0) { setFormErr("Enter an amount above 0."); return null; }
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(from)) { setFormErr("Enter the address to check from, or connect your wallet."); return null; }
    setFormErr("");
    setBusy(true);
    setCheckErr("");
    setSendMsg(null);
    setDenying(false);
    try {
      const h = override ? override.hour : hour;
      const { status: code, data } = await postJson("/api/check", { sender: from, recipient: to, amount: amt, hour: h ?? new Date().getHours(), network: net, note: note.trim() || undefined });
      if (code !== 200) throw new Error(data.detail ?? data.error ?? "check failed");
      setRes(data);
      return data as CheckResponse;
    } catch {
      // Fail closed in the UI too: never show an empty result as if it were safe.
      setRes(null);
      setCheckErr("The check could not run, so treat this send as Reflection: stop and reconsider.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Signing is only needed for memory: unlock it, then re-run the same check with it. */
  async function unlock() {
    if (sender && (await session.signIn())) runCheck();
  }

  function pick(s: (typeof SCENARIOS)[number]) {
    setRecipient(s.recipient);
    setAmount(String(s.amount));
    setHour(s.hour);
    setSave({ state: "idle" });
    runCheck({ recipient: s.recipient, amount: s.amount, hour: s.hour });
  }

  async function decide(action: Decision["action"], text: string, k: Decision["kind"], target?: Decision, feats?: CheckResponse["features"]) {
    if (!res) return;
    const { status: code, data } = await postJson("/api/decide", {
      action,
      recipient: target?.recipient ?? recipient.trim(),
      amount: target?.amount ?? Number(amount),
      reason: text,
      kind: k,
      features: target?.features ?? feats ?? res.features,
      source: status?.memory === "local" ? "demo" : "real",
      target: target?.id,
    });
    if (code === 429) throw new Error("Memory is busy. Wait a moment and try again; nothing was lost.");
    if (code === 403) throw new Error(data.error);
    if (code !== 202) throw new Error("Saving failed, so nothing was remembered.");
    return data.jobId as string;
  }

  async function saveDenial(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return setSave({ state: "error", msg: "Type your reason. It is what gets quoted back to you." });
    if (!sender) return setSave({ state: "error", msg: "Connect your wallet to save this refusal. Memories are kept per wallet." });
    setSave({ state: "saving", what: "your refusal" });
    try {
      if (!(await session.signIn())) throw new Error("Sign in with your wallet to save. Signing moves no funds.");
      // A guest check read another address, so take this wallet's own features before saving.
      let feats = res?.features;
      if (res && res.sender !== sender) {
        const c = await postJson("/api/check", { sender, recipient: recipient.trim(), amount: Number(amount), hour: hour ?? new Date().getHours(), network: net });
        if (c.status === 200) feats = c.data.features;
      }
      const job = await decide("deny", reason.trim(), kind, undefined, feats);
      const blobId = job ? (await waitForBlob(job)) ?? undefined : undefined;
      setSave({ state: "saved", what: "Refusal remembered.", blobId });
      setDenying(false);
      setReason("");
    } catch (err) {
      setSave({ state: "error", msg: (err as Error).message });
    }
  }

  async function forget(d: Decision) {
    setSave({ state: "saving", what: "the deletion" });
    try {
      const job = await decide("delete", "Deleted by the user", d.kind, d);
      if (job) await waitForBlob(job);
      setSave({ state: "saved", what: "Lesson forgotten." });
      await runCheck({ recipient: recipient.trim(), amount: Number(amount), hour });
    } catch (err) {
      setSave({ state: "error", msg: (err as Error).message });
    }
  }

  async function proceed() {
    if (!res) return;
    setSendMsg(null);
    if (!sender) return setSendMsg({ tone: "err", text: "Connect your wallet to send. The check above did not need one." });
    setSending(true);
    try {
      if (!(await session.signIn())) throw new Error("Sign in with your wallet first. Signing moves no funds.");
      let digest: string | undefined;
      if (status?.executeOn && sender) {
        const built = await postJson("/api/build", { sender, recipient: recipient.trim(), amount: Number(amount), acknowledged: true, hour: hour ?? new Date().getHours(), network: net });
        if (built.status !== 200) throw new Error(built.data.error ?? "The send could not be prepared.");
        // Your wallet asks you to approve and signs. The server never sees a key.
        const signed = await kit.signTransaction({ transaction: built.data.transaction, network: net });
        const sent = await postJson("/api/broadcast", { bytes: signed.bytes, signature: signed.signature, network: net });
        if (sent.status !== 200) throw new Error(sent.data.detail ?? sent.data.error ?? "The send failed.");
        digest = sent.data.digest;
      }
      await decide(res.verdict.level === "normal" ? "approve" : "override", "Approved after the check", "context");
      setSendMsg({
        tone: "ok",
        text: digest
          ? `Sent on ${res.network}. Digest ${digest}. Your approval counts as evidence next time.`
          : "Approved. Execution is off on this deployment, so nothing was sent. Your approval counts as evidence next time.",
      });
    } catch (err) {
      setSendMsg({ tone: "err", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  const v = res?.verdict;
  const changed = v && v.level !== v.counterfactualLevel;
  const denials = v?.matches.filter((m) => m.decision.action === "deny") ?? [];
  const top = [...denials].sort((a, b) => b.similarity - a.similarity)[0]?.decision;
  const f = res?.facts;
  const canSave = status?.writesOn !== false;

  return (
    <Shell>
      <div className="row">
        <div className="panel" style={{ gridColumn: "span 2", height: "220rem" }}><Display text="CHECK A SEND" className="title" /></div>
        <div className="tcell">
          <div className="bullet" data-scramble style={{ fontSize: "25rem", lineHeight: "34rem" }}>Before you sign</div>
          <div className="sub">Tatum reads the chain. Memory recalls you.</div>
        </div>
        <div className="stat" aria-label="This deployment" style={{ zIndex: 30 }}>
          <div className="stat-r">
            <span>Chain</span>
            <span role="group" aria-label="Sui network" style={{ display: "inline-flex", gap: "8rem" }}>
              {(["testnet", "mainnet"] as const).map((n) => (
                <button key={n} type="button" aria-pressed={net === n} disabled={!status}
                  onClick={() => { setPicked(n); kit.switchNetwork(n); setRes(null); setCheckErr(""); setSendMsg(null); }}
                  style={{ padding: "2rem 10rem", border: "1rem solid var(--line)", textTransform: "uppercase", fontSize: "13rem", borderColor: net === n ? "var(--text)" : undefined, opacity: net === n ? 1 : 0.55 }}>{n}</button>
              ))}
            </span>
          </div>
          <div className="stat-r"><span>Memory</span><span className={status?.memory === "local" ? "warn" : undefined}>{status ? (status.memory === "local" ? "Local, not Walrus" : "Walrus mainnet") : "…"}</span></div>
          <div className="stat-r"><span>Execution</span><span>{status ? (status.executeOn ? `On, max ${status.maxSend} SUI` : "Off") : "…"}</span></div>
          <div className="stat-r"><span>Wallet</span><span>{sender ? short(sender) : "Not connected"}</span></div>
          <div className="stat-r"><span>Your memory</span><span>{session.signedIn ? "Unlocked" : "Locked"}</span></div>
          <div style={{ marginTop: "12rem", display: "flex", gap: "10rem", alignItems: "center", flexWrap: "wrap" }}>
            <ConnectButton />
            {sender && <button className="btn" type="button" style={{ height: "40rem", padding: "0 16rem", fontSize: "14rem" }} onClick={() => { void kit.disconnectWallet(); setRes(null); }}>Disconnect</button>}
          </div>
        </div>
      </div>

      <div className="row row-line">
        {/* form */}
        <div className="col">
          <div className="col-h">The send</div>
          <form onSubmit={(e) => { e.preventDefault(); setSave({ state: "idle" }); runCheck(); }}>
            <label className="fld"><span>Recipient</span>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" />
            </label>
            {!sender && (
              <label className="fld"><span>Check from (any Sui address, no wallet needed)</span>
                <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" />
              </label>
            )}
            <label className="fld"><span>Amount (SUI)</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </label>
            <label className="fld"><span>What is it for? (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. a stranger says the offer ends today" maxLength={200} />
            </label>
            {formErr && <p className="err" role="alert">{formErr}</p>}
            <button className="cta" type="submit" disabled={busy}>{busy ? "Checking…" : "Run the check"}</button>
          </form>
          <div className="col-h" style={{ marginTop: "34rem" }}>Or try one</div>
          <div>
            {SCENARIOS.map((s) => (
              <button className="scen" key={s.label} onClick={() => pick(s)} disabled={busy}>
                <Corners />{s.label}<small>{s.sub}</small>
              </button>
            ))}
          </div>
        </div>

        {/* verdict */}
        <div style={{ gridColumn: "span 2", position: "relative", zIndex: 3 }}>
          <div className="verdict" aria-live="polite">
            <div className="ladder">
              {LEVELS.map((l) => <div key={l.id} className={v?.level === l.id ? "on" : undefined} aria-current={v?.level === l.id ? "step" : undefined}>{l.label}</div>)}
            </div>

            {!res && !checkErr && !busy && <p className="v-idle">Enter a send, or pick one on the left. No wallet needed to run a check, and nothing is sent until you approve it.{status?.writesOn === false && <> Saving is off here, so <a href="#recorded" style={{ color: "var(--orange)", textDecoration: "underline" }}>watch the recorded run</a> to see a refusal change a decision.</>}</p>}
            {busy && <p className="v-idle"><i className="pending" />Reading the chain through Tatum and recalling your memory…</p>}
            {checkErr && <p className="v-head warn" role="alert">{checkErr}</p>}

            {res && v && !busy && (
              <>
                {changed && top ? (
                  <>
                    <h2 className="v-head" style={{ fontWeight: 400 }}>Your memory changed this decision.</h2>
                    <blockquote className="v-quote">“{top.reason}”</blockquote>
                    <p className="v-meta">
                      {when(top.ts)}, {top.action === "deny" ? "you denied" : "you decided on"} {top.amount} SUI.{" "}
                      {top.blobId && (blobUrl(top.blobId)
                        ? <>Memory <a href={blobUrl(top.blobId)} target="_blank" rel="noreferrer">{top.blobId}</a> (encrypted, so Walruscan shows no readable data)</>
                        : <>Memory {top.blobId} (local)</>)}
                    </p>
                    <p className="v-counter">Without this memory, the same send would be <b>{v.counterfactualLevel}</b>. With it: <b>{v.level}</b>.</p>
                  </>
                ) : changed ? (
                  <h2 className="v-head" style={{ fontWeight: 400 }}>Stop and reconsider before you send.</h2>
                ) : (
                  <h2 className="v-head" style={{ fontWeight: 400 }}>No past refusal applies to this send.</h2>
                )}
                {!(session.signedIn && res.sender === sender) && (
                  <p className="note" style={{ marginBottom: "12rem" }}>
                    Checked without your memories{sender ? "" : `, from ${short(res.sender)}`}. The usual amount is measured from that address's own history, so with none it stays neutral.{" "}
                    {sender ? <button className="link-btn" type="button" onClick={unlock} disabled={session.busy}>{session.busy ? "Waiting for your wallet…" : "Sign in to include yours"}</button> : "Connect a wallet to include your own memories."}
                  </p>
                )}
                <ul className="v-reasons">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                {res.habits.length > 0 && <p className="v-meta" style={{ marginTop: "10rem" }}>{res.habits.join(" ")} <i>(learned from your refusals)</i></p>}
                {res.ignoredMemories > 0 && <p className="v-meta" style={{ marginTop: "10rem" }}>{res.ignoredMemories} unreadable memories were ignored.</p>}

                {!denying && (
                  <div className="acts">
                    <button className="cta" onClick={() => { setDenying(true); setSave({ state: "idle" }); }} disabled={!canSave}>Deny this send</button>
                    <button className="btn" onClick={proceed} disabled={sending || !canSave || wait > 0}>
                      {sending ? "Working…" : wait > 0 ? `Take a breath… ${wait}` : v.level === "normal" ? "Proceed" : v.level === "reminder" ? "Send anyway" : "Yes, this is intentional"}
                    </button>
                    {save.state === "saved" && <button className="btn" onClick={() => runCheck()}>Repeat this send</button>}
                  </div>
                )}
                {!canSave && <p className="note">Saving decisions is off on this deployment. The check above is still real.</p>}

                {denying && (
                  <form className="deny-box" onSubmit={saveDenial}>
                    <label className="fld"><span>Why are you saying no? This is what gets quoted back to you.</span>
                      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Too large for someone I have never paid." autoFocus />
                    </label>
                    <label className="fld"><span>Remember it as</span>
                      <select value={kind} onChange={(e) => setKind(e.target.value as Decision["kind"])}>
                        <option value="soft">Soft: be careful with sends like this</option>
                        <option value="context">Context: this situation felt wrong</option>
                        <option value="hard">Hard: never send to this address</option>
                      </select>
                    </label>
                    {!sender && <p className="note">Saving needs your wallet, because memories are kept per wallet. <ConnectButton /></p>}
                    <div className="acts">
                      <button className="cta" type="submit" disabled={save.state === "saving"}>Save my refusal</button>
                      <button className="btn" type="button" onClick={() => setDenying(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {save.state === "saving" && <p className="note"><i className="pending" />Saving {save.what}. Walrus Memory takes about 25 seconds.</p>}
                {save.state === "saved" && (
                  <p className="note"><b>{save.what}</b> {save.blobId && <>Memory {save.blobId}. </>}A denied send never touches the chain, so this memory is the proof. Repeat the send to see the difference.</p>
                )}
                {save.state === "error" && <p className="note warn" role="alert">{save.msg}</p>}
                {sendMsg && <p className={`note ${sendMsg.tone === "err" ? "warn" : ""}`} role="status" style={{ wordBreak: "break-all" }}>{sendMsg.text}</p>}
              </>
            )}
          </div>

          {res && v && (
            <div className="why">
              <button className="why-t" onClick={() => setWhy(!why)} aria-expanded={why}>
                <span>Why am I seeing this?</span><b aria-hidden>{why ? "−" : "+"}</b>
              </button>
              {why && (
                <div className="why-b">
                  <pre>{`similarity = ${res.weights.recipient.toFixed(2)} × recipient + ${res.weights.amount.toFixed(2)} × amount + ${res.weights.hour.toFixed(2)} × hour + ${res.weights.interaction.toFixed(2)} × interaction${res.weights.recipient === 0.35 ? "" : "  (weights learned from your refusals)"}
this send:  recipient ${res.features.novelRecipient ? "new" : "known"} · amount ${res.features.amountRatio.toFixed(2)}× your usual · hour ${res.features.hour}:00 · ${res.features.interactions} past sends to them
score ${v.score.toFixed(2)} · counted evidence with a stated prior, not machine learning`}</pre>
                  {v.matches.length === 0 && <p style={{ color: "var(--muted)" }}>No stored decision is similar enough (0.40 or above).</p>}
                  {top && (() => {
                    const best = v.matches.find((m) => m.decision.id === top.id);
                    return best ? (
                      <pre>{`closest refusal, by factor (max in brackets)
recipient    ${best.parts.recipient.toFixed(2)}  [${res.weights.recipient.toFixed(2)}]
amount       ${best.parts.amount.toFixed(2)}  [${res.weights.amount.toFixed(2)}]  you: ${res.features.amountRatio.toFixed(1)}× your usual
hour         ${best.parts.hour.toFixed(2)}  [${res.weights.hour.toFixed(2)}]
interaction  ${best.parts.interaction.toFixed(2)}  [${res.weights.interaction.toFixed(2)}]`}</pre>
                    ) : null;
                  })()}
                  {v.matches.map((m) => (
                    <div className="mrow" key={m.decision.id}>
                      <span className={`badge ${m.decision.action === "deny" ? "deny" : ""}`}>{m.decision.action}</span>
                      <span>{m.decision.reason}<div className="bar" aria-hidden><i style={{ width: `${m.similarity * 100}%` }} /></div></span>
                      <span style={{ color: "var(--muted)", fontSize: "14rem" }}>similarity {m.similarity.toFixed(2)}</span>
                      <button className="link-btn" onClick={() => forget(m.decision)} disabled={!canSave}>Forget</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* facts */}
        <div className="col">
          <div className="col-h">Tatum says</div>
          {!res && <p style={{ color: "var(--muted)", fontSize: "16rem", lineHeight: "25rem" }}>Live chain facts appear here after the check.</p>}
          {res && !f && <p className="warn" style={{ fontSize: "16rem", lineHeight: "25rem" }}>The check is unavailable right now, so the verdict was raised.</p>}
          {f && (
            <>
              <div className="fact"><span>Your balance</span><span>{f.balance.toFixed(3)} SUI</span></div>
              <div className="fact"><span>Recipient</span><span>{f.priorToRecipient === 0 ? "New to you" : `${f.priorToRecipient} past sends`}</span></div>
              <div className="fact"><span>Your usual send</span><span>{f.medianAmount > 0 ? `${f.medianAmount} SUI` : "No history yet"}</span></div>
              <div className="fact"><span>Sends counted</span><span>{f.priorTxCount >= 50 ? "50+" : f.priorTxCount}</span></div>
              <div className="fact"><span>Scam list</span><span className={f.screen.status === "flagged" ? "warn" : undefined}>{f.screen.status === "flagged" ? "Flagged" : f.screen.status === "clear" ? "Not listed" : "Not checked"}</span></div>
              <div className="fact"><span>Dry-run</span><span className={f.dryRunOk ? undefined : "warn"}>{f.dryRunOk ? "Would succeed" : "Would fail"}</span></div>
              <p style={{ color: "var(--muted)", fontSize: "13.5rem", lineHeight: "20rem", margin: "6rem 0 22rem" }}>History starts at the node&apos;s earliest available data, so it may be incomplete.</p>
            </>
          )}
          {res && res.requestLog.length > 0 && (
            <>
              <div className="col-h" style={{ marginTop: "12rem" }}>Request log ({res.requestLog.length})</div>
              {res.requestLog.map((r, i) => (
                <div className="log-r" key={i}><span>{r.method}</span><span className={r.ok ? undefined : "warn"}>{r.ms}ms {r.ok ? "ok" : "retry"}</span></div>
              ))}
            </>
          )}
        </div>
      </div>
      <RecordedRun />
    </Shell>
  );
}
