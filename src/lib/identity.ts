// One source of truth for who this app is. The Slush wallet shows `appName` when you connect,
// so it must match the page title, the application-name meta tag, the sign-in message and the host.
// The name is public, so it is safe to override with NEXT_PUBLIC_DAPP_NAME on a fork.
export const DAPP_NAME = (process.env.NEXT_PUBLIC_DAPP_NAME ?? "").trim() || "Said-No";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || "https://said-no.vercel.app";
export const TAGLINE = "Most wallets remember approvals. Said-No remembers the sends you rejected.";

/** Passed to dApp Kit's `slushWalletConfig`, which registers the Slush web wallet through @mysten/slush-wallet. */
export const slushWalletConfig = { appName: DAPP_NAME } as const;

export const siteMetadata = {
  title: DAPP_NAME,
  applicationName: DAPP_NAME,
  description: TAGLINE,
  metadataBase: new URL(SITE_URL),
  openGraph: { title: DAPP_NAME, description: TAGLINE, url: SITE_URL, siteName: DAPP_NAME, type: "website" as const },
};
