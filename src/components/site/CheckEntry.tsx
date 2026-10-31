"use client";

import dynamic from "next/dynamic";

// Wallet code touches the browser, so the check page renders on the client only.
const CheckApp = dynamic(() => import("./CheckApp"), { ssr: false });

export default function CheckEntry() {
  return <CheckApp />;
}
