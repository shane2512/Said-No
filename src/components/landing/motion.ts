import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

/** Each glyph lands in a random order, stepping up through grey. */
function revealGlyphs(el: Element, delay = 0) {
  gsap.fromTo(
    el.querySelectorAll("[data-g]"),
    { opacity: 0 },
    { opacity: 1, duration: 0.5, ease: "steps(4)", delay, stagger: { amount: 0.75, from: "random" } },
  );
}

function intro(root: HTMLElement, onDone: () => void) {
  const box = root.querySelector<HTMLElement>(".intro");
  if (!box) return onDone();
  const cols = 16, rows = 8;
  const frag = document.createDocumentFragment();
  const cells: { el: HTMLElement; row: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const el = document.createElement("i");
      el.className = "intro-c";
      el.style.cssText = `left:${(c * 100) / cols}%;top:${(r * 100) / rows}%;width:${100 / cols + 0.2}%;height:${100 / rows + 0.3}%;background:var(--orange)`;
      frag.appendChild(el);
      cells.push({ el, row: r });
    }
  box.prepend(frag);
  box.style.background = "transparent"; // the CSS orange only covers the moment before this script loads
  const marks = box.querySelectorAll(".intro-logos svg");
  const tl = gsap.timeline({ onComplete: () => { box.remove(); } });
  tl.to(marks, { opacity: 1, duration: 0.28, ease: "steps(3)", stagger: 0.24 }, 0.25);
  tl.to(marks, { opacity: 0, duration: 0.14, ease: "steps(2)" }, "+=0.28");
  const wipeAt = tl.duration();
  cells.forEach(({ el, row }) => {
    const at = wipeAt + ((rows - 1 - row) / rows) * 0.75 + Math.random() * 0.42;
    tl.to(el, { opacity: 0.45, duration: 0.05, ease: "none" }, at).to(el, { opacity: 0, duration: 0.05, ease: "none" }, at + 0.09);
  });
  tl.call(onDone, undefined, wipeAt + 0.45);
  return tl;
}

function carousel(track: HTMLElement, prev: HTMLElement | null, next: HTMLElement | null, step: () => number) {
  let i = 0;
  const go = (d: number) => {
    const max = Math.max(0, track.scrollWidth - (track.parentElement?.clientWidth ?? 0));
    i = Math.max(0, Math.min(Math.ceil(max / step()), i + d));
    gsap.to(track, { x: -Math.min(max, i * step()), duration: 0.9, ease: "power3.out" });
  };
  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));
}

