// Purpose: "Our Branches" section — from Chennai to India, then to the world. The Earth from the rocket
// flight zooms into the blue dot-matrix map framed on India + Dubai, an orange signal connects the 6 India &
// Gulf hubs, the camera pulls back to the whole world map and the network reaches Singapore, the UK and the
// USA; a ripple then opens into Awards.
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";
import { clamp, range, lerp, easeOutCubic } from "@/lib/math";
import { SPACE_CSS, STREAKS, FAR_STARS, NEAR_STARS, Stars, MOON_BG, MOON_PLACEHOLDER, flightGeometry } from "@/pages/Awards/RocketJourney";
import { useNear } from "@/hooks/useNear";
import { INDIA_HUBS, GLOBAL_HOPS, HUB_BY_ID, VIEW, WORLD, FRAME_INDIA, FRAME_INDIA_PHONE, REGION, worldXY } from "./branchesData";

/* the map geometry (~270 KB of SVG paths) is its own chunk, fetched while the browser is idle after load,
   so it never weighs on the first paint / PageSpeed (this section is far down the page) */
const loadShapes = () => import("./worldShapes.generated");

/* ------------------------------------------------------------------ *
 *  OUR BRANCHES  (between the Testimonials rocket flight and Awards)
 *
 *  Starts on exactly the last frame of the rocket flight (same stars, Earth and rocket on Chennai),
 *  pinned, then driven by scroll progress p:
 *
 *   CHAPTER 1 · INDIA NETWORK
 *    0.03 – 0.21  the camera dives into the Earth towards India
 *    0.14 – 0.28  the Earth cross-fades into the blue dot-matrix map, framed on India + Dubai (FRAME_INDIA)
 *    0.21 – 0.30  the rocket becomes the Chennai marker; title + hub list arrive on the left
 *    0.31 – 0.62  the signal runs Chennai → Hyderabad → Bangalore → Mumbai → Dubai → Delhi
 *
 *   CHAPTER 2 · GOING GLOBAL
 *    0.645– 0.735 the camera pulls back from the India close-up to the whole world map (one map, locked on
 *                 Chennai), the heading turns to "Now 9 hubs on 3 continents."
 *    0.745– 0.925 the network grows outward, one country at a time (Singapore, United Kingdom, United States):
 *                 no signal lines here (India already showed them) – each country is NOTIFIED instead: its marker
 *                 and label pin pop up above it, a ripple rings out and the country lights up blue
 *
 *    0.958– 0.995 a ripple opens from the last hub and fills the screen with the Awards paper colour
 *
 *  Hubs, hops and the world framing live in ./branchesData.js. The world map image is generated:
 *  `npm run build:world-map` → worldShapes.generated.js (vector land, borders, graticule + glowing countries).
 *  The world map is drawn as a holographic dot-matrix in SVG, so it stays sharp at every zoom.
 *  Everything is written straight to the DOM from the shared onFrame loop (no React state).
 *  Reduced motion: a normal static section showing the finished world network.
 * ------------------------------------------------------------------ */

const SCROLL_VH = 620; // scroll length of this section, in screens
const BG = "#04070d";
const PAPER = "#E9E6DF"; // = Awards background
const INK = "#121110";
const MONO = "Michroma,Eurostile,'Arial Black',sans-serif";
const DISPLAY = "Michroma,Eurostile,'Arial Black',sans-serif";
const SIGNAL_COLOR = "#ffa45c";

/* narrow screens (< 900px): a taller crop of the hub band (western USA → just past Singapore, top of Canada →
   southern Africa / Australia), so the map fills the space under the list without the empty Pacific edges */
const VIEW_FULL = (() => {
  const lon0 = -90, lon1 = 114, lat0 = 76, lat1 = -56;
  return { x: (lon0 - WORLD.lon0) * WORLD.k, y: (WORLD.lat0 - lat0) * WORLD.k, w: (lon1 - lon0) * WORLD.k, h: (lat0 - lat1) * WORLD.k };
})();
const viewBoxOf = (v) => `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`;
/* narrow screens: the list in the middle swaps from the India cities to the countries we serve */
const WORLD_LIST = [
  { name: "India", note: "Head office", hub: "chennai" },
  { name: "Dubai", note: "UAE", hub: "dubai" },
  { name: "Singapore", note: "Asia-Pacific", hub: "singapore" },
  { name: "UK", note: "Europe", hub: "uk" },
  { name: "USA", note: "Americas", hub: "usa" },
];

/* the India close-up box on screen (right side on wide screens, along the bottom on narrow ones) */
const VB_W = 950;
const VB_H = 710;

/* two coastline points (Okha, Gujarat and the Hooghly mouth): used to match the size of India when the
   globe hands over to the dotted map */
const SIZE_REF = { a: { lon: 69.07, lat: 22.47 }, b: { lon: 88.05, lat: 21.65 } };
/* the India hubs in world-map units, and the orange signal arcs between them */
const INDIA_PTS = INDIA_HUBS.map((h) => {
  const [x, y] = worldXY(h.lon, h.lat);
  return { x, y };
});

/* ---- timeline ---- */
/* the dive + hand-over to the India photo is stretched and overlapped (it used to fit in one wheel flick, so
   the Earth seemed to jump straight to a full-screen India map) */
const T_ZOOM = [0.02, 0.23];
const T_FLAT = [0.11, 0.25];
const T_FLAT_SETTLE = [0.14, 0.32];
const T_EARTH_OUT = [0.2, 0.29];
const T_UI = [0.22, 0.31];
const T_CHENNAI = [0.22, 0.28];
const T_LIST = [0.25, 0.32];
const INDIA_SIGNAL = [
  [0.31, 0.37], // Hyderabad
  [0.375, 0.435], // Bangalore
  [0.44, 0.5], // Mumbai
  [0.505, 0.565], // Dubai
  [0.57, 0.62], // Delhi
];
const T_GLOBAL = [0.645, 0.735]; // camera pull-back into the world map
const T_HEADING = [0.665, 0.715]; // "6 hubs" → "9 hubs on 3 continents"
const GLOBAL_SIGNAL = [
  [0.745, 0.8], // Singapore is notified
  [0.81, 0.865], // United Kingdom
  [0.875, 0.925], // United States (typed in fully before the exit ripple)
];
const T_RIPPLE = [0.958, 0.995];
const ZOOM_DEFAULT = 2.7; // globe magnification before the photo takes over (recomputed in layout)
const FLAT_START = 1.7; // the India close-up starts this much larger and settles to 1

/* the hub each step lights up, in story order (index 0 = Chennai, already lit when the rocket lands) */
const STEPS = [
  { hub: INDIA_HUBS[0], from: null, t: null },
  ...INDIA_HUBS.slice(1).map((hub, i) => ({ hub, from: INDIA_HUBS[0], t: INDIA_SIGNAL[i] })),
  ...GLOBAL_HOPS.map(([from, to], i) => ({ hub: HUB_BY_ID[to], from: HUB_BY_ID[from], t: GLOBAL_SIGNAL[i] })),
];
const isGlobalStep = (step) => GLOBAL_SIGNAL.includes(step.t);
/* India hubs light up as their signal line arrives; global hubs are notified: they pop up early in their window */
const arriveAt = (p, step) => {
  if (!step.t) return range(p, T_CHENNAI[0], T_CHENNAI[1]);
  const [a, b] = step.t;
  return isGlobalStep(step) ? range(p, a + (b - a) * 0.1, a + (b - a) * 0.55) : range(p, b - 0.02, b + 0.025);
};
/* the notification ripple around a global hub (0 → 1, rings out once) */
const burstAt = (p, step) => {
  const [a, b] = step.t;
  return range(p, a + (b - a) * 0.3, b + 0.015);
};

