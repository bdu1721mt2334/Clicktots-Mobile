// Purpose: Implement the RocketJourney pages module, keeping this responsibility separate for maintainability.
import { useEffect, useRef } from "react";
import { useNear } from "@/hooks/useNear";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";
import { clamp, range, easeOutCubic } from "@/lib/math";

/* ------------------------------------------------------------------ *
 *  ROCKET JOURNEY  –  Testimonials (Earth)  →  Awards & Milestones (Moon)
 *
 *  Wraps the Testimonials section. When the visitor scrolls to the end of the
 *  testimonials, the page stays put for FLIGHT_VH of scrolling and the whole
 *  trip is driven by that one scroll progress (u = 0 → 1):
 *
 *    0.00 – 0.12  a 3D rocket pops up at the bottom-right corner of the
 *                 testimonial board and starts to rumble
 *    0.12 – 0.50  the testimonial section is pushed off to the TOP-LEFT corner
 *                 (shrinking and tilting) and space is revealed behind it
 *    0.12 – 0.72  the rocket flies along a dotted trail, in a long arc,
 *                 towards the Moon, which rises from the bottom
 *    0.12 – 0.85  (rocket) lands on Chennai, India, on a real-looking Earth that rises from the bottom
 *    0.85 – 1.00  the rocket stands on India and the flight ends. NOTHING else happens here: the
 *                 BranchesMap section continues from this exact frame (same Earth, same rocket), then
 *                 zooms from the globe into the real India map.
 *
 *  How it is built (no React state, one write per frame):
 *    • the testimonial panel (ScrollOverHero's [data-flight-panel] wrapper) is
 *      pinned with a counter-translate while it flies away, so it looks fixed;
 *    • two sticky layers live in the flight zone: a BACKDROP under the panel
 *      (stars + Moon) and a STAGE over it (trail, rocket, landing circle);
 *    • everything is positioned from the real viewport size, so it adapts to
 *      any screen; the flight zone starts one screen early (margin-top: -100svh)
 *      so the layers are already pinned when the testimonial section ends.
 *
 *  Reduced motion: no flight at all, the sections simply stack.
 * ------------------------------------------------------------------ */

const FLIGHT_VH = 320; // scroll length of the whole trip, in screens
const INK = "#121110";
/* The Earth texture (public/space/earth.webp) is built from a real Earth photo (Earth seen from space,
   India near the top). EARTH_PHOTO is the Earth's edge in that photo (pixels): the texture square is
   that circle, so the disk on screen lines up with it. EARTH_VIEW is the camera fitted to the photo
   from coastline points (Karachi, Gujarat, Kanyakumari, Sri Lanka, the Bay of Bengal), so any
   lon/lat can be placed on it. */
const EARTH_PHOTO = { cx: 1079.76, cy: 1605.07, r: 1480 };
export const EARTH_VIEW = { lon0: 70.9414, lat0: -25.3487, k: 1055.3315, u0: 976.7329, v0: 1172.7389, rot: 0.0851, dist: 5.9538 };

/** lon/lat → pixel on the Earth photo (perspective view of a sphere) */
function earthPhotoPx(lon, lat) {
  const rad = Math.PI / 180;
  const { lon0, lat0, k, u0, v0, rot, dist } = EARTH_VIEW;
  const l = (lon - lon0) * rad;
  const f = lat * rad;
  const f0 = lat0 * rad;
  let x = Math.cos(f) * Math.sin(l);
  let y = Math.cos(f0) * Math.sin(f) - Math.sin(f0) * Math.cos(f) * Math.cos(l);
  const z = Math.sin(f0) * Math.sin(f) + Math.cos(f0) * Math.cos(f) * Math.cos(l);
  const s = dist / (dist - z);
  x *= s;
  y *= s;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  return [u0 + k * (c * x - sn * y), v0 - k * (sn * x + c * y)];
}
const MASK_ID = "ct-flight-trail-mask";

