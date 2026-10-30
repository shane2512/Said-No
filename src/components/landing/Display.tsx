/** Original display letterforms: thick chamfered strokes, open bowls, drawn on a 100-unit-tall grid. */
type Glyph = { w: number; d: string[] };

const p = (...pts: [number, number][]) => "M" + pts.map(([x, y]) => `${x} ${y}`).join("L");

const G: Record<string, Glyph> = {
  A: { w: 92, d: [p([10, 112], [36, 11], [56, 11], [82, 112])] },
  B: { w: 84, d: [p([0, 11], [62, 11], [73, 22], [73, 39], [62, 50], [14, 50]), p([62, 50], [73, 61], [73, 78], [62, 89], [0, 89])] },
  C: { w: 80, d: [p([80, 11], [22, 11], [11, 22], [11, 78], [22, 89], [80, 89])] },
  D: { w: 84, d: [p([0, 11], [62, 11], [73, 22], [73, 78], [62, 89], [0, 89])] },
  E: { w: 80, d: [p([80, 11], [22, 11], [11, 22], [11, 78], [22, 89], [80, 89]), p([11, 50], [72, 50])] },
  F: { w: 76, d: [p([76, 11], [11, 11], [11, 112]), p([11, 52], [66, 52])] },
  G: { w: 86, d: [p([86, 11], [22, 11], [11, 22], [11, 78], [22, 89], [64, 89], [75, 78], [75, 52], [46, 52])] },
  H: { w: 86, d: [p([11, -12], [11, 112]), p([75, -12], [75, 112]), p([11, 50], [75, 50])] },
  I: { w: 76, d: [p([0, 11], [76, 11]), p([38, 11], [38, 89]), p([0, 89], [76, 89])] },
  J: { w: 72, d: [p([61, -12], [61, 78], [50, 89], [0, 89])] },
  K: { w: 86, d: [p([11, -12], [11, 112]), p([88, -8], [30, 50], [88, 108])] },
  L: { w: 76, d: [p([11, -12], [11, 78], [22, 89], [76, 89])] },
  M: { w: 110, d: [p([6, 112], [26, 11], [88, 11], [99, 22], [99, 112]), p([58, 11], [58, 112])] },
  N: { w: 88, d: [p([11, 112], [11, 22], [22, 11], [66, 11], [77, 22], [77, 112])] },
  O: { w: 90, d: [p([22, 11], [79, 11], [79, 78], [68, 89], [11, 89], [11, 22], [22, 11], [34, 11])] },
  P: { w: 84, d: [p([11, 112], [11, 11], [62, 11], [73, 22], [73, 44], [62, 55], [11, 55])] },
  Q: { w: 92, d: [p([22, 11], [79, 11], [79, 78], [68, 89], [11, 89], [11, 22], [22, 11], [34, 11]), p([50, 66], [90, 112])] },
  R: { w: 88, d: [p([11, 112], [11, 11], [62, 11], [73, 22], [73, 44], [62, 55], [11, 55]), p([44, 55], [84, 112])] },
  S: { w: 84, d: [p([84, 11], [22, 11], [11, 22], [11, 39], [22, 50], [62, 50], [73, 61], [73, 78], [62, 89], [0, 89])] },
  T: { w: 84, d: [p([0, 11], [84, 11]), p([42, 11], [42, 112])] },
  U: { w: 86, d: [p([11, -12], [11, 78], [22, 89], [64, 89], [75, 78], [75, -12])] },
  V: { w: 92, d: [p([10, -12], [36, 89], [56, 89], [82, -12])] },
  W: { w: 110, d: [p([6, -12], [26, 89], [88, 89], [99, 78], [99, -12]), p([58, 89], [58, -12])] },
  X: { w: 90, d: [p([6, -6], [84, 106]), p([84, -6], [6, 106])] },
  Y: { w: 88, d: [p([4, -8], [44, 48], [84, -8]), p([44, 48], [44, 112])] },
  Z: { w: 82, d: [p([0, 11], [72, 11], [10, 89], [82, 89])] },
  "0": { w: 86, d: [p([22, 11], [75, 11], [75, 78], [64, 89], [11, 89], [11, 22], [22, 11], [34, 11])] },
  "1": { w: 56, d: [p([4, 22], [32, 11], [32, 112])] },
  "2": { w: 82, d: [p([0, 11], [60, 11], [71, 22], [71, 39], [60, 50], [22, 50], [11, 61], [11, 89], [82, 89])] },
  "3": { w: 84, d: [p([0, 11], [62, 11], [73, 22], [73, 39], [62, 50], [14, 50]), p([62, 50], [73, 61], [73, 78], [62, 89], [0, 89])] },
  "4": { w: 86, d: [p([11, -12], [11, 56], [86, 56]), p([64, -12], [64, 112])] },
  "5": { w: 84, d: [p([84, 11], [11, 11], [11, 50], [62, 50], [73, 61], [73, 78], [62, 89], [0, 89])] },
  "6": { w: 84, d: [p([84, 11], [22, 11], [11, 22], [11, 89], [73, 89], [73, 50], [11, 50])] },
  "7": { w: 80, d: [p([0, 11], [80, 11], [30, 112])] },
  "8": { w: 86, d: [p([11, 11], [75, 11], [75, 89], [11, 89], [11, 11], [24, 11]), p([11, 50], [75, 50])] },
  "9": { w: 84, d: [p([73, 50], [11, 50], [11, 11], [73, 11], [73, 78], [62, 89], [0, 89])] },
  "-": { w: 60, d: [p([0, 50], [60, 50])] },
};

/** Big display text. Each letter is its own <svg data-g> so GSAP can reveal letters individually. */
export function Display({ text, className = "", reveal = true }: { text: string; className?: string; reveal?: boolean }) {
  return (
    <span className={`dt ${className}`} role="img" aria-label={text} data-glyphs={reveal ? "" : undefined}>
      {text.split("").map((ch, i) => {
        if (ch === " ") return <span key={i} className="dt-sp" />;
        const g = G[ch] ?? G["-"];
        return (
          <svg key={i} data-g="" viewBox={`0 0 ${g.w} 100`} style={{ width: `${g.w / 100}em` }} aria-hidden>
            {g.d.map((d, j) => (
              <path key={j} d={d} />
            ))}
          </svg>
        );
      })}
    </span>
  );
}

/** Our mark: a chamfered stop-sign frame with a single bar. Deliberately not the reference's logo. */
export function Mark({ className = "", tone = "var(--orange)", bar = "var(--text)" }: { className?: string; tone?: string; bar?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 60" aria-hidden>
      <path d="M18 3H42L57 18V42L42 57H18L3 42V18Z" fill="none" stroke={tone} strokeWidth="9" />
      <rect x="17" y="26" width="26" height="8" fill={bar} />
    </svg>
  );
}

export const Arrow = ({ dir = "right" }: { dir?: "left" | "right" }) => (
  <svg className="ico-arrow" viewBox="0 0 22 22" style={dir === "left" ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
    <path d="M2 11H17M10 3L18 11L10 19" fill="none" stroke="currentColor" strokeWidth="4" />
  </svg>
);

export const Corners = () => (
  <>
    <i className="cn tl" />
    <i className="cn tr" />
    <i className="cn bl" />
    <i className="cn br" />
  </>
);

export const Check = () => (
  <svg className="ico-check" viewBox="0 0 30 24" aria-hidden>
    <path d="M2 11L11 20L27 3" fill="none" stroke="var(--orange)" strokeWidth="6" />
  </svg>
);
