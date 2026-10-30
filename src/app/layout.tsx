import { Roboto_Mono } from "next/font/google";
import "@/components/landing/landing.css";
import "@/components/site/site.css";

const mono = Roboto_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Said-No",
  description: "Most wallets remember approvals. Said-No remembers the sends you rejected.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <head>
        {/* Before paint: hide reveal targets only when JavaScript can reveal them again. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('has-motion')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
