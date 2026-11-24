// Purpose: the "air" of the Moon scene in the service-page rocket story, drawn on two 2D canvases.
//
//   BACK canvas (behind the shuttle, over the moonscape photo)
//     • exosphere glow – a thin blue-white haze sitting on the horizon
//     • dust banks     – wide, soft clouds of regolith drifting slowly across the plain (parallax: far = slow)
//     • floating motes – sun-lit dust specks hanging in low gravity, rising and twinkling
//   FRONT canvas (in front of the shuttle's wheels)
//     • retro-thrust skirt – dust starts streaming sideways along the ground as the orbiter nears touchdown
//     • touchdown billow   – a big cloud bursts out under the orbiter, rolls outward, rises slowly and
//                            hangs in the air (low gravity) while the hatch opens, then settles
//     • ground haze        – a few faint, low puffs drifting past in the foreground for depth
//
// The landing dust is driven by the scroll position (it plays backwards when you scroll up); the drift and
// twinkle run on their own clock, only while the Moon is on screen. No React state, no allocations per frame.

const TAU = Math.PI * 2;
const HORIZON = 0.52; // the horizon line on /layers/d/moonscape.webp (fraction of the image height)
const IMG_W = 2400;
const IMG_H = 1357;

const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const outQuart = (t) => 1 - Math.pow(1 - t, 4);

/* one lumpy, soft dust puff (several overlapping radial blobs), tinted. Drawn once, reused for every cloud. */
function makePuff(size, rgb, seed) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = rng(seed);
  const blobs = 9;
  for (let i = 0; i < blobs; i++) {
    const a = r() * TAU;
    const d = r() * size * 0.17;
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d * 0.7;
    const rad = size * (0.2 + r() * 0.16);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${rgb},0.42)`);
    grad.addColorStop(0.55, `rgba(${rgb},0.16)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rad, 0, TAU);
    g.fill();
  }
  return c;
}

