// Purpose: the "360° AI orbit" layer of the Services ring — a 360° light sweep (a scanner beam circles
// the ring and lights up each card as it passes), the section header and the live card counter with
// its 0°→360° progress arc. RingGallery.jsx renders these pieces and calls updateOrbit() every frame.
import { useRef } from "react";
import { SERVICE_CARDS } from "@/pages/Services/servicesData";
import "./orbit.css";

/* ---------- content ---------- */
const HEADER = {
  eyebrow: "360° AI-powered services",
  title: "One orbit.",
  titleMuted: "Ten AI-driven capabilities.",
  sub: "The system behind the results: analytics, AI SEO, paid media and conversion design feed each other in real time, all the way around your brand.",
};

/* ---------- look ---------- */
const SWEEP_SECONDS = 7; // one full 360° pass of the light beam
const ARC_R = 13; // radius of the progress arc beside the counter (svg units)

const D2R = Math.PI / 180;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mod = (n, m) => ((n % m) + m) % m;
const pad = (n) => String(n).padStart(2, "0");
const wrap180 = (a) => mod(a + 180, 360) - 180;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** All DOM refs the orbit needs, created once by RingGallery. */
export function useOrbitRefs() {
  return {
    track: useRef(null), // faint 360° circle under the cards
    beam: useRef(null), // the sweeping light on the floor of the ring
    scan: useRef(null), // the upright scan line at the beam's head
    arc: useRef(null), // progress arc beside the counter
    hud: useRef(null),
    header: useRef(null),
    lines: useRef([]), // header lines (masked rise in / out)
    counter: useRef(null),
    odometer: useRef(null),
    cardName: useRef(null),
    degree: useRef(null),
    state: useRef({ card: 0, lit: [] }),
  };
}

/* ---------- 3D pieces (rendered inside .rg-centre, same space as the cards) ---------- */
export function OrbitScene({ refs }) {
  return (
    <>
      <i ref={refs.track} className="rg-track" aria-hidden="true" />
      <i ref={refs.beam} className="rg-beam" aria-hidden="true" />
      <i ref={refs.scan} className="rg-scan" aria-hidden="true" />
    </>
  );
}

