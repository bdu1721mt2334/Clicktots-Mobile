// Purpose: Implement the Footer components module, keeping this responsibility separate for maintainability.
import { useEffect, useId, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { onFrame, scrollToTarget, scrollRect } from "@/lib/scroll";
import { navigate } from "@/lib/router";
import { SERVICES_DATA } from "@/pages/Services/servicesData";
import { scrollToServices } from "@/components/RingGallery/RingGallery";
import { useNear } from "@/hooks/useNear";
import "./Footer.css";

/* ------------------------------------------------------------------ *
 *  FOOTER  (reference: Driftbar footer)
 *
 *  - It is revealed from underneath: the footer stays fixed to the bottom of the screen
 *    and the page scrolls away from it (the wrapper clips it), so it "comes up" right after
 *    the Contact button forms. There is no gap between the two sections.
 *  - Background scene: the Milky Way over the moonscape (the same pictures as the hero
 *    and the rocket journey) instead of mountains, with drifting lime sparks.
 *  - The giant glass "Clicktots" lights up around the pointer on hover / touch.
 *  - Phones: a normal static footer (no reveal).
 *  - standalone: the same footer at the end of a service page (inside the service overlay). The page's
 *    scroll loop is paused there, so it runs its own frame loop; menu links close the page first.
 * ------------------------------------------------------------------ */

/** a frame loop of our own (used when the page's shared loop is paused, e.g. inside the service overlay) */
function ownLoop(fn) {
  let id = requestAnimationFrame(function tick(t) {
    fn(t);
    id = requestAnimationFrame(tick);
  });
  return () => cancelAnimationFrame(id);
}

const MENU = [
  { label: "Home", go: () => scrollToTarget(0) },
  { label: "Services", go: () => scrollToServices() },
  { label: "Projects", go: () => scrollToTarget(document.getElementById("c-stack-slider")) },
  { label: "Our Work", go: () => scrollToTarget(document.getElementById("c-work")) },
  { label: "FAQ", go: () => scrollToTarget(document.getElementById("faq")) },
];

/* replace the "#" with your real profile links */
const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "YouTube", href: "#" },
];

// Act IV · touchdown: back on the lunar horizon, dust gone, mission complete.
const PILLS = ["Accepting new AI growth partners · 2026", "Engineered in Chennai", "5 pillars, one autonomous engine"];

// drifting lime sparks (fixed values: no randomness, so it renders the same every time)
const SPARKS = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  bottom: 6 + ((i * 53) % 46),
  size: 2 + (i % 3),
  dur: 9 + ((i * 7) % 8),
  delay: -((i * 5) % 13),
}));

const WORD_CROP = 30; // % of the wordmark that sits below the screen edge (the letters are cut off at the bottom)
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const talk = () => window.dispatchEvent(new Event("clicktots:talk"));

