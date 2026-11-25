// Purpose: The rocket story of a service page – a scroll-driven "short film" with real 3D models.
//
//   1. Launch    – the rocket in the hero picture becomes the 3D space shuttle and lifts off (dotted trail);
//                  the hero text flies to the TOP-LEFT, the picture to the TOP-RIGHT, the sky opens up.
//   2. Climb     – the shuttle climbs up the middle. Each step swings in (card + team photo), holds while you
//                  read, then drops away below. Between steps the shuttle STEERS left or right around an
//                  asteroid labelled with the business problem the next step prevents ("Slow, buggy code" →
//                  "✓ Avoided"); asteroid fields drift past on both sides. Real staging: the boosters separate
//                  after step 2, the fuel tank after step 4 – they tumble away behind the orbiter.
//   3. Landing   – the orbiter pitches over and glides down onto the Moon (home page moonscape + Earth).
//   4. Moonwalk  – the orbiter's crew hatch swings open, the 3D astronaut steps out and bounds towards the
//                  camera in low-gravity hops (following your scroll), plants the Clicktots flag and greets.
//   5. Result    – "Mission accomplished" card, then space fades into the page.
//
//   The 3D layer (scene3d.js, three.js) is lazy-loaded. If WebGL is unavailable, the SVG rocket and the 2D
//   astronaut picture are used instead. Smoothness: the overlay scroller uses Lenis; this component also eases
//   its drawn progress towards the scroll position. Per frame only transform / opacity change.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Sparkles, Users, TriangleAlert } from "lucide-react";
import { SPACE_CSS, Stars, FAR_STARS, NEAR_STARS, STREAKS } from "@/pages/Awards/RocketJourney";
import { clamp, range, lerp } from "@/lib/math";
import RocketSVG from "./RocketSVG";
import { createMoonAtmosphere } from "./moonAtmosphere";
import "./rocketStory.css";

/* ── timeline, in screens of scrolling ── */
const INTRO = 1.5; // hero flies away (0–0.95), then the mission title, while the shuttle rises to its climbing spot
const FIRST = 0.7; // gap before step 1 is centred (the title is fully gone before step 1 swings in)
const SPACING = 1.42; // from one step to the next (room to dodge an asteroid / drop a stage in between)
const DWELL = 0.55; // a step holds (almost) still for this long
/* landing → hatch → moonwalk → flag now plays out in about two screens of scrolling (was ~5.5) */
const TO_MOON = 0.3; // after the last step until the descent starts
const DESCENT = 0.6; // orbiter glides down to touchdown
const EXIT = 0.45; // door opens, 3D steps unfold, astronaut walks down the steps onto the Moon
const WALK = 0.35; // moonwalk towards the camera
const FLAG = 0.22; // flag goes in and unfurls
const WAVE = 0.1; // turns to the camera and waves
const RESULT = 0.55; // result card, then the fade into the page
const EASE_RATE = 14; // extra smoothing on top of Lenis (higher = follows the scroll more tightly)

const ASTRO_RATIO = 210 / 416; // 2D fallback astronaut image width / height
const LAND_Y = 0.045; // the landed stack's centre sits this much (× its height) above the ground: wheels on the Moon
const WALK_CLIP = 5; // seconds in the moon_walk clip
const ROCK_POOL = 18;

const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const pad = (n) => String(n).padStart(2, "0");
const initials = (role) =>
  role
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

function findScroller(el) {
  let n = el.parentElement;
  while (n && n !== document.body) {
    const oy = getComputedStyle(n).overflowY;
    if (oy === "auto" || oy === "scroll") return n;
    n = n.parentElement;
  }
  return window;
}

/** total scroll length of the story (in screens) – lets the page reserve its space before it mounts */
export const storyScreens = (count) => timeline(count).total;

function timeline(count) {
  const center = Array.from({ length: count }, (_, i) => INTRO + FIRST + i * SPACING);
  const gaps = center.slice(1).map((c, i) => ({ g: i + 1, mid: (center[i] + c) / 2, dir: i % 2 === 0 ? 1 : -1 }));
  const boost = gaps[1]?.mid ?? gaps[0]?.mid ?? INTRO + 1;
  const tank = gaps[3]?.mid ?? gaps[gaps.length - 1]?.mid ?? boost + 1;
  const skyStart = center[0] + DWELL / 2; // the sky holds while you read step 1 …
  const skyEnd = (center[1] ?? center[0] + SPACING) - 0.25; // … then the shuttle breaks through the clouds into space
  const moon = center[count - 1] + TO_MOON;
  const land1 = moon + DESCENT;
  const exit0 = land1 + 0.08;
  const exit1 = exit0 + EXIT;
  const walk1 = exit1 + WALK;
  const flag1 = walk1 + FLAG;
  const wave1 = flag1 + WAVE;
  const total = wave1 + RESULT;
  return { center, gaps, boost, tank, skyStart, skyEnd, moon, land1, exit0, exit1, walk1, flag1, wave1, total };
}