/* ---------- 2D header + counter (rendered inside .rg-frame) ---------- */
export function OrbitHud({ refs, count }) {
  const line = (i, className, children) => (
    <span className="rg-hl-mask">
      <span ref={(el) => (refs.lines.current[i] = el)} className={`rg-hl-line ${className}`}>
        {children}
      </span>
    </span>
  );
  return (
    <div ref={refs.hud} className="rg-hud" aria-hidden="true">
      {/* left column: header, then the counter under it (the ring rises highest on the right) */}
      <div className="rg-hud-left">
      <div ref={refs.header} className="rg-hud-title">
        {line(0, "rg-hud-eyebrow", (
          <>
            {HEADER.eyebrow}
          </>
        ))}
        {line(1, "rg-hud-h", (
          <>
            {HEADER.title} <em>{HEADER.titleMuted}</em>
          </>
        ))}
        {line(2, "rg-hud-sub", HEADER.sub)}
      </div>

      <div ref={refs.counter} className="rg-hud-count">
        {/* 0° → 360° progress arc: fills as the cards come into focus */}
        <svg className="rg-arc" viewBox="-16 -16 32 32" aria-hidden="true">
          <circle r={ARC_R} className="rg-arc-track" />
          <circle
            ref={refs.arc}
            r={ARC_R}
            className="rg-arc-fill"
            transform="rotate(-90)"
            style={{ strokeDasharray: 2 * Math.PI * ARC_R, strokeDashoffset: 2 * Math.PI * ARC_R }}
          />
        </svg>
        <p className="rg-hud-num">
          {/* odometer: the strip rolls to the card number */}
          <span className="rg-odo">
            <span ref={refs.odometer} className="rg-odo-strip">
              {Array.from({ length: count }, (_, i) => (
                <b key={i}>{pad(i + 1)}</b>
              ))}
            </span>
          </span>
          <span className="rg-hud-of">/ {pad(count)}</span>
        </p>
        <div>
          <p ref={refs.cardName} className="rg-hud-name">
            {SERVICE_CARDS[0].title}
          </p>
          <p className="rg-hud-deg">
            <span ref={refs.degree}>000°</span> of 360°
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

/** Bottom of the header lines, in px from the frame's top: the ring is laid out below it. */
export function orbitHeaderBottom(refs) {
  const h = refs.header.current;
  if (!h) return 0;
  let top = h.offsetTop;
  for (let p = h.offsetParent; p && !p.classList.contains("rg-hud"); p = p.offsetParent) top += p.offsetTop;
  return top + h.offsetHeight;
}

/**
 * Per-frame update, called from RingGallery's scroll loop.
 * f = { stage, rot, time, reduced, formation, expansion, cover, radius, pers, tilt,
 *       cardScale, focusSlot, frontSlot, cardAt, count, cards (the card elements, by slot) }
 */
export function updateOrbit(refs, f) {
  const st = refs.state.current;
  const formed = clamp01((f.formation - 0.62) / 0.38);
  const tiltCos = Math.cos(f.tilt * D2R);
  const bandY = 80 * f.cardScale + 18;

  /* 360° light sweep: a beam circles the ring at its own pace (independent of the scroll), and
     every card it passes lights up for a moment. Angles are in the cards' angle space. */
  const beamAngle = f.reduced ? 999 : -((f.time / 1000) * (360 / SWEEP_SECONDS)) % 360;
  const floorO = formed * (1 - clamp01(f.expansion / 0.6)) * (1 - f.cover); // floor pieces: outside view only
  const floorY = bandY + 22 * f.cardScale;
  const dr = f.radius * 1.08;
  const setFloor = (el, size) => {
    if (!el) return false;
    if (floorO <= 0.01 || f.reduced) {
      el.style.visibility = "hidden";
      return false;
    }
    el.style.visibility = "visible";
    el.style.width = el.style.height = `${2 * size}px`;
    el.style.opacity = floorO.toFixed(3);
    return true;
  };
  if (setFloor(refs.track.current, dr)) {
    refs.track.current.style.transform = `translate3d(${-dr}px,${floorY - dr}px,0) rotateX(90deg)`;
  }
  if (setFloor(refs.beam.current, dr)) {
    // a disc point at clock angle β sits under the card whose angle is −(β + rotation): head at β = 0
    refs.beam.current.style.transform = `translate3d(${-dr}px,${floorY - dr}px,0) rotateX(90deg) rotateZ(${(-beamAngle).toFixed(2)}deg)`;
  }
  const scan = refs.scan.current;
  if (scan) {
    const hx = -Math.sin(beamAngle * D2R) * dr;
    const hz = -Math.cos(beamAngle * D2R) * dr;
    const behind = hz * tiltCos >= f.pers - 120;
    if (floorO <= 0.01 || f.reduced || behind) scan.style.visibility = "hidden";
    else {
      const h = 220 * f.cardScale;
      scan.style.visibility = "visible";
      scan.style.height = `${h}px`;
      scan.style.transform = `translate3d(${hx.toFixed(1)}px,${(floorY - h).toFixed(1)}px,${hz.toFixed(1)}px) rotateY(${beamAngle.toFixed(2)}deg)`;
      scan.style.opacity = floorO.toFixed(3);
    }
  }
  // light up each card as the beam passes (a quick rise ahead of the beam, a slower fade behind it)
  const litK = f.reduced ? 0 : 0.35 + 0.65 * (1 - f.cover);
  for (let slot = 0; slot < f.count; slot++) {
    const el = f.cards[slot];
    if (!el) continue;
    const angle = wrap180((360 * slot) / f.count + f.rot);
    const d = wrap180(angle - beamAngle);
    const lit = (d < 0 ? Math.exp(-((d / 9) ** 2)) : Math.exp(-d / 26)) * litK;
    const v = lit.toFixed(2);
    if (st.lit[slot] !== v) {
      st.lit[slot] = v;
      el.style.setProperty("--lit", v);
    }
  }

  /* header: each line rises out of its mask as the ring forms, then lifts away as the camera enters */
  const hud = refs.hud.current;
  if (!hud) return;
  const hudO = 1 - clamp01(f.cover / 0.5);
  hud.style.visibility = hudO > 0.01 ? "visible" : "hidden";
  hud.style.opacity = hudO.toFixed(3);
  refs.lines.current.forEach((el, i) => {
    if (!el) return;
    const tin = f.reduced ? 1 : easeOut(clamp01((f.formation - 0.22 - i * 0.09) / 0.34));
    const tout = f.reduced ? 0 : easeOut(clamp01((f.expansion - 0.2 - i * 0.05) / 0.3));
    el.style.transform = `translate3d(0,${((1 - tin) * 108 - tout * 108).toFixed(2)}%,0)`;
  });

  /* counter: comes in with the ring, stays for the whole orbit; the number rolls, the name wipes in */
  const counter = refs.counter.current;
  if (counter) {
    const cin = f.reduced ? 1 : easeOut(clamp01((f.formation - 0.5) / 0.4));
    counter.style.opacity = cin.toFixed(3);
    counter.style.transform = `translate3d(0,${((1 - cin) * 14).toFixed(1)}px,0)`;
  }
  f.stage.classList.toggle("rg-converge", f.cover > 0.12);

  // outside the ring the nearest card is the front one; inside, the card straight ahead
  const fc = f.cardAt(f.expansion < 0.5 ? f.frontSlot : f.focusSlot);
  if (st.card !== fc.n) {
    const first = st.card === 0;
    st.card = fc.n;
    if (refs.odometer.current) refs.odometer.current.style.transform = `translate3d(0,${-(fc.n - 1)}em,0)`;
    const name = refs.cardName.current;
    if (name) {
      name.textContent = SERVICE_CARDS[fc.n - 1].title;
      if (!first && !f.reduced && name.animate) {
        name.animate(
          [
            { clipPath: "inset(0 100% 0 0)", transform: "translateX(-6px)" },
            { clipPath: "inset(0 0 0 0)", transform: "none" },
          ],
          { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    }
    if (refs.degree.current) refs.degree.current.textContent = `${String(((fc.n - 1) * 360) / f.count).padStart(3, "0")}°`;
    if (refs.arc.current) {
      const circ = 2 * Math.PI * ARC_R;
      refs.arc.current.style.strokeDashoffset = (circ * (1 - fc.n / f.count)).toFixed(2);
    }
  }
}