const smooth = (t) => t * t * (3 - 2 * t);
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Where the Earth, the rocket's launch point and its landing spot (Chennai) are on screen.
 *  Shared with BranchesMap so its first frame is IDENTICAL to this section's last frame. */
export function flightGeometry(vw, vh) {
  const small = vw < 768;
  const rs = vw < 640 ? 78 : 104;
  const R = Math.max(vw * 0.62, vh * 0.55);
  const capH = vh * (small ? 0.3 : 0.36);
  const cx = vw * (small ? 0.5 : 0.46);
  const moonTop = vh - capH;
  const cy = moonTop + R;
  const earthPoint = (lon, lat) => {
    const [px, py] = earthPhotoPx(lon, lat);
    return [cx + ((px - EARTH_PHOTO.cx) / EARTH_PHOTO.r) * R, cy + ((py - EARTH_PHOTO.cy) / EARTH_PHOTO.r) * R];
  };
  const [ax, ay] = earthPoint(80.27, 13.08); // Chennai on the globe
  const ex = ax;
  const ey = ay - rs * 0.16;
  const sx = Math.min(vw - rs * 0.62, vw / 2 + 570 - rs * 0.4);
  const sy = vh - (small ? 48 : 64);
  const c1x = Math.min(vw * 1.05, sx + vw * 0.22);
  const c1y = vh * 0.28;
  const c2x = vw * 0.28;
  const c2y = -vh * 0.02;
  // final heading of the flight (same convention as the live rocket)
  const cub = (t) => {
    const u = 1 - t;
    return [
      u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
      u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
    ];
  };
  const [pa, pb] = [cub(0.985), cub(1)];
  let ang = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI;
  if (ang > 0) ang -= 360;
  return { vw, vh, small, rs, R, capH, cx, cy, moonTop, ax, ay, ex, ey, sx, sy, c1x, c1y, c2x, c2y, ang, earthPoint };
}

/** deterministic star field (so server / client / re-renders always agree) */
function makeStars(count, seed, size, alpha) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({
    x: +(rnd() * 100).toFixed(2),
    y: +(rnd() * 100).toFixed(2),
    r: +(size[0] + rnd() * (size[1] - size[0])).toFixed(2),
    o: +(alpha[0] + rnd() * (alpha[1] - alpha[0])).toFixed(2),
  }));
}
export const FAR_STARS = makeStars(110, 7, [0.5, 0.95], [0.28, 0.65]);
export const NEAR_STARS = makeStars(34, 31, [1, 1.7], [0.6, 1]);

export function Stars({ stars, svgRef, style }) {
  return (
    <svg ref={svgRef} aria-hidden="true" style={style} width="100%" height="100%">
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  );
}

/* Shooting stars and burning space rocks drifting through the background.
   All time-based CSS (they keep moving even when you stop scrolling).
   x0 / y0: start (vw / vh), d: seconds per crossing, w: tail length (px),
   s: rock size (px). They travel down-left at 40deg. */
export const STREAKS = [
  { x0: 70, y0: -8, d: 5.2, delay: 0.5, w: 170 },
  { x0: 105, y0: 10, d: 6.4, delay: 2.8, w: 220 },
  { x0: 45, y0: -12, d: 4.6, delay: 5.1, w: 140 },
  { x0: 120, y0: 30, d: 7.2, delay: 1.4, w: 190 },
  { x0: 85, y0: -5, d: 5.8, delay: 7.3, w: 160 },
  { x0: 20, y0: -10, d: 6.8, delay: 9.0, w: 130 },
  { x0: 110, y0: 55, d: 5.4, delay: 11.2, w: 200 },
];
export const ROCKS = [
  { x0: 95, y0: -10, d: 15, delay: 0, s: 30, spin: 9 },
  { x0: 125, y0: 8, d: 21, delay: 4, s: 18, spin: 6 },
  { x0: 60, y0: -14, d: 18, delay: 8, s: 44, spin: 14 },
  { x0: 115, y0: 40, d: 24, delay: 2, s: 22, spin: 7 },
  { x0: 80, y0: -12, d: 19, delay: 12, s: 14, spin: 5 },
  { x0: 135, y0: 22, d: 27, delay: 6, s: 36, spin: 11 },
];

