// Cuts the raw screen recording into the ~90 s demo: speed-ups, short captions, end card.
//   node scripts/video/cut-demo.mjs "<raw.mp4>" "<out.mp4>"
// Needs ffmpeg on PATH. Segment times are seconds in the raw recording.
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [raw, out] = process.argv.slice(2);
if (!raw || !out) throw new Error("usage: node scripts/video/cut-demo.mjs <raw.mp4> <out.mp4>");

// [start, end, speed, caption]
const SEGMENTS = [
  [6, 12, 1, "Said-No remembers the sends you refused"],
  [12.5, 50, 7, "A consent firewall for Sui: Tatum for chain facts, Walrus for memory"],
  [60, 80, 4, "Connect your own Sui wallet. The server holds no key."],
  [84, 110, 4, "Enter a send, and what it is for"],
  [111, 119, 2, "Sign in once. It moves no funds."],
  [124, 140, 4, "Tatum reads the chain. No past refusal yet, so Said-No stays quiet."],
  [142, 170, 4, "Deny it, and say why"],
  [170, 198, 8, "Saved to Walrus Memory. About 25 s, sped up."],
  [198, 210, 4, "Refusal remembered. The blob ID is the receipt."],
  [210, 226, 3, "Same send again: it quotes your own words"],
  [227, 230, 1, "The blob on Walruscan (encrypted)"],
  [235.5, 239.5, 1.5, ""],
  [240, 260, 3, "No black box: every factor and weight is visible"],
  [260, 286, 2.5, "Proceed: your wallet signs, Tatum broadcasts"],
  [288, 298, 3, "Confirmed on Sui testnet"],
  [304, 322, 4, "Memory Lab: inspect and forget"],
  [327.5, 329.2, 1, "12 mainnet Walrus writes, every blob linked"],
  [333, 335.7, 1.5, ""],
  [338, 341, 1.5, ""],
];
const END_CARD = resolve(import.meta.dirname, "../../brand/png/poster-16x9.png");
const END_SECONDS = 3;
const FADE = 0.15;

const work = join(tmpdir(), "said-no-cut");
mkdirSync(work, { recursive: true });

const filters = [];
let t = 0;
SEGMENTS.forEach(([s, e, speed, caption], i) => {
  const d = (e - s) / speed;
  filters.push(
    `[0:v]trim=start=${s}:end=${e},setpts=(PTS-STARTPTS)/${speed},fps=30,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,` +
      (caption ? `drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':textfile=cap${i}.txt:fontsize=42:fontcolor=white:box=1:boxcolor=0x0e0e0e@0.8:boxborderw=20:x=(w-text_w)/2:y=h-120:enable='between(t,0.3,${Math.max(0.6, d - 0.3).toFixed(2)})',` : "") +
      `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(d - FADE).toFixed(3)}:d=${FADE}[v${i}]`,
  );
  writeFileSync(join(work, `cap${i}.txt`), caption);
  t += d;
});
const n = SEGMENTS.length;
filters.push(`[1:v]scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv420p,fade=t=in:st=0:d=0.3[v${n}]`);
t += END_SECONDS;
filters.push(`${SEGMENTS.map((_, i) => `[v${i}]`).join("")}[v${n}]concat=n=${n + 1}:v=1:a=0[cat]`);

const last = "cat";

writeFileSync(join(work, "graph.txt"), filters.join(";\n"));
console.log(`planned length: ${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")} (${t.toFixed(1)} s)`);

const r = spawnSync(
  "ffmpeg",
  ["-y", "-v", "error", "-stats", "-i", raw, "-loop", "1", "-t", String(END_SECONDS), "-i", END_CARD, "-/filter_complex", "graph.txt",
   "-map", `[${last}]`, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
  { cwd: work, stdio: "inherit" },
);
process.exit(r.status ?? 1);
