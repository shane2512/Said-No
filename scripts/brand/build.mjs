// Builds the brand kit: logo SVGs, poster HTML, then renders PNGs with headless Chrome.
//   node scripts/brand/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const out = (p) => resolve(root, "brand", p);
mkdirSync(out("src"), { recursive: true });
mkdirSync(out("png"), { recursive: true });

const C = { bg: "#0e0e0e", panel: "#1b1b1b", line: "#414144", text: "#f0f0ee", muted: "#8d8d8d", orange: "#ff7120" };
const FONT = `'Roboto Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;

/* ---------- the mark ---------- */
// An octagon (the stop sign) crossed by the refusal slash; the small block is the memory that stays.
const oct = Array.from({ length: 8 }, (_, k) => {
  const a = (Math.PI / 180) * (22.5 + 45 * k);
  return `${(60 + 52 * Math.cos(a)).toFixed(2)},${(60 + 52 * Math.sin(a)).toFixed(2)}`;
}).join(" ");
const mark = (ink = C.text, accent = C.orange) =>
  `<polygon points="${oct}" fill="none" stroke="${ink}" stroke-width="7" stroke-linejoin="miter"/>` +
  `<line x1="24" y1="24" x2="96" y2="96" stroke="${accent}" stroke-width="10"/>` +
  `<rect x="70" y="34" width="15" height="15" fill="${ink}"/>`;

const markSvg = (ink, accent, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="480" height="480" role="img" aria-label="Said-No mark">${bg ? `<rect width="120" height="120" fill="${bg}"/>` : ""}${mark(ink, accent)}</svg>\n`;

