"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Display, Mark } from "../landing/Display";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Check a send" },
  { href: "/lab", label: "Memory Lab" },
  { href: "/docs", label: "Docs" },
];

export function GlyphFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id="glyph-soft" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="1.6" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="14" intercept="-6.5" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

/** Nav, grid lines and footer for every inner page, plus the shared scroll and reveal motion. */
export default function Shell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => {
    let stop: (() => void) | undefined;
    let dead = false;
    import("../landing/motion").then(({ initPage }) => {
      if (!dead && root.current) stop = initPage(root.current);
    });
    return () => {
      dead = true;
      stop?.();
    };
  }, []);

  return (
    <div className="page inner" ref={root}>
      <GlyphFilter />
      <div className="vlines" aria-hidden><i /><i /><i /><i /><i /></div>
      <header>
        <nav className="nav" aria-label="Main">
          <a className="logo" href="/" aria-label="Said-No, home">
            <Mark />
            <span className="logo-t"><span>Said-</span><Display text="NO" reveal={false} /></span>
          </a>
          <div className="links">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={path === l.href ? "on" : undefined} aria-current={path === l.href ? "page" : undefined}>{l.label}</a>
            ))}
            <a href="https://tatum.io/hackathon/total-recall" target="_blank" rel="noreferrer">Hackathon</a>
          </div>
          <a className="cta" href="/app">Try it</a>
        </nav>
        <div className="nav-line" /><div className="nav-corner l" /><div className="nav-corner r" />
      </header>
      <main>{children}</main>
      <footer className="site-foot">
        <div className="copy"><span>© 2026</span><span>SAID-NO. AN ENTRY IN THE TATUM x WALRUS MEMORY HACKATHON. TRACKS: CONSUMER FINANCE AND BEST WALRUS MEMORY.</span></div>
      </footer>
    </div>
  );
}