export const SPACE_CSS = `
@keyframes ct-fly{from{transform:translate3d(0,0,0)}to{transform:translate3d(-125vw,105vw,0)}}
@keyframes ct-spin{to{transform:rotate(360deg)}}
@keyframes ct-twinkle{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes ct-pan{from{transform:translate3d(0,0,0)}to{transform:translate3d(-3.5vw,1.5vw,0)}}
@keyframes ct-bgdrift{from{transform:scale(1.12) translate3d(0,0,0)}to{transform:scale(1.12) translate3d(-2.5%,1.8%,0)}}
.ct-fly{position:absolute;left:0;top:0;will-change:transform;animation:ct-fly var(--d) linear var(--delay) infinite;opacity:0;animation-fill-mode:backwards}
.ct-streak{position:absolute;left:0;top:0;height:2px;width:var(--w);transform-origin:0 50%;transform:rotate(-40deg) scaleX(-1);border-radius:2px;
  background:linear-gradient(90deg,#fff 0,rgba(255,226,170,.95) 6%,rgba(255,138,76,.55) 35%,rgba(255,138,76,0) 100%);filter:drop-shadow(0 0 5px rgba(255,160,90,.9))}
.ct-tail{position:absolute;left:50%;top:50%;height:var(--h);width:calc(var(--s)*6);margin-top:calc(var(--h)/-2);transform-origin:0 50%;transform:rotate(-40deg);
  background:linear-gradient(90deg,rgba(255,196,110,.95) 0,rgba(255,110,40,.6) 25%,rgba(200,50,10,.25) 60%,transparent 100%);filter:blur(2.5px);border-radius:50%}
.ct-rock{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s)/-2) 0 0 calc(var(--s)/-2);animation:ct-spin var(--spin) linear infinite;
  border-radius:46% 54% 50% 50%/52% 46% 54% 48%;
  background:radial-gradient(circle at 32% 28%,#a98467 0,#6a4c3a 38%,#2f2018 78%,#1a110c 100%);
  box-shadow:0 0 calc(var(--s)*.6) rgba(255,120,40,.85),inset -3px -3px 6px rgba(0,0,0,.55),inset 2px 2px 4px rgba(255,190,120,.35)}
.ct-rock::after{content:"";position:absolute;left:24%;top:30%;width:24%;height:20%;border-radius:50%;background:rgba(20,10,6,.55);box-shadow:30px 16px 0 -2px rgba(20,10,6,.45)}
@media (prefers-reduced-motion:reduce){.ct-fly,.ct-rock{animation:none!important}}
`;

// the planet we land on: a real Earth photo texture (public/space/earth.webp, India near the top),
// with a plain blue gradient underneath as a fallback while the image loads
/* shown until the Earth photo is requested (only as the section gets close) */
export const MOON_PLACEHOLDER = "radial-gradient(circle at 50% 30%, #3f78b8 0%, #1d4f8f 45%, #0b2348 100%)";
export const MOON_BG = [
  "url(/space/earth.webp) center / 100% 100% no-repeat",
  "radial-gradient(circle at 38% 6%, #6fb4ff 0%, #2f7de0 28%, #1450a8 58%, #0a2a63 100%)",
].join(",");

