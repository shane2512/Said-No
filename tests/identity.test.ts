import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { DAPP_NAME, SITE_URL, slushWalletConfig, siteMetadata } from "@/lib/identity";
import { signInMessage } from "@/lib/signin-message";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

describe("deployment identity", () => {
  it("gives the Slush wallet the same app name the page declares", () => {
    expect(slushWalletConfig.appName).toBe(DAPP_NAME);
    expect(siteMetadata.applicationName).toBe(DAPP_NAME);
  });

  it("matches the name to the deployment host", () => {
    expect(new URL(SITE_URL).protocol).toBe("https:");
    expect(new URL(SITE_URL).hostname).toContain(slug(DAPP_NAME));
  });

  it("uses the same name in the page title and the sign-in message", () => {
    expect(String(siteMetadata.title)).toContain(DAPP_NAME);
    expect(signInMessage("0xabc", 1)).toContain(DAPP_NAME);
  });

  it("titles every page with the app name, so the wallet never sees a different one", () => {
    const dirs = ["app", "app/app", "app/lab", "app/docs"].map((d) => `src/${d}/page.tsx`).filter(existsSync);
    expect(dirs.length).toBeGreaterThan(0);
    for (const f of dirs) {
      const m = readFileSync(f, "utf8").match(/title:\s*"([^"]+)"/);
      if (m) expect(m[1], f).toContain(DAPP_NAME);
    }
  });

  it("ships an icon for the wallet and browsers to show", () => {
    expect(existsSync("src/app/icon.svg")).toBe(true);
    expect(readdirSync("src/app").length).toBeGreaterThan(0);
  });
});