/* a curved "signal" between two points, bulging upward */
function makeArc(a, b, bulgeFor) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bulge = bulgeFor(len);
  const cx = mx + nx * len * bulge;
  const cy = my + ny * len * bulge;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}
const INDIA_ARCS = INDIA_PTS.slice(1).map((c) =>
  makeArc(INDIA_PTS[0], c, (len) => (len > 30 ? 0.12 : len > 12 ? 0.16 : 0.28))
);
/* the detailed close-up area in map units, pulled in a little: its coast outline is clipped to this, so the
   straight edge where the 1:50m land was cut never gets drawn as a fake coastline */
const REGION_CLIP = (() => {
  const [x0, y0] = worldXY(REGION.lon0, REGION.lat0);
  const [x1, y1] = worldXY(REGION.lon1, REGION.lat1);
  return { x: x0 + 0.6, y: y0 + 0.6, w: x1 - x0 - 1.2, h: y1 - y0 - 1.2 };
})();
const ARC_PX = 2.6; // signal line width on screen (px), whatever the zoom
const HEAD_PX = 4.6;
const WORLD_GLOW = "#5aa9ff"; // blue country glow + pins on the world map

const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const pad2 = (n) => String(n).padStart(2, "0");

const CSS = `
.bm-layer{position:absolute;inset:0;transform-origin:0 0;will-change:transform,opacity;pointer-events:none}
.bm-map{position:absolute;right:4vw;top:5vh;height:90vh;aspect-ratio:${VB_W} / ${VB_H}}
.bm-map svg{display:block;width:100%;height:100%;overflow:visible}
.bm-region-dots{fill:url(#bm-dots-fine)}
.bm-region-fill{fill:url(#bm-land-grad)}
.bm-region-coast{fill:none;stroke:rgba(140,200,255,.6);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.bm-region-borders{fill:none;stroke:rgba(140,200,255,.22);stroke-width:.8;vector-effect:non-scaling-stroke}
.bm-ilabel{font:600 13px ${MONO};letter-spacing:.08em;text-transform:uppercase;paint-order:stroke;fill:#fff;stroke:rgba(4,7,13,.85);stroke-width:3.4px;stroke-linejoin:round}
.bm-world{position:absolute;left:0;top:0}
.bm-world svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;user-select:none}
/* holographic dot-matrix world (vector: sharp at every zoom) */
/* cropped to VIEW (branchesData.js): nothing outside the window is drawn; both world layers fade out softly
   at the edges (the mask is painted once; while the camera moves the layer is only GPU-scaled) */
.bm-holo svg{overflow:hidden}
.bm-world{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 95%,transparent 100%),linear-gradient(180deg,transparent 0,#000 6%,#000 90%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 6%,#000 95%,transparent 100%),linear-gradient(180deg,transparent 0,#000 6%,#000 90%,transparent 100%);mask-composite:intersect}
.bm-land-fill{fill:url(#bm-land-grad)}
.bm-land-dots{fill:url(#bm-dots)}
.bm-coast{fill:none;stroke:rgba(140,200,255,.55);stroke-width:.9;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.bm-borders{fill:none;stroke:rgba(140,200,255,.16);stroke-width:.7;vector-effect:non-scaling-stroke}
.bm-grat{fill:none;stroke:rgba(255,255,255,.055);stroke-width:.7;vector-effect:non-scaling-stroke}
.bm-blur{position:absolute;left:0;top:0;bottom:0;width:46vw;background:linear-gradient(90deg,rgba(4,7,13,.78) 0,rgba(4,7,13,.58) 55%,rgba(4,7,13,0) 100%);-webkit-backdrop-filter:blur(11px);backdrop-filter:blur(11px);-webkit-mask-image:linear-gradient(90deg,#000 0,#000 58%,transparent 100%);mask-image:linear-gradient(90deg,#000 0,#000 58%,transparent 100%)}
.bm-ring{fill:none;stroke:${SIGNAL_COLOR};stroke-width:1.6;transform-box:fill-box;transform-origin:center;animation:bm-ping 2.6s ease-out infinite}
.bm-ring.b{animation-delay:1.3s}
@keyframes bm-ping{0%{transform:scale(.4);opacity:.95}100%{transform:scale(3.4);opacity:0}}
.bm-label{font:600 13px ${MONO};letter-spacing:.08em;text-transform:uppercase;paint-order:stroke}
.bm-row{display:flex;align-items:baseline;gap:14px;padding:9px 0;border-top:1px solid rgba(255,255,255,.16);white-space:nowrap}
.bm-row:last-child{border-bottom:1px solid rgba(255,255,255,.16)}
.bm-row-global{border-top-color:rgba(255,164,92,.35)}
.bm-num{font:500 11px/1 ${MONO};letter-spacing:.1em;color:rgba(255,255,255,.55)}
.bm-city{font:400 clamp(14px,1.3vw,19px)/1.1 ${DISPLAY};color:#fff;display:inline-block}
.bm-note{margin-left:auto;font:500 10px/1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${SIGNAL_COLOR}}
.bm-swap{display:grid}
.bm-swap>span{grid-area:1/1;will-change:transform,opacity}
.bm-hud{position:absolute;right:max(24px,3vw);bottom:max(22px,4vh);text-align:right;font:500 11px/1.7 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);text-shadow:0 1px 6px rgba(0,0,0,.7);pointer-events:none}
.bm-hud p{margin:0}
.bm-hud b{font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
.bm-hud-sep{margin:0 .6em;color:rgba(255,255,255,.35)}
.bm-hud-target{color:${SIGNAL_COLOR}}
.bm-hud-cross{position:absolute;right:0;top:-26px;font-size:16px;line-height:1;color:rgba(255,255,255,.55)}
.bm-pin rect{fill:rgba(7,20,44,.82);stroke:rgba(140,195,255,.75);stroke-width:1}
.bm-pin text{font:600 13px/1 ${DISPLAY};letter-spacing:.01em;fill:#fff}
.bm-pin line{stroke:rgba(170,215,255,.85);stroke-width:1.2}
.bm-wring{fill:none;stroke:${WORLD_GLOW};stroke-width:1.4;transform-box:fill-box;transform-origin:center;animation:bm-ping 2.6s ease-out infinite}
.bm-wring.b{animation-delay:1.3s}
.bm-burst{fill:none;stroke:#bfe0ff;stroke-width:1.6;opacity:0;filter:drop-shadow(0 0 6px rgba(90,170,255,.9))}
.bm-country{fill:rgba(64,150,255,.28);stroke:#8cc4ff;stroke-width:1.1;stroke-linejoin:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 6px rgba(70,160,255,.95)) drop-shadow(0 0 14px rgba(70,160,255,.6));transition:none}
@media (max-width:899px){.bm-hud{display:none}.bm-pin text{font-size:11px}}
.bm-narrative{margin:16px 0 0;max-width:min(30vw,420px);font:400 13px/1.6 ${DISPLAY};color:rgba(255,255,255,.62)}
@media (max-height:780px){.bm-narrative{display:none}}
@media (max-width:899px){
  .bm-narrative{display:none}
  .bm-title{top:clamp(54px,7vh,70px)!important}
  .bm-map{right:0;left:0;margin:0 auto;top:auto;bottom:1vh;height:min(70vh,74vw)}
  .bm-blur{width:100%!important;bottom:auto;height:42vh;background:linear-gradient(180deg,rgba(4,7,13,.95) 0,rgba(4,7,13,.9) 88%,rgba(4,7,13,0) 100%);-webkit-backdrop-filter:none;backdrop-filter:none;-webkit-mask-image:linear-gradient(180deg,#000 0,#000 90%,transparent 100%);mask-image:linear-gradient(180deg,#000 0,#000 90%,transparent 100%)}
}
.bm-mlist{display:none}
@media (max-width:899px){
  .bm-title-h{font-size:clamp(1.02rem,4.4vw,1.5rem)!important;line-height:1.22!important}
  .bm-title-eyebrow{font-size:9px!important;line-height:13px!important;margin-bottom:6px!important}
  .bm-map{bottom:-2vh;height:min(60vh,80vw)}
  .bm-mlist{display:block;position:absolute;left:6vw;right:6vw;top:calc(7vh + 98px);pointer-events:none}
  .bm-ilabel{font-size:10.5px}
  /* softer edge fade: the crop already ends at the hubs */
  .bm-world{-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 3%,#000 97%,transparent 100%),linear-gradient(180deg,transparent 0,#000 4%,#000 92%,transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 3%,#000 97%,transparent 100%),linear-gradient(180deg,transparent 0,#000 4%,#000 92%,transparent 100%)}
  .bm-mgroup{position:absolute;left:0;right:0;top:0;will-change:opacity}
  .bm-mrow{display:flex;align-items:baseline;gap:12px;padding:5px 0;border-top:1px solid rgba(255,255,255,.14)}
  .bm-mrow:last-child{border-bottom:1px solid rgba(255,255,255,.14)}
  .bm-mrow .bm-num{font-size:9.5px}
  .bm-mrow .bm-city{font-size:12.5px}
  .bm-mrow .bm-note{font-size:8.5px}
}
@media (max-width:899px) and (max-height:700px){.bm-mrow{padding:4px 0}}
@media (prefers-reduced-motion:reduce){.bm-ring{animation:none;opacity:.5}}
`;

