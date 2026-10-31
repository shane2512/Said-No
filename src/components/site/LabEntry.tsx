"use client";

import dynamic from "next/dynamic";

// Wallet code touches the browser, so this page renders on the client only.
const LabApp = dynamic(() => import("./LabApp"), { ssr: false });

export default function LabEntry() {
  return <LabApp />;
}
