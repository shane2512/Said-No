"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Arrow, Check, Corners, Display, Mark } from "./Display";
import { BUILT_ON, TESTS, FAQ, KEEPS, LADDER, LOG, NAV, PROOF, SCOPE, STACK, WORDS } from "./content";

const Target = () => (
  <svg viewBox="0 0 26 26" aria-hidden>
    <circle cx="13" cy="13" r="12" fill="none" stroke="var(--muted)" />
    <circle cx="13" cy="13" r="5" fill="var(--muted)" />
  </svg>
);

const XTile = () => (
  <svg className="tile-x" viewBox="0 0 58 58" aria-hidden>
    <path d="M10 10L48 48M48 10L10 48" stroke="var(--muted)" strokeWidth="1.2" />
    <rect x="25" y="25" width="8" height="8" fill="var(--muted)" />
  </svg>
);

const Ctl = ({ id, className = "ctl" }: { id: string; className?: string }) => (
  <div className={`${className} arrows`} data-ctl={id}>
    <button data-prev aria-label="Previous"><Arrow dir="left" /></button>
    <button data-next aria-label="Next"><Arrow /></button>
  </div>
);

const Tile3D = ({ kind, inv, children }: { kind: string; inv?: boolean; children?: ReactNode }) => (
  <>
    <canvas data-tile={kind} data-inv={inv ? "" : undefined} aria-hidden />
    {children}
  </>
);

