"use client";

import { Display } from "@/components/landing/Display";
import Shell from "@/components/site/Shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="row">
        <div className="panel" style={{ gridColumn: "span 2", height: "320rem" }}><Display text="404" className="title" /></div>
        <div className="tcell" style={{ gridColumn: "span 2" }}>
          <div className="bullet" style={{ fontSize: "25rem", lineHeight: "34rem" }}>This page does not exist</div>
          <div className="sub">We would have remembered.</div>
          <a className="cta" href="/" style={{ width: "260rem", marginTop: "30rem" }}>Back to home</a>
        </div>
      </div>
    </Shell>
  );
}