/* a glowing speck for the floating motes */
function makeMote(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,250,238,1)");
  grad.addColorStop(0.25, "rgba(255,240,215,0.75)");
  grad.addColorStop(1, "rgba(200,220,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function createMoonAtmosphere(backCanvas, frontCanvas) {
  const back = backCanvas.getContext("2d");
  const front = frontCanvas.getContext("2d");
  const puffs = [
    makePuff(256, "205,212,224", 3), // cool regolith grey
    makePuff(256, "222,214,200", 7), // warm, sun-lit
    makePuff(256, "190,204,226", 13), // blue-ish, in shadow
  ];
  const mote = makeMote(32);

  const r = rng(42);
  /* dust banks: depth 0 (horizon, slow, small) … 1 (near, faster, bigger) */
  const BANKS = Array.from({ length: 14 }, (_, i) => ({
    depth: i / 13,
    x: r(),
    v: 0.004 + r() * 0.006,
    dir: r() < 0.7 ? 1 : -1,
    w: 0.6 + r() * 0.8,
    a: 0.55 + r() * 0.45,
    bob: r() * TAU,
    p: i % 3,
  }));
  const MOTES = Array.from({ length: 90 }, () => ({
    x: r(),
    y: r(),
    vy: 0.006 + r() * 0.016, // screens per second, upward
    vx: (r() - 0.35) * 0.012,
    s: 1 + Math.pow(r(), 2.4) * 3.6,
    tw: 0.6 + r() * 1.8,
    ph: r() * TAU,
  }));
  /* touchdown billow: puffs fan out along the ground (both sides), a few rise in a column */
  const BILLOW = Array.from({ length: 46 }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const column = i % 7 === 0;
    return {
      side,
      reach: column ? 0.08 + r() * 0.14 : 0.3 + Math.pow(r(), 0.7) * 0.9, // × orbiter length
      lift: column ? 0.04 + r() * 0.05 : 0.004 + r() * 0.03,
      size: 0.11 + r() * 0.15,
      grow: 1.2 + r() * 1.3,
      delay: r() * 0.18,
      a: 0.5 + r() * 0.5,
      drift: (r() - 0.3) * 0.05,
      wob: r() * TAU,
      p: i % 3,
    };
  });
  /* retro-thrust skirt: thin streams racing sideways along the ground */
  const SKIRT = Array.from({ length: 22 }, (_, i) => ({
    side: i % 2 === 0 ? 1 : -1,
    off: r(),
    speed: 0.55 + r() * 0.6,
    size: 0.07 + r() * 0.08,
    y: r() * 0.02,
    p: i % 3,
  }));
  const HAZE = Array.from({ length: 5 }, (_, i) => ({ x: r(), v: 0.006 + r() * 0.008, w: 0.5 + r() * 0.5, y: 0.88 + r() * 0.12, p: i % 3, a: 0.5 + r() * 0.5 }));

  const S = { w: 0, h: 0, dpr: 1 };
  const st = { on: 0, rise: 0, landX: 0, groundY: 0, landLen: 600, pre: 0, burst: 0, linger: 0 };
  let clock = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let disposed = false;

  const horizonY = () => {
    const sc = Math.max(S.w / IMG_W, S.h / IMG_H);
    const dh = IMG_H * sc;
    return S.h - dh + HORIZON * dh + st.rise;
  };

  const sprite = (g, img, x, y, w, h, a) => {
    if (a <= 0.003 || w < 1) return;
    g.globalAlpha = a > 1 ? 1 : a;
    g.drawImage(img, x - w / 2, y - h / 2, w, h);
  };

  const drawBack = () => {
    const g = back;
    const { w, h } = S;
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const on = st.on;
    if (on <= 0.01) return;
    const hy = horizonY();

    /* exosphere: a soft luminous band resting on the horizon */
    g.globalCompositeOperation = "screen";
    g.globalAlpha = on;
    const band = g.createLinearGradient(0, hy - h * 0.14, 0, hy + h * 0.1);
    band.addColorStop(0, "rgba(120,170,255,0)");
    band.addColorStop(0.55, "rgba(150,195,255,0.16)");
    band.addColorStop(0.72, "rgba(205,225,255,0.24)");
    band.addColorStop(1, "rgba(160,190,230,0)");
    g.fillStyle = band;
    g.fillRect(0, hy - h * 0.14, w, h * 0.24);
    g.globalCompositeOperation = "source-over";

    /* dust banks drifting across the plain, far → near */
    for (let i = 0; i < BANKS.length; i++) {
      const b = BANKS[i];
      const d = b.depth;
      const bw = w * (0.22 + d * 0.38) * b.w;
      const bh = bw * (0.22 + d * 0.06);
      const span = w + bw;
      const x = (((b.x + clock * b.v * (0.35 + d * 1.4) * b.dir) % 1) + 1) % 1;
      const px = x * span - bw / 2;
      const py = hy + (h - hy) * (0.03 + d * 0.62) + Math.sin(clock * 0.25 + b.bob) * 4;
      sprite(g, puffs[b.p], px, py, bw, bh, on * b.a * (0.4 + d * 0.38));
    }

    /* floating motes: sun-lit specks hanging in low gravity */
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < MOTES.length; i++) {
      const m = MOTES[i];
      const y01 = (((m.y - clock * m.vy) % 1) + 1) % 1; // rise and wrap
      const x01 = (((m.x + clock * m.vx + Math.sin(clock * 0.4 + m.ph) * 0.004) % 1) + 1) % 1;
      const y = hy - h * 0.18 + y01 * (h - hy + h * 0.18);
      const tw = 0.45 + 0.55 * Math.sin(clock * m.tw + m.ph) ** 2;
      const edge = Math.min(1, y01 * 5, (1 - y01) * 6); // fade in/out where they wrap
      const s = m.s * 3.2;
      sprite(g, mote, x01 * w, y, s, s, on * tw * edge * 0.7);
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  };

  const drawFront = () => {
    const g = front;
    const { w, h } = S;
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const on = st.on;
    if (on <= 0.01) return;
    const L = st.landLen;
    const gx = st.landX;
    const gy = st.groundY;

    /* retro-thrust skirt (before touchdown) */
    if (st.pre > 0.01) {
      for (let i = 0; i < SKIRT.length; i++) {
        const k = SKIRT[i];
        const t = (k.off + clock * k.speed) % 1;
        const x = gx + k.side * t * L * 0.75;
        const sz = L * k.size * (0.6 + t * 1.4);
        sprite(g, puffs[k.p], x, gy - k.y * L - t * L * 0.02, sz * 1.6, sz * 0.55, st.pre * (1 - t) * 0.9);
      }
    }

    /* touchdown billow: bursts out, rolls along the ground, rises slowly and hangs, then settles */
    const b = st.burst;
    const hang = st.linger;
    if (b > 0 || hang > 0) {
      for (let i = 0; i < BILLOW.length; i++) {
        const p = BILLOW[i];
        const t = clamp01((b - p.delay) / (1 - p.delay));
        if (t <= 0 && hang <= 0) continue;
        const roll = outQuart(t);
        const x = gx + p.side * roll * p.reach * L + p.drift * L * hang + Math.sin(clock * 0.5 + p.wob) * L * 0.004;
        const y = gy - outCubic(t) * p.lift * L - hang * p.lift * L * 0.35;
        const sz = L * p.size * (0.4 + roll * p.grow + hang * 0.5);
        const a = p.a * 0.8 * Math.min(1, t * 4) * (1 - roll * 0.35) * (1 - hang) * on;
        sprite(g, puffs[p.p], x, y, sz * 1.7, sz * 0.55, a);
      }
    }

    /* low ground haze in the foreground */
    for (let i = 0; i < HAZE.length; i++) {
      const z = HAZE[i];
      const hw = w * 0.55 * z.w;
      const x = ((((z.x + clock * z.v) % 1) + 1) % 1) * (w + hw) - hw / 2;
      sprite(g, puffs[z.p], x, h * z.y, hw, hw * 0.2, on * z.a * 0.35);
    }
    g.globalAlpha = 1;
  };

  const tick = (now) => {
    raf = 0;
    if (disposed || !running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    clock += dt;
    drawBack();
    drawFront();
    raf = requestAnimationFrame(tick);
  };

  const setRunning = (on) => {
    if (on === running) return;
    running = on;
    last = 0;
    if (on && !raf) raf = requestAnimationFrame(tick);
    if (!on) {
      back.setTransform(1, 0, 0, 1, 0, 0);
      front.setTransform(1, 0, 0, 1, 0, 0);
      back.clearRect(0, 0, backCanvas.width, backCanvas.height);
      front.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
    }
  };

  return {
    resize(w, h) {
      S.w = w;
      S.h = h;
      S.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      [backCanvas, frontCanvas].forEach((c) => {
        c.width = Math.round(w * S.dpr);
        c.height = Math.round(h * S.dpr);
      });
    },
    /** called from the story's scroll render: on (0–1 Moon visibility), rise (px the moonscape is still
     *  pushed down), the landing spot, and the landing phases pre / burst / linger (0–1 each) */
    update(next) {
      Object.assign(st, next);
      setRunning(!disposed && st.on > 0.01);
    },
    stop() {
      setRunning(false);
    },
    dispose() {
      disposed = true;
      setRunning(false);
    },
  };
}
