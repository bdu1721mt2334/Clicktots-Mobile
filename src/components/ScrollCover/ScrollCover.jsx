// Purpose: Implement the ScrollCover components module, keeping this responsibility separate for maintainability.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";
import { clamp } from "@/lib/math";

/* ------------------------------------------------------------------ *
 *  ScrollCover: "the next section slides over the last one".
 *
 *  Used between Awards & Milestones (base) and Work in Motion (children):
 *    1. the Awards section scrolls normally until its end reaches the bottom
 *       of the screen, then it stays put (sticky);
 *    2. the dark Work in Motion panel rises over it with rounded top corners
 *       and a soft shadow, while the Awards behind it recede: they shrink a
 *       little, round off and dim;
 *       (advanced version: the base tips back in 3D, the panel arrives as a dome
 *       that flattens, a lime edge light runs along it, its content glides up);
 *    3. when the panel reaches the top, Awards is hidden and Work in Motion
 *       takes over. Nothing is empty at any point, and there is no fade or
 *       jump, just one continuous scroll.
 *
 *  The same idea as the Client Showcase → Testimonials scroll-over on this
 *  site. Everything is written straight to the DOM from the shared onFrame
 *  loop (no React state). Reduced motion: the two sections simply stack.
 * ------------------------------------------------------------------ */

/* How long (in screen heights of scrolling) Awards rests, fully visible, before the Work in Motion
   panel starts rising. Bigger = a longer pause. */
const HOLD_VH = 85;

const BASE_SCALE = 0.88;
const BASE_DIM = 0.6;
const BASE_RADIUS = 28;

export default function ScrollCover({ base, children, panelColor = "#0a0a0b" }) {
  const reduced = useReducedMotion();
  const stick = useRef(null);
  const inner = useRef(null);
  const dim = useRef(null);
  const cover = useRef(null);
  const rise = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const stickEl = stick.current;
    const innerEl = inner.current;
    const dimEl = dim.current;
    const coverEl = cover.current;
    const riseEl = rise.current;
    if (!riseEl || !stickEl || !innerEl || !dimEl || !coverEl) return;

    let H = 0;
    let vh = 0;
    let last = -1;

    const measure = () => {
      H = stickEl.offsetHeight;
      vh = window.innerHeight;
      // stick when the BOTTOM of the section meets the bottom of the screen
      stickEl.style.top = `${Math.min(0, vh - H).toFixed(1)}px`;
      // recede around the middle of what is currently visible
      innerEl.style.transformOrigin = `50% ${Math.max(0, H - vh / 2).toFixed(1)}px`;
      last = -1;
    };

    const update = () => {
      const cr = scrollRect(coverEl);
      // The shutter wipe has just filled the screen and the Work section is about to scroll away:
      // hide it right here, so the FAQ that waits underneath is already in place (no empty grey scroll).
      const done = cr.bottom <= vh + 1 && cr.top < 0;
      const hide = done ? "hidden" : "";
      if (coverEl.style.visibility !== hide) coverEl.style.visibility = hide;
      const p = clamp((vh - cr.top) / vh);
      if (p === last) return;
      last = p;
      // Awards recedes in 3D: it tips back, shrinks, drifts up and dims
      innerEl.style.transform =
        p > 0
          ? `perspective(1600px) translate3d(0,${(-4 * p).toFixed(2)}%,0) rotateX(${(5 * p).toFixed(2)}deg) scale(${(1 - (1 - BASE_SCALE) * p).toFixed(4)})`
          : "";
      innerEl.style.borderRadius = `${(BASE_RADIUS * p).toFixed(1)}px`;
      // the Work in Motion panel arrives as a wide dome that flattens into rounded corners
      const rx = `calc(${(50 * (1 - p)).toFixed(2)}% + ${(40 * p).toFixed(1)}px)`;
      const ry = `${(170 * (1 - p) * (1 - p) + 40).toFixed(1)}px`;
      coverEl.style.borderTopLeftRadius = `${rx} ${ry}`;
      coverEl.style.borderTopRightRadius = `${rx} ${ry}`;
      // a lime light runs along the rising edge, strongest mid-way
      const glow = Math.sin(Math.PI * p);
      coverEl.style.boxShadow = `0 -30px 90px -20px rgba(0,0,0,.65), 0 -10px ${(30 + 70 * glow).toFixed(0)}px -12px rgba(198,243,92,${(0.4 * glow).toFixed(3)})`;
      // the panel's content glides up into place a little after the panel itself
      riseEl.style.transform = p < 1 ? `translate3d(0,${((1 - p) * (1 - p) * 14).toFixed(2)}vh,0)` : "";
      dimEl.style.opacity = (BASE_DIM * p).toFixed(3);
      // fully covered: stop drawing / hovering the section underneath
      stickEl.style.visibility = p >= 1 ? "hidden" : "";
    };

    measure();
    update();
    const off = onFrame(update);
    const relayout = () => {
      measure();
      update();
    };
    window.addEventListener("resize", relayout);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(relayout) : null;
    ro?.observe(stickEl);
    return () => {
      off();
      window.removeEventListener("resize", relayout);
      ro?.disconnect();
      stickEl.style.visibility = "";
      coverEl.style.visibility = "";
    };
  }, [reduced]);

  return (
    <div className="relative w-full">
      <div ref={stick} className="relative z-0" style={reduced ? undefined : { position: "sticky" }}>
        <div ref={inner} style={{ position: "relative", overflow: "hidden", willChange: reduced ? undefined : "transform" }}>
          {base}
          <div
            ref={dim}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, background: "#000", opacity: 0, pointerEvents: "none", zIndex: 60 }}
          />
        </div>
      </div>
      {/* the pause: scrolling here keeps Awards pinned and readable, nothing else moves */}
      {!reduced && <div aria-hidden="true" style={{ height: `${HOLD_VH}vh`, pointerEvents: "none" }} />}
      <div
        ref={cover}
        className="relative z-10"
        style={{
          background: panelColor,
          overflow: "clip",
          borderTopLeftRadius: reduced ? 0 : "2.5rem",
          borderTopRightRadius: reduced ? 0 : "2.5rem",
          boxShadow: "0 -30px 90px -20px rgba(0,0,0,.65)",
        }}
      >
        <div ref={rise} style={{ willChange: reduced ? undefined : "transform" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