export default function Footer({ standalone = false, onHome, onNavigate }) {
  // unique SVG ids, so a second footer (service pages) does not borrow the first one's gradients
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ID = { glass: `ftw-glass-${uid}`, light: `ftw-light-${uid}`, glow: `ftw-glow-${uid}` };
  const goMenu = (m) => {
    if (!standalone) return m.go();
    onHome?.(); // close the service page, then scroll the home page
    setTimeout(m.go, 700);
  };
  const wrapRef = useRef(null);
  const rootRef = useRef(null);
  const topRef = useRef(null);
  const skyRef = useRef(null);
  const wordRef = useRef(null);
  const svgRef = useRef(null);
  const lightRef = useRef(null);
  const lightGRef = useRef(null);
  const near = useNear(wrapRef); // the big moon picture is fetched only when the footer is getting close

  useEffect(() => {
    const wrap = wrapRef.current;
    const root = rootRef.current;
    const top = topRef.current;
    const sky = skyRef.current;
    const word = wordRef.current;
    const svg = svgRef.current;
    const light = lightRef.current;
    const lightG = lightGRef.current;
    if (!wrap || !svg) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = () => window.innerWidth < 768;

    /* pointer → light position (smoothed) */
    const tgt = { x: 500, y: 110, hx: 50, hy: 75 };
    const cur = { x: 500, y: 110, hx: 50, hy: 75 };
    let inside = false;
    const toSvg = (e) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(m.inverse());
      tgt.x = p.x;
      tgt.y = p.y;
      const r = root.getBoundingClientRect();
      tgt.hx = ((e.clientX - r.left) / r.width) * 100;
      tgt.hy = ((e.clientY - r.top) / r.height) * 100;
    };
    const enter = (e) => {
      inside = true;
      toSvg(e);
      cur.x = tgt.x;
      cur.y = tgt.y;
      lightG.style.opacity = 1;
      root.classList.add("is-lit");
    };
    const move = (e) => {
      if (!inside) enter(e);
      toSvg(e);
    };
    const leave = () => {
      inside = false;
      lightG.style.opacity = 0;
      root.classList.remove("is-lit");
    };
    // the whole bottom area of the footer reacts, so the light follows you into the letters
    const area = word.parentElement;
    area.addEventListener("pointerenter", enter);
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    area.addEventListener("pointercancel", leave);

    let lastReveal = -1;
    const off = (standalone ? ownLoop : onFrame)(() => {
      // light follows the pointer with a little ease
      if (inside || Math.abs(cur.x - tgt.x) > 0.05) {
        cur.x += (tgt.x - cur.x) * 0.18;
        cur.y += (tgt.y - cur.y) * 0.18;
        cur.hx += (tgt.hx - cur.hx) * 0.14;
        cur.hy += (tgt.hy - cur.hy) * 0.14;
        light.setAttribute("cx", cur.x.toFixed(1));
        light.setAttribute("cy", cur.y.toFixed(1));
        root.style.setProperty("--hx", `${cur.hx.toFixed(1)}%`);
        root.style.setProperty("--hy", `${cur.hy.toFixed(1)}%`);
      }

      // reveal progress: 0 = the footer's top edge reaches the bottom of the screen, 1 = fully shown
      if (reduced || phone()) {
        if (lastReveal !== 1) {
          lastReveal = 1;
          top.style.cssText = "";
          sky.style.transform = "";
          word.style.transform = "";
        }
        return;
      }
      const r = scrollRect(wrap);
      const reveal = clamp((window.innerHeight - r.top) / r.height);
      if (reveal === lastReveal) return;
      lastReveal = reveal;
      const e = 1 - reveal;
      const a = clamp((reveal - 0.12) / 0.5);
      top.style.opacity = a.toFixed(3);
      top.style.transform = `translate3d(0,${((1 - a) * 36).toFixed(1)}px,0)`;
      sky.style.transform = `translate3d(0,${(-e * 7).toFixed(2)}%,0) scale(1.08)`;
      word.style.transform = `translate3d(0,${(WORD_CROP + e * 14).toFixed(1)}%,0)`;
    });

    return () => {
      off();
      area.removeEventListener("pointerenter", enter);
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      area.removeEventListener("pointercancel", leave);
    };
  }, [standalone]);

  return (
    <div ref={wrapRef} className={`ft-wrap${standalone ? " ft-standalone" : ""}`} data-text-fade="off">
      <footer ref={rootRef} className="ft" aria-label="Footer">
        {/* ── background: light → Milky Way over the moon ── */}
        <div className="ft-bg" aria-hidden="true">
          <div className="ft-scene">
            <div ref={skyRef} className="ft-sky" />
            <div className={`ft-moon${near ? " is-near" : ""}`} />
            <div className="ft-sparks">
              {SPARKS.map((s, i) => (
                <i
                  key={i}
                  style={{
                    left: `${s.left}%`,
                    bottom: `${s.bottom}%`,
                    width: s.size,
                    height: s.size,
                    animationDuration: `${s.dur}s`,
                    animationDelay: `${s.delay}s`,
                  }}
                />
              ))}
            </div>
            <div className="ft-halo" />
            <div className="ft-mist" />
          </div>
        </div>

        {/* ── content ── */}
        <div ref={topRef} className="ft-top">
          <div className="ft-brand">
            <h3 className="ft-tag">Every market breakthrough starts with a click.</h3>
            <p className="ft-desc">
              An AI-powered digital marketing agency in Chennai. Conversion websites, predictive SEO &amp; AEO,
              generative design, branding and performance marketing engineered as one system, so your
              business dominates its category.
            </p>
            <button type="button" className="ft-cta" onClick={talk}>
              Talk to our experts
              <ArrowUpRight size={15} />
            </button>
            <div className="ft-pills">
              {PILLS.map((t, i) => (
                <span key={t} className="ft-pill">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <nav className="ft-col" aria-label="Menu">
            <h4>Menu</h4>
            <ul>
              {MENU.map((m) => (
                <li key={m.label}>
                  <button type="button" onClick={() => goMenu(m)}>
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="ft-col" aria-label="Services">
            <h4>Services</h4>
            <ul>
              {SERVICES_DATA.map((s) => (
                <li key={s.slug}>
                  <a
                    href={s.path}
                    onClick={(e) => {
                      e.preventDefault();
                      if (standalone && onNavigate) onNavigate(s.path);
                      else navigate(s.path, { rect: e.currentTarget.getBoundingClientRect() });
                    }}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="ft-col" aria-label="Follow us">
            <h4>Follow us</h4>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            {/* Google Partner badge (official snippet; registered for clicktots.com) */}
            <h4 className="ft-partner-h">Our Partner</h4>
            <a
              className="ft-badge"
              href="https://www.google.com/partners/agency?id=4406347005"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Clicktots Technologies is a Google Partner (opens Google Partners profile)"
            >
              <img
                src="https://www.gstatic.com/partners/badge/images/2026/PartnerBadgeClickable.svg"
                alt="Google Partner"
                width="132"
                height="126"
                loading="lazy"
                decoding="async"
              />
            </a>
          </nav>
        </div>

        {/* ── giant glass wordmark: lights up around the pointer ── */}
        <div className="ft-bottom">
          <div ref={wordRef} className="ft-word">
            <h2 className="sr-only">Clicktots</h2>
            <svg ref={svgRef} viewBox="0 0 1000 215" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id={ID.glass} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
                  <stop offset="0.55" stopColor="#fff" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
                </linearGradient>
                <radialGradient
                  ref={lightRef}
                  id={ID.light}
                  gradientUnits="userSpaceOnUse"
                  cx="500"
                  cy="110"
                  r="170"
                >
                  <stop offset="0" style={{ stopColor: "var(--ft-l1)" }} />
                  <stop offset="0.3" style={{ stopColor: "var(--ft-l2)" }} />
                  <stop offset="0.65" style={{ stopColor: "var(--ft-l3)" }} stopOpacity="0.6" />
                  <stop offset="1" style={{ stopColor: "var(--ft-l3)" }} stopOpacity="0" />
                </radialGradient>
                <filter id={ID.glow} x="-8%" y="-30%" width="116%" height="160%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
              </defs>
              <text
                x="500"
                y="175"
                textAnchor="middle"
                fontSize="200"
                textLength="985"
                lengthAdjust="spacingAndGlyphs"
                fill={`url(#${ID.glass})`}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.9"
              >
                Clicktots
              </text>
              <g ref={lightGRef} className="ft-lit" style={{ opacity: 0 }}>
                <text
                  x="500"
                  y="175"
                  textAnchor="middle"
                  fontSize="200"
                  textLength="985"
                  lengthAdjust="spacingAndGlyphs"
                  fill={`url(#${ID.light})`}
                  filter={`url(#${ID.glow})`}
                >
                  Clicktots
                </text>
                <text
                  x="500"
                  y="175"
                  textAnchor="middle"
                  fontSize="200"
                  textLength="985"
                  lengthAdjust="spacingAndGlyphs"
                  fill={`url(#${ID.light})`}
                >
                  Clicktots
                </text>
              </g>
            </svg>
          </div>
          <p className="ft-copy">© 2026 Clicktots Technologies · Made in Chennai</p>
        </div>
      </footer>
    </div>
  );
}
