// Purpose: Implement the AboutReveal pages module, keeping this responsibility separate for maintainability.
import { useRef, useEffect, useCallback } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { AboutVideo, ASSET_ABOUT_POSTER } from "@/pages/About/AboutVideo";

// Still photo kept as an export: Key Facts still uses it for its image card.
export const ASSET_ABOUT_PHOTO = ASSET_ABOUT_POSTER;

// Exposed so AboutClicktots / ShutterTransition can reference the single video element.
export const aboutVideoRef = { current: null };

const EXPAND_START = 0.48; // photo starts growing out of the pill
const EXPAND_END = 0.72; // photo is fullscreen (and stays)
const TRACK_VH = 330; // 100vh stage + 230vh of AboutReveal scroll
const SHUTTER_VH = 120; // extra 120vh so the single <video> stays pinned during ShutterTransition
const OVERLAP_VH = 70; // how much of Earthrise's pinned tail it overlaps
const OVERLAP_LOCAL = OVERLAP_VH / (TRACK_VH - 100);
const ASTRONAUT_RATE = 58 / (0.3 * (440 - 100));
const ABOUT_GAP_VH = 42;

export const ABOUT_CTA = "Inside our AI engine";

export const CAPTION_WORDS =
  "Born in Chennai and powered by autonomous AI, Clicktots unites predictive performance marketing, generative brand storytelling, and high-craft web engineering to turn ambitious brands into category leaders.".split(
    " "
  );
const CAPTION_START = 0.74;
const CAPTION_END = 0.93;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const map = (p, a, b, from, to) => from + (to - from) * clamp01((p - a) / (b - a));

const pillSize = (w) => ({
  pw: Math.min(w * 0.28, 400),
  ph: Math.min(w * 0.11, 150),
});

