import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const ORANGE = 0xff7120;
const OCT_OFFSET = Math.PI / 8; // turns an 8-sided cylinder so a flat facet faces the viewer

function makeEnv(renderer: THREE.WebGLRenderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return tex;
}

const clay = (color = 0x37373a, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
const box = (w: number, h: number, d: number, r: number, m: THREE.Material) =>
  new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
const cyl = (rt: number, rb: number, h: number, m: THREE.Material, seg = 48) =>
  new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z = 0): T => (o.position.set(x, y, z), o);

/** Faceted octagonal prism: the brand's chamfer as a solid. `w` is flat-to-flat width. */
function oct(wTop: number, wBot: number, h: number, m: THREE.Material) {
  const k = 1 / Math.cos(Math.PI / 8) / 2;
  const g = new THREE.CylinderGeometry(wTop * k, wBot * k, h, 8).toNonIndexed();
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.y = OCT_OFFSET;
  return mesh;
}

function octShape(r: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = OCT_OFFSET + (i * Math.PI) / 4;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/** The logo as an object: an orange octagon frame around a dark plate with a single white bar. */
function signHead(size: number) {
  const g = new THREE.Group();
  const R = size / 2 / Math.cos(Math.PI / 8);
  const ring = octShape(R);
  ring.holes.push(octShape(R * 0.72));
  const frameGeo = new THREE.ExtrudeGeometry(ring, { depth: size * 0.16, bevelEnabled: true, bevelSize: size * 0.012, bevelThickness: size * 0.012, bevelSegments: 2 });
  frameGeo.translate(0, 0, -size * 0.08);
  g.add(new THREE.Mesh(frameGeo, new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.42, emissive: 0x8a3306, emissiveIntensity: 0.55 })));
  const plateGeo = new THREE.ExtrudeGeometry(octShape(R * 0.74), { depth: size * 0.05, bevelEnabled: false });
  plateGeo.translate(0, 0, -size * 0.05);
  g.add(new THREE.Mesh(plateGeo, clay(0x0b0b0b, 0.3)));
  const bar = new THREE.Mesh(new THREE.BoxGeometry(size * 0.46, size * 0.12, size * 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  bar.position.z = size * 0.02;
  g.add(bar);
  return { group: g, bar };
}

function coreTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a0a02";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffd9a0";
  g.font = "700 140px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("NO", 128, 138);
  return new THREE.CanvasTexture(c);
}

function coinTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ff7120";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#7a2c06";
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(88, 40); g.lineTo(168, 40); g.lineTo(216, 88); g.lineTo(216, 168); g.lineTo(168, 216); g.lineTo(88, 216); g.lineTo(40, 168); g.lineTo(40, 88);
  g.closePath();
  g.stroke();
  g.fillStyle = "#7a2c06";
  g.fillRect(82, 112, 92, 32);
  return new THREE.CanvasTexture(c);
}