/* deterministic pseudo-random */
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export default function RocketStory({ service, story }) {
  const flow = service.flow;
  const count = flow.length;
  const T = useMemo(() => timeline(count), [count]);

  /* clouds only in the sky (launch + step 1); asteroid fields in space */
  const { BACK_CLOUDS, FRONT_CLOUDS, FIELD } = useMemo(() => {
    const r = rng(11);
    const back = Array.from({ length: 10 }, (_, i) => ({ s: 0.5 + i * 0.22 + r() * 0.15, x: r() * 100, w: 240 + r() * 320, v: 0.9 + r() * 0.5, o: 0.6 + r() * 0.35 }));
    const front = [
      { s: 0.95, x: -8, w: 760, v: 2.3 },
      { s: 0.98, x: 62, w: 680, v: 2.1 },
      { s: T.skyStart + 0.18, x: -12, w: 860, v: 2.6 },
      { s: T.skyStart + 0.22, x: 60, w: 700, v: 2.3 },
      { s: T.skyStart + 0.32, x: 20, w: 900, v: 2.8 },
    ];
    const r2 = rng(97);
    const field = [];
    for (let s = T.skyEnd - 0.4; s < T.moon + 0.4; s += 0.16) {
      const left = r2() < 0.5;
      field.push({
        s: s + r2() * 0.1,
        side: left ? -1 : 1,
        edge: r2(), // 0..1 across the edge band
        size: 14 + Math.pow(r2(), 2.2) * 70,
        v: 0.9 + r2() * 1.3,
        z: -6 + r2() * 6,
        rx: r2() * 6,
        ry: r2() * 6,
        spin: (r2() - 0.5) * 0.6,
      });
    }
    return { BACK_CLOUDS: back, FRONT_CLOUDS: front, FIELD: field };
  }, [T]);

  const rootRef = useRef(null);
  const bdRef = useRef(null);
  const stRef = useRef(null);
  const canvasRef = useRef(null);
  const skyRef = useRef(null);
  const duskRef = useRef(null);
  const groundRef = useRef(null);
  const bgRef = useRef(null);
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const backCloudRefs = useRef([]);
  const frontCloudRefs = useRef([]);
  const earthRef = useRef(null);
  const moonscapeRef = useRef(null);
  const svgRef = useRef(null);
  const launchTrail = useRef(null);
  const launchMask = useRef(null);
  const climbTrail = useRef(null);
  const sceneRefs = useRef([]);
  const tagRefs = useRef([]);
  const rocketRef = useRef(null);
  const rocket2dRef = useRef(null);
  const plumeRef = useRef(null);
  const sepRef = useRef(null);
  const stageRefs = useRef([]);
  const specRef = useRef(null);
  const moonAirRef = useRef(null);
  const atmoBackRef = useRef(null); // Moon "air": horizon glow, drifting dust banks, floating motes
  const atmoFrontRef = useRef(null); // Moon "air": retro-thrust dust, touchdown billow, foreground haze
  const dustRef = useRef(null);
  const landRingRef = useRef(null);
  const stepDustRef = useRef(null);
  const landShadowRef = useRef(null);
  const astroRef = useRef(null);
  const shadowRef = useRef(null);
  const flagRef = useRef(null);
  const poleRef = useRef(null);
  const clothRef = useRef(null);
  const barRef = useRef(null);
  const chromeRef = useRef(null);
  const fadeRef = useRef(null);
  const introRef = useRef(null);

  const [view, setView] = useState({ on: -1, next: 0, scene: "launch", avoided: 0 });
  const [has3d, setHas3d] = useState(false);
  const [no3d, setNo3d] = useState(false); // 3D failed (no WebGL…): only then show the 2D rocket
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduced) return undefined;
    const root = rootRef.current;
    const bd = bdRef.current;
    const st = stRef.current;
    if (!root || !bd || !st) return undefined;

    const hero = root.previousElementSibling;
    const heroText = hero?.querySelector("[data-rk-text]");
    const heroImage = hero?.querySelector("[data-rk-image]");
    const heroHead = hero?.querySelector("[data-rk-head]");
    const heroBg = hero?.querySelector("[data-rk-bg]");
    const heroCue = hero?.querySelector("[data-rk-cue]");
    const badge = hero?.querySelector("[data-rk-origin]");
    const scroller = findScroller(root);

    const G = { vw: 0, vh: 0, H: 240, O: [0, 0], C: [0, 0], L: 1, badgeH: 40, mobile: false, parts: [], s3: null };
    let active = false;
    let lastKey = "";
    let target = 0;
    let cur = 0;
    let raf = 0;
    let lastT = 0;
    let disposed = false;
    const atmo = atmoBackRef.current && atmoFrontRef.current ? createMoonAtmosphere(atmoBackRef.current, atmoFrontRef.current) : null;

    /* load the 3D layer straight away (fetch now, build on the first idle moment or the first scroll), so the
       shuttle that launches is always the 3D one – the flat 2D rocket only appears if 3D can't run */
    let started3d = false;
    const start3d = () => {
      if (started3d || disposed || !canvasRef.current) return;
      started3d = true;
      import("./scene3d.js")
        .then(({ createScene3D }) => {
          if (disposed) return;
          const s3 = createScene3D(canvasRef.current, { color: service.color });
          return s3.ready.then(() => {
            if (disposed) {
              s3.dispose();
              return;
            }
            G.s3 = s3;
            s3.setSize(G.vw || st.offsetWidth, G.vh || st.offsetHeight);
            s3.setActive(active);
            setHas3d(true);
            render(cur);
          });
        })
        .catch(() => {
          setHas3d(false);
          setNo3d(true);
        });
    };
    import("./scene3d.js").catch(() => {}); // start downloading three.js + the shuttle now
    const idle3d = setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(start3d, { timeout: 500 }) : start3d()), 250);

    const layout = () => {
      const vw = st.offsetWidth;
      const vh = st.offsetHeight;
      if (!vw || !vh) return;
      const mobile = vw < 900;
      Object.assign(G, { vw, vh, mobile });
      G.H = Math.round(mobile ? vh * 0.16 : clamp(vh * 0.32, 200, 300)); // shuttle stack height while climbing
      const r = rocketRef.current;
      if (r) {
        r.style.width = `${Math.round(G.H * 0.32)}px`;
        r.style.height = `${G.H}px`;
      }
      G.swing = mobile ? vw * 0.2 : clamp(vw * 0.15, 150, 260);
      // Moon scene: orbiter in the midground (left), astronaut + flag in the foreground
      G.groundY = vh * (mobile ? 0.64 : 0.7);
      G.landLen = mobile ? vw * 0.74 : clamp(vw * 0.44, 460, 780); // orbiter length on screen (big enough to read the hatch + stairs)
      G.landX = mobile ? vw * 0.5 : Math.max(vw * 0.1 + G.landLen * 0.4, vw * 0.1) + vw * 0.02; // nose stays on screen
      G.footY = vh * (mobile ? 0.94 : 0.92);
      G.astroH = vh * (mobile ? 0.2 : 0.25); // astronaut height in the foreground
      // desktop: stand in the open ground under the orbiter's wing, clear of the result panel on the right
      G.standX = vw * (mobile ? 0.34 : 0.41);
      G.flagX = G.standX + G.astroH * (mobile ? 0.32 : 0.38);
      G.flagH = G.astroH * (mobile ? 1.35 : 1.55);
      if (flagRef.current) {
        flagRef.current.style.height = `${G.flagH}px`;
        flagRef.current.style.width = `${(G.flagH * 120) / 170}px`;
      }
      if (astroRef.current) {
        astroRef.current.style.height = `${G.astroH}px`;
        astroRef.current.style.width = `${G.astroH * ASTRO_RATIO}px`;
      }
      // asteroid label widths (to keep them on screen)
      G.tagW = tagRefs.current.map((t) => (t ? t.offsetWidth : 160));
      // the step parts (card + photo) move separately
      G.parts = sceneRefs.current.map((sc) => (sc ? { card: sc.querySelector(".rk-card"), photo: sc.querySelector(".lp") } : null));

      // launch point = the small rocket in the hero picture (where it sits once the hero is pinned)
      if (badge && hero && heroImage) {
        const keep = heroImage.style.transform;
        heroImage.style.transform = "";
        const b = badge.getBoundingClientRect();
        const h = hero.getBoundingClientRect();
        heroImage.style.transform = keep;
        const pinnedTop = Math.min(0, vh - hero.offsetHeight);
        G.O = [b.left + b.width / 2 - st.getBoundingClientRect().left, b.top - h.top + pinnedTop + b.height / 2];
        G.badgeH = b.height || 40;
      } else G.O = [vw * 0.75, vh * 0.75];
      // climbing spot: centre, and never BELOW the launch point – the shuttle only ever moves up
      G.C = [vw / 2, mobile ? vh * 0.86 : clamp(Math.min(vh * 0.6, G.O[1] - 24), vh * 0.42, vh * 0.6)];

      const [ox, oy] = G.O;
      const [cx, cy] = G.C;
      const d = `M${ox.toFixed(1)} ${oy.toFixed(1)} C${ox.toFixed(1)} ${(oy - vh * 0.32).toFixed(1)} ${cx.toFixed(1)} ${(cy + vh * 0.42).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      svgRef.current?.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
      launchTrail.current?.setAttribute("d", d);
      launchMask.current?.setAttribute("d", d);
      G.L = launchTrail.current ? launchTrail.current.getTotalLength() : 1;
      if (launchMask.current) launchMask.current.style.strokeDasharray = `${G.L} ${G.L}`;
      G.s3?.setSize(vw, vh);
      atmo?.resize(vw, vh);
    };

    const resetHero = () => {
      [heroText, heroImage, heroHead].forEach((el) => {
        if (el) el.style.transform = el.style.opacity = el.style.transformOrigin = el.style.filter = "";
      });
      if (heroBg) heroBg.style.opacity = "";
      if (heroCue) heroCue.style.opacity = "";
      if (hero) hero.style.visibility = hero.style.pointerEvents = "";
      if (badge) badge.style.opacity = "";
    };
    const deactivate = () => {
      active = false;
      resetHero();
      bd.style.visibility = st.style.visibility = "hidden";
      G.s3?.setActive(false);
      atmo?.stop();
    };
    const activate = () => {
      active = true;
      layout();
      bd.style.visibility = st.style.visibility = "visible";
      G.s3?.setActive(true);
    };
    const pushView = (v) => {
      const key = `${v.on}|${v.next}|${v.scene}|${v.avoided}`;
      if (key !== lastKey) {
        lastKey = key;
        setView(v);
      }
    };

    /* rocket pose → the plume host div (and the SVG fallback) + the 3D shuttle */
    const rocket3 = { x: 0, y: 0, height: 0, heading: -90, roll: 0, tilt: 0, boosters: 0, tank: 0, door: 0, visible: true };
    const setRocket = (x, y, ang, sc, thrust, roll, extra = {}) => {
      G.rx = x;
      G.ry = y;
      G.rsc = sc;
      const r = rocketRef.current;
      if (r) r.style.transform = `translate3d(${(x - (G.H * 0.32) / 2).toFixed(2)}px,${(y - G.H / 2).toFixed(2)}px,0) rotate(${(ang + 90).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      if (rocket2dRef.current) rocket2dRef.current.style.transform = `perspective(500px) rotateY(${(roll * 16).toFixed(2)}deg)`;
      if (specRef.current) specRef.current.style.transform = `translateX(${(roll * 9).toFixed(2)}px)`;
      if (plumeRef.current) {
        plumeRef.current.style.transform = `translateX(-50%) scaleY(${(0.15 + thrust * 0.85).toFixed(3)})`;
        plumeRef.current.style.opacity = (thrust > 0.02 ? 0.45 + thrust * 0.55 : 0).toFixed(3);
      }
      Object.assign(rocket3, { x, y, height: G.H * sc, heading: ang, roll, tilt: 0, door: 0, steps: 0, gear: 0, landingThrust: 0, ...extra });
    };

    const scrollProgress = () => {
      const top = scroller === window ? 0 : scroller.getBoundingClientRect().top;
      return Math.max(0, top - root.getBoundingClientRect().top);
    };

    /** a step part comes down from above, holds, drops away below – with a 3D swing */
    const placePart = (el, d, side) => {
      if (!el) return 0;
      const { vh } = G;
      const half = DWELL / 2;
      const drift = 0.22;
      let y;
      if (Math.abs(d) <= half) y = d * vh * drift;
      else y = Math.sign(d) * half * vh * drift + (d - Math.sign(d) * half) * vh * 1.7;
      const n = clamp(y / vh, -1, 1);
      const dist = Math.abs(n);
      const op = 1 - range(dist, 0.1, 0.48);
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translate3d(0,${y.toFixed(1)}px,0) rotateX(${(-n * 32).toFixed(2)}deg) rotateY(${(side * n * 14).toFixed(2)}deg) scale(${(1 - 0.1 * range(dist, 0, 0.6)).toFixed(4)})`;
      return op;
    };

    const render = (f) => {
      if (!G.vh) return;
      if (f <= 0.5) {
        if (active) deactivate();
        pushView({ on: -1, next: 0, scene: "launch", avoided: 0 });
        return;
      }
      if (!active) activate();
      if (!started3d) start3d();
      const s = Math.min(f / G.vh, T.total);
      const { vw, vh, mobile, H } = G;
      const [cx, cy] = G.C;

      /* ── 1. hero: text → top-left, picture → top-right, page colour → sky ── */
      const e = inOut(range(s, 0.12, 0.95));
      if (heroText) {
        heroText.style.transformOrigin = "0 0";
        heroText.style.transform = e ? `translate3d(${(-vw * 0.32 * e).toFixed(1)}px,${(-vh * 0.62 * e).toFixed(1)}px,0) rotate(${(-7 * e).toFixed(2)}deg) scale(${(1 - 0.45 * e).toFixed(4)})` : "";
        heroText.style.opacity = String(1 - range(e, 0.45, 0.9));
      }
      if (heroImage) {
        heroImage.style.transformOrigin = "100% 0";
        heroImage.style.transform = e ? `translate3d(${(vw * 0.3 * e).toFixed(1)}px,${(-vh * 0.72 * e).toFixed(1)}px,0) rotate(${(8 * e).toFixed(2)}deg) scale(${(1 - 0.5 * e).toFixed(4)})` : "";
        heroImage.style.opacity = String(1 - range(e, 0.45, 0.9));
      }
      if (heroHead) heroHead.style.opacity = String(1 - range(s, 0.02, 0.3));
      if (heroCue) heroCue.style.opacity = String(1 - range(s, 0.005, 0.1));
      if (heroBg) heroBg.style.opacity = String(1 - range(s, 0.1, 0.7));
      if (hero) {
        hero.style.visibility = e >= 1 ? "hidden" : "";
        hero.style.pointerEvents = s > 0.15 ? "none" : "";
      }
      if (badge) badge.style.opacity = "0";

      /* ── 2. altitude: ground falls away, sky → dusk → space (by step 2), clouds rush past ── */
      const alt = range(s, T.skyStart, T.skyEnd);
      if (skyRef.current) skyRef.current.style.opacity = String(1 - range(alt, 0, 0.6));
      if (duskRef.current) duskRef.current.style.opacity = String(1 - range(alt, 0.4, 1));
      if (groundRef.current) {
        const gy = Math.pow(s, 1.3) * vh * 0.9;
        groundRef.current.style.visibility = gy > vh * 0.5 ? "hidden" : "";
        groundRef.current.style.transform = `translate3d(0,${gy.toFixed(1)}px,0)`;
      }
      const drift = (k, cap) => cap * (1 - Math.exp((-s * k) / cap)); // eases into a cap: never uncovers the image edge
      /* space keeps moving while the shuttle climbs: the two star layers are endless loops that stream down past
         it (near stars faster than far ones = depth), the Milky Way sways gently. Once the orbiter reaches the
         Moon the climb stops, so space settles. */
      const climb = Math.min(s, T.moon + 0.35);
      const loop = (k) => ((((climb * k) % 1) + 1) % 1) * vh - vh; // −vh … 0, wraps seamlessly
      if (bgRef.current) {
        const bx = Math.sin(climb * 0.55) * vw * 0.018;
        const by = vh * drift(0.025, 0.05) + Math.sin(climb * 0.85) * vh * 0.014;
        bgRef.current.style.transform = `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0) scale(${(1 + Math.sin(climb * 0.4) * 0.012).toFixed(4)})`;
      }
      if (farRef.current) farRef.current.style.transform = `translate3d(0,${loop(0.16).toFixed(1)}px,0)`;
      if (nearRef.current) nearRef.current.style.transform = `translate3d(0,${loop(0.45).toFixed(1)}px,0)`;
      const moveClouds = (list, refs, base, minY, maxY) =>
        list.forEach((c, i) => {
          const el = refs.current[i];
          if (!el) return;
          const y = vh * base + (s - c.s) * vh * c.v;
          const on = y > minY && y < maxY;
          el.style.visibility = on ? "" : "hidden";
          if (on) el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
        });
      moveClouds(BACK_CLOUDS, backCloudRefs, 0.55, -vh * 0.5, vh * 1.4);
      moveClouds(FRONT_CLOUDS, frontCloudRefs, 0.45, -vh, vh * 1.6);

      /* ── 3. steps: card + photo swing in (photo a beat later), hold, drop away ── */
      let on = -1;
      let next = count;
      sceneRefs.current.forEach((sc, i) => {
        const p = G.parts[i];
        if (!sc || !p) return;
        const d = s - T.center[i];
        if (d < -DWELL / 2 - 0.12 && next === count) next = i;
        if (Math.abs(d) > 1.2) {
          sc.style.visibility = "hidden";
          return;
        }
        const o1 = placePart(p.card, d, -1);
        const o2 = placePart(p.photo, d - 0.07, 1);
        sc.style.visibility = o1 + o2 <= 0.02 ? "hidden" : "";
        const isOn = Math.abs(d) <= DWELL / 2 + 0.12;
        sc.classList.toggle("is-on", isOn);
        if (isOn) on = i;
      });

      /* ── 4. the Moon (home page moonscape + Earth) rises into view as the orbiter comes down ── */
      const mt = inOut(range(s, T.moon, T.land1));
      const moonOn = s > T.moon - 0.02;
      if (moonscapeRef.current) {
        moonscapeRef.current.style.visibility = moonOn ? "" : "hidden";
        moonscapeRef.current.style.transform = `translate3d(0,${((1 - mt) * vh * 0.95).toFixed(1)}px,0)`;
      }
      if (moonAirRef.current) {
        moonAirRef.current.style.visibility = moonOn ? "" : "hidden";
        moonAirRef.current.style.opacity = (mt * 0.9).toFixed(3);
      }
      if (earthRef.current) {
        earthRef.current.style.visibility = moonOn ? "" : "hidden";
        earthRef.current.style.opacity = range(s, T.moon - 0.05, T.moon + 0.4).toFixed(3);
        earthRef.current.style.transform = `translate3d(0,${((1 - mt) * vh * 0.4).toFixed(1)}px,0) scale(${(1.15 - 0.15 * mt).toFixed(4)})`;
      }

      /* ── 5. the shuttle ── */
      let scene = "climb";
      const boosters = range(s, T.boost - 0.05, T.boost + 0.95);
      const tank = range(s, T.tank - 0.05, T.tank + 0.95);
      const descent0 = T.moon + 0.05;
      if (plumeRef.current) plumeRef.current.style.width = boosters > 0.05 ? "30%" : "64%";
      if (s < INTRO) {
        scene = "launch";
        // one smooth, upward move from the hero picture to the climbing spot (no dip, no loop),
        // nose up the whole time, banking slightly into the sideways slide
        const t = inOut(range(s, 0.1, INTRO - 0.05));
        const dir = Math.sign(cx - G.O[0]) || 1;
        const bank = Math.sin(Math.PI * t);
        const grow = outCubic(range(s, 0.02, 0.5));
        const rumble = range(s, 0.03, 0.12) * (1 - range(s, 0.12, 0.22));
        setRocket(
          lerp(G.O[0], cx, t) + Math.sin(s * 700) * 2 * rumble,
          lerp(G.O[1], cy, outCubic(t)) + Math.cos(s * 900) * 1.5 * rumble,
          -90 + dir * 10 * bank,
          lerp(G.badgeH / H, 1, grow),
          0.25 + 0.75 * range(s, 0.06, 0.25),
          dir * 0.5 * bank,
          { boosters: 0, tank: 0 },
        );
      } else if (s < descent0) {
        // climbing: steer around the asteroid of the current gap (bank into the turn), steady while you read
        let x = cx;
        let head = -90;
        let roll = Math.sin(s * 1.7) * 0.25;
        let thrust = on < 0 ? 1 : 0.65;
        for (const gp of T.gaps) {
          const u = range(s, gp.mid - 0.45, gp.mid + 0.45);
          if (u > 0 && u < 1) {
            const b = Math.sin(Math.PI * u);
            x += gp.dir * G.swing * b;
            head += gp.dir * 16 * Math.cos(Math.PI * u);
            roll += gp.dir * 0.85 * b;
            thrust = 1;
          }
        }
        const sway = Math.sin(s * 2.4);
        setRocket(x + sway * (mobile ? 3 : 6), cy + Math.cos(s * 3.2) * 4, head + sway * 1.5, 1, thrust, roll, { boosters, tank });
      } else if (s < T.land1) {
        // realistic shuttle glide approach -> pre-flare (nose up) -> main rear gear touchdown -> nose settle
        scene = "land";
        const rawT = range(s, descent0, T.land1);
        const te = inOut(rawT);
        const ratio = G.s3?.orbiterRatio || 0.8;
        const landH = G.landLen / ratio;
        const sc = lerp(1, landH / H, te);
        const flare = Math.sin(range(rawT, 0.55, 0.95) * Math.PI);
        const y = lerp(cy - vh * 0.1, G.groundY - landH * LAND_Y, outCubic(rawT)) - flare * vh * 0.024;
        const baseTurn = lerp(-90, -192, inOut(range(rawT, 0, 0.55)));
        let head = rawT < 0.55 ? baseTurn : clamp(baseTurn + flare * 21 + range(rawT, 0.82, 1.0) * 12, -192, -170);
        if (rawT >= 0.85) head = lerp(-172, -180, inOut(range(rawT, 0.85, 1.0)));
        const landingThrust = Math.sin(range(rawT, 0.45, 0.96) * Math.PI);
        setRocket(lerp(cx + vw * 0.1, G.landX, te), y, head, sc, 0.5 * (1 - range(rawT, 0, 0.35)), lerp(0, 1.35, inOut(range(rawT, 0, 0.75))), {
          boosters: 1.2,
          tank: 1.2,
          tilt: 0.28 * te,
          gear: range(rawT, 0.45, 0.78),
          landingThrust: 0,
        });
      } else {
        scene = s < T.exit1 ? "door" : s < T.walk1 ? "walk" : s < T.flag1 ? "flag" : s < T.wave1 ? "wave" : "result";
        const ratio = G.s3?.orbiterRatio || 0.8;
        const landH = G.landLen / ratio;
        // crew hatch swings open first, then the 3D boarding steps unfold down to the Moon
        const door = outCubic(range(s, T.land1 + 0.02, T.exit0 + EXIT * 0.34));
        const steps = outCubic(range(s, T.exit0 + EXIT * 0.2, T.exit0 + EXIT * 0.56));
        setRocket(G.landX, G.groundY - landH * LAND_Y, -180, landH / H, 0, 1.35, { boosters: 1.2, tank: 1.2, tilt: 0.28, door, steps, gear: 1, landingThrust: 0 });
      }
      // stage separation callouts: what we drop, and why
      [T.boost, T.tank].forEach((sk, k) => {
        const el = stageRefs.current[k];
        if (!el) return;
        const inn = range(s, sk - 0.16, sk - 0.04);
        const out = range(s, sk + 0.3, sk + 0.42);
        const v = inn * (1 - out);
        el.style.visibility = v > 0.01 ? "" : "hidden";
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translate(-50%,0) translateY(${((1 - inn) * -24 + out * -30).toFixed(1)}px) scale(${(0.96 + 0.04 * inn).toFixed(4)})`;
      });
      // stage separation flash
      if (sepRef.current) {
        const f1 = range(s, T.boost - 0.04, T.boost + 0.18);
        const f2 = range(s, T.tank - 0.04, T.tank + 0.18);
        const fl = Math.max(f1 > 0 && f1 < 1 ? Math.sin(f1 * Math.PI) : 0, f2 > 0 && f2 < 1 ? Math.sin(f2 * Math.PI) : 0);
        sepRef.current.style.opacity = fl.toFixed(3);
        sepRef.current.style.transform = `translate3d(${(G.rx ?? cx).toFixed(1)}px,${((G.ry ?? cy) + H * 0.15).toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.6 + fl).toFixed(3)})`;
      }
      if (launchTrail.current) launchTrail.current.style.opacity = "0";
      const ct = climbTrail.current;
      if (ct) {
        const op = range(s, 0.2, 0.45) * (1 - range(s, T.moon - 0.1, descent0 + 0.2));
        ct.style.opacity = op.toFixed(3);
        if (op > 0) {
          const nx = G.rx ?? cx;
          const ny = (G.ry ?? cy) + (H / 2) * (G.rsc ?? 1) + H * 0.3;
          ct.setAttribute("x1", nx.toFixed(1));
          ct.setAttribute("x2", nx.toFixed(1));
          ct.setAttribute("y1", ny.toFixed(1));
          ct.setAttribute("y2", String(vh + 20));
          ct.style.strokeDashoffset = String(-s * vh * 0.9);
        }
      }

      /* ── 6. asteroids: one labelled "problem" rock per gap (passes on the side the shuttle steers away
               from) + medium rocks near the path + drifting fields on both edges ── */
      const rocks = [];
      let avoided = 0;
      T.gaps.forEach((gp, i) => {
        const y = cy + (s - gp.mid) * vh * 1.7;
        const size = mobile ? 86 : clamp(vw * 0.085, 90, 140);
        const x = cx - gp.dir * (mobile ? vw * 0.14 : clamp(vw * 0.07, 70, 120));
        const vis = y > -size && y < vh + size && s < T.moon && alt > 0.55;
        if (vis) rocks.push({ x, y, size, z: 0, rx: gp.g * 1.3 + s * 0.6, ry: gp.g * 0.7 + s * 0.4, spin: 0.25, prio: 0 });
        // two medium rocks around the path
        [-1, 1].forEach((k) => {
          const y2 = cy + (s - gp.mid - k * 0.18) * vh * 1.5;
          const x2 = cx + k * gp.dir * (mobile ? vw * 0.36 : clamp(vw * 0.3, 260, 440));
          if (y2 > -60 && y2 < vh + 60 && s < T.moon && alt > 0.55) rocks.push({ x: x2, y: y2, size: mobile ? 34 : 54, z: -2, rx: s * 0.8 + k, ry: s * 0.5 + i, spin: 0.35, prio: 1 });
        });
        if (s >= gp.mid) avoided = i + 1;
        const tag = tagRefs.current[i];
        if (tag) {
          tag.style.visibility = vis ? "" : "hidden";
          if (vis) {
            // beside the rock on the outer side, but always fully on screen
            const tw = (G.tagW && G.tagW[i]) || 160;
            let tx = gp.dir > 0 ? x - size * 0.55 - tw : x + size * 0.55;
            tx = clamp(tx, 10, vw - tw - 10);
            tag.style.transform = `translate3d(${tx.toFixed(1)}px,${(y - size * 0.62).toFixed(1)}px,0)`;
            tag.classList.toggle("is-avoided", s >= gp.mid + 0.02);
          }
        }
      });
      const band = mobile ? 0.08 : 0.16;
      FIELD.forEach((fr) => {
        const y = vh * 0.5 + (s - fr.s) * vh * fr.v;
        if (y < -fr.size || y > vh + fr.size || s > T.moon + 0.3 || alt < 0.6) return;
        const x = fr.side < 0 ? vw * (0.01 + fr.edge * band) : vw * (0.99 - fr.edge * band);
        rocks.push({ x, y, size: mobile ? fr.size * 0.6 : fr.size, z: fr.z, rx: fr.rx + s * 0.3, ry: fr.ry, spin: fr.spin, prio: 2 });
      });
      rocks.sort((a, b) => a.prio - b.prio);

      // the orbiter's shadow on the ground: appears and sharpens as it comes down
      if (landShadowRef.current) {
        const sh = range(s, T.land1 - DESCENT * 0.47, T.land1);
        landShadowRef.current.style.opacity = (sh * 0.75).toFixed(3);
        landShadowRef.current.style.transform = `translate3d(${(G.landX + G.landLen * 0.04).toFixed(1)}px,${(G.groundY + G.landLen * 0.03).toFixed(1)}px,0) translate(-50%,-50%) scale(${(G.landLen / 100) * (1.3 - 0.3 * sh)},${(G.landLen / 100) * 0.16 * (1.3 - 0.3 * sh)})`;
      }
      // touchdown dust + expanding ground-effect shockwave ring
      const landBurst = range(s, T.land1 - 0.08, T.land1 + 0.32);
      if (dustRef.current) {
        dustRef.current.style.opacity = (landBurst > 0 && landBurst < 1 ? Math.sin(landBurst * Math.PI) * 0.35 : 0).toFixed(3);
        dustRef.current.style.transform = `translate3d(${G.landX.toFixed(1)}px,${G.groundY.toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.6 + landBurst * 3.8).toFixed(3)},${(0.45 + landBurst * 1.4).toFixed(3)})`;
      }
      if (landRingRef.current) {
        const ringT = range(s, T.land1 - 0.07, T.land1 + 0.26);
        landRingRef.current.style.opacity = (ringT > 0 && ringT < 1 ? (1 - ringT) * 0.75 : 0).toFixed(3);
        landRingRef.current.style.transform = `translate3d(${G.landX.toFixed(1)}px,${G.groundY.toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.35 + ringT * 3.6).toFixed(3)},${(0.16 + ringT * 1.1).toFixed(3)})`;
      }

      /* ── 7. astronaut: appears at the open door, walks down the animated steps, moonwalks, plants flag, waves ── */
      let astro = null;
      const stepOut = T.exit0 + EXIT * 0.6; // appears right as the door and 3D steps finish opening
      const hatchX = G.landX - G.landLen * 0.24;
      // where the 3D stair descent really ends on screen (falls back to an estimate without WebGL)
      const sf = G.s3?.stepFoot;
      const footAtBottomX = sf?.ok ? sf.x : hatchX + G.landLen * 0.065;
      const footAtBottomY = sf?.ok ? sf.y : G.groundY;
      if (s >= stepOut) {
        const h0 = G.landLen * 0.135;
        let x;
        let y;
        let h;
        let yaw;
        let action = "idle";
        let scrub = null;
        if (s < T.exit1) {
          const t = range(s, stepOut, T.exit1);
          const te = inOut(t);
          x = lerp(hatchX, footAtBottomX, te);
          y = lerp(G.groundY - h0 * 0.56, footAtBottomY, te);
          h = h0 * lerp(0.66, 1, outCubic(t));
          yaw = 0.85;
          action = "step_down";
          scrub = t;
        } else if (s < T.walk1) {
          const t = range(s, T.exit1, T.walk1);
          const te = inOut(t);
          x = lerp(footAtBottomX, G.standX, te);
          y = lerp(footAtBottomY, G.footY, te);
          h = lerp(h0, G.astroH, Math.pow(te, 1.4));
          yaw = 0.75;
          action = "moon_walk";
          scrub = t * WALK_CLIP * 3;
        } else {
          x = G.standX;
          y = G.footY;
          h = G.astroH;
          const turn = inOut(range(s, T.walk1, T.walk1 + FLAG * 0.36));
          yaw = s < T.flag1 ? lerp(0.75, 0.95, turn) : lerp(0.95, 0.1, inOut(range(s, T.flag1, T.wave1)));
          action = s < T.flag1 ? "idle" : "wave";
        }
        // z > 0 = in front of the landed orbiter (same screen size: the 3D layer compensates for depth)
        astro = { x, y, height: h, yaw, action, scrub, z: 4, visible: true };
        if (shadowRef.current) {
          shadowRef.current.style.opacity = "0.55";
          shadowRef.current.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(h / 60).toFixed(4)})`;
        }
        // 2D fallback astronaut (no WebGL)
        if (astroRef.current) {
          const k = h / G.astroH;
          astroRef.current.style.opacity = "1";
          astroRef.current.style.transform = `translate3d(${(x - (G.astroH * ASTRO_RATIO) / 2).toFixed(1)}px,${(y - G.astroH).toFixed(1)}px,0) scale(${k.toFixed(4)})`;
        }
      } else {
        if (shadowRef.current) shadowRef.current.style.opacity = "0";
        if (astroRef.current) astroRef.current.style.opacity = "0";
      }

      /* ── 8. flag: pole is pushed into the ground, the flag unfurls along its crossbar ── */
      const flag = flagRef.current;
      if (flag) {
        const fw = (G.flagH * 120) / 170;
        const pole = outCubic(range(s, T.walk1 + FLAG * 0.14, T.walk1 + FLAG * 0.55));
        const cloth = outCubic(range(s, T.walk1 + FLAG * 0.4, T.flag1));
        flag.style.opacity = pole > 0 ? "1" : "0";
        flag.style.transform = `translate3d(${(G.flagX - fw * 0.03).toFixed(1)}px,${(G.footY - G.flagH).toFixed(1)}px,0)`;
        if (poleRef.current) poleRef.current.style.transform = `translateY(${(-(1 - pole) * 40).toFixed(2)}px)`;
        if (clothRef.current) clothRef.current.style.transform = `translateY(${(-(1 - pole) * 40).toFixed(2)}px) scaleX(${cloth.toFixed(4)})`;
      }

      // small dust puff when astronaut steps off the bottom of the stairs onto the Moon
      if (stepDustRef.current) {
        const sd = range(s, T.exit1 - 0.03, T.exit1 + 0.18);
        stepDustRef.current.style.opacity = (sd > 0 && sd < 1 ? (1 - sd) * 0.75 : 0).toFixed(3);
        stepDustRef.current.style.transform = `translate3d(${footAtBottomX.toFixed(1)}px,${footAtBottomY.toFixed(1)}px,0) translate(-50%,-50%) scale(${(0.5 + sd * 2.2).toFixed(3)},${(0.4 + sd * 1.0).toFixed(3)})`;
      }

      // Moon air: horizon glow, drifting dust + motes, and the landing dust (skirt → billow → hangs → settles)
      atmo?.update({
        on: moonOn ? mt : 0,
        rise: (1 - mt) * vh * 0.95,
        landX: G.landX,
        groundY: G.groundY,
        landLen: G.landLen,
        pre: s < T.land1 + 0.05 ? Math.pow(range(s, T.land1 - DESCENT * 0.37, T.land1 - 0.03), 1.5) * (1 - range(s, T.land1 - 0.03, T.land1 + 0.04)) : 0,
        burst: range(s, T.land1 - 0.05, T.land1 + 0.24),
        linger: range(s, T.land1 + 0.18, T.exit0 + EXIT * 0.58),
      });

      // hand the 3D layer its state (including landing dust burst + ambient moon air quality)
      G.s3?.setState({
        rocket: rocket3,
        rocks: rocks.slice(0, ROCK_POOL),
        astro,
        landing: { x: G.landX, y: G.groundY, scale: G.landLen, burst: landBurst },
        moonAir: { opacity: moonOn ? mt : 0, groundY: G.groundY },
      });

      /* ── 9. HUD, intro title, fade into the page ── */
      if (introRef.current) {
        const inn = range(s, 0.92, 1.08);
        const out = range(s, INTRO - 0.25, INTRO - 0.08);
        const io = inn * (1 - out);
        introRef.current.style.opacity = io.toFixed(3);
        introRef.current.style.visibility = io > 0.01 ? "" : "hidden";
        introRef.current.style.transform = `translate(-50%,0) translateY(${((1 - inn) * 30 - out * 60).toFixed(1)}px) scale(${(0.94 + 0.06 * inn - 0.04 * out).toFixed(4)})`;
      }
      if (chromeRef.current) chromeRef.current.style.opacity = String(range(s, 0.95, 1.2) * (1 - range(s, T.moon - 0.1, T.moon + 0.4)));
      if (barRef.current) barRef.current.style.transform = `scaleX(${range(s, INTRO * 0.6, T.flag1).toFixed(4)})`;
      if (fadeRef.current) fadeRef.current.style.opacity = String(inOut(range(s, T.total - 0.55, T.total - 0.12)));

      const navDark = s > 0.35 && s < T.total - 0.28;
      if ((document.documentElement.dataset.navDarkOverride === "1") !== navDark) {
        if (navDark) document.documentElement.dataset.navDarkOverride = "1";
        else delete document.documentElement.dataset.navDarkOverride;
        window.dispatchEvent(new Event("clicktots:navsurface"));
      }

      pushView({ on, next: Math.min(next, count - 1), scene, avoided });
    };

    /* smoothing loop: ease the drawn progress towards the scroll target (frame-rate independent) */
    const tick = (now) => {
      const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 1 / 60);
      lastT = now;
      cur += (target - cur) * (1 - Math.exp(-EASE_RATE * dt));
      if (Math.abs(target - cur) < 0.4) cur = target;
      render(cur);
      raf = cur !== target ? requestAnimationFrame(tick) : 0;
      if (!raf) lastT = 0;
    };
    const onScroll = () => {
      target = scrollProgress();
      if (Math.abs(target - cur) > (G.vh || 800) * 3) cur = target;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const relayout = () => {
      layout();
      target = cur = scrollProgress();
      render(cur);
    };

    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const idleId = idle(() => root.querySelectorAll("img").forEach((img) => img.decode?.().catch(() => {})));

    layout();
    deactivate();
    target = cur = scrollProgress();
    render(cur);
    const t1 = setTimeout(relayout, 500);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", relayout);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(relayout) : null;
    ro?.observe(st);
    if (hero) ro?.observe(hero);
    return () => {
      disposed = true;
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", relayout);
      ro?.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(idle3d);
      (window.cancelIdleCallback || clearTimeout)(idleId);
      deactivate();
      if (document.documentElement.dataset.navDarkOverride) {
        delete document.documentElement.dataset.navDarkOverride;
        window.dispatchEvent(new Event("clicktots:navsurface"));
      }
      G.s3?.dispose();
      atmo?.dispose();
    };
  }, [reduced, count, T, BACK_CLOUDS, FRONT_CLOUDS, FIELD, service.slug, service.color]);

  /** scroll so step i (or a later scene) is on screen */
  const goTo = useCallback((s) => {
    const root = rootRef.current;
    if (!root) return;
    const scroller = findScroller(root);
    const vh = stRef.current?.offsetHeight || window.innerHeight;
    const top = scroller === window ? 0 : scroller.getBoundingClientRect().top;
    const current = scroller === window ? window.scrollY : scroller.scrollTop;
    const y = current + root.getBoundingClientRect().top - top + s * vh;
    if (scroller.__lenis) scroller.__lenis.scrollTo(y, { duration: 1.6 });
    else scroller.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const openExpertForm = () => window.dispatchEvent(new Event("clicktots:talk"));
  const scrollPast = () => goTo(T.total + 0.6);

  /* ── reduced motion: the steps as a simple list ── */
  if (reduced) {
    return (
      <section className="rk rk-static" style={{ "--c": service.color }} data-text-fade="off" aria-labelledby={`rk-title-${service.slug}`}>
        <header className="rk-static-head">
          <p className="rk-eyebrow">{story.eyebrow}</p>
          <h2 id={`rk-title-${service.slug}`} className="rk-title">
            {story.title}
          </h2>
        </header>
        <ol className="rk-static-list">
          {flow.map((step, i) => (
            <li key={step.title}>
              <StepCard step={step} s={story.steps[i]} i={i} total={count} />
              <TeamPhoto service={service} s={story.steps[i]} holo={story.holo} alt={`${step.title} – ${service.name}`} />
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const layer = { gridArea: "1 / 1", alignSelf: "start", position: "sticky", top: 0, height: "100svh", width: "100%", overflow: "hidden", visibility: "hidden" };
  const showN = view.on >= 0 ? view.on + 1 : view.next + 1;
  const done = view.scene === "result";

  return (
    <section
      ref={rootRef}
      className={`rk scene-${view.scene} ${has3d ? "has-3d" : ""} ${no3d ? "no-3d" : ""}`}
      data-text-fade="off"
      style={{ "--c": service.color, height: `calc(${100 + T.total * 100}svh)`, marginTop: "-100svh", marginBottom: 0 }}
      aria-labelledby={`rk-title-${service.slug}`}
    >
      {/* ═══ BACKDROP (under the pinned hero): space, dusk, sky, ground, clouds, Earth + moonscape ═══ */}
      <div ref={bdRef} className="rk-backdrop" style={{ ...layer, zIndex: 0 }} aria-hidden="true">
        <style>{SPACE_CSS}</style>
        <div ref={bgRef} className="rk-milkyway" />
        <div className="rk-nebula" />
        {/* star layers: two copies stacked (an endless loop) that stream down while the shuttle climbs */}
        <div className="rk-fill rk-starfield">
          <div ref={farRef} className="rk-starloop">
            <Stars stars={FAR_STARS} style={{ display: "block", height: "50%", animation: "ct-twinkle 7s ease-in-out infinite" }} />
            <Stars stars={FAR_STARS} style={{ display: "block", height: "50%", animation: "ct-twinkle 7s ease-in-out infinite" }} />
          </div>
        </div>
        <div className="rk-fill rk-starfield">
          <div ref={nearRef} className="rk-starloop">
            <Stars stars={NEAR_STARS} style={{ display: "block", height: "50%", animation: "ct-twinkle 4.5s ease-in-out infinite" }} />
            <Stars stars={NEAR_STARS} style={{ display: "block", height: "50%", animation: "ct-twinkle 4.5s ease-in-out infinite" }} />
          </div>
        </div>
        {STREAKS.slice(0, 4).map((m, i) => (
          <div key={`s${i}`} className="ct-fly" style={{ "--d": `${m.d}s`, "--delay": `${m.delay}s`, left: `${m.x0}vw`, top: `${m.y0}vh`, opacity: 1 }}>
            <i className="ct-streak" style={{ "--w": `${m.w}px` }} />
          </div>
        ))}
        <img ref={earthRef} className="rk-earth" src="/layers/d/earth.webp" alt="" decoding="async" style={{ visibility: "hidden" }} />
        <div ref={duskRef} className="rk-dusk" />
        <div ref={skyRef} className="rk-sky" />
        <div ref={groundRef} className="rk-ground">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path d="M0 210 C180 150 320 190 470 160 C640 125 760 185 930 150 C1100 115 1260 170 1440 140 L1440 320 L0 320Z" fill="#b9cfdf" />
            <path d="M0 250 C220 205 380 240 560 215 C760 188 900 238 1080 212 C1240 190 1340 220 1440 205 L1440 320 L0 320Z" fill="#9fbbd0" />
            <path d="M0 290 C260 262 520 280 760 268 C1000 256 1240 276 1440 262 L1440 320 L0 320Z" fill="#86a7bf" />
          </svg>
        </div>
        {BACK_CLOUDS.map((c, i) => (
          <i key={i} ref={(n) => (backCloudRefs.current[i] = n)} className="rk-cloud" style={{ left: `${c.x}%`, width: c.w, marginLeft: -c.w / 2, opacity: c.o, visibility: "hidden" }} />
        ))}
        <img ref={moonscapeRef} className="rk-moonscape" src="/layers/d/moonscape.webp" alt="" decoding="async" style={{ visibility: "hidden" }} />
        <div ref={moonAirRef} className="rk-moon-air" style={{ visibility: "hidden", opacity: 0 }} />
        <canvas ref={atmoBackRef} className="rk-atmo rk-atmo-back" />
      </div>

      {/* ═══ STAGE (over the hero) ═══ */}
      <div ref={stRef} className="rk-stage" style={{ ...layer, zIndex: 2 }}>
        <div ref={introRef} className="rk-intro" style={{ opacity: 0 }}>
          <p className="rk-eyebrow">
            {story.eyebrow}
          </p>
          <h2 id={`rk-title-${service.slug}`} className="rk-title">
            {story.title}
          </h2>
          <p className="rk-hint">Keep scrolling – climb through {count} stages with our team</p>
        </div>

        <svg ref={svgRef} className="rk-trail" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id={`rk-mask-${service.slug}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
              <rect x="-50%" y="-50%" width="200%" height="200%" fill="#000" />
              <path ref={launchMask} fill="none" stroke="#fff" strokeWidth="16" />
            </mask>
          </defs>
          <path ref={launchTrail} fill="none" stroke="var(--c)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0.1 14" mask={`url(#rk-mask-${service.slug})`} style={{ opacity: 0 }} />
          <line ref={climbTrail} stroke="var(--c)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0.1 16" style={{ opacity: 0 }} />
        </svg>

        {/* Moon surface: touchdown dust, shockwave ring, step-down dust, astronaut shadow, flag */}
        <span ref={landShadowRef} className="rk-land-shadow" aria-hidden="true" />
        <span ref={dustRef} className="rk-dust" aria-hidden="true" />
        <span ref={landRingRef} className="rk-land-ring" aria-hidden="true" />
        <span ref={stepDustRef} className="rk-step-dust" aria-hidden="true" />
        <span ref={shadowRef} className="rk-astro-shadow" aria-hidden="true" />
        <div ref={flagRef} className="rk-flag" style={{ opacity: 0 }} aria-hidden="true">
          <Flag service={service} poleRef={poleRef} clothRef={clothRef} />
        </div>

        {/* plume + SVG fallback rocket (the 3D shuttle is drawn on the canvas at the same spot) */}
        <div ref={rocketRef} className="rk-rocket" aria-hidden="true">
          <span ref={plumeRef} className="rk-plume">
            <i />
          </span>
          <div ref={rocket2dRef} className="rk-rocket-3d">
            <RocketSVG specRef={specRef} />
          </div>
        </div>
        <span ref={sepRef} className="rk-sep" aria-hidden="true" />
        {story.stages.slice(0, 2).map((st, k) => (
          <div key={st.title} ref={(n) => (stageRefs.current[k] = n)} className="rk-stagecall" style={{ visibility: "hidden" }} aria-hidden="true">
            <p className="rk-stagecall-k">
              Stage {k + 1} separation · after step {k === 0 ? 2 : 4}
            </p>
            <p className="rk-stagecall-t">{st.title}</p>
            <p className="rk-stagecall-p">{st.text}</p>
          </div>
        ))}

        {/* 3D layer: shuttle, asteroids, astronaut */}
        <canvas ref={canvasRef} className="rk-canvas" aria-hidden="true" />
        {/* Moon air in front of the orbiter's wheels: touchdown dust billow + low ground haze */}
        <canvas ref={atmoFrontRef} className="rk-atmo rk-atmo-front" aria-hidden="true" />
        <img ref={astroRef} className="rk-astro" src="/services/scene/astronaut.webp" alt="" draggable={false} style={{ opacity: 0 }} aria-hidden="true" />

        {/* the steps: card on the left, the team at work on the right, the shuttle climbs between */}
        {flow.map((step, i) => (
          <div key={step.title} ref={(n) => (sceneRefs.current[i] = n)} className="rk-scene" style={{ visibility: "hidden" }} aria-hidden={i !== view.on}>
            <StepCard step={step} s={story.steps[i]} i={i} total={count} />
            <TeamPhoto service={service} s={story.steps[i]} holo={story.holo} alt={`${step.title} – ${service.name}`} />
          </div>
        ))}

        {/* asteroid labels: the business problem each next step prevents */}
        {T.gaps.map((gp, i) => (
          <p key={gp.g} ref={(n) => (tagRefs.current[i] = n)} className="rk-tag" style={{ visibility: "hidden" }} aria-hidden="true">
            <span className="rk-tag-warn">
              <TriangleAlert size={13} strokeWidth={2.4} />
            </span>
            <span className="rk-tag-ok">
              <Check size={13} strokeWidth={3} />
            </span>
            <span className="rk-tag-k">
              <span className="rk-tag-a">Risk</span>
              <span className="rk-tag-b">Avoided</span>
            </span>
            {story.steps[gp.g]?.avoid}
          </p>
        ))}

        {/* clouds rushing past in front (sky only) */}
        {FRONT_CLOUDS.map((c, i) => (
          <i key={i} ref={(n) => (frontCloudRefs.current[i] = n)} className="rk-cloud is-front" style={{ left: `${c.x}%`, width: c.w, visibility: "hidden" }} aria-hidden="true" />
        ))}

        {/* the result, once the flag is up */}
        <div className={`rk-result ${done ? "is-on" : ""}`} aria-hidden={!done}>
          <p className="rk-eyebrow">
            Mission accomplished · {service.name}
          </p>
          <h2 className="rk-result-h">{story.finale.title}</h2>
          <p className="rk-result-p">{story.finale.text}</p>
          <p className="rk-result-label">What you have at the end</p>
          <ol className="rk-result-list">
            {flow.map((st, i) => (
              <li key={st.title}>
                <span className="rk-result-n">{pad(i + 1)}</span>
                <span>{st.gives}</span>
              </li>
            ))}
          </ol>
          <div className="rk-result-actions">
            <button type="button" className="rk-result-cta" onClick={openExpertForm} tabIndex={done ? 0 : -1}>
              Start your mission <ArrowUpRight size={16} />
            </button>
            <button type="button" className="rk-result-more" onClick={scrollPast} tabIndex={done ? 0 : -1}>
              See what's included ↓
            </button>
          </div>
        </div>

        {/* HUD: mission + stage count, risks avoided, progress bar, stage rail */}
        <div ref={chromeRef} className="rk-chrome" style={{ opacity: 0 }}>
          <div className="rk-hud" aria-hidden="true">
            Mission · {service.name}
            <b>
              {pad(showN)} <i>/ {pad(count)}</i>
            </b>
            <span className="rk-hud-sep" />
            <span className="rk-hud-av">
              {view.avoided}/{T.gaps.length} risks avoided
            </span>
          </div>
          <div className="rk-bar" aria-hidden="true">
            <i ref={barRef} />
          </div>
          <nav className="rk-rail" aria-label={`${service.name} process steps`}>
            {[...flow].reverse().map((step, ri) => {
              const i = count - 1 - ri;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => goTo(T.center[i])}
                  className={i === view.on ? "is-on" : i < view.next || (view.on >= 0 && i < view.on) ? "is-done" : ""}
                  aria-label={`Step ${i + 1}: ${step.title}`}
                  aria-current={i === view.on ? "step" : undefined}
                >
                  <span className="rk-rail-label">{story.steps[i]?.short}</span>
                  <i />
                </button>
              );
            })}
          </nav>
        </div>

        <div ref={fadeRef} className="rk-fade" aria-hidden="true" />
      </div>
    </section>
  );
}