/** Lenis, title reveals, scramble labels, fades and 3D tiles: shared by every page. */
function setupCommon(root: HTMLElement, reduce: boolean, cleanups: (() => void)[]) {
  let lenis: Lenis | undefined;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 0.9, anchors: { offset: -108 * rem() } });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis!.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(() => { gsap.ticker.remove(raf); lenis!.destroy(); });
  }

  root.querySelectorAll("[data-glyphs]").forEach((el) => {
    if (el.closest(".marquee")) return;
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => revealGlyphs(el) });
  });

  root.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => {
    const text = el.textContent ?? "";
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => gsap.fromTo(el, { scrambleText: { text: "", chars: "01_/" } }, { scrambleText: { text, chars: "01_/", speed: 0.7 }, duration: 0.9, ease: "none" }),
    });
  });

  root.querySelectorAll<HTMLElement>("[data-fade]").forEach((el) => {
    gsap.from(el, { y: 26, autoAlpha: 0, duration: 0.9, ease: "power4.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return lenis;
}

/** Inner pages: the same type, tiles and scrolling, without the intro or the sentinel. */
export function initPage(root: HTMLElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: (() => void)[] = [];
  const ctx = gsap.context(() => {
    setupCommon(root, reduce, cleanups);
    let stopped = false;
    import("./scene3d").then(({ mountTile, tickTiles }) => {
      if (stopped) return;
      try {
        const stops = [...root.querySelectorAll<HTMLCanvasElement>("canvas[data-tile]")].map((c) =>
          mountTile(c, c.dataset.tile as "star", { inverted: c.hasAttribute("data-inv") }),
        );
        const loop = (t: number) => tickTiles(t);
        gsap.ticker.add(loop);
        cleanups.push(() => { gsap.ticker.remove(loop); stops.forEach((s) => s()); });
      } catch {
        /* no WebGL: tiles stay empty and the page still works */
      }
    });
    cleanups.push(() => { stopped = true; });
  }, root);
  return () => {
    cleanups.forEach((c) => c());
    ctx.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  };
}

export function initLanding(root: HTMLElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(min-width: 901px)").matches;
  const cleanups: (() => void)[] = [];

  const ctx = gsap.context(() => {
    const lenis = setupCommon(root, reduce, cleanups);

    const mq = root.querySelector<HTMLElement>(".marquee-t");
    if (mq && !reduce) {
      // about 30 design px per second, the drift measured from the reference
      gsap.to(mq, { x: () => -(mq.scrollWidth + 0.42 * 144 * rem()) / 2, duration: () => mq.scrollWidth / rem() / 2 / 30, ease: "none", repeat: -1 });
    }

    const heroGlyphs = root.querySelectorAll(".marquee [data-glyphs]");
    let hatchOpen = () => {};
    let introDone = false;
    const start = () => {
      introDone = true;
      heroGlyphs.forEach((g, i) => revealGlyphs(g, i * 0.05));
      hatchOpen();
    };

    root.querySelectorAll<HTMLElement>(".links a[data-sec]").forEach((a) => {
      const sec = document.getElementById(a.dataset.sec!);
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: "top 40%", end: "bottom 40%", toggleClass: { targets: a, className: "on" } });
    });

    root.querySelectorAll<HTMLElement>("[data-car]").forEach((c) => {
      const track = c.querySelector<HTMLElement>("[data-track]");
      const ctl = root.querySelector<HTMLElement>(`[data-ctl="${c.dataset.car}"]`);
      if (!track || !ctl) return;
      const first = track.firstElementChild as HTMLElement | null;
      carousel(track, ctl.querySelector("[data-prev]"), ctl.querySelector("[data-next]"), () => {
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return (first?.offsetWidth ?? 300) + gap;
      });
    });

    root.querySelectorAll<HTMLElement>(".fq").forEach((f) => {
      const q = f.querySelector<HTMLButtonElement>(".fq-q")!;
      const a = f.querySelector<HTMLElement>(".fq-a")!;
      q.addEventListener("click", () => {
        const open = f.toggleAttribute("data-open");
        q.setAttribute("aria-expanded", String(open));
        gsap.to(a, { height: open ? "auto" : 0, duration: 0.6, ease: "power3.out", onComplete: () => ScrollTrigger.refresh() });
      });
    });

    root.querySelectorAll<HTMLElement>(".kcard").forEach((k) => {
      const b = k.querySelector<HTMLButtonElement>("button")!;
      const w = k.querySelector<HTMLElement>(".kcard-w")!;
      const sign = b.querySelector("b")!;
      b.addEventListener("click", () => {
        const open = k.toggleAttribute("data-open");
        b.setAttribute("aria-expanded", String(open));
        sign.textContent = open ? "−" : "+";
        gsap.to(w, { yPercent: open ? -100 : 0, duration: 0.55, ease: "power3.out" });
      });
    });

    // 3D is optional: the page stays complete without WebGL. The column and pipes are desktop only.
    let stopped = false;
    import("./scene3d").then(({ createGuardian, createPipes, mountTile, tickTiles }) => {
      if (stopped) return;
      try {
        const canvas = root.querySelector<HTMLCanvasElement>(".guardian")!;
        const guardian = desktop ? createGuardian(canvas) : null;
        const pipesEl = desktop ? root.querySelector<HTMLCanvasElement>(".pipes") : null;
        const pipes = pipesEl ? createPipes(pipesEl) : null;
        const tileStops = [...root.querySelectorAll<HTMLCanvasElement>("canvas[data-tile]")].map((c) =>
          mountTile(c, c.dataset.tile as "star", { inverted: c.hasAttribute("data-inv") }),
        );
        const proofST = pipesEl ? ScrollTrigger.create({ trigger: pipesEl, start: "top bottom", end: "bottom top" }) : null;

        const hatch = { v: 0 };
        hatchOpen = () => {
          if (reduce) return guardian?.setHatch(1);
          gsap.to(hatch, { v: 1, duration: 1.1, delay: 1.3, ease: "power3.inOut", onUpdate: () => guardian?.setHatch(hatch.v) });
        };
        if (introDone) hatchOpen();

        const loop = (t: number) => {
          guardian?.render(scrollY / rem(), t);
          pipes?.render(t, proofST?.progress ?? 0);
          tickTiles(t);
        };
        gsap.ticker.add(loop);
        cleanups.push(() => {
          gsap.ticker.remove(loop);
          guardian?.dispose();
          pipes?.dispose();
          tileStops.forEach((s) => s());
        });
      } catch {
        root.querySelector<HTMLElement>(".guardian")?.remove();
      }
    });
    cleanups.push(() => { stopped = true; });

    if (reduce) {
      root.querySelector(".intro")?.remove();
      start();
    } else {
      window.scrollTo(0, 0);
      lenis?.stop();
      intro(root, () => { lenis?.start(); start(); });
    }
  }, root);

  return () => {
    cleanups.forEach((c) => c());
    ctx.revert();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  };
}