export function RocketJourney({ children }) {
  const reduced = useReducedMotion();
  const holder = useRef(null);
  const near = useNear(holder); // Milky Way + Earth pictures load only as this part of the page gets close
  const bd = useRef(null);
  const st = useRef(null);
  const bgRef = useRef(null);
  const farRef = useRef(null);
  const nearRef = useRef(null);
  const moonRef = useRef(null);
  const svgRef = useRef(null);
  const maskRect = useRef(null);
  const maskPath = useRef(null);
  const trail = useRef(null);
  const rocket = useRef(null);
  const hud = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const holderEl = holder.current;
    const bdEl = bd.current;
    const stEl = st.current;
    const panel = holderEl?.querySelector("[data-flight-panel]");
    if (!holderEl || !bdEl || !stEl) return;
    const container = panel ? panel.offsetParent : null;

    const G = { vw: 0, vh: 0, F: 1, L: 1, rs: 100, sx: 0, sy: 0, ex: 0, ey: 0, cx: 0, moonTop: 0, capH: 0, rMax: 0, H: 0, tail: 0, originY: 0 };
    let active = false;
    let lastU = -1;

    const layout = () => {
      const vw = stEl.offsetWidth;
      const vh = stEl.offsetHeight;
      if (!vw || !vh) return;
      const small = vw < 768;
      G.vw = vw;
      G.vh = vh;
      G.F = (vh * FLIGHT_VH) / 100;
      const g = flightGeometry(vw, vh);
      G.rs = g.rs;
      G.sx = g.sx;
      G.sy = g.sy;

      // the Earth: a big sphere whose top cap rises from the bottom edge
      G.capH = g.capH;
      G.cx = g.cx;
      G.moonTop = g.moonTop;
      G.ex = g.ex;
      G.ey = g.ey;
      const R = g.R;
      const moon = moonRef.current;
      if (moon) {
        moon.style.width = moon.style.height = `${R * 2}px`;
        moon.style.left = `${G.cx - R}px`;
        moon.style.top = `${G.moonTop}px`;
      }

      // flight path (a long arc: up and over, then down onto India)
      const d = `M${g.sx.toFixed(1)} ${g.sy.toFixed(1)} C${g.c1x.toFixed(1)} ${g.c1y.toFixed(1)} ${g.c2x.toFixed(1)} ${g.c2y.toFixed(1)} ${g.ex.toFixed(1)} ${g.ey.toFixed(1)}`;
      trail.current?.setAttribute("d", d);
      maskPath.current?.setAttribute("d", d);
      svgRef.current?.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
      maskRect.current?.setAttribute("width", String(vw));
      maskRect.current?.setAttribute("height", String(vh));
      G.L = trail.current ? trail.current.getTotalLength() : 1;
      if (maskPath.current) maskPath.current.style.strokeDasharray = `${G.L} ${G.L}`;

      // testimonial panel geometry (for pinning / flying it off)
      if (panel && container) {
        G.H = panel.offsetHeight;
        G.tail = container.offsetHeight - (panel.offsetTop + panel.offsetHeight);
        G.originY = G.H + G.tail - vh;
      }
      if (rocket.current) rocket.current.style.width = rocket.current.style.height = `${G.rs}px`;
      if (hud.current) hud.current.style.display = vw < 560 ? "none" : "";
      lastU = -1;
    };

    const resetPanel = () => {
      if (!panel) return;
      const s = panel.style;
      s.transform = s.clipPath = s.opacity = s.visibility = s.transformOrigin = s.willChange = "";
    };
    const deactivate = () => {
      active = false;
      lastU = -1;
      resetPanel();
      bdEl.style.visibility = "hidden";
      stEl.style.visibility = "hidden";
    };
    const activate = () => {
      active = true;
      bdEl.style.visibility = "visible";
      stEl.style.visibility = "visible";
      if (panel) panel.style.willChange = "transform, opacity";
    };

    const update = () => {
      if (!G.vh) return;
      const f = clamp(G.vh - scrollRect(holderEl).bottom, 0, G.F);
      if (f <= 0) {
        if (active) deactivate();
        return;
      }
      if (!active) activate();
      const u = f / G.F;
      if (u === lastU) return;
      lastU = u;

      /* ---- 1. testimonial section: pinned, then off to the top-left ---- */
      const eRaw = range(u, 0.13, 0.5);
      const e = Math.pow(eRaw, 2.1);
      if (panel) {
        const s = panel.style;
        if (e >= 1) {
          s.visibility = "hidden";
        } else {
          s.visibility = "";
          s.transformOrigin = `0px ${G.originY}px`;
          s.transform = `translate3d(${(-G.vw * 0.95 * e).toFixed(2)}px,${(f - G.vh * 1.0 * e).toFixed(2)}px,0) rotate(${(-9 * e).toFixed(3)}deg) scale(${(1 - 0.7 * e).toFixed(4)})`;
          s.clipPath = `inset(${G.originY.toFixed(1)}px 0px ${(-G.tail).toFixed(1)}px 0px round ${(26 + 14 * e).toFixed(1)}px)`;
          s.opacity = String(1 - range(e, 0.72, 1));
        }
      }

      /* ---- 2. space behind: parallax stars + the Moon rising ---- */
      if (bgRef.current) bgRef.current.style.transform = `translate3d(${(-u * G.vw * 0.05).toFixed(1)}px,${(u * G.vh * 0.08).toFixed(1)}px,0)`;
      if (farRef.current) farRef.current.style.transform = `translate3d(0,${(u * G.vh * 0.1).toFixed(1)}px,0)`;
      if (nearRef.current) nearRef.current.style.transform = `translate3d(0,${(u * G.vh * 0.26).toFixed(1)}px,0)`;
      const m = easeOutCubic(range(u, 0.22, 0.78));
      if (moonRef.current) moonRef.current.style.transform = `translate3d(0,${((1 - m) * (G.capH + 60)).toFixed(1)}px,0)`;

      /* ---- 3. the rocket along its dotted trail ---- */
      const appear = easeOutCubic(range(u, 0, 0.1));
      const t = smooth(range(u, 0.12, 0.85));
      const trailEl = trail.current;
      if (trailEl && rocket.current) {
        const L = G.L;
        const p = trailEl.getPointAtLength(L * t);
        const a = trailEl.getPointAtLength(L * Math.max(0, t - 0.012));
        const b = trailEl.getPointAtLength(L * Math.min(1, t + 0.012));
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ang > 0) ang -= 360; // keep the turn continuous (up → left → down)
        const rumble = range(u, 0.03, 0.12) * (1 - range(u, 0.12, 0.2));
        const dx = Math.sin(u * 900) * 2.2 * rumble;
        const dy = Math.cos(u * 1100) * 1.6 * rumble;
        const land = range(u, 0.83, 0.92);
        const sc = appear * (1 - 0.55 * land);
        rocket.current.style.transform = `translate3d(${(p.x - G.rs / 2 + dx).toFixed(2)}px,${(p.y - G.rs / 2 + dy).toFixed(2)}px,0) rotate(${(ang + 45).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
        rocket.current.style.opacity = String(appear);
        if (maskPath.current) maskPath.current.style.strokeDashoffset = String(L * (1 - t));
        trailEl.style.opacity = String(1 - range(u, 0.9, 1));
      }
      if (hud.current) {
        hud.current.style.opacity = String(appear * (1 - range(u, 0.1, 0.2)));
        hud.current.style.transform = `translate3d(${(G.sx - G.rs * 0.8).toFixed(1)}px,${G.sy.toFixed(1)}px,0) translate(-100%,-50%)`;
      }

    };

    layout();
    deactivate();
    update();
    const off = onFrame(update);

    let ro;
    const relayout = () => {
      layout();
      update();
    };
    window.addEventListener("resize", relayout);
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(relayout);
      if (panel) ro.observe(panel);
      if (container) ro.observe(container);
    }
    return () => {
      off();
      window.removeEventListener("resize", relayout);
      ro?.disconnect();
      deactivate();
    };
  }, [reduced]);

  const layer = {
    gridArea: "1 / 1",
    alignSelf: "start",
    position: "sticky",
    top: 0,
    height: "100svh",
    width: "100%",
    overflow: "hidden",
    visibility: "hidden",
  };
  const fill = { position: "absolute", inset: 0 };

  return (
    <>
      <div ref={holder}>{children}</div>

      {!reduced && (
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateRows: "minmax(0,1fr)",
            width: "100%",
            height: `calc(${100 + FLIGHT_VH}svh)`,
            marginTop: "-100svh",
            pointerEvents: "none",
          }}
        >
          {/* BACKDROP: under the testimonial panel – space, stars and the Moon */}
          <div
            ref={bd}
            style={{
              ...layer,
              zIndex: 5,
              background: "#04070d",
            }}
          >
            <style>{SPACE_CSS}</style>
            {/* Milky Way photo: scroll parallax (outer) + slow endless drift (inner) */}
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
            {/* moving stars: scroll parallax + slow pan + twinkle */}
            <div style={{ position: "absolute", inset: 0, animation: "ct-pan 50s linear infinite alternate" }}>
              <Stars stars={FAR_STARS} svgRef={farRef} style={{ position: "absolute", left: 0, top: "-12%", height: "124%", willChange: "transform", animation: "ct-twinkle 7s ease-in-out infinite" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, animation: "ct-pan 28s linear infinite alternate" }}>
              <Stars stars={NEAR_STARS} svgRef={nearRef} style={{ position: "absolute", left: 0, top: "-30%", height: "160%", willChange: "transform", animation: "ct-twinkle 4.5s ease-in-out infinite" }} />
            </div>
            {/* shooting stars */}
            {STREAKS.map((m, i) => (
              <div key={`s${i}`} className="ct-fly" style={{ "--d": `${m.d}s`, "--delay": `${m.delay}s`, left: `${m.x0}vw`, top: `${m.y0}vh`, opacity: 1 }}>
                <i className="ct-streak" style={{ "--w": `${m.w}px` }} />
              </div>
            ))}
            {/* burning space rocks with fiery tails */}
            {ROCKS.map((m, i) => (
              <div key={`r${i}`} className="ct-fly" style={{ "--d": `${m.d}s`, "--delay": `${m.delay}s`, left: `${m.x0}vw`, top: `${m.y0}vh`, opacity: 1 }}>
                <i className="ct-tail" style={{ "--s": `${m.s}px`, "--h": `${m.s * 0.7}px` }} />
                <i className="ct-rock" style={{ "--s": `${m.s}px`, "--spin": `${m.spin}s` }} />
              </div>
            ))}
            <div
              ref={moonRef}
              style={{
                position: "absolute",
                borderRadius: "50%",
                background: near ? MOON_BG : MOON_PLACEHOLDER,
                boxShadow: "inset 0 14px 50px rgba(190,225,255,.45), 0 -6px 90px rgba(80,150,255,.45)",
                willChange: "transform",
              }}
            />
          </div>

          {/* STAGE: over the panel – trail, rocket, and the landing circle */}
          <div ref={st} style={{ ...layer, zIndex: 20 }}>
            <svg ref={svgRef} style={{ ...fill, width: "100%", height: "100%", overflow: "visible" }} preserveAspectRatio="none">
              <defs>
                <mask id={MASK_ID} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <rect ref={maskRect} x="0" y="0" width="100%" height="100%" fill="#000" />
                  <path ref={maskPath} fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="butt" />
                </mask>
              </defs>
              <path
                ref={trail}
                fill="none"
                stroke="#ff8a4c"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="0.1 14"
                mask={`url(#${MASK_ID})`}
              />
            </svg>

            <div
              ref={hud}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 0,
                whiteSpace: "nowrap",
                font: "500 11px/14px 'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: INK,
              }}
            >
              Next stop · From Chennai to 9 growth hubs &rarr;
            </div>

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
                opacity: 0,
                transformOrigin: "50% 50%",
                willChange: "transform, opacity",
                filter: "drop-shadow(0 8px 14px rgba(0,0,0,.35)) drop-shadow(0 0 16px rgba(255,138,76,.45))",
                userSelect: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default RocketJourney;