/** one stage: number + time, mission, title, story, how the team builds it, AI assist, what you get */
const StepCard = memo(function StepCard({ step, s, i, total }) {
  const Icon = s?.icon;
  return (
    <article className="rk-card">
      <p className="rk-num">
        <span className="rk-num-n">{pad(i + 1)}</span>
        <span className="rk-num-of">/ {pad(total)}</span>
        <span className="rk-num-time">{step.time}</span>
      </p>
      {s && (
        <p className="rk-mission">
          {Icon && <Icon size={14} strokeWidth={2.2} />} {s.mission}
        </p>
      )}
      <h3 className="rk-h">{step.title}</h3>
      {s?.story && <p className="rk-story">{s.story}</p>}
      {s?.how && (
        <div className="rk-how">
          <p className="rk-how-t">How our team builds it</p>
          <ul>
            {s.how.map((h) => (
              <li key={h}>
                <Check size={11} strokeWidth={3} /> {h}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s?.ai && (
        <p className="rk-ai">
          <span className="rk-ai-tag">
            <Sparkles size={12} strokeWidth={2.4} /> AI assist
          </span>
          {s.ai}
        </p>
      )}
      <p className="rk-gives">
        <span className="rk-tick">
          <Check size={11} strokeWidth={3} />
        </span>
        <span>
          <b>You get:</b> {step.gives}
        </span>
      </p>
    </article>
  );
});

/** the team at work: a photo of the step (people + laptop), hologram tiles floating over it, the team below */
const TeamPhoto = memo(function TeamPhoto({ service, s, holo, alt }) {
  const Icon = s?.icon;
  return (
    <div className="lp" style={{ "--c": service.color }}>
      <figure className="lp-photo">
        <img src={s?.image} alt={alt} decoding="async" draggable={false} />
      </figure>
      <div className="lp-holo" aria-hidden="true">
        <span className="lp-beam" />
        {holo.slice(0, 3).map((H, k) => (
          <span key={k} className="lp-chip" style={{ "--k": k }}>
            <H size={18} strokeWidth={1.8} />
          </span>
        ))}
        <span className="lp-panel">
          {Icon && <Icon size={20} strokeWidth={1.8} />}
          <b>{s?.short}</b>
        </span>
      </div>
      {s?.team && (
        <p className="lp-team">
          <Users size={13} strokeWidth={2} />
          {s.team.map((r) => (
            <span key={r} className="lp-person">
              <i>{initials(r)}</i>
              {r}
            </span>
          ))}
        </p>
      )}
    </div>
  );
});

/** The service name on the flag: the coloured pill is sized to the text (measured after the font loads),
    and long names shrink so the pill always stays on the cloth. */
const BADGE = { cx: 59, cy: 56.5, h: 9, padX: 4.5, maxW: 96, font: 5.2 };
const FlagBadge = memo(function FlagBadge({ label, color }) {
  const textRef = useRef(null);
  const [fit, setFit] = useState({ w: 58, font: BADGE.font });
  useEffect(() => {
    let alive = true;
    const measure = () => {
      const t = textRef.current;
      if (!alive || !t || !t.getComputedTextLength) return;
      t.setAttribute("font-size", String(BADGE.font));
      const len = t.getComputedTextLength();
      if (!len) return;
      const room = BADGE.maxW - BADGE.padX * 2;
      const spacing = 0.9 * label.length; // letter-spacing does not scale with the font size
      const font = len > room ? (BADGE.font * Math.max(1, room - spacing)) / Math.max(1, len - spacing) : BADGE.font;
      const textW = Math.min(len, room) - 0.9; // drop the trailing letter-space so the text sits centred
      setFit({ w: textW + BADGE.padX * 2, font });
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => {
      alive = false;
    };
  }, [label]);
  return (
    <g>
      <rect x={BADGE.cx - fit.w / 2} y={BADGE.cy - BADGE.h / 2} width={fit.w} height={BADGE.h} rx={BADGE.h / 2} fill={color} />
      <text
        ref={textRef}
        x={BADGE.cx + 0.45}
        y={BADGE.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fit.font}
        letterSpacing="0.9"
        fill="#0b1a12"
        fontFamily="inherit"
        fontWeight="700"
      >
        {label}
      </text>
    </g>
  );
});

/** Apollo-style flag: metal pole + top crossbar, a rippled white flag with the Clicktots logo */
const Flag = memo(function Flag({ service, poleRef, clothRef }) {
  return (
    <svg viewBox="0 0 120 170" className="rk-flag-svg" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`fp-${service.slug}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6d747c" />
          <stop offset="0.5" stopColor="#f2f4f6" />
          <stop offset="1" stopColor="#80878f" />
        </linearGradient>
        <linearGradient id={`fc-${service.slug}`} x1="0" x2="1">
          <stop offset="0" stopColor="#e9ecef" />
          <stop offset="0.12" stopColor="#ffffff" />
          <stop offset="0.24" stopColor="#d9dde2" />
          <stop offset="0.38" stopColor="#ffffff" />
          <stop offset="0.52" stopColor="#dde1e5" />
          <stop offset="0.68" stopColor="#ffffff" />
          <stop offset="0.82" stopColor="#d6dade" />
          <stop offset="1" stopColor="#f4f6f8" />
        </linearGradient>
      </defs>
      <g ref={poleRef}>
        <rect x="3" y="2" width="3.2" height="168" rx="1.2" fill={`url(#fp-${service.slug})`} />
        <circle cx="4.6" cy="2.4" r="2.6" fill="#e9ecef" />
      </g>
      <g ref={clothRef} className="rk-flag-cloth">
        <rect x="5" y="6.5" width="108" height="2.4" rx="1" fill={`url(#fp-${service.slug})`} />
        <path
          d="M6 9 L112 9 L112 70 C101 73 92 67 81 71 C69 75 58 68 46 72 C35 75.5 25 69 15 72.5 C11 73.6 8 72.5 6 72 Z"
          fill={`url(#fc-${service.slug})`}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="0.5"
        />
        <image href="/assets/clicktots-logo.webp" x="18" y="20" width="82" height="26" preserveAspectRatio="xMidYMid meet" />
        <FlagBadge label={service.name.toUpperCase()} color={service.color} />
      </g>
    </svg>
  );
});