/** The sentinel column. Coordinates are design pixels: x from centre, y negative going down the page. */
export function createGuardian(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  scene.environmentIntensity = 0.42;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-500, 400, 900);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(700, 200, 300);
  scene.add(key, rim);

  const camera = new THREE.OrthographicCamera(-958, 958, 465, -465, -3000, 3000);
  const root = new THREE.Group();
  scene.add(root);

  const shell = clay(0x3b3b3f, 0.5);
  const shellLight = clay(0x4a4a4e, 0.42);
  const dark = clay(0x0c0c0c, 0.4);

  // upper sentinel: mast, yoke and the sign head (turns slowly over the hero text)
  const upper = new THREE.Group();
  root.add(upper);
  upper.add(at(oct(150, 170, 60, shellLight), 0, -76));
  upper.add(at(oct(66, 66, 30, dark), 0, -118));
  upper.add(at(box(420, 26, 74, 8, shell), 0, -142));
  for (const s of [-1, 1]) {
    upper.add(at(box(26, 320, 74, 8, shell), s * 210, -300));
    upper.add(at(box(58, 58, 58, 8, dark), s * 182, -300));
  }
  upper.add(at(box(420, 26, 74, 8, shell), 0, -458));
  upper.add(at(oct(84, 84, 34, dark), 0, -476));
  const { group: head, bar: visor } = signHead(290);
  head.position.set(0, -300, 0);
  upper.add(head);

  // torso: faceted body with a hatch over the glowing core
  const torso = at(oct(270, 270, 244, shell), 0, -616);
  upper.add(torso);
  upper.add(at(oct(274, 274, 3, dark), 0, -600));
  const core = new THREE.Group();
  core.position.set(0, -610, 136);
  ([[150, 0xff7120], [118, 0xffa040], [88, 0xffd27a]] as const).forEach(([s, c], i) => {
    const geo = new THREE.ShapeGeometry(octShape(s / 2 / Math.cos(Math.PI / 8)));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
    m.position.z = i * 0.6;
    core.add(m);
  });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), new THREE.MeshBasicMaterial({ map: coreTexture() }));
  word.position.z = 2.4;
  core.add(word);
  core.scale.setScalar(0.001);
  upper.add(core);
  const hatchL = at(box(62, 160, 8, 3, shellLight), -31, -610, 138);
  const hatchR = at(box(62, 160, 8, 3, shellLight), 31, -610, 138);
  upper.add(hatchL, hatchR);
  const glow = new THREE.PointLight(ORANGE, 0, 500);
  glow.position.set(0, -610, 220);
  upper.add(glow);

  // skirt and mast
  root.add(at(oct(270, 366, 54, shell), 0, -760));
  const chrome = new THREE.MeshStandardMaterial({ color: 0x77777c, roughness: 0.18, metalness: 0.9 });
  root.add(at(oct(274, 274, 480, chrome), 0, -1020));

  // capsule
  const capsule = new THREE.Group();
  root.add(capsule);
  capsule.add(at(oct(274, 366, 34, shellLight), 0, -1252));
  capsule.add(at(oct(366, 366, 84, shell), 0, -1310));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfc2c6, roughness: 0.08, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
  capsule.add(at(oct(322, 322, 440, glass), 0, -1576));
  const pillarM = clay(0x2a2a2d, 0.45);
  const cornerR = 322 / 2 / Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = OCT_OFFSET + (i * Math.PI) / 4;
    capsule.add(at(new THREE.Mesh(new THREE.BoxGeometry(9, 440, 9), pillarM), Math.cos(a) * cornerR, -1576, Math.sin(a) * cornerR));
  }
  capsule.add(at(oct(366, 366, 40, shell), 0, -1816));
  capsule.add(at(oct(370, 370, 8, new THREE.MeshBasicMaterial({ color: ORANGE })), 0, -1810));
  capsule.add(at(oct(366, 366, 110, shell), 0, -1884));
  capsule.add(at(oct(366, 416, 44, shell), 0, -1960));
  capsule.add(at(oct(416, 416, 150, shell), 0, -2058));
  capsule.add(at(oct(416, 300, 40, shell), 0, -2153));

  // inside the capsule: each refusal lands as a slab, then a new send hangs above the pile
  const SLABS = 6, FLOOR = -1782, SLAB_H = 22;
  const slabs: THREE.Group[] = [];
  const slabBody = clay(0x56565a, 0.4);
  const slabEdge = new THREE.MeshBasicMaterial({ color: ORANGE });
  for (let i = 0; i < SLABS; i++) {
    const s = new THREE.Group();
    s.add(oct(236 - i * 6, 236 - i * 6, SLAB_H - 5, slabBody));
    s.add(at(oct(238 - i * 6, 238 - i * 6, 3, slabEdge), 0, SLAB_H / 2 - 1));
    s.visible = false;
    capsule.add(s);
    slabs.push(s);
  }
  const coin = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: coinTexture(), roughness: 0.4, emissive: 0x7a2c06, emissiveIntensity: 0.35 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xc94e12, roughness: 0.5 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(72, 72, 14, 64), [edge, face, face]);
  disc.rotation.x = Math.PI / 2;
  coin.add(disc);
  capsule.add(coin);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    const H = (innerHeight / innerWidth) * 1916;
    camera.left = -958; camera.right = 958; camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener("resize", resize);

  // Moves with the page, sticks while the how-it-works rows pass, then leaves with the page.
  const STICK_FROM = 937, STICK_TO = 2050, STICK_RATE = 0.18;
  let hatch = 0;
  return {
    setHatch(v: number) { hatch = v; },
    render(scrollPx: number, time: number) {
      const H = camera.top * 2;
      let off = scrollPx;
      if (scrollPx > STICK_FROM) off = STICK_FROM + (Math.min(scrollPx, STICK_TO) - STICK_FROM) * STICK_RATE + Math.max(0, scrollPx - STICK_TO);
      root.position.y = H / 2 + off;
      const visible = off < 2300 + H;
      canvas.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;

      upper.rotation.y = -0.3 + Math.sin(time * 0.45) * 0.16;
      head.rotation.x = Math.sin(time * 0.7) * 0.05;
      // the visor settles from a thin slit to the full bar when the hatch opens
      visor.scale.x = 0.25 + hatch * 0.75;
      visor.scale.y = 0.5 + hatch * 0.5 + Math.sin(time * 2.2) * 0.04;
      hatchL.position.x = -31 - hatch * 66;
      hatchR.position.x = 31 + hatch * 66;
      hatchL.visible = hatchR.visible = hatch < 0.98;
      core.scale.setScalar(Math.max(0.001, hatch));
      glow.intensity = hatch * 26000;

      const p = THREE.MathUtils.clamp((scrollPx - (STICK_FROM - 260)) / (STICK_TO - STICK_FROM + 260), 0, 1);
      slabs.forEach((s, i) => {
        const land = THREE.MathUtils.smoothstep(p, i / SLABS * 0.72, (i + 1) / SLABS * 0.72);
        const rest = FLOOR + i * SLAB_H;
        s.visible = land > 0;
        s.position.y = THREE.MathUtils.lerp(-1370, rest, land * land);
        s.rotation.y = (1 - land) * 1.2;
      });
      const inn = THREE.MathUtils.smoothstep(p, 0.74, 1);
      coin.visible = inn > 0;
      coin.position.y = THREE.MathUtils.lerp(-1370, -1560, inn);
      coin.rotation.y = -0.6 + p * 7 + time * 0.3;
      renderer.render(scene, camera);
    },
    dispose() {
      removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}

/* ---- small rotating tile objects: one shared renderer blitted into 2D canvases ---- */
type TileKind = "star" | "star2" | "spheres" | "ball";
let shared: { renderer: THREE.WebGLRenderer; env: THREE.Texture } | undefined;
function sharedRenderer() {
  if (!shared) {
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(512, 512, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    shared = { renderer, env: makeEnv(renderer) };
  }
  return shared;
}

function tileObject(kind: TileKind, tone: number) {
  const g = new THREE.Group();
  const m = clay(tone, 0.5);
  if (kind === "star" || kind === "star2") {
    const hole = clay(0x050505, 0.8);
    const dirs: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    if (kind === "star2") dirs.pop();
    dirs.forEach((d) => {
      const arm = new THREE.Group();
      arm.add(at(cyl(0.34, 0.34, 1.05, m, 32), 0, 0.55));
      arm.add(at(cyl(0.16, 0.16, 0.02, hole, 24), 0, 1.08));
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d));
      g.add(arm);
    });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), m));
  } else if (kind === "spheres") {
    const s = new THREE.SphereGeometry(0.62, 48, 32);
    g.add(at(new THREE.Mesh(s, m), -0.62, 0, 0), at(new THREE.Mesh(s, m), 0.24, 0.5, -0.2), at(new THREE.Mesh(s, m), 0.3, -0.42, 0.25));
  } else {
    const outer = new THREE.MeshPhysicalMaterial({ color: tone, roughness: 0.12, transparent: true, opacity: 0.4 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 32), outer));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), m), -0.18, -0.08, 0));
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 12, 60, Math.PI * 1.2), m);
    t.rotation.set(0.6, 0.3, 0.5);
    g.add(t);
  }
  return g;
}

