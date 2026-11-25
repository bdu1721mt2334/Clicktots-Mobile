// Purpose: HUD header + live card counter for the Services 3D orbit (light sweep/track animation removed for 120fps smoothness).
import { useRef } from "react";
import { SERVICE_CARDS } from "@/pages/Services/servicesData";
import "./orbit.css";

const HEADER = {
  eyebrow: "360° AI-powered services",
  title: "One orbit.",
  titleMuted: "Ten AI-driven capabilities.",
  sub: "The system behind the results: analytics, AI SEO, paid media and conversion design feed each other in real time, all the way around your brand.",
};

const ARC_R = 13;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pad = (n) => String(n).padStart(2, "0");
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function useOrbitRefs() {
  return {
    arc: useRef(null),
    hud: useRef(null),
    header: useRef(null),
    lines: useRef([]),
    counter: useRef(null),
    odometer: useRef(null),
    cardName: useRef(null),
    degree: useRef(null),
    state: useRef({ card: 0, lastHudO: "", lastCover: false, lastLines: ["", "", ""], lastCin: "" }),
  };
}

export function OrbitScene() {
  return null;
}

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
      <div className="rg-hud-left">
        <div ref={refs.header} className="rg-hud-title">
          {line(0, "rg-hud-eyebrow", <>{HEADER.eyebrow}</>)}
          {line(1, "rg-hud-h", (
            <>
              {HEADER.title} <em>{HEADER.titleMuted}</em>
            </>
          ))}
          {line(2, "rg-hud-sub", HEADER.sub)}
        </div>

        <div ref={refs.counter} className="rg-hud-count">
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

/** Bottom of the header lines, in px from the frame's top (measured only on resize, never per frame). */
export function orbitHeaderBottom(refs) {
  const h = refs.header.current;
  if (!h) return 0;
  let top = h.offsetTop;
  for (let p = h.offsetParent; p && !p.classList.contains("rg-hud"); p = p.offsetParent) top += p.offsetTop;
  return top + h.offsetHeight;
}

/** Lightweight per-frame HUD update (only writes DOM when values actually change). */
export function updateOrbit(refs, f) {
  const st = refs.state.current;
  const hud = refs.hud.current;
  if (!hud) return;

  const hudO = 1 - clamp01(f.cover / 0.5);
  const hudOStr = hudO.toFixed(3);
  if (st.lastHudO !== hudOStr) {
    st.lastHudO = hudOStr;
    hud.style.visibility = hudO > 0.01 ? "visible" : "hidden";
    hud.style.opacity = hudOStr;
  }

  for (let i = 0; i < 3; i++) {
    const el = refs.lines.current[i];
    if (!el) continue;
    const tin = f.reduced ? 1 : easeOut(clamp01((f.formation - 0.22 - i * 0.09) / 0.34));
    const tout = f.reduced ? 0 : easeOut(clamp01((f.expansion - 0.2 - i * 0.05) / 0.3));
    const yStr = ((1 - tin) * 108 - tout * 108).toFixed(2);
    if (st.lastLines[i] !== yStr) {
      st.lastLines[i] = yStr;
      el.style.transform = `translate3d(0,${yStr}%,0)`;
    }
  }

  const counter = refs.counter.current;
  if (counter) {
    const cin = f.reduced ? 1 : easeOut(clamp01((f.formation - 0.5) / 0.4));
    const cinStr = cin.toFixed(3);
    if (st.lastCin !== cinStr) {
      st.lastCin = cinStr;
      counter.style.opacity = cinStr;
      counter.style.transform = `translate3d(0,${((1 - cin) * 14).toFixed(1)}px,0)`;
    }
  }

  const conv = f.cover > 0.12;
  if (st.lastCover !== conv) {
    st.lastCover = conv;
    f.stage.classList.toggle("rg-converge", conv);
  }

  const fc = f.cardAt(f.expansion < 0.5 ? f.frontSlot : f.focusSlot);
  if (st.card !== fc.n) {
    st.card = fc.n;
    if (refs.odometer.current) refs.odometer.current.style.transform = `translate3d(0,${-(fc.n - 1)}em,0)`;
    const name = refs.cardName.current;
    if (name) {
      name.textContent = SERVICE_CARDS[fc.n - 1].title;
    }
    if (refs.degree.current) refs.degree.current.textContent = `${String(((fc.n - 1) * 360) / f.count).padStart(3, "0")}°`;
    if (refs.arc.current) {
      const circ = 2 * Math.PI * ARC_R;
      refs.arc.current.style.strokeDashoffset = (circ * (1 - fc.n / f.count)).toFixed(2);
    }
  }
}