export default function BranchesMap() {
  const reduced = useReducedMotion();
  const root = useRef(null);
  const near = useNear(root); // Milky Way + Earth pictures load only as the section gets close
  const stage = useRef(null);
  const bgRef = useRef(null);
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const earthRef = useRef(null);
  const [geo, setGeo] = useState(null);

  /* fetch the map geometry once the page has settled (idle), well before anyone scrolls this far */
  useEffect(() => {
    let id = 0;
    let alive = true;
    const go = () => loadShapes().then((m) => alive && setGeo(m));
    const t = setTimeout(() => {
      if ("requestIdleCallback" in window) id = window.requestIdleCallback(go, { timeout: 4000 });
      else go();
    }, 1800);
    return () => {
      alive = false;
      clearTimeout(t);
      if (id) window.cancelIdleCallback?.(id);
    };
  }, []);
  const mapRef = useRef(null);
  const blurRef = useRef(null);
  const title = useRef(null);
  const headA = useRef(null); // "Scaling across 6 hubs."
  const headB = useRef(null); // "Now 9 hubs on 3 continents."
  // one dotted map for both chapters: the land layer (India close-up detail + whole-world dots) and the
  // signal layer (India arcs + markers, glowing countries, world pins), moved together by one camera
  const regionRef = useRef(null);
  const baseLandRef = useRef(null);
  const indiaGroup = useRef(null);
  const glows = useRef([]);
  const worldLandLayer = useRef(null);
  const worldSigLayer = useRef(null);
  const worldBoxes = useRef([]);
  const worldMarkers = useRef([]);
  const countryRefs = useRef({}); // blue glowing countries, by key
  const pinRects = useRef([]); // label-pin backgrounds, sized to their text in layout()
  const pinTexts = useRef([]);
  const pinLines = useRef([]);
  const worldBursts = useRef([]); // notification ripple around each global hub
  const lastDot = useRef(null); // the final hub: the exit ripple starts here
  // X/Y coordinate HUD (blueprint checklist "X")
  const hud = useRef(null);
  const hudLat = useRef(null);
  const hudLon = useRef(null);
  const hudTarget = useRef(null);
  const hudHubs = useRef(null);
  const list = useRef(null);
  const mList = useRef(null);
  const mGroupA = useRef(null);
  const mGroupB = useRef(null);
  const mRowsA = useRef([]);
  const mRowsB = useRef([]);
  const worldSvgs = useRef([]);
  const viewClip = useRef(null);
  const paper = useRef(null);
  const paperText = useRef(null);
  const rocket = useRef(null);
  const markers = useRef([]);
  const indiaLabels = useRef([]);
  const arcs = useRef([]);
  const heads = useRef([]);
  const rows = useRef([]);
  const rowText = useRef([]);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    if (!rootEl || !stageEl) return undefined;

    const G = {
      vw: 0, vh: 0, rs: 104, ax: 0, ay: 0, cx: 0, cy: 0, ang: -90, f: 1, zmax: ZOOM_DEFAULT,
      // world map rest rect (stage px), its scale (px per world unit), Chennai on it, and the pull-back zoom
      wl: 0, wt: 0, ws: 1, wcx: 0, wcy: 0, s0: 6,
    };
    let lastP = -1;
    let shown = false;

    const layout = () => {
      G.vw = stageEl.offsetWidth;
      G.vh = stageEl.offsetHeight;
      if (!G.vw || !G.vh) return;

      /* the exact geometry the rocket flight ended with (Earth, Chennai on the globe, rocket size and heading) */
      const g = flightGeometry(G.vw, G.vh);
      G.rs = g.rs;
      G.ax = g.ax;
      G.ay = g.ay;
      G.ang = g.ang;
      const earth = earthRef.current;
      if (earth) {
        earth.style.width = earth.style.height = `${g.R * 2}px`;
        earth.style.left = `${g.cx - g.R}px`;
        earth.style.top = `${g.moonTop}px`;
        earth.style.transformOrigin = `${(g.ax - (g.cx - g.R)).toFixed(1)}px ${(g.ay - g.moonTop).toFixed(1)}px`;
      }
      /* same parallax offsets the rocket flight stops on */
      if (bgRef.current) bgRef.current.style.transform = `translate3d(${(-G.vw * 0.05).toFixed(1)}px,${(G.vh * 0.08).toFixed(1)}px,0)`;
      if (farRef.current) farRef.current.style.transform = `translate3d(0,${(G.vh * 0.1).toFixed(1)}px,0)`;
      if (nearRef.current) nearRef.current.style.transform = `translate3d(0,${(G.vh * 0.26).toFixed(1)}px,0)`;

      /* the world map: right of the hub list on wide screens, along the bottom on narrow ones */
      const wide = G.vw >= 900;
      const wideNow = wide;
      const V = wide ? VIEW : VIEW_FULL;
      const vb = viewBoxOf(V);
      worldSvgs.current.forEach((svg) => svg && svg.getAttribute("viewBox") !== vb && svg.setAttribute("viewBox", vb));
      if (viewClip.current) {
        viewClip.current.setAttribute("x", V.x);
        viewClip.current.setAttribute("y", V.y);
        viewClip.current.setAttribute("width", V.w);
        viewClip.current.setAttribute("height", V.h);
      }
      let ww = wide ? G.vw * 0.67 : G.vw; // a touch bigger than before (was 0.62)
      let wh = (ww * V.h) / V.w;
      const maxH = G.vh * (wide ? 0.7 : 0.5);
      if (wh > maxH) {
        wh = maxH;
        ww = (wh * V.w) / V.h;
      }
      G.wl = wide ? G.vw - ww - G.vw * 0.006 : (G.vw - ww) / 2;
      G.wt = wide ? (G.vh - wh) / 2 + G.vh * 0.03 : Math.min(G.vh - wh - G.vh * 0.08, G.vh * 0.665 - wh / 2); // narrow: centred in the space under the list
      G.ws = ww / V.w;
      worldBoxes.current.forEach((b) => {
        if (!b) return;
        b.style.left = `${G.wl.toFixed(1)}px`;
        b.style.top = `${G.wt.toFixed(1)}px`;
        b.style.width = `${ww.toFixed(1)}px`;
        b.style.height = `${wh.toFixed(1)}px`;
      });
      const [wx, wy] = worldXY(INDIA_HUBS[0].lon, INDIA_HUBS[0].lat);
      G.wcx = G.wl + (wx - V.x) * G.ws;
      G.wcy = G.wt + (wy - V.y) * G.ws;

      /* chapter 1 close-up: FRAME_INDIA (India + Dubai) fitted into the .bm-map box. s0 = how much the world
         map is magnified there; (cx, cy) = where Chennai sits on screen in the close-up */
      const m = mapRef.current;
      /* phones: where the city list ends (the map fills the generous area below it) */
      let listBottom = 0;
      const listGap = Math.max(12, G.vh * 0.018);
      if (!wide && title.current) {
        const listTop = title.current.offsetTop + title.current.offsetHeight + listGap;
        listBottom = listTop + (mGroupA.current?.offsetHeight || 0);
        if (blurRef.current) blurRef.current.style.height = `${(listBottom + 16).toFixed(0)}px`;
      }
      if (m) {
        const F = wide ? FRAME_INDIA : FRAME_INDIA_PHONE;
        const [fx0, fy0] = worldXY(F.lon0, F.lat0);
        const [fx1, fy1] = worldXY(F.lon1, F.lat1);
        // phones: fill almost full width and all remaining height under the city list with zero wasted margins
        const bw = wide ? m.offsetWidth : G.vw * 0.96;
        const bt = wide ? m.offsetTop : listBottom + 6;
        const bh = wide ? m.offsetHeight : Math.max(180, G.vh - bt - 6);
        const bl = wide ? m.offsetLeft : (G.vw - bw) / 2;
        const ppu = Math.min(bw / (fx1 - fx0), bh / (fy1 - fy0));
        G.s0 = Math.max(1.01, ppu / G.ws);
        G.cx = bl + bw / 2 + (wx - (fx0 + fx1) / 2) * ppu;
        G.cy = bt + bh / 2 + (wy - (fy0 + fy1) / 2) * ppu;

        /* zoom the globe until India is as big as it is on the dotted map when the map fades in */
        const [gax, gay] = g.earthPoint(SIZE_REF.a.lon, SIZE_REF.a.lat);
        const [gbx, gby] = g.earthPoint(SIZE_REF.b.lon, SIZE_REF.b.lat);
        const globeW = Math.hypot(gbx - gax, gby - gay);
        const [rax, ray] = worldXY(SIZE_REF.a.lon, SIZE_REF.a.lat);
        const [rbx, rby] = worldXY(SIZE_REF.b.lon, SIZE_REF.b.lat);
        const mapW = Math.hypot(rbx - rax, rby - ray) * ppu * FLAT_START;
        G.zmax = globeW > 0 ? clamp(mapW / globeW, 1.5, 7) : ZOOM_DEFAULT;
      }

      /* mobile city label placement: keep Dubai above its dot so it never clips off the left edge */
      indiaLabels.current.forEach((lbl, i) => {
        const c = INDIA_HUBS[i];
        if (!lbl || !c) return;
        if (!wide && c.id === "dubai") {
          lbl.setAttribute("x", "4");
          lbl.setAttribute("y", "-12");
          lbl.setAttribute("text-anchor", "middle");
        } else {
          lbl.setAttribute("x", c.side === "right" ? "11" : "-11");
          lbl.setAttribute("y", "4.5");
          lbl.setAttribute("text-anchor", c.side === "right" ? "start" : "end");
        }
      });

      /* label pins: size each glass pill to its text and place it above (or, on phones if asked, below)
         its marker — fonts and room differ between phone and desktop */
      pinTexts.current.forEach((t, i) => {
        const r = pinRects.current[i];
        const ln = pinLines.current[i];
        const hub = STEPS[i] && STEPS[i].hub;
        if (!t || !r || !hub) return;
        const m = !wideNow && hub.pinMobile ? hub.pinMobile : {};
        const dx = m.dx ?? hub.pinDx ?? 0;
        const below = Boolean(m.below);
        const w = (t.getComputedTextLength ? t.getComputedTextLength() : 40) + 22;
        r.setAttribute("width", w.toFixed(1));
        r.setAttribute("x", (dx - w / 2).toFixed(1));
        r.setAttribute("y", below ? "21" : "-47");
        t.setAttribute("x", String(dx));
        t.setAttribute("y", below ? "38.5" : "-29.5");
        if (ln) {
          ln.setAttribute("y1", below ? "6" : "-6");
          ln.setAttribute("x2", (dx * 0.85).toFixed(1));
          ln.setAttribute("y2", below ? "21" : "-21");
        }
      });

      /* narrow: the list starts a clear gap below the heading (its height depends on the screen width) */
      if (mList.current && title.current) {
        mList.current.style.top = wide ? "" : `${(title.current.offsetTop + title.current.offsetHeight + listGap).toFixed(0)}px`;
      }

      if (rocket.current) rocket.current.style.width = rocket.current.style.height = `${G.rs}px`;
      lastP = -1;
    };

    const arcPaths = arcs.current;
    const totals = arcPaths.map((el) => (el ? el.getTotalLength() : 1));

    const drawSignal = (el, head, total, t) => {
      if (!el) return;
      el.style.strokeDashoffset = String((1 - t).toFixed(4));
      el.style.opacity = t > 0 ? "1" : "0";
      if (head) {
        const pt = el.getPointAtLength(total * t);
        head.setAttribute("cx", pt.x.toFixed(1));
        head.setAttribute("cy", pt.y.toFixed(1));
        head.style.opacity = String(t > 0 && t < 1 ? 1 : 0);
      }
    };

    const render = (p) => {
      if (p === lastP) return;
      lastP = p;
      const { vw, vh } = G;
      const wide = vw >= 900;

      /* the camera dive: the Earth grows around Chennai and glides so Chennai lands on its place on the map */
      const zt = inOut(range(p, T_ZOOM[0], T_ZOOM[1]));
      const Z = lerp(1, G.zmax, zt);
      const tx = (G.cx - G.ax) * zt;
      const ty = (G.cy - G.ay) * zt;
      if (earthRef.current) {
        earthRef.current.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${Z.toFixed(4)})`;
        earthRef.current.style.opacity = String(1 - range(p, T_EARTH_OUT[0], T_EARTH_OUT[1]));
      }

      /* the dotted map takes over, framed on India (starts bigger and settles; Chennai never moves) */
      const fa = inOut(range(p, T_FLAT[0], T_FLAT[1])); // gentle both ends
      const ms = lerp(FLAT_START, 1, inOut(range(p, T_FLAT_SETTLE[0], T_FLAT_SETTLE[1])));

      /* the rocket stays on Chennai, then turns into the marker */
      const rx = G.ax + tx;
      const ry = G.ay + ty - G.rs * 0.16;
      if (rocket.current) {
        const sc = lerp(0.45, 0.3, range(p, 0.2, 0.28));
        const op = 1 - range(p, 0.23, 0.28);
        rocket.current.style.opacity = String(op);
        rocket.current.style.transform = `translate3d(${(rx - G.rs / 2).toFixed(2)}px,${(ry - G.rs / 2).toFixed(2)}px,0) rotate(${(G.ang + 45).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      }

      /* left side: blurred, darkened strip + title + list */
      const ui = easeOutCubic(range(p, T_UI[0], T_UI[1]));
      if (blurRef.current) {
        blurRef.current.style.opacity = String(ui);
        // the strip narrows in the global chapter so the whole USA stays sharp
        if (wide) blurRef.current.style.width = `${lerp(46, 40, inOut(range(p, T_GLOBAL[0], T_GLOBAL[1]))).toFixed(2)}vw`;
      }
      if (title.current) {
        title.current.style.opacity = String(ui);
        title.current.style.transform = `translate3d(0,${((1 - ui) * 16).toFixed(1)}px,0)`;
      }
      /* heading turns over as the camera pulls back: the old line lifts out, the new one rises in */
      const hs = inOut(range(p, T_HEADING[0], T_HEADING[1]));
      if (headA.current) {
        headA.current.style.opacity = String((1 - range(hs, 0, 0.5)).toFixed(3)); // out first …
        headA.current.style.transform = `translate3d(0,${(-hs * 0.5).toFixed(3)}em,0)`;
      }
      if (headB.current) {
        headB.current.style.opacity = String(range(hs, 0.5, 1).toFixed(3)); // … then the new line in
        headB.current.style.transform = `translate3d(0,${((1 - hs) * 0.5).toFixed(3)}em,0)`;
      }
      if (list.current) {
        list.current.style.opacity = String(easeOutCubic(range(p, T_LIST[0], T_LIST[1])));
        list.current.style.display = wide ? "" : "none";
      }

      /* narrow screens: India cities, then (as the camera pulls back) the countries we serve */
      if (!wide) {
        const lo = easeOutCubic(range(p, T_LIST[0], T_LIST[1]));
        if (mGroupA.current) mGroupA.current.style.opacity = String((lo * (1 - range(hs, 0, 0.5))).toFixed(3));
        if (mGroupB.current) mGroupB.current.style.opacity = String(range(hs, 0.5, 1).toFixed(3));
        INDIA_HUBS.forEach((h, i) => {
          const r = mRowsA.current[i];
          if (r) r.style.opacity = String((0.3 + 0.7 * arriveAt(p, STEPS[i])).toFixed(3));
        });
        WORLD_LIST.forEach((w, i) => {
          const r = mRowsB.current[i];
          const si = STEPS.findIndex((st) => st.hub.id === w.hub);
          const on = si >= INDIA_HUBS.length ? arriveAt(p, STEPS[si]) : 1;
          if (r) r.style.opacity = String((0.3 + 0.7 * on).toFixed(3));
        });
      }

      /* hub list: each name is typed in as its signal arrives */
      STEPS.forEach((step, i) => {
        const arrive = arriveAt(p, step);
        const row = rows.current[i];
        const txt = rowText.current[i];
        if (row) row.style.opacity = String((0.3 + 0.7 * arrive).toFixed(3));
        if (txt) txt.style.clipPath = `inset(0 ${((1 - arrive) * 100).toFixed(1)}% 0 0)`;
      });

      /* ONE camera over one dotted map. Chapter 1 holds the static India + Dubai close-up (magnified s0,
         settling from FLAT_START); chapter 2 pulls back to the whole world (s0 → 1, on a log scale), always
         locked on Chennai. */
      const gt = inOut(range(p, T_GLOBAL[0], T_GLOBAL[1]));
      const wm = Math.pow(G.s0, 1 - gt) * ms; // map magnification
      const ccx = lerp(G.cx, G.wcx, gt);
      const ccy = lerp(G.cy, G.wcy, gt);
      const worldT = `translate3d(${(ccx - wm * G.wcx).toFixed(2)}px,${(ccy - wm * G.wcy).toFixed(2)}px,0) scale(${wm.toFixed(5)})`;
      // promote to a GPU layer only while the camera moves; once settled the browser re-draws the vectors crisp
      const moving = (p > T_FLAT[0] && p < T_FLAT_SETTLE[1]) || (gt > 0 && gt < 1);
      [worldLandLayer.current, worldSigLayer.current].forEach((el) => {
        if (!el) return;
        el.style.willChange = moving ? "transform,opacity" : "auto";
        el.style.transform = gt >= 1 ? "none" : worldT;
        el.style.opacity = String(fa.toFixed(3));
        el.style.visibility = fa <= 0 ? "hidden" : "visible";
      });
      /* close-up detail (1:50m coast, fine dots) hands over to the whole-world dots as the camera pulls back */
      if (regionRef.current) regionRef.current.style.opacity = String((1 - range(gt, 0.05, 0.4)).toFixed(3));
      if (baseLandRef.current) baseLandRef.current.style.opacity = String(range(gt, 0, 0.35).toFixed(3));

      /* markers, lines and labels keep a constant on-screen size whatever the zoom: u = 1 / (screen px per unit) */
      const u = 1 / (G.ws * wm);

      /* CHAPTER 1: India markers + orange signal lines (on the map itself, so they ride the camera) */
      if (indiaGroup.current) {
        const io = 1 - range(gt, 0, 0.35);
        indiaGroup.current.style.opacity = io.toFixed(3);
        indiaGroup.current.style.visibility = io <= 0 ? "hidden" : "visible";
      }
      INDIA_HUBS.forEach((c, i) => {
        const m = markers.current[i];
        if (!m) return;
        const arrive = arriveAt(p, STEPS[i]);
        const s = easeOutBack(arrive);
        const pt = INDIA_PTS[i];
        m.style.opacity = String(Math.min(1, arrive * 2));
        m.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) scale(${Math.max(0.0001, s * u).toFixed(5)})`);
      });
      arcPaths.forEach((el, i) => {
        const t = inOut(range(p, INDIA_SIGNAL[i][0], INDIA_SIGNAL[i][1]));
        if (el) el.setAttribute("stroke-width", (ARC_PX * u).toFixed(4));
        const gl = glows.current[i];
        if (gl) {
          gl.setAttribute("stroke-width", (ARC_PX * 3.2 * u).toFixed(4));
          gl.style.strokeDashoffset = String((1 - t).toFixed(4));
          gl.style.opacity = t > 0 ? "0.35" : "0";
        }
        if (heads.current[i]) heads.current[i].setAttribute("r", (HEAD_PX * u).toFixed(4));
        drawSignal(el, heads.current[i], totals[i], t);
      });

      STEPS.forEach((step, i) => {
        const m = worldMarkers.current[i];
        if (!m) return;
        const isGlobal = i >= INDIA_HUBS.length;
        // India's own world pins (India / UAE) take over from the orange close-up markers during the pull-back
        const arrive = isGlobal ? arriveAt(p, step) : range(gt, 0.25, 0.7);
        const s = isGlobal || step.hub.pin ? easeOutBack(arrive) : 0.62; // other India cities: small dots
        const [x, y] = worldXY(step.hub.lon, step.hub.lat);
        m.style.opacity = String(Math.min(1, arrive * 2));
        m.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${Math.max(0.001, s * u).toFixed(4)})`);
      });
      /* countries glow blue once their hub is online (India and the UAE are already online) */
      STEPS.forEach((step, i) => {
        const key = step.hub.country;
        const el = key && countryRefs.current[key];
        if (!el) return;
        // India / UAE: a soft tint in the close-up (the dots stay visible), full glow once the world is in view
        const on = i >= INDIA_HUBS.length ? arriveAt(p, step) : lerp(0.3, 1, range(gt, 0.2, 0.8));
        el.style.opacity = (on * 0.95).toFixed(3);
        const glow = gt > 0.35 ? "" : "none"; // the CSS glow is far too wide while the map is magnified
        if (el.style.filter !== glow) el.style.filter = glow;
      });
      /* notification ripple: one bright ring rings out around each global hub as it is notified */
      STEPS.forEach((step, i) => {
        const ring = worldBursts.current[i];
        if (!ring || !isGlobalStep(step)) return;
        const b = burstAt(p, step);
        const live = b > 0 && b < 1;
        ring.setAttribute("r", (7 + easeOutCubic(b) * 42).toFixed(2));
        ring.style.opacity = live ? ((1 - b) * 0.95).toFixed(3) : "0";
      });

      /* exit: a ripple from the last hub fills the screen with the Awards colour */
      const w = inOut(range(p, T_RIPPLE[0], T_RIPPLE[1]));

      /* X/Y HUD: the readout follows the signal head along every hop, in story order */
      if (hud.current) {
        hud.current.style.opacity = String((ui * (1 - w)).toFixed(3));
        const o = INDIA_HUBS[0];
        let lat = o.lat;
        let lon = o.lon;
        let target = "Head office · Chennai";
        let online = p >= T_CHENNAI[1] ? 1 : 0;
        for (let i = 1; i < STEPS.length; i++) {
          const { hub, from, t: [a, b] } = STEPS[i];
          if (p >= b) {
            online = i + 1;
            lat = hub.lat;
            lon = hub.lon;
            target = `Hub ${pad2(i + 1)} online · ${hub.name}`;
            if (i === INDIA_HUBS.length - 1 && p >= T_GLOBAL[0] && p < GLOBAL_SIGNAL[0][0]) target = "Zooming out · Going global";
          } else if (p > a && isGlobalStep(STEPS[i])) {
            // global hubs are notified (no signal travelling): the readout jumps to the new country
            lat = hub.lat;
            lon = hub.lon;
            target = `New hub · ${hub.name}`;
            break;
          } else if (p > a) {
            const t = inOut(range(p, a, b));
            lat = lerp(from.lat, hub.lat, t);
            lon = lerp(from.lon, hub.lon, t);
            target = `Signal ${from.name} → ${hub.name}`;
            break;
          } else break;
        }
        const latTxt = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
        const lonTxt = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
        const hubsTxt = `${pad2(online)} / ${pad2(STEPS.length)}`;
        if (hudLat.current && hudLat.current.textContent !== latTxt) hudLat.current.textContent = latTxt;
        if (hudLon.current && hudLon.current.textContent !== lonTxt) hudLon.current.textContent = lonTxt;
        if (hudTarget.current && hudTarget.current.textContent !== target) hudTarget.current.textContent = target;
        if (hudHubs.current && hudHubs.current.textContent !== hubsTxt) hudHubs.current.textContent = hubsTxt;
      }
      if (paper.current) {
        if (w <= 0) {
          paper.current.style.visibility = "hidden";
        } else {
          let ox = vw * 0.6;
          let oy = vh * 0.3;
          const d = lastDot.current;
          if (d) {
            const r = d.getBoundingClientRect();
            const sr = stageEl.getBoundingClientRect();
            ox = r.left + r.width / 2 - sr.left;
            oy = r.top + r.height / 2 - sr.top;
          }
          const rMax = Math.hypot(Math.max(ox, vw - ox), Math.max(oy, vh - oy)) + 40;
          paper.current.style.visibility = "visible";
          paper.current.style.clipPath = `circle(${(w * rMax).toFixed(1)}px at ${ox.toFixed(1)}px ${oy.toFixed(1)}px)`;
        }
      }
      if (paperText.current) {
        const tt = easeOutCubic(range(p, 0.978, 1));
        paperText.current.style.opacity = String(tt);
        paperText.current.style.transform = `translate3d(0,${((1 - tt) * 26).toFixed(1)}px,0)`;
      }
    };

    layout();

    if (reduced) {
      stageEl.style.visibility = "visible";
      render(0.955);
      const ro = new ResizeObserver(() => {
        layout();
        render(0.955);
      });
      ro.observe(stageEl);
      return () => ro.disconnect();
    }

    const update = () => {
      if (!G.vh) return;
      const r = scrollRect(rootEl);
      // visible only once the rocket flight above has reached its last frame (this section's top reaches the screen top)
      const on = r.top <= 0.5 && r.bottom > 0;
      if (on !== shown) {
        shown = on;
        stageEl.style.visibility = on ? "visible" : "hidden";
      }
      if (!on) return;
      const span = Math.max(1, r.height - G.vh);
      render(clamp(-r.top / span));
    };

    update();
    const off = onFrame(update);
    const relayout = () => {
      if (Math.abs(stageEl.offsetWidth - G.vw) < 1 && Math.abs(stageEl.offsetHeight - G.vh) < 1) return;
      layout();
      update();
    };
    window.addEventListener("resize", relayout, { passive: true });
    const ro = new ResizeObserver(relayout);
    ro.observe(stageEl);
    return () => {
      off();
      window.removeEventListener("resize", relayout);
      ro.disconnect();
    };
  }, [reduced, geo]);

  const rootStyle = reduced
    ? { position: "relative", zIndex: 1 }
    : {
        position: "relative",
        zIndex: 30,
        width: "100%",
        marginTop: "-100svh",
        height: `calc(${100 + SCROLL_VH}svh)`,
        pointerEvents: "none",
      };
  const stageStyle = {
    position: reduced ? "relative" : "sticky",
    top: 0,
    width: "100%",
    height: "100svh",
    overflow: "hidden",
    background: BG,
    visibility: "hidden",
    color: "#fff",
  };
  const abs = { position: "absolute", inset: 0 };

  return (
    <div ref={root} id="c-branches" data-text-fade="off" aria-label="Our branches" role="region" style={rootStyle}>
      <div ref={stage} style={stageStyle}>
        <style>{CSS}</style>
        <style>{SPACE_CSS}</style>

        {/* space: the same backdrop the rocket flight ends on, so there is no visible cut */}
        <div style={{ ...abs, background: BG }}>
          <div ref={bgRef} style={{ position: "absolute", inset: "-8%", willChange: "transform" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: near ? "url(/space/milkyway.webp)" : "none",
                backgroundSize: "cover",
                backgroundPosition: "50% 50%",
                animation: "ct-bgdrift 60s ease-in-out infinite alternate",
              }}
            />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "ct-pan 50s linear infinite alternate" }}>
            <Stars stars={FAR_STARS} svgRef={farRef} style={{ position: "absolute", left: 0, top: "-12%", height: "124%", willChange: "transform", animation: "ct-twinkle 7s ease-in-out infinite" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, animation: "ct-pan 28s linear infinite alternate" }}>
            <Stars stars={NEAR_STARS} svgRef={nearRef} style={{ position: "absolute", left: 0, top: "-30%", height: "160%", willChange: "transform", animation: "ct-twinkle 4.5s ease-in-out infinite" }} />
          </div>
          {STREAKS.map((m, i) => (
            <div key={`s${i}`} className="ct-fly" style={{ "--d": `${m.d}s`, "--delay": `${m.delay}s`, left: `${m.x0}vw`, top: `${m.y0}vh`, opacity: 1 }}>
              <i className="ct-streak" style={{ "--w": `${m.w}px` }} />
            </div>
          ))}
        </div>

        {/* the Earth (identical to the one the rocket landed on); it dives towards India */}
        <div
          ref={earthRef}
          style={{
            position: "absolute",
            borderRadius: "50%",
            background: near ? MOON_BG : MOON_PLACEHOLDER,
            boxShadow: "inset 0 14px 50px rgba(190,225,255,.45), 0 -6px 90px rgba(80,150,255,.45)",
            willChange: "transform, opacity",
          }}
        />

        {/* the holographic dot-matrix map, used by BOTH chapters (below the blur strip):
            India close-up detail (1:50m, fine dots) in chapter 1, whole-world dots (1:110m) in chapter 2 */}
        <div ref={worldLandLayer} className="bm-layer" aria-hidden="true" style={{ opacity: 0, visibility: "hidden" }}>
          <div ref={(el) => (worldBoxes.current[0] = el)} className="bm-world bm-holo">
            <svg ref={(el) => (worldSvgs.current[0] = el)} viewBox={viewBoxOf(VIEW)} focusable="false">
              <defs>
                {/* the dot matrix: one dot per 3.2 map units, only where there is land */}
                <pattern id="bm-dots" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
                  <circle cx="1.6" cy="1.6" r="0.78" fill="rgba(150,205,255,.78)" />
                </pattern>
                {/* the close-up's finer dot matrix: looks the same on screen once the camera has zoomed in */}
                <pattern id="bm-dots-fine" width="0.62" height="0.62" patternUnits="userSpaceOnUse">
                  <circle cx="0.31" cy="0.31" r="0.15" fill="rgba(150,205,255,.8)" />
                </pattern>
