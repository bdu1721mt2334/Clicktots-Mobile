// Purpose: Implement the ScrollOverHero components module, keeping this responsibility separate for maintainability.
import * as React from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";

/* ------------------------------------------------------------------ *
 *  Scroll Over (from Ruixen "Scroll Over Hero"), adapted to this site.
 *
 *    1. HOLD  – the Client Showcase fills the screen and stays pinned for
 *               `holdVh` of scrolling, so visitors can play with the balls
 *    2. RISE  – the white testimonial section rises over it, slower than
 *               the scroll (`rise`), growing 0.95 → 1, while the Client
 *               Showcase goes backwards: shrinks, blurs and dims
 *    3. the testimonial section then scrolls normally (any height)
 *
 *  The Client Showcase reads its own rect.top for its white → black fade, so
 *  it is only ever scaled from its TOP edge (rect.top never changes) and
 *  blurred / dimmed – never moved.
 *  Reduced motion: plain stacked sections, no pin, no effects.
 * ------------------------------------------------------------------ */

export interface ScrollOverHeroProps {
  /** The layer that stays pinned and is covered (the Client Showcase). */
  base: React.ReactNode;
  /** The panel that rises over it (the testimonials). */
  children: React.ReactNode;
  /** Extra scroll (in vh) the Client Showcase stays untouched before the rise. */
  holdVh?: number;
  /**
   * How much slower than the scroll the panel rises (0 = 1:1, 0.4 = 40 % slower).
   * Higher = longer, calmer rise.
   */
  rise?: number;
  /** Extra scroll runway (in svh) reserved below the panel so a rocket flight can pin it with native CSS sticky. */
  flightVh?: number;
  /** Background of the rising panel. Default white. */
  panelClassName?: string;
  id?: string;
  className?: string;
}

const PANEL_SCALE = 0.95; // panel grows 0.95 → 1
const BASE_SCALE = 0.9; // client section recedes 1 → 0.9
const BASE_BLUR = 9; // px
const BASE_DIM = 0.55;

export function ScrollOverHero({
  base,
  children,
  holdVh = 100,
  rise = 0.4,
  flightVh = 0,
  panelClassName,
  id,
  className,
}: ScrollOverHeroProps) {
  const reduced = useReducedMotion();
  const spacerRef = React.useRef<HTMLDivElement>(null);
  const baseWrapRef = React.useRef<HTMLDivElement>(null);
  const k = Math.min(0.8, Math.max(0, rise));

  const progress = useMotionValue(0); // 0 → 1 over the rise
  const panelY = useMotionValue(0); // px the panel lags behind the scroll

  React.useEffect(() => {
    if (reduced) return;
    const el = spacerRef.current;
    if (!el) return;
    let vh = 0;
    let lastP = -1;
    let lastY = -1;
    let baseHidden = false;

    const measure = () => {
      const spH = holdVh > 0 ? el.offsetHeight / (holdVh / 100) : 0;
      const next = spH > 100 ? spH : baseWrapRef.current?.offsetHeight || window.innerHeight || 1;
      if (Math.abs(next - vh) >= 1) {
        vh = next;
        lastP = -1;
        lastY = -1;
      }
    };

    const update = () => {
      if (!vh) measure();
      const dist = vh / (1 - k); // scroll distance of the whole rise
      // the spacer's bottom edge = where the panel would sit without any lag
      const s = Math.max(0, vh - scrollRect(el).bottom);
      const p = Math.min(1, s / dist);
      const y = k * dist * p;
      if (p !== lastP) {
        lastP = p;
        progress.set(p);
      }
      if (Math.abs(y - lastY) >= 0.05) {
        lastY = y;
        panelY.set(y);
      }
      const hideBase = p >= 0.999;
      if (hideBase !== baseHidden && baseWrapRef.current) {
        baseHidden = hideBase;
        baseWrapRef.current.style.visibility = hideBase ? "hidden" : "";
      }
    };

    measure();
    update();
    const off = onFrame(update);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      off();
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      if (baseWrapRef.current) baseWrapRef.current.style.visibility = "";
    };
  }, [reduced, k, holdVh, progress, panelY]);

  const panelScale = useTransform(progress, [0, 1], [PANEL_SCALE, 1]);
  const baseScale = useTransform(progress, [0, 1], [1, BASE_SCALE]);
  const baseRadius = useTransform(progress, [0, 1], [0, 28]);
  const baseFilter = useTransform(progress, (v) => {
    if (v < 0.004 || (typeof window !== "undefined" && window.innerWidth < 768)) return "none";
    return `blur(${(v * BASE_BLUR).toFixed(2)}px)`;
  });
  const dim = useTransform(progress, [0, 1], [0, BASE_DIM]);

  const panelBg = panelClassName ?? "bg-white";
  // the panel lags by up to k/(1-k) screens – reserve that room at the end
  const tail = `calc(${(k / (1 - k)).toFixed(4)} * 100svh)`;

  return (
    <div id={id} className={cn("relative w-full", className)}>
      {/* pinned layer */}
      <div
        ref={baseWrapRef}
        className={cn(
          "soh-base-wrap relative z-0 min-h-[560px] bg-black",
          !reduced && "sticky top-0 h-screen-s",
        )}
      >
        <motion.div
          style={
            reduced
              ? undefined
              : {
                  scale: baseScale,
                  filter: baseFilter,
                  borderRadius: baseRadius,
                  transformOrigin: "50% 0%",
                }
          }
          className="h-full w-full overflow-hidden"
        >
          {base}
        </motion.div>
        {!reduced && (
          <motion.div
            aria-hidden="true"
            style={{ opacity: dim }}
            className="pointer-events-none absolute inset-0 z-[60] bg-black"
          />
        )}
      </div>

      {/* HOLD: scroll distance during which the client section stays untouched */}
      {!reduced && (
        <div ref={spacerRef} aria-hidden="true" style={{ height: `${holdVh}svh` }} />
      )}

      {/* rising panel. The wrapper is the handle the rocket journey grabs
          (data-flight-panel): it pins natively via CSS sticky at its end, then flies off
          to the top-left corner with zero scroll-counter jitter. */}
      <div data-flight-panel="" className="relative z-10">
        <motion.section
          aria-label="Testimonials"
          style={reduced ? undefined : { scale: panelScale, y: panelY, transformOrigin: "50% 0%" }}
          className={cn(
            "soh-panel relative min-h-[100svh] w-full rounded-t-[1.75rem] px-4 pb-24 pt-16 shadow-[0_-30px_90px_-20px_rgba(0,0,0,0.65)] sm:px-8 md:rounded-t-[2.5rem] md:pb-32 md:pt-24", // px = the navbar's, so the content lines up with it
            panelBg,
          )}
        >
          {children}
        </motion.section>
      </div>
      {!reduced && <div data-flight-tail="" aria-hidden="true" style={{ height: tail, pointerEvents: "none" }} />}
      {!reduced && flightVh > 0 && (
        <div aria-hidden="true" style={{ height: `${flightVh}svh`, pointerEvents: "none" }} />
      )}
    </div>
  );
}

export default ScrollOverHero;
