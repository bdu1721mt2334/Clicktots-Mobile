// Purpose: Implement the ShutterTransition components module, keeping this responsibility separate for maintainability.
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { CAPTION_WORDS, ABOUT_CTA } from "@/pages/About/AboutReveal";
import { warmRobot } from "@/pages/About/robot/RobotBackdrop";
import AboutClicktots from "@/pages/About/AboutClicktots";
import { scrollToTarget } from "@/lib/scroll";
import { goHome } from "@/lib/router";

const BAR_COUNT = 5;
const STAGGER = 0.12;
const SCROLL_VH = 120;
const TIMELINE_LENGTH = 1 + (BAR_COUNT - 1) * STAGGER;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const power2InOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function ShutterBar({ progress, index, color }) {
  const scaleY = useTransform(progress, (v) => {
    const start = (BAR_COUNT - 1 - index) * STAGGER;
    return power2InOut(clamp01(v * TIMELINE_LENGTH - start));
  });

  return (
    <motion.div
      style={{
        flex: 1,
        width: "100%",
        backgroundColor: color,
        scaleY,
        transformOrigin: "bottom",
        willChange: "transform",
      }}
    />
  );
}

export default function ShutterTransition({ color = "#D2D2D2" }) {
  const isAboutPath = () => window.location.pathname.replace(/\/+$/, "") === "/about";
  const [aboutOpen, setAboutOpen] = useState(isAboutPath);
  const [originRect, setOriginRect] = useState(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    // build the About robot ahead of time, so About opens with it already there. Only in genuinely idle
    // time, a few seconds after load (never in the middle of the hero animation)
    const run = () => warmRobot().catch(() => {});
    let id = 0;
    const t = setTimeout(() => {
      if ("requestIdleCallback" in window) id = window.requestIdleCallback(run);
      else run();
    }, 6000);
    return () => {
      clearTimeout(t);
      if (id) window.cancelIdleCallback?.(id);
    };
  }, []);

  useEffect(() => {
    const sync = () => setAboutOpen(isAboutPath());
    const onOpenAbout = (e) => openAbout(e.detail || null);
    const onPrefetch = () => warmRobot().catch(() => {}); // pointer on the About button: get it ready now
    window.addEventListener("popstate", sync);
    window.addEventListener("clicktots:navigate", sync);
    window.addEventListener("open-about-clicktots", onOpenAbout);
    window.addEventListener("prefetch-about-frames", onPrefetch);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("clicktots:navigate", sync);
      window.removeEventListener("open-about-clicktots", onOpenAbout);
      window.removeEventListener("prefetch-about-frames", onPrefetch);
    };
  }, []);

  const openAbout = (rect) => {
    setOriginRect(rect);
    if (!isAboutPath()) window.history.pushState({ about: true }, "", "/about");
    setAboutOpen(true);
  };

  const closeAbout = () => {
    if (buttonRef.current) setOriginRect(buttonRef.current.getBoundingClientRect());
    if (window.history.state?.about) {
      window.history.back();
    } else {
      setAboutOpen(false);
      goHome();
    }
  };

  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const wasActive = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const active = v > 0;
    if (active === wasActive.current) return;
    wasActive.current = active;
    window.dispatchEvent(new CustomEvent("shutter-active", { detail: active }));
  });

  const stageOpacity = useTransform(scrollYProgress, (v) => (v > 0 ? 1 : 0));
  const stagePointerEvents = useTransform(scrollYProgress, (v) =>
    v > 0 ? "auto" : "none"
  );
  const solidO = useTransform(scrollYProgress, [0.96, 1], [0, 1]);
  const captionO = useTransform(scrollYProgress, [0.35, 0.8], [1, 0]);

  return (
    <div
      ref={wrapRef}
      className="relative z-20 w-full pointer-events-none"
      style={{ height: `${100 + SCROLL_VH}vh`, marginTop: `-${100 + SCROLL_VH}vh` }}
    >
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{
          opacity: stageOpacity,
          pointerEvents: stagePointerEvents,
          background: "transparent",
        }}
      >
        {/* Caption + About Clicktots button over the still-playing AboutReveal video */}
        <motion.div
          className="absolute inset-x-0 bottom-0 flex flex-col justify-between gap-4 sm:gap-6 px-5 pt-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-white sm:flex-row sm:items-end sm:p-10 lg:p-14"
          style={{ zIndex: 10, opacity: captionO }}
        >
          <div className="max-w-[40rem]">
            <p
              style={{
                margin: 0,
                color: "#fff",
                fontWeight: 500,
                fontSize: "clamp(0.85rem, 1.25vw, 1.2rem)",
                lineHeight: 1.6,
                letterSpacing: "-0.01em",
                textAlign: "left",
                textShadow: "0 1px 10px rgba(0,0,0,0.55)",
              }}
            >
              {CAPTION_WORDS.map((word, i) => (
                <span
                  key={i}
                  style={{ display: "inline-block", marginRight: "0.28em" }}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>
          <div className="shrink-0">
            <button
              ref={buttonRef}
              type="button"
              onMouseEnter={() => warmRobot().catch(() => {})}
              onFocus={() => warmRobot().catch(() => {})}
              onClick={(e) => {
                openAbout(e.currentTarget.getBoundingClientRect());
              }}
              className="ct-about-cta ct-btn ct-btn-primary pointer-events-auto gap-1.5 md:gap-2 px-4 py-2.5 md:px-6 md:py-3 lg:px-7 lg:py-3.5 text-[10.5px] md:text-xs lg:text-sm uppercase tracking-wider"
            >
              {ABOUT_CTA}
              <ArrowUpRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </button>
          </div>
        </motion.div>

        {/* ── Shutter bars ── */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col"
          style={{ zIndex: 30 }}
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <ShutterBar
              key={i}
              index={i}
              progress={scrollYProgress}
              color={color}
            />
          ))}
        </div>
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 31, backgroundColor: color, opacity: solidO }}
        />
      </motion.div>

      <AboutClicktots
        open={aboutOpen}
        originRect={originRect}
        onClose={closeAbout}
        onExploreWork={() => {
          closeAbout();
          setTimeout(() => scrollToTarget(document.getElementById("projects")), 850);
        }}
      />
    </div>
  );
}