const wordmarkSvg = (ink, accent, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="1120" height="240" role="img" aria-label="Said-No">` +
  `<style>@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500;700&amp;display=swap');text{font-family:${FONT};font-weight:700;font-size:62px;letter-spacing:.04em}</style>` +
  (bg ? `<rect width="560" height="120" fill="${bg}"/>` : "") +
  `<g>${mark(ink, accent)}</g>` +
  `<text x="150" y="82" fill="${ink}">SAID<tspan fill="${accent}">-</tspan>NO</text></svg>\n`;

const iconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="512" height="512" role="img" aria-label="Said-No app icon">` +
  `<rect width="120" height="120" rx="26" fill="${C.bg}"/><g transform="translate(18 18) scale(.7)">${mark()}</g></svg>\n`;

writeFileSync(out("logo-mark.svg"), markSvg(C.text, C.orange, C.bg));
writeFileSync(out("logo-mark-transparent-dark.svg"), markSvg(C.text, C.orange));
writeFileSync(out("logo-mark-transparent-light.svg"), markSvg(C.bg, C.orange));
writeFileSync(out("logo-wordmark-dark.svg"), wordmarkSvg(C.text, C.orange, C.bg));
writeFileSync(out("logo-wordmark-light.svg"), wordmarkSvg(C.bg, C.orange, "#f0f0ee"));
writeFileSync(out("logo-icon.svg"), iconSvg);

/* ---------- shared page chrome ---------- */
const icons = JSON.parse(readFileSync(out("logos/_icons.json"), "utf8"));
const page = (title, body, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;background:${C.bg};color:${C.text};font-family:${FONT};overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(${C.panel} 1px,transparent 1px),linear-gradient(90deg,${C.panel} 1px,transparent 1px);background-size:120px 120px;opacity:.7}
.abs{position:absolute}
.o{color:${C.orange}}
.muted{color:${C.muted}}
.label{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:${C.muted}}
.card{background:${C.panel};border:1px solid ${C.line}}
.corner{position:absolute;width:14px;height:14px;border-color:${C.text};border-style:solid;border-width:0}
${extra}
</style></head><body><div class="grid"></div>${body}</body></html>`;

const small = (ink = C.text) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${mark(ink)}</svg>`;

/* ---------- 1. poster 16:9 ---------- */
const poster = page(
  "Said-No poster",
  `
<div class="abs" style="left:96px;top:84px;display:flex;align-items:center;gap:20px"><div style="width:56px;height:56px">${small()}</div><div style="font-weight:700;font-size:30px;letter-spacing:.06em">SAID<span class="o">-</span>NO</div></div>
<div class="abs label" style="right:96px;top:104px">Total Recall · Tatum × Walrus Memory</div>

<div class="abs" style="left:96px;top:300px;width:1000px">
  <div style="font-weight:700;font-size:104px;line-height:1.02;letter-spacing:-.01em">Remember<br>what you<br><span class="o">refused.</span></div>
  <div class="muted" style="font-size:26px;line-height:1.5;margin-top:44px;width:780px">A personal consent firewall for Sui. It saves the reasons you gave when you said no, and quotes them back before you send.</div>
</div>

<div class="abs card" style="left:1180px;top:250px;width:644px;padding:44px 48px 48px">
  <div class="corner" style="left:-1px;top:-1px;border-top-width:2px;border-left-width:2px"></div>
  <div class="corner" style="right:-1px;bottom:-1px;border-bottom-width:2px;border-right-width:2px"></div>
  <div class="label">Check · 7 SUI to a new recipient</div>
  <div style="display:inline-block;margin-top:26px;padding:8px 16px;border:1px solid ${C.orange};color:${C.orange};font-size:18px;letter-spacing:.14em">REFLECTION</div>
  <div style="font-size:26px;line-height:1.5;margin-top:30px">You refused something like this before:</div>
  <div style="font-size:26px;line-height:1.5;margin-top:14px;padding-left:20px;border-left:3px solid ${C.orange};color:${C.text}">"Too large for someone I have never paid. They can take a small test first."</div>
  <div style="margin-top:34px;padding-top:26px;border-top:1px solid ${C.line};font-size:19px;line-height:1.6" class="muted">Without this memory: <b style="color:${C.text}">normal</b><br>With it: <b class="o">reflection</b></div>
</div>

<div class="abs" style="left:96px;right:96px;bottom:72px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid ${C.line};padding-top:26px">
  <div style="display:flex;gap:44px;font-size:18px;letter-spacing:.1em" class="muted"><span>CHAIN FACTS · TATUM gRPC</span><span>MEMORY · WALRUS</span><span>FAILS CLOSED</span></div>
  <div style="font-size:18px;letter-spacing:.08em">said-no.live</div>
</div>`,
);

/* ---------- 2. tech stack ---------- */
const iconCard = (slug, name, role, hexOverride) => {
  const i = icons[slug];
  const hex = hexOverride ?? i.hex;
  return `<div class="tile"><div class="logo"><svg viewBox="0 0 24 24" width="62" height="62" fill="#${hex}"><path d="${i.path}"/></svg></div><div class="nm">${name}</div><div class="rl">${role}</div></div>`;
};
const imgCard = (src, name, role, dark, h = 54) =>
  `<div class="tile${dark ? " darktile" : ""}"><div class="logo"><img src="${src}" style="width:100%;max-height:${h}px;object-fit:contain;object-position:left"></div><div class="nm">${name}</div><div class="rl">${role}</div></div>`;
const textCard = (glyph, name, role) =>
  `<div class="tile"><div class="logo"><div style="font-weight:700;font-size:40px;letter-spacing:.02em;color:#0e0e0e">${glyph}</div></div><div class="nm">${name}</div><div class="rl">${role}</div></div>`;

const group = (title, tiles) =>
  `<div class="grp"><div class="label" style="margin-bottom:18px">${title}</div><div class="row">${tiles.join("")}</div></div>`;

const stack = page(
  "Said-No tech stack",
  `
<div class="abs" style="left:96px;top:72px;display:flex;align-items:center;gap:20px"><div style="width:48px;height:48px">${small()}</div><div style="font-size:48px;font-weight:700;letter-spacing:-.01em">Built with</div></div>
<div class="abs label" style="right:96px;top:90px">Said-No · Tech stack</div>
<div class="abs" style="left:96px;right:96px;top:190px;display:flex;flex-direction:column;gap:96px">
  <div class="grow">${group("Chain facts", [imgCard("../logos/tatum.svg", "Tatum", "Sui gRPC gateway", false, 40), iconCard("sui", "Sui", "Testnet + mainnet")])}
  ${group("Memory", [imgCard("../logos/walrus.svg", "Walrus Memory", "Decisions + reasons", true, 40), textCard("gRPC", "gRPC", "Native Tatum transport")])}
  ${group("App", [iconCard("nextdotjs", "Next.js 15", "App Router"), iconCard("react", "React 19", "UI"), iconCard("typescript", "TypeScript", "End to end")])}</div>
  <div class="grow">
  ${group("Motion + 3D", [iconCard("gsap", "GSAP", "ScrollTrigger"), iconCard("threedotjs", "three.js", "Octagon sentinel")])}
  ${group("Quality", [iconCard("vitest", "Vitest", "92 tests, written first", "6E9F18"), iconCard("zod", "Zod", "Input + memory schemas")])}
  ${group("Runtime + ship", [iconCard("nodedotjs", "Node.js", "Server routes"), iconCard("pnpm", "pnpm", "Workspace"), iconCard("vercel", "Vercel", "Deploy"), iconCard("github", "GitHub", "Source")])}</div>
</div>
<div class="abs" style="left:96px;right:96px;bottom:54px;border-top:1px solid ${C.line};padding-top:20px;display:flex;justify-content:space-between;font-size:15px" class="muted"><span style="color:${C.muted}">Logos are trademarks of their respective owners and are shown to name the technologies used. No endorsement is implied.</span><span style="color:${C.muted}">github.com/shane2512/Said-No</span></div>`,
  `.grow{display:flex;gap:44px}
.row{display:flex;gap:14px}
.tile{background:#f0f0ee;color:#0e0e0e;width:190px;height:228px;padding:22px 18px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
.tile.darktile{background:#000;color:#faf8f5;border:1px solid ${C.line}}
.logo{height:70px;display:flex;align-items:center}
.nm{font-weight:700;font-size:21px;margin-top:10px}
.rl{font-size:14px;opacity:.62;margin-top:4px;line-height:1.35}`,
);

/* ---------- 3. user flow ---------- */
const step = (n, title, body, hi) =>
  `<div class="st${hi ? " hi" : ""}"><div class="n">${n}</div><div class="t">${title}</div><div class="b">${body}</div></div>`;
const arrow = `<div class="ar"><svg width="54" height="24" viewBox="0 0 54 24"><line x1="0" y1="12" x2="46" y2="12" stroke="${C.muted}" stroke-width="2"/><polyline points="38,4 48,12 38,20" fill="none" stroke="${C.muted}" stroke-width="2"/></svg></div>`;
const down = `<div class="dn"><svg width="24" height="48" viewBox="0 0 24 48"><line x1="12" y1="0" x2="12" y2="40" stroke="${C.muted}" stroke-width="2"/><polyline points="4,32 12,42 20,32" fill="none" stroke="${C.muted}" stroke-width="2"/></svg></div>`;

const flow = page(
  "Said-No user flow",
  `
<div class="abs" style="left:96px;top:72px;display:flex;align-items:center;gap:20px"><div style="width:48px;height:48px">${small()}</div><div style="font-size:48px;font-weight:700;letter-spacing:-.01em">How a send is checked</div></div>
<div class="abs label" style="right:96px;top:90px">Said-No · User flow</div>

<div class="abs" style="left:96px;top:190px;width:1728px;display:flex;align-items:stretch;justify-content:space-between">
  ${step("01", "Connect", "Your own Sui wallet, on testnet or mainnet. The server holds no spending key.")}${arrow}
  ${step("02", "Sign in", "Sign a message once. It moves no funds. It unlocks your memories only.")}${arrow}
  ${step("03", "Enter a send", "Recipient and amount. Nothing is sent yet.")}${arrow}
  ${step("04", "Gather evidence", "<b>Tatum gRPC</b>: balance, your history, dry run.<br><b>Walrus Memory</b>: your past refusals, recalled.", true)}
</div>

<div class="abs" style="left:96px;top:470px;width:1728px;display:flex;align-items:stretch;justify-content:space-between">
  <div class="st wide"><div class="n">05</div><div class="t">The engine decides</div>
    <div class="ladder"><span>NORMAL</span><span>REMINDER</span><span class="hl">REFLECTION</span><span>HOLD</span></div>
    <div class="b">Fixed weights: recipient .35, amount .30, hour .20, history .15. If Tatum or Memory fails, the answer is at least Reflection. Your own reason is quoted back, with the counterfactual.</div>
    <div class="b" style="margin-top:22px;padding-top:20px;border-top:1px solid ${C.line}"><b>Hold</b> needs a "never this address" memory, or two matching refusals at 0.85 or higher. Approvals count too: approve more than you refused, and the friction drops.</div></div>
  <div style="width:70px"></div>
  <div style="display:flex;flex-direction:column;gap:22px;flex:1">
    <div class="st br"><div class="n">06A · Deny</div><div class="t">Say why</div><div class="b">Type your reason. It is saved to Walrus Memory in about 25 seconds, and the blob ID is your receipt.</div></div>
    <div class="st br"><div class="n">06B · Proceed</div><div class="t">Wallet signs, Tatum broadcasts</div><div class="b">Server builds the transfer, <b>your wallet signs it</b>, Tatum sends it. Your approval is remembered too.</div></div>
  </div>
</div>

<div class="abs" style="left:96px;right:96px;bottom:60px;border:1px dashed ${C.orange};padding:22px 28px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:24px"><span class="o">↺</span> The next time a similar send comes up, step 04 recalls what you saved in step 06.</div>
  <div class="muted" style="font-size:16px;letter-spacing:.1em">FORGET OR OVERRIDE ANY MEMORY, ANY TIME</div>
</div>`,
  `.st{background:${C.panel};border:1px solid ${C.line};padding:26px 26px 28px;flex:1;position:relative}
.st.hi{border-color:${C.orange}}
.st.wide{flex:1.25}
.st.br{flex:1}
.n{font-size:14px;letter-spacing:.14em;color:${C.orange};margin-bottom:14px}
.t{font-size:27px;font-weight:700;line-height:1.2;margin-bottom:12px}
.b{font-size:17px;line-height:1.55;color:#c9c9c6}
.b b{color:${C.text}}
.ar{width:70px;display:flex;align-items:center;justify-content:center}
.ladder{display:flex;gap:8px;margin:6px 0 16px}
.ladder span{flex:1;text-align:center;padding:12px 4px;border:1px solid ${C.line};font-size:13px;letter-spacing:.08em;color:${C.muted}}
.ladder span.hl{border-color:${C.orange};color:${C.orange}}`,
);

/* ---------- 4. brand board ---------- */
const sw = (hex, name, role, dark) =>
  `<div style="background:${hex};color:${dark ? "#0e0e0e" : "#f0f0ee"};height:150px;padding:16px 18px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid ${C.line}"><b style="font-size:17px">${name}</b><span style="font-size:14px;opacity:.75">${hex.toUpperCase()} · ${role}</span></div>`;
const board = page(
  "Said-No brand board",
  `
<div class="abs label" style="left:96px;top:64px">Said-No · Brand board · v1</div>
<div class="abs label" style="right:96px;top:64px">01 / 01</div>

<div class="abs card" style="left:96px;top:110px;width:760px;height:560px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:30px">
  <div style="width:250px;height:250px">${small()}</div>
  <div style="font-weight:700;font-size:52px;letter-spacing:.06em">SAID<span class="o">-</span>NO</div>
  <div class="muted" style="font-size:20px">Remember what you refused.</div>
</div>

<div class="abs card" style="left:880px;top:110px;width:420px;height:560px;padding:28px 28px">
  <div class="label" style="margin-bottom:20px">Construction</div>
  <svg viewBox="0 0 120 120" width="364" height="364">
    <g stroke="${C.line}" stroke-width=".4" fill="none"><rect x="8" y="8" width="104" height="104"/><circle cx="60" cy="60" r="52"/><line x1="60" y1="4" x2="60" y2="116"/><line x1="4" y1="60" x2="116" y2="60"/><line x1="24" y1="24" x2="96" y2="96"/></g>
    ${mark()}
  </svg>
  <div class="muted" style="font-size:15px;line-height:1.6;margin-top:16px">Octagon: the stop sign.<br>Slash: the refusal.<br>Block: the memory that stays.</div>
</div>

<div class="abs" style="left:1324px;top:110px;width:500px;height:560px;display:grid;grid-template-rows:1fr 1fr;gap:24px">
  <div style="background:#f0f0ee;display:flex;align-items:center;justify-content:center;gap:22px;padding:0 24px"><div style="width:96px;height:96px">${small("#0e0e0e")}</div><div style="color:#0e0e0e;font-weight:700;font-size:38px;letter-spacing:.06em">SAID<span class="o">-</span>NO</div></div>
  <div class="card" style="display:flex;align-items:center;justify-content:center;gap:34px"><div style="width:150px;height:150px;border-radius:34px;background:${C.bg};border:1px solid ${C.line};display:flex;align-items:center;justify-content:center"><div style="width:106px;height:106px">${small()}</div></div><div style="width:64px;height:64px;border-radius:15px;background:${C.bg};border:1px solid ${C.line};display:flex;align-items:center;justify-content:center"><div style="width:44px;height:44px">${small()}</div></div></div>
</div>

<div class="abs" style="left:96px;top:700px;width:760px;display:grid;grid-template-columns:repeat(3,1fr);gap:0">
  ${sw(C.bg, "Ink", "Background", false)}${sw(C.panel, "Panel", "Surfaces", false)}${sw(C.line, "Rule", "Lines", false)}
  ${sw(C.muted, "Quiet", "Secondary text", true)}${sw(C.text, "Paper", "Text", true)}${sw(C.orange, "Refusal", "The one accent", true)}
</div>

<div class="abs card" style="left:880px;top:700px;width:944px;height:300px;padding:28px 34px">
  <div class="label">Type · Roboto Mono</div>
  <div style="font-weight:700;font-size:74px;line-height:1.1;margin-top:14px">Aa Bb 0123</div>
  <div style="font-size:21px;line-height:1.6;margin-top:12px;color:#c9c9c6">Bold for headlines and the wordmark. Regular for everything else. Uppercase with wide tracking for labels. One typeface, no exceptions.</div>
  <div class="muted" style="font-size:15px;margin-top:14px">Voice: plain, specific, no hype. "You refused something like this before." Never "AI-powered".</div>
</div>
`,
);

for (const [name, html] of [["poster-16x9", poster], ["tech-stack", stack], ["user-flow", flow], ["brand-board", board]]) {
  writeFileSync(out(`src/${name}.html`), html);
}

/* ---------- render ---------- */
const { existsSync } = await import("node:fs");
const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!exe) throw new Error("No Chrome or Edge found");

function shot(htmlFile, pngFile, w, h) {
  const r = spawnSync(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${w},${h}`, "--virtual-time-budget=6000", `--screenshot=${pngFile}`, `file:///${htmlFile.replace(/\\/g, "/")}`], { encoding: "utf8" });
  console.log(r.status === 0 ? "rendered" : "FAILED", pngFile.split(/[\\/]/).pop());
}
for (const n of ["poster-16x9", "tech-stack", "user-flow", "brand-board"]) shot(out(`src/${n}.html`), out(`png/${n}.png`), 1920, 1080);

// Logo PNGs: render each SVG on its own page at its natural size.
const logoPage = (svgFile, w, h) => {
  const p = out(`src/_${svgFile}.html`);
  writeFileSync(p, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style><link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap" rel="stylesheet"><body><img src="../${svgFile}" width="${w}" height="${h}" style="display:block">`);
  return p;
};
for (const [f, w, h] of [["logo-mark.svg", 480, 480], ["logo-icon.svg", 512, 512]]) shot(logoPage(f, w, h), out(`png/${f.replace(".svg", ".png")}`), w, h);