export function AboutReveal() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const videoLayerRef = useRef(null);
  const overlayRef = useRef(null);
  const wordsLayerRef = useRef(null);
  const leadWordRef = useRef(null);
  const trailWordRef = useRef(null);
  const pillGapRef = useRef(null);
  const captionLayerRef = useRef(null);
  const buttonWrapRef = useRef(null);
  const wordRefs = useRef([]);
  const shutterActiveRef = useRef(false);

  const sizeRef = useRef(
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1440, h: 900 }
  );
  const aboutVisibleRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const applyProgress = useCallback((local) => {
    const p = 0.16 + local * 0.84;
    const { w, h } = sizeRef.current;
    const { pw, ph } = pillSize(w);

    const scrolledVH = local * (TRACK_VH - 100);
    const offsetVH = Math.max(0, ABOUT_GAP_VH - ASTRONAUT_RATE * scrolledVH);
    const tRise = clamp01(1 - offsetVH / ABOUT_GAP_VH);
    const aboutO = map(tRise, 0, 0.3, 0, 1);
    const aboutY = (offsetVH / 100) * h;
    const aboutScale = 0.85 + 0.15 * tRise;
    const riseTransform = `translate3d(0, ${aboutY.toFixed(2)}px, 0) scale(${aboutScale.toFixed(4)})`;

    const aboutVisible = aboutO > 0.01;
    if (aboutVisible !== aboutVisibleRef.current) {
      aboutVisibleRef.current = aboutVisible;
      const v = aboutVideoRef.current;
      if (v) {
        if (aboutVisible) v.play().catch(() => {});
        else v.pause();
      }
    }

    const e = easeInOutCubic(clamp01((p - EXPAND_START) / (EXPAND_END - EXPAND_START)));
    const push = e * ((w - pw) / 2 + 40);
    const wordsO = 1 - 0.85 * e;
    const wordsGone = p >= EXPAND_END;
    const k = 1 - e;
    const insetY = ((h - ph) / 2) * k;
    const insetX = ((w - pw) / 2) * k;
    const radius = (ph / 2) * k;
    const photoFull = p >= EXPAND_END;
    const photoClip = photoFull
      ? "none"
      : `inset(${insetY.toFixed(2)}px ${insetX.toFixed(2)}px ${insetY.toFixed(2)}px ${insetX.toFixed(2)}px round ${radius.toFixed(2)}px)`;
    const overlayO = map(p, 0.66, 0.76, 0, 0.72);

    const captionO = map(p, 0.74, 0.82, 0, 1);
    const captionY = (1 - captionO) * 20;

    if (stageRef.current) {
      stageRef.current.style.background =
        local >= OVERLAP_LOCAL ? "#000" : "transparent";
    }

    if (videoLayerRef.current) {
      const vl = videoLayerRef.current.style;
      vl.opacity = String(aboutO.toFixed(3));
      vl.transform = photoFull ? "none" : riseTransform;
      vl.clipPath = photoClip;
      vl.WebkitClipPath = photoClip;
    }

    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(overlayO.toFixed(3));
    }

    if (wordsLayerRef.current) {
      const wl = wordsLayerRef.current.style;
      wl.opacity = wordsGone ? "0" : String(aboutO.toFixed(3));
      wl.transform = riseTransform;
    }

    if (leadWordRef.current) {
      leadWordRef.current.style.transform = `translate3d(${(-push).toFixed(2)}px, 0, 0)`;
      leadWordRef.current.style.opacity = String(wordsO.toFixed(3));
    }

    if (trailWordRef.current) {
      trailWordRef.current.style.transform = `translate3d(${push.toFixed(2)}px, 0, 0)`;
      trailWordRef.current.style.opacity = String(wordsO.toFixed(3));
    }

    if (captionLayerRef.current) {
      captionLayerRef.current.style.opacity = shutterActiveRef.current
        ? "0"
        : String(captionO.toFixed(3));
      captionLayerRef.current.style.transform = `translate3d(0, ${captionY.toFixed(2)}px, 0)`;
    }

    if (buttonWrapRef.current) {
      buttonWrapRef.current.style.pointerEvents =
        !shutterActiveRef.current && captionO > 0.5 ? "auto" : "none";
    }

    for (let i = 0; i < CAPTION_WORDS.length; i++) {
      const span = wordRefs.current[i];
      if (!span) continue;
      const start =
        CAPTION_START +
        (i / CAPTION_WORDS.length) * (CAPTION_END - CAPTION_START - 0.04);
      const t = clamp01((p - start) / 0.04);
      const blur = (1 - t) * 8;
      span.style.opacity = String(t.toFixed(3));
      span.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : "none";
      span.style.transform =
        t > 0.999 ? "none" : `translate3d(0, ${((1 - t) * 10).toFixed(2)}px, 0)`;
    }
  }, []);

  useMotionValueEvent(scrollYProgress, "change", applyProgress);

  useEffect(() => {
    const onShutter = (e) => {
      shutterActiveRef.current = Boolean(e.detail);
      applyProgress(scrollYProgress.get());
    };
    window.addEventListener("shutter-active", onShutter);
    return () => window.removeEventListener("shutter-active", onShutter);
  }, [applyProgress, scrollYProgress]);

  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      sizeRef.current = { w, h };
      if (pillGapRef.current) {
        const { pw, ph } = pillSize(w);
        pillGapRef.current.style.width = `${pw}px`;
        pillGapRef.current.style.height = `${ph}px`;
      }
      applyProgress(scrollYProgress.get());
    };
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, [applyProgress, scrollYProgress]);

  const { pw, ph } = pillSize(sizeRef.current.w);

  return (
    <section
      className="relative z-10 w-full"
      style={{ height: `${TRACK_VH + SHUTTER_VH}vh`, marginTop: `-${100 + OVERLAP_VH}vh` }}
    >
      {/* Scroll-progress measure box matching the original 330vh AboutReveal track */}
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: `${TRACK_VH}vh` }}
      />

      {/* Pinned stage: stays pinned through both AboutReveal and ShutterTransition */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ background: "transparent" }}
      >
        {/* VIDEO LAYER */}
        <div
          ref={videoLayerRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            pointerEvents: "none",
            opacity: 0,
            willChange: "transform, clip-path, opacity",
          }}
        >
          <AboutVideo ref={aboutVideoRef} />
          <div
            ref={overlayRef}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
        </div>

        {/* WORDS LAYER: "About [gap] Us" */}
        <div
          ref={wordsLayerRef}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            pointerEvents: "none",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          {/* Seam 1 bridge: the astronaut's vision → the AI hand that executes it */}
          <p
            className="font-mono uppercase"
            style={{
              position: "absolute",
              top: "18%",
              left: 0,
              right: 0,
              margin: 0,
              color: "rgba(255,255,255,0.62)",
              fontSize: "clamp(0.62rem, 0.9vw, 0.8rem)",
              letterSpacing: "0.32em",
              textAlign: "center",
            }}
          >
            Vision needs an engine · About us
          </p>
          <div
            className="font-serif font-medium select-none"
            style={{
              display: "grid",
              // equal side columns (minmax(0,…) so a long word can't widen its side): the gap stays exactly in
              // the middle, where the video pill opens – on phones "Human" used to push it off-centre
              gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
              alignItems: "center",
              columnGap: "clamp(10px, 2vw, 24px)",
              width: "100%",
              lineHeight: 1,
              letterSpacing: "-0.025em",
              fontSize: "clamp(1.05rem, 4.8vw, 4.2rem)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              ref={leadWordRef}
              style={{
                justifySelf: "end",
                color: "#0A84FF",
                textShadow: "0 4px 28px rgba(10,132,255,0.7)",
                willChange: "transform",
              }}
            >
              Human
            </span>

            <span ref={pillGapRef} style={{ display: "block", width: pw, height: ph }} />

            <span
              ref={trailWordRef}
              style={{
                justifySelf: "start",
                color: "#0A84FF",
                textShadow: "0 4px 28px rgba(10,132,255,0.7)",
                willChange: "transform",
              }}
            >
              × AI
            </span>
          </div>
        </div>

        {/* TEXT + BUTTON on top of the fullscreen video */}
        <div
          ref={captionLayerRef}
          className="absolute inset-x-0 bottom-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 px-5 pt-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:p-10 lg:p-14 text-white"
          style={{
            zIndex: 40,
            pointerEvents: "none",
            opacity: 0,
          }}
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
                  ref={(el) => {
                    wordRefs.current[i] = el;
                  }}
                  style={{
                    display: "inline-block",
                    marginRight: "0.28em",
                    opacity: 0,
                  }}
                >
                  {word}
                </span>
              ))}
            </p>
          </div>

          <div
            ref={buttonWrapRef}
            className="shrink-0"
            style={{ pointerEvents: "none" }}
          >
            <button
              type="button"
              onMouseEnter={() => window.dispatchEvent(new CustomEvent("prefetch-about-frames"))}
              onFocus={() => window.dispatchEvent(new CustomEvent("prefetch-about-frames"))}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent("open-about-clicktots", { detail: rect }));
              }}
              className="ct-about-cta ct-btn ct-btn-primary gap-1.5 md:gap-2 px-4 py-2.5 md:px-6 md:py-3 lg:px-7 lg:py-3.5 text-[10.5px] md:text-xs lg:text-sm uppercase tracking-wider"
            >
              {ABOUT_CTA}
              <ArrowUpRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutReveal;
