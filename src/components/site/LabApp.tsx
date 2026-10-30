"use client";

import { useCallback, useEffect, useState } from "react";
import { Corners, Display } from "../landing/Display";
import { blobUrl, getStatus, postJson, short, waitForBlob, when, type Decision, type Status } from "./api";
import Shell from "./Shell";

const PRESETS: { label: string; reason: string; recipient: string; amount: number; kind: Decision["kind"]; features: Decision["features"] }[] = [
  { label: "Too large for a stranger", reason: "Too large for someone I have never paid.", recipient: `0x${"ab".repeat(32)}`, amount: 0.5, kind: "soft", features: { novelRecipient: true, amountRatio: 1, hour: 14, interactions: 0 } },
  { label: "Late at night", reason: "I do not make decisions like this at 2am.", recipient: `0x${"cd".repeat(32)}`, amount: 1, kind: "context", features: { novelRecipient: true, amountRatio: 1, hour: 2, interactions: 0 } },
  { label: "Rushed into it", reason: "Nobody who means well needs an answer in five minutes.", recipient: `0x${"12".repeat(32)}`, amount: 0.2, kind: "context", features: { novelRecipient: true, amountRatio: 1, hour: 11, interactions: 0 } },
  { label: "Never this address", reason: "Never send to this address again.", recipient: `0x${"34".repeat(32)}`, amount: 0.1, kind: "hard", features: { novelRecipient: true, amountRatio: 1, hour: 16, interactions: 0 } },
];

export default function LabApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [items, setItems] = useState<Decision[] | null>(null);
  const [ignored, setIgnored] = useState(0);
  const [loadErr, setLoadErr] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/memories").catch(() => null);
    if (!r?.ok) return setLoadErr(true);
    const data = await r.json();
    setLoadErr(false);
    setItems([...data.decisions].sort((a: Decision, b: Decision) => b.ts - a.ts));
    setIgnored(data.ignored);
  }, []);

  useEffect(() => { getStatus().then(setStatus); load(); }, [load]);

  async function write(body: Record<string, unknown>, label: string, done: string) {
    setBusy(label);
    setMsg(null);
    try {
      const { status: code, data } = await postJson("/api/decide", body);
      if (code === 429) throw new Error("Memory is busy. Wait a moment and try again; nothing was lost.");
      if (code === 403) throw new Error(data.error);
      if (code !== 202) throw new Error("Saving failed, so nothing changed.");
      const blob = await waitForBlob(data.jobId);
      await load();
      setMsg({ tone: "ok", text: blob ? `${done} Memory ${blob}.` : `${done} It may take a moment to appear.` });
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  const addPreset = (p: (typeof PRESETS)[number]) =>
    write({ action: "deny", recipient: p.recipient, amount: p.amount, reason: p.reason, kind: p.kind, features: p.features, source: "demo" }, p.label, "Added.");

  const forget = (d: Decision) =>
    write({ action: "delete", recipient: d.recipient, amount: d.amount, reason: "Deleted by the user", kind: d.kind, features: d.features, source: d.source, target: d.id }, d.id, "Forgotten.");

  const deleted = new Set((items ?? []).filter((d) => d.action === "delete").map((d) => d.target));
  const rows = (items ?? []).filter((d) => d.action !== "delete");
  const live = rows.filter((d) => !deleted.has(d.id));
  const nDeny = live.filter((d) => d.action === "deny").length;
  const nReal = (items ?? []).filter((d) => d.source === "real").length;
  const canWrite = status?.writesOn !== false;
  const isLocal = status?.memory === "local";

  return (
    <Shell>
      <div className="row">
        <div className="panel" style={{ gridColumn: "span 2", height: "220rem" }}><Display text="MEMORY LAB" className="title" /></div>
        <div className="tcell">
          <div className="bullet" data-scramble style={{ fontSize: "25rem", lineHeight: "34rem" }}>What it remembers</div>
          <div className="sub">Inspect, add and forget.</div>
        </div>
        <div className="tile" style={{ width: "237rem", height: "220rem", borderLeft: 0 }}><canvas data-tile="spheres" aria-hidden /><Corners /></div>
      </div>

      <div className="row row-line">
        <div className="col">
          <div className="col-h">Add a demo refusal</div>
          <p style={{ fontSize: "15.5rem", lineHeight: "24rem", color: "var(--muted)", marginBottom: "20rem" }}>
            {isLocal
              ? "This server keeps memories locally. They are not on Walrus and disappear on restart."
              : "These write to the real Walrus Memory account, labelled as demo data. Each takes about 25 seconds."}
          </p>
          <div>
            {PRESETS.map((p) => (
              <button className="scen" key={p.label} onClick={() => addPreset(p)} disabled={!!busy || !canWrite}>
                <Corners />{p.label}<small>{p.amount} SUI, {p.kind} memory</small>
              </button>
            ))}
          </div>
          {!canWrite && <p className="note">Saving is off on this deployment.</p>}
          {busy && <p className="note" role="status"><i className="pending" />Saving…</p>}
          {msg && <p className={`note ${msg.tone === "err" ? "warn" : ""}`} role={msg.tone === "err" ? "alert" : "status"} style={{ wordBreak: "break-all" }}>{msg.text}</p>}
          <a className="cta" href="/app" style={{ marginTop: "26rem" }}>Replay a send</a>
        </div>

        <div style={{ gridColumn: "span 3", position: "relative", zIndex: 3 }}>
          <div className="tiles">
            <div className="ntile">Active refusals<Display text={String(nDeny)} reveal={false} /></div>
            <div className="ntile">Real memories, 10 needed<Display text={String(nReal)} reveal={false} /></div>
            <div className="ntile">Unreadable, ignored<Display text={String(ignored)} reveal={false} /></div>
          </div>

          {loadErr && <p className="empty warn" role="alert">Memory could not be read right now. Nothing here means nothing is stored.</p>}
          {!loadErr && items === null && <p className="empty"><i className="pending" />Recalling your memory…</p>}
          {!loadErr && items !== null && rows.length === 0 && (
            <p className="empty">Nothing remembered yet. Deny a send on the <a href="/app" style={{ textDecoration: "underline" }}>check page</a>, or add a demo refusal.</p>
          )}
          {rows.map((d) => {
            const gone = deleted.has(d.id);
            const url = blobUrl(d.blobId);
            return (
              <div className={`mem ${gone ? "gone" : ""}`} key={d.id}>
                <div>
                  <span className={`badge ${d.action === "deny" ? "deny" : ""}`}>{d.action}</span>
                  <small style={{ marginTop: "8rem" }}>{when(d.ts)}</small>
                </div>
                <div className="why-txt">{d.reason}<small style={{ marginTop: "6rem" }}>{d.amount} SUI to {short(d.recipient)}{gone ? ", forgotten" : ""}</small></div>
                <div><span className={`badge ${d.source === "real" ? "real" : ""}`}>{d.source}</span><small style={{ marginTop: "8rem" }}>{d.kind}</small></div>
                <small>{url ? <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{d.blobId}</a> : d.blobId}</small>
                {gone ? <span /> : <button className="link-btn" onClick={() => forget(d)} disabled={!!busy || !canWrite}>Forget</button>}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