<clipPath id="bm-region-clip">
                  <rect x={REGION_CLIP.x} y={REGION_CLIP.y} width={REGION_CLIP.w} height={REGION_CLIP.h} />
                </clipPath>
                                <linearGradient id="bm-land-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(60,130,230,.20)" />
                  <stop offset="1" stopColor="rgba(30,80,170,.10)" />
                </linearGradient>
              </defs>
              {geo && (
                <>
                  <path d={geo.WORLD_GRATICULE} className="bm-grat" />
                  <g ref={baseLandRef} style={{ opacity: 0 }}>
                    <path d={geo.WORLD_LAND} className="bm-land-fill" />
                    <path d={geo.WORLD_LAND} className="bm-land-dots" />
                    <path d={geo.WORLD_BORDERS} className="bm-borders" />
                    <path d={geo.WORLD_LAND} className="bm-coast" />
                  </g>
                  <g ref={regionRef}>
                    <path d={geo.REGION_LAND} className="bm-region-fill" />
                    <path d={geo.REGION_LAND} className="bm-region-dots" />
                    <g clipPath="url(#bm-region-clip)">
                      <path d={geo.WORLD_BORDERS} className="bm-region-borders" />
                      <path d={geo.REGION_LAND} className="bm-region-coast" />
                    </g>
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* measures the India close-up box (FRAME_INDIA is fitted into it); nothing is drawn in it */}
        <div ref={mapRef} className="bm-map" aria-hidden="true" style={{ visibility: "hidden" }} />

        {/* blurred, darkened strip on the left so the title and the hub list read clearly over the map */}
        <div ref={blurRef} className="bm-blur" aria-hidden="true" style={{ opacity: 0 }} />

        {/* glowing countries, CHAPTER 1's orange India signal + cities, CHAPTER 2's hub markers / label pins
            (no signal lines there: each country is notified). Above the blur strip so it stays sharp. */}
        <div ref={worldSigLayer} className="bm-layer" style={{ opacity: 0, visibility: "hidden" }}>
          <div ref={(el) => (worldBoxes.current[1] = el)} className="bm-world">
            <svg ref={(el) => (worldSvgs.current[1] = el)} viewBox={viewBoxOf(VIEW)} aria-hidden="true" focusable="false">
              {/* blue glowing countries (outlines generated from Natural Earth) */}
              <defs>
                <clipPath id="bm-view-clip">
                  <rect ref={viewClip} x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} />
                </clipPath>
              </defs>
              <g clipPath="url(#bm-view-clip)">
                {geo &&
                  Object.entries(geo.COUNTRY_SHAPES).map(([key, d]) => (
                    <path key={key} ref={(el) => (countryRefs.current[key] = el)} d={d} className="bm-country" style={{ opacity: 0 }} />
                  ))}
              </g>
              {/* CHAPTER 1 · India: orange signal lines from Chennai and the city markers (sizes set per frame) */}
              <g ref={indiaGroup}>
                {INDIA_ARCS.map((d, i) => (
                  <g key={`a${i}`}>
                    <path
                      ref={(el) => (glows.current[i] = el)}
                      d={d}
                      pathLength="1"
                      fill="none"
                      stroke={SIGNAL_COLOR}
                      strokeLinecap="round"
                      strokeDasharray="1 1"
                      strokeDashoffset="1"
                      style={{ opacity: 0 }}
                    />
                    <path
                      ref={(el) => (arcs.current[i] = el)}
                      d={d}
                      pathLength="1"
                      fill="none"
                      className="bm-arc"
                      stroke={SIGNAL_COLOR}
                      strokeLinecap="round"
                      strokeDasharray="1 1"
                      strokeDashoffset="1"
                      style={{ opacity: 0 }}
                    />
                    <circle ref={(el) => (heads.current[i] = el)} className="bm-head" r="0.5" fill="#fff" style={{ opacity: 0 }} />
                  </g>
                ))}
                {INDIA_HUBS.map((c, i) => (
                  <g key={c.id} ref={(el) => (markers.current[i] = el)} style={{ opacity: 0 }} transform={`translate(${INDIA_PTS[i].x} ${INDIA_PTS[i].y}) scale(0.0001)`}>
                    <circle className="bm-ring" r="7" />
                    <circle className="bm-ring b" r="7" />
                    <circle r="5" fill="#fff" stroke={SIGNAL_COLOR} strokeWidth="2.4" />
                    <text
                      ref={(el) => (indiaLabels.current[i] = el)}
                      x={c.side === "right" ? 12 : -12}
                      y="4.5"
                      textAnchor={c.side === "right" ? "start" : "end"}
                      className="bm-ilabel"
                    >
                      {c.name}
                    </text>
                  </g>
                ))}
              </g>
              {STEPS.map(({ hub }, i) => {
                const pinned = Boolean(hub.pin);
                const dx = hub.pinDx || 0;
                return (
                  <g key={`w-${hub.id}`} ref={(el) => (worldMarkers.current[i] = el)} style={{ opacity: 0 }}>
                    {pinned && (
                      <>
                        <circle className="bm-wring" r="7" />
                        <circle className="bm-wring b" r="7" />
                      </>
                    )}
                    {i >= INDIA_HUBS.length && <circle ref={(el) => (worldBursts.current[i] = el)} className="bm-burst" r="7" />}
                    <circle ref={i === STEPS.length - 1 ? lastDot : undefined} r={pinned ? 5 : 4} fill="#fff" stroke={WORLD_GLOW} strokeWidth="2.4" />
                    {pinned && (
                      /* glass label pin on a short stem, like a map callout */
                      <g className="bm-pin">
                        <line ref={(el) => (pinLines.current[i] = el)} x1="0" y1="-6" x2={dx * 0.85} y2="-21" />
                        <rect
                          ref={(el) => (pinRects.current[i] = el)}
                          data-cx={dx}
                          x={dx - 30}
                          y="-47"
                          width="60"
                          height="26"
                          rx="8"
                        />
                        <text ref={(el) => (pinTexts.current[i] = el)} x={dx} y="-29.5" textAnchor="middle">
                          {hub.pin}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* the rocket, standing on Chennai exactly as it did at the end of the flight */}
        <img
          ref={rocket}
          src="/rocket/rocket.webp"
          loading="lazy"
          decoding="async"
          alt=""
          width={104}
          height={104}
          draggable={false}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
            filter: "drop-shadow(0 8px 14px rgba(0,0,0,.35)) drop-shadow(0 0 16px rgba(255,138,76,.45))",
            userSelect: "none",
          }}
        />

        {/* title (top-left, arrives with the map; its second line turns over when the network goes global) */}
        <div ref={title} className="bm-title" style={{ position: "absolute", left: "6vw", right: "6vw", top: "9vh", opacity: 0, willChange: "transform, opacity" }}>
          <p className="bm-title-eyebrow" style={{ margin: "0 0 12px", font: `500 12px/16px ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>
            Command center · Where our AI scales brands
          </p>
          <p className="bm-title-h" style={{ margin: 0, font: `400 clamp(1.4rem,2.8vw,2.5rem)/1.15 ${DISPLAY}`, color: "#fff" }}>
            Born in Chennai.
            <span className="bm-swap">
              <span ref={headA}>Scaling across 6 hubs.</span>
              <span ref={headB} style={{ opacity: 0 }}>
                Now {STEPS.length} hubs on 3 continents.
              </span>
            </span>
          </p>
          <p className="bm-narrative">
            Engineered at our Chennai head office, scaled across India and Dubai, and now serving brands from
            Singapore, the United Kingdom and the United States, all backed by centralised AI performance models.
          </p>
        </div>

        {/* X/Y coordinate HUD (bottom-right): live lat/long of the signal head */}
        <div ref={hud} className="bm-hud" aria-hidden="true" style={{ opacity: 0 }}>
          <span className="bm-hud-cross">+</span>
          <p>
            Lat <b ref={hudLat}>13.08°N</b>
            <span className="bm-hud-sep">·</span>
            Lon <b ref={hudLon}>80.27°E</b>
          </p>
          <p ref={hudTarget} className="bm-hud-target">Head office · Chennai</p>
          <p>
            Hubs online <b ref={hudHubs}>01 / {pad2(STEPS.length)}</b>
          </p>
        </div>

        {/* narrow screens: the hub list sits in the middle, between the title and the map */}
        <div ref={mList} className="bm-mlist" aria-hidden="true">
          <div ref={mGroupA} className="bm-mgroup" style={{ opacity: 0 }}>
            {INDIA_HUBS.map((h, i) => (
              <div key={h.id} ref={(el) => (mRowsA.current[i] = el)} className="bm-mrow" style={{ opacity: 0.3 }}>
                <span className="bm-num">{pad2(i + 1)}</span>
                <span className="bm-city">{h.name}</span>
                <span className="bm-note">{h.note}</span>
              </div>
            ))}
          </div>
          <div ref={mGroupB} className="bm-mgroup" style={{ opacity: 0 }}>
            {WORLD_LIST.map((w, i) => (
              <div key={w.hub} ref={(el) => (mRowsB.current[i] = el)} className="bm-mrow" style={{ opacity: 0.3 }}>
                <span className="bm-num">{pad2(i + 1)}</span>
                <span className="bm-city">{w.name}</span>
                <span className="bm-note">{w.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* hub list: each name is typed in as its signal arrives (01–06 India & Gulf, 07–09 global) */}
        <div ref={list} style={{ position: "absolute", left: "6vw", top: "43vh", width: "min(30vw,420px)", opacity: 0 }}>
          {STEPS.map(({ hub }, i) => (
            <div key={hub.id} ref={(el) => (rows.current[i] = el)} className={`bm-row${i === INDIA_HUBS.length ? " bm-row-global" : ""}`} style={{ opacity: 0.3 }}>
              <span className="bm-num">{pad2(i + 1)}</span>
              <span ref={(el) => (rowText.current[i] = el)} className="bm-city">
                {hub.name}
              </span>
              <span className="bm-note">{hub.note}</span>
            </div>
          ))}
        </div>

        {/* exit: ripple from the last hub in the Awards colour */}
        <div
          ref={paper}
          style={{
            position: "absolute",
            inset: 0,
            visibility: "hidden",
            background: PAPER,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <div ref={paperText} style={{ opacity: 0 }}>
            <p style={{ margin: "0 0 18px", font: `500 12px/16px ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: "#6E6A62" }}>
              Next · Awards &amp; Milestones
            </p>
            <p style={{ margin: 0, font: `400 clamp(2rem,6.5vw,5.5rem)/1.1 ${DISPLAY}`, color: INK }}>Onward.</p>
          </div>
        </div>
      </div>
    </div>
  );
}