/** Spins a small object inside `canvas` while it is on screen. Returns cleanup. */
const tiles = new Set<{ tick: (t: number) => void; on: boolean }>();
export function mountTile(canvas: HTMLCanvasElement, kind: TileKind, opts: { inverted?: boolean } = {}) {
  const { renderer, env } = sharedRenderer();
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = opts.inverted ? 0.5 : 0.35;
  const l = new THREE.DirectionalLight(0xffffff, opts.inverted ? 1.1 : 2);
  l.position.set(-2, 3, 4);
  scene.add(l);
  const obj = tileObject(kind, opts.inverted ? 0x2a2a2c : 0x5a5a5e);
  scene.add(obj);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.z = 6.4;
  const ctx = canvas.getContext("2d")!;
  canvas.width = canvas.height = 512;
  const entry = {
    on: false,
    tick(t: number) {
      obj.rotation.set(0.45 + Math.sin(t * 0.3) * 0.25, t * 0.35, 0.2);
      renderer.render(scene, camera);
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(renderer.domElement, 0, 0, 512, 512);
    },
  };
  const io = new IntersectionObserver(([e]) => (entry.on = e.isIntersecting));
  io.observe(canvas);
  tiles.add(entry);
  entry.tick(0);
  return () => { io.disconnect(); tiles.delete(entry); };
}
export function tickTiles(t: number) {
  tiles.forEach((e) => e.on && e.tick(t));
}