function LadderIcon({ kind }: { kind: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
  const icons: Record<string, ReactNode> = {
    normal: <><circle cx="62" cy="62" r="46" {...s} /><path d="M42 62l14 14 28-30" {...s} /></>,
    reminder: <><path d="M62 18c-22 0-30 16-30 34v20L20 90h84L92 72V52c0-18-8-34-30-34z" {...s} /><path d="M52 100c2 8 18 8 20 0" {...s} /></>,
    reflection: <><circle cx="46" cy="62" r="34" {...s} /><circle cx="78" cy="62" r="34" {...s} /><path d="M30 40c-8 12-8 32 0 44M94 40c8 12 8 32 0 44" {...s} /></>,
    hold: <><path d="M42 14h40l28 28v40l-28 28H42L14 82V42z" {...s} /><path d="M38 62h48" {...s} strokeWidth={5} /></>,
    counter: <><path d="M16 62h40l32-34h20M56 62l32 34h20" {...s} /><path d="M98 18l10 10-10 10M98 86l10 10-10 10" {...s} /></>,
    replay: <><path d="M96 40a42 42 0 1 0 8 26" {...s} /><path d="M100 18v24H76" {...s} /><path d="M52 46l26 16-26 16z" {...s} /></>,
  };
  return <svg viewBox="0 0 124 124" aria-hidden>{icons[kind]}</svg>;
}

function Identicon({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: string[] = [];
  for (let y = 0; y < 5; y++) {
    const row: string[] = [];
    for (let x = 0; x < 3; x++) {
      h = (h * 2654435761) >>> 0;
      row.push(h % 3 === 0 ? "x" : h % 7 === 0 ? "o" : "");
    }
    cells.push(row[0], row[1], row[2], row[1], row[0]);
  }
  return <div className="wcard-a" aria-hidden>{cells.map((c, i) => <i key={i} className={c} />)}</div>;
}

function CheckForm() {
  const [address, setAddress] = useState("");
  const [state, setState] = useState<{ tone: "idle" | "busy" | "ok" | "err"; msg: string }>({ tone: "idle", msg: "" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(address.trim())) {
      setState({ tone: "err", msg: "That does not look like a Sui address. It should start with 0x." });
      return;
    }
    // The check runs against your own wallet, so it happens on the app page after you connect.
    setState({ tone: "busy", msg: "Opening the check. Connect your wallet there." });
    window.location.href = `/app?to=${encodeURIComponent(address.trim())}`;
  }

  return (
    <form className="foot-form" id="check" onSubmit={submit} aria-label="Check an address">
      <label htmlFor="addr">Check a stranger before you send*</label>
      <input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Paste a Sui address, 0x…" spellCheck={false} autoComplete="off" />
      <p className="foot-res" role="status">
        {state.tone === "ok" ? <b>{state.msg}</b> : state.msg}
      </p>
      <button type="submit" hidden />
    </form>
  );
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<"open" | "noted" | "closed">("open");

  useEffect(() => {
    let stop: (() => void) | undefined;
    let dead = false;
    import("./motion").then(({ initLanding }) => {
      if (!dead && root.current) stop = initLanding(root.current);
    });
    return () => {
      dead = true;
      stop?.();
    };
  }, []);

  useEffect(() => {
    if (notice !== "noted") return;
    const t = setTimeout(() => setNotice("closed"), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  const hero = "REMEMBERS REJECTIONS";

  return (
    <div className="page" ref={root}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="glyph-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.6" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="14" intercept="-6.5" />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="intro" aria-hidden>
        <div className="intro-logos">
          {[0, 1, 2].map((i) => <Mark key={i} tone="#0e0e0e" bar="#0e0e0e" />)}
        </div>
      </div>

      <canvas className="guardian" aria-hidden />
      <div className="vlines" aria-hidden><i /><i /><i /><i /><i /></div>

      <header>
        <nav className="nav" aria-label="Main">
          <a className="logo" href="#top" aria-label="Said-No, home">
            <Mark />
            <span className="logo-t"><span>Said-</span><Display text="NO" reveal={false} /></span>
          </a>
          <div className="links">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} data-sec={n.id}>{n.label}</a>
            ))}
          </div>
          <a className="eco" href="/lab"><i aria-hidden />Memory Lab</a>
          <a className="cta" href="/app">Try it</a>
        </nav>
        <div className="nav-line" /><div className="nav-corner l" /><div className="nav-corner r" />
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="hero-x" aria-hidden><XTile /></div>
          <div className="rail">
            <a href="#top" aria-label="Back to top"><Target /></a>
            <a href="https://docs.wal.app/walrus-memory" target="_blank" rel="noreferrer" aria-label="Walrus Memory docs">WAL</a>
            <a href="https://docs.tatum.io/reference/rpc-sui" target="_blank" rel="noreferrer" aria-label="Tatum Sui docs">TTM</a>
            <a href="https://docs.sui.io" target="_blank" rel="noreferrer" aria-label="Sui docs">SUI</a>
            <a href="https://tatum.io/hackathon/total-recall" target="_blank" rel="noreferrer" aria-label="Total Recall hackathon">HCK</a>
          </div>
          <i className="hline" style={{ top: "188rem" }} /><i className="hline" style={{ top: "458rem" }} />
          <i className="sq" style={{ left: "98rem", top: "202rem" }} /><i className="sq" style={{ left: "1803rem", top: "202rem" }} />
          <i className="sq" style={{ left: "98rem", top: "422rem" }} /><i className="sq" style={{ left: "1803rem", top: "422rem" }} />

          <h1 className="marquee" aria-label="Said-No remembers rejections">
            <span className="marquee-t">
              <Display text={hero} />
              <Display text={hero} />
            </span>
          </h1>
          <div className="hero-label"><span>REMEMBERS</span><span>REJECTIONS</span></div>
          <p className="hero-copy">Most wallets remember approvals. Said-No remembers the sends you rejected, and asks again.</p>
          <a className="cta hero-cta" href="/app">Check a send</a>
          <div className="t-star tile"><Tile3D kind="star" inv /><Corners /></div>
          <div className="built"><span>BUILT ON:</span><Ctl id="strip" className="arrows" /></div>

          <div className="strip" data-car="strip">
            <div className="strip-t" data-track>
              {BUILT_ON.map((b, i) => (
                <div className="strip-i" key={i}>
                  <Corners />
                  <Mark tone="currentColor" bar="currentColor" /><span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="sec" id="how" style={{ paddingTop: "89rem" }}>
          <div className="row">
            <div className="panel how-title" style={{ gridColumn: "span 2" }}>
              <Display text="BEYOND ALERTS" className="title" />
            </div>
            <div className="cell" style={{ height: 238 + "rem" }}><div className="dot-tile" style={{ right: 0, top: 0 }} aria-hidden><Target /></div></div>
            <div className="tile" style={{ width: "237rem", height: "238rem", borderRight: "1rem solid var(--line)", borderTop: "1rem solid var(--line)" }}><Tile3D kind="spheres" /><Corners /></div>
          </div>

          <div className="row row-line">
            <div className="cell how-row">
              <div className="bullet" data-scramble>A personal consent firewall</div>
            </div>
            <div /><div />
            <div className="cell how-row">
              <div className="bullet" data-scramble>The friction ladder</div>
              <div className="sub">Four levels, your own history</div>
            </div>
          </div>

          <div className="row" style={{ minHeight: "617rem" }}>
            <div className="cell">
              <div className="list">
                {SCOPE.map((s) => (
                  <div className="list-i" key={s}><Corners /><Check /><span>{s}</span></div>
                ))}
              </div>
              <a className="cta" href="/app" style={{ margin: "56rem 33rem 0" }}>See it check a send</a>
            </div>
            <div /><div />
            <div className="cell card2">
              {LADDER.slice(0, 2).map((l) => (
                <article className="lcard" key={l.n}>
                  <div className="lcard-top"><i /><span>{l.n}</span></div>
                  <div className="lcard-ico"><LadderIcon kind={l.icon} /></div>
                  <div className="lcard-t">{l.title}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* APPROACH */}
        <section className="sec">
          <div className="row row-line">
            <div className="tile" style={{ width: "237rem", height: "238rem", borderRight: "1rem solid var(--line)" }}>
              <Tile3D kind="ball" /><Corners />
              <div className="dot-tile" style={{ left: "100%", top: 0 }} aria-hidden><Target /></div>
            </div>
            <div />
            <div className="panel" style={{ gridColumn: "span 2", height: "238rem" }}>
              <Display text="YOUR RULES" className="title" />
            </div>
          </div>
          <div className="row row-line">
            <div className="cell how-row" style={{ height: "216rem" }}>
              <div className="bullet" data-scramble>Explainable, by design</div>
              <div className="sub">Printed weights, not ML</div>
            </div>
            <div /><div />
            <div className="cell how-row" style={{ height: "216rem" }}>
              <div className="bullet" data-scramble>A different approach</div>
              <div className="sub">Beyond blocklists</div>
            </div>
          </div>
          <div className="row row-line" style={{ minHeight: "495rem" }}>
            <div className="cell">
              <div className="clip" data-car="ladder">
                <div className="ctrack" data-track>
                  {LADDER.slice(2).map((l) => (
                    <article className="lcard" key={l.n}>
                      <div className="lcard-top"><i /><span>{l.n}</span></div>
                      <div className="lcard-ico"><LadderIcon kind={l.icon} /></div>
                      <div className="lcard-t">{l.title}</div>
                    </article>
                  ))}
                </div>
              </div>
              <Ctl id="ladder" />
            </div>
            <div /><div />
            <div className="cell">
              <p className="para">It does not decide what is dangerous. It remembers what you decided was not worth the risk. Tatum supplies the live chain facts, Walrus Memory supplies your own reasoning, and Said-No puts them side by side before you sign.</p>
              <a className="cta" href="/docs" style={{ margin: "50rem 32rem 0" }}>Read how it works</a>
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="sec" id="proof" style={{ paddingTop: "70rem" }}>
          <div className="proof-head">
            <canvas className="pipes" aria-hidden />
            <div className="panel proof-panel">
              <div className="bullet" data-scramble style={{ fontSize: "26rem" }}>What we have verified</div>
              <div className="proof-title">
                <Display text="PROOF" />
                <Display text="POINTS" />
              </div>
            </div>
            <div className="count"><div>Tests passing</div><Display text={TESTS} /></div>
            <a className="count-a" href="/docs" aria-label="Read the docs"><Arrow /></a>
          </div>
          <div style={{ position: "relative" }}>
            <div className="pctl arrows" data-ctl="proof">
              <button data-prev aria-label="Previous"><Arrow dir="left" /></button>
              <button data-next aria-label="Next"><Arrow /></button>
            </div>
            <div className="pcards" data-car="proof">
              <div className="ptrack" data-track>
                {PROOF.map((p) => (
                  <article className="pcard" key={p.tag}>
                    <div className="pcard-top"><span className="pcard-tag">{p.tag}</span>{p.name}</div>
                    <div className="pcard-b">
                      {p.stats.slice(0, 2).map(([a, b]) => <div className="pcard-s" key={b}>{a}<small>{b}</small></div>)}
                      <a className="pcard-go" href="/docs" aria-label={`More on ${p.tag}`}><Arrow /></a>
                      {p.stats.slice(2).map(([a, b]) => <div className="pcard-s" key={b}>{a}<small>{b}</small></div>)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STACK */}
        <section className="sec" id="stack" style={{ paddingTop: "110rem" }}>
          <div className="row">
            <div className="panel stack-title"><Display text="THE STACK" className="title" /></div>
            <div className="cell" style={{ height: "241rem" }}>
              <div className="dot-tile" style={{ left: 0, top: 0 }} aria-hidden><XTile /></div>
              <div className="tile" style={{ position: "absolute", right: 0, top: 0, width: "238rem", height: "241rem", border: "1rem solid var(--line)", borderBottom: 0 }}><Tile3D kind="spheres" /><Corners /></div>
            </div>
            <div className="cell" style={{ height: "241rem" }} />
          </div>
          <div className="row row-line">
            {STACK.map((s) => (
              <a className="scard" key={s.name} href={s.href} target="_blank" rel="noreferrer">
                <Corners />
                <div className="scard-n">{s.name}<Arrow /></div>
                <p>{s.text}</p>
              </a>
            ))}
          </div>
        </section>

        {/* WORDS */}
        <section className="sec" id="words" style={{ paddingTop: "97rem" }}>
          <div className="row row-line">
            <div className="panel" style={{ gridColumn: "span 2", height: "240rem" }}>
              <Display text="IN YOUR WORDS" className="title" />
            </div>
            <div className="cell" style={{ padding: "85rem 0 0 58rem", height: "240rem" }}>
              <div className="bullet" data-scramble style={{ width: "300rem" }}>Your reasons, quoted back</div>
              <div className="dot-tile" style={{ right: 0, top: 0 }} aria-hidden><Target /></div>
            </div>
            <div className="tile" style={{ width: "237rem", height: "240rem", background: "var(--tile-inv)" }}><Tile3D kind="star" inv /><Corners /></div>
          </div>
          <div style={{ position: "relative", marginTop: "97rem" }}>
            <div className="pctl arrows" data-ctl="words" style={{ top: "190rem" }}>
              <button data-prev aria-label="Previous"><Arrow dir="left" /></button>
              <button data-next aria-label="Next"><Arrow /></button>
            </div>
            <div className="pcards" data-car="words">
              <div className="ptrack" data-track>
                {WORDS.map((w) => (
                  <article className="wcard" key={w.who}>
                    <span className="demo-tag">Demo data</span>
                    <div className="wcard-h">
                      <Identicon seed={w.who} />
                      <div><div className="wcard-n">{w.who}</div><div className="wcard-s">{w.sub}</div></div>
                    </div>
                    <p className="wcard-q">“{w.quote}”</p>
                    <div className="wcard-x" aria-hidden>✕</div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* KEEPS */}
        <section className="sec" id="keeps" style={{ paddingTop: "97rem" }}>
          <div className="row row-line">
            <div className="panel" style={{ gridColumn: "span 2", height: "240rem" }}>
              <Display text="WHAT IT KEEPS" className="title" />
            </div>
            <div className="cell" style={{ padding: "85rem 0 0 58rem", gridColumn: "span 2", height: "240rem" }}>
              <div className="bullet" data-scramble style={{ width: "380rem" }}>One decision, one record</div>
            </div>
          </div>
          <div className="row-line" style={{ paddingTop: "53rem" }}>
            <div className="kcards">
              {KEEPS.map((k) => (
                <article className="kcard" key={k.name}>
                  <div className="kcard-h">{k.name}<small>{k.sub}</small></div>
                  <div className="kcard-m tile">
                    <Tile3D kind={k.tile} />
                    <div className="kcard-w">{k.why}</div>
                  </div>
                  <div className="kcard-f">
                    <button aria-expanded="false">WHY <b>+</b></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sec" id="faq" style={{ paddingTop: "127rem" }}>
          <div className="row row-line">
            <div className="panel" style={{ height: "237rem" }}><Display text="FAQ" className="title" /></div>
            <div className="cell" style={{ height: "237rem" }}>
              <div className="tile" style={{ position: "absolute", right: 0, top: 0, width: "238rem", height: "237rem", borderLeft: "1rem solid var(--line)" }}><Tile3D kind="star2" /><Corners /></div>
            </div>
            <div className="cell" style={{ gridColumn: "span 2", padding: "78rem 0 0 186rem", height: "237rem" }}>
              <div className="bullet" data-scramble>Most common questions</div>
              <div className="sub">No hand-waving, including what we will not claim</div>
            </div>
          </div>
          {FAQ.map(([q, a]) => (
            <div className="fq" key={q}>
              <button className="fq-q" aria-expanded="false">
                <span>{q}</span>
                <span className="fq-p" aria-hidden><span>+</span></span>
              </button>
              <div className="fq-a"><p>{a}</p></div>
            </div>
          ))}
        </section>

        {/* LOG */}
        <section className="sec" id="log" style={{ paddingTop: "93rem" }}>
          <div className="row row-line" style={{ borderBottom: "1rem solid var(--line)" }}>
            <div className="panel" style={{ gridColumn: "span 2", height: "238rem" }}><Display text="BUILD LOG" className="title" /></div>
            <div className="cell" style={{ height: "238rem" }}>
              <Corners />
              <div className="log-go" style={{ left: "125rem" }}>
                <span>From the spikes</span>
                <i aria-hidden><Arrow /></i>
              </div>
            </div>
            <div className="cell" style={{ height: "238rem" }}><div className="dot-tile" style={{ right: 0, top: 0 }} aria-hidden><Target /></div></div>
          </div>
          <div style={{ position: "relative", marginTop: "97rem" }}>
            <div className="pctl arrows" data-ctl="log" style={{ left: "22rem", top: "190rem" }}>
              <button data-prev aria-label="Previous"><Arrow dir="left" /></button>
              <button data-next aria-label="Next"><Arrow /></button>
            </div>
            <div className="lcards" data-car="log">
              <div className="ltrack" data-track>
                {LOG.map((l) => (
                  <article className="bcard" key={l.title}>
                    <div className="bcard-m tile"><Tile3D kind={l.icon} /></div>
                    <h3>{l.title}</h3>
                    <div className="bcard-by">by the Said-No build</div>
                    <div className="bcard-f"><span>{l.tag}</span><span>{l.date}</span></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="foot-top">
          <div className="foot-logo"><span className="logo" style={{ margin: 0 }}><Mark /><span className="logo-t"><span>Said-</span><Display text="NO" reveal={false} /></span></span></div>
          <div className="foot-sub"><CheckForm /></div>
          <div className="foot-r"><span>Nothing is sent. <a href="/app" style={{ textDecoration: "underline" }}>Full check</a></span><button className="cta" form="check" type="submit">Check it</button></div>
        </div>
        <div className="foot-links">
          <div><h4>Built on</h4><a href="https://docs.wal.app/walrus-memory" target="_blank" rel="noreferrer">Walrus Memory</a><a href="https://docs.tatum.io/reference/rpc-sui" target="_blank" rel="noreferrer">Tatum Sui RPC</a><a href="https://docs.sui.io" target="_blank" rel="noreferrer">Sui</a></div>
          <div><h4>Quick links</h4><a href="/app">Check a send</a><a href="/lab">Memory Lab</a><a href="/docs">Docs</a><a href="#faq">FAQ</a></div>
          <div><h4>Honesty</h4><span>Counted statistics, not ML</span><span>Demo data is labelled</span><span>Delegates are read/write</span></div>
          <div className="r"><h4>Hackathon</h4><a href="https://tatum.io/hackathon/total-recall" target="_blank" rel="noreferrer">Total Recall</a><span>Consumer Finance</span><span>Best Walrus Memory</span></div>
        </div>
        <div className="copy"><span>© 2026</span><span>SAID-NO. AN ENTRY IN THE TATUM x WALRUS MEMORY HACKATHON.</span></div>
        <div className="giant">
          <i className="sq" style={{ left: "20rem", top: "20rem" }} /><i className="sq" style={{ right: "20rem", top: "20rem" }} />
          <i className="sq" style={{ left: "20rem", bottom: "20rem" }} /><i className="sq" style={{ right: "20rem", bottom: "20rem" }} />
          <Display text="SAID-NO" />
        </div>
      </footer>

      {notice !== "closed" && (
        <aside className="notice" aria-label="Notice">
          {notice === "open" ? (
            <>
              <p>This site sets no cookies. It only remembers what you reject. Try it.</p>
              <div className="notice-b">
                <button className="notice-a" onClick={() => setNotice("closed")}>ACCEPT</button>
                <button className="notice-r" onClick={() => setNotice("noted")}>REJECT</button>
              </div>
              <button className="notice-x" aria-label="Close notice" onClick={() => setNotice("closed")}>✕</button>
            </>
          ) : (
            <p>Noted. That is the whole idea.</p>
          )}
        </aside>
      )}
    </div>
  );
}