/* ---- pipe network beside the proof title ---- */
export function createPipes(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.environment = makeEnv(renderer);
  scene.environmentIntensity = 0.5;
  const dl = new THREE.DirectionalLight(0xffffff, 1.2);
  dl.position.set(-300, 400, 800);
  scene.add(dl);
  const W = 1136, H = 590;
  const camera = new THREE.OrthographicCamera(0, W, 0, -H, -1000, 1000);
  const tube = new THREE.MeshPhysicalMaterial({ color: 0x8f9296, roughness: 0.15, transparent: true, opacity: 0.32 });
  const node = new THREE.MeshPhysicalMaterial({ color: 0x9fa2a6, roughness: 0.1, transparent: true, opacity: 0.3 });
  const joint = clay(0x4a4a4e, 0.42);

  const pipe = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const c = cyl(16, 16, len, tube, 24);
    c.position.set((x1 + x2) / 2, -(y1 + y2) / 2, 0);
    if (y1 === y2) c.rotation.z = Math.PI / 2;
    scene.add(c);
  };
  const ball = (x: number, y: number, hot = false) => {
    scene.add(at(new THREE.Mesh(new THREE.SphereGeometry(42, 32, 24), node), x, -y));
    if (hot) scene.add(at(new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), new THREE.MeshBasicMaterial({ color: ORANGE })), x, -y, 30));
  };
  const nodes: [number, number, boolean][] = [[190, 190, true], [960, 190, true], [290, 520, false], [660, 520, true], [490, 390, false], [660, 390, false]];
  pipe(190, 190, 960, 190); pipe(190, 190, 190, 520); pipe(290, 390, 660, 390); pipe(660, 190, 660, 520); pipe(190, 520, 660, 520);
  nodes.forEach(([x, y, hot]) => ball(x, y, hot));
  scene.add(at(box(76, 76, 56, 14, joint), 320, -190), at(box(76, 76, 56, 14, joint), 660, -190), at(box(72, 72, 56, 14, joint), 490, -390));

  const sign = (x: number, y: number, s: number) => {
    const { group, bar } = signHead(s);
    group.position.set(x, -y, 40);
    scene.add(group);
    return bar;
  };
  const b1 = sign(490, 170, 210);
  const b2 = sign(960, 390, 260);

  let on = false;
  const io = new IntersectionObserver(([en]) => (on = en.isIntersecting));
  io.observe(canvas);
  const size = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  size();
  addEventListener("resize", size);
  return {
    render(time: number, progress: number) {
      if (!on) return;
      // the bars turn a quarter at a time as the section scrolls past
      b1.rotation.z = Math.round(progress * 4) * (Math.PI / 2);
      b2.rotation.z = Math.PI / 2 + Math.round(progress * 3) * (Math.PI / 2);
      scene.rotation.y = Math.sin(time * 0.3) * 0.012;
      renderer.render(scene, camera);
    },
    dispose() { io.disconnect(); removeEventListener("resize", size); renderer.dispose(); },
  };
}
