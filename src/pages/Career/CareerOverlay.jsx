// Purpose: The Career overlay (/career and /career/<slug>), matching BlogOverlay's 5-bar shutter transition.
//   - Quiet animated background + dark/light switch.
//   - OPEN: card flips to front, the role image flies from the card to the top of the role page.
//   - BACK: the same image flies back down into its card (button, and the Esc key).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import BackButton from "@/components/BackButton/BackButton";
import { useShutterStage } from "@/hooks/useShutterStage";
import Footer from "@/components/Footer/Footer";
import { useOverlayScroll } from "@/hooks/useOverlayScroll";
import { navigate } from "@/lib/router";
import CareerPage from "./CareerPage";
import CareerDetail from "./CareerDetail";
import CareerBackground from "./CareerBackground";
import SpaceBackdrop from "@/components/SpaceBackdrop/SpaceBackdrop";
import ThemeToggle from "./ThemeToggle";
import useCareerTheme from "./useCareerTheme";
import { findCareerBySlug } from "./careerData";
import "./career.css";

const BAR_COUNT = 5;
const STAGGER = 0.09;
const BAR_DURATION = 0.6;
const BAR_EASE = [0.76, 0, 0.24, 1];
const BAR_COLOR = "#D2D2D2";

// Role image travel + fades (kept short so it feels instant)
const FLY_DURATION = 0.6;
const FLY_EASE = [0.22, 1, 0.36, 1];
const FADE_MS = 140;

function CareerContent({ slug, onClose }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const listScroll = useRef(0);
  const prevSlug = useRef(slug);
  const navTimer = useRef(0);
  const flyId = useRef(0);
  const reduced = useReducedMotion();
  const role = slug ? findCareerBySlug(slug) : null;

  const [theme, toggleTheme] = useCareerTheme();
  // fly = { id, mode: "open" | "close", slug, src, from, to, rFrom, rTo, fadeFrom, fadeTo }
  const [fly, setFly] = useState(null);
  const [listFading, setListFading] = useState(false);
  const [detailFading, setDetailFading] = useState(false);

  /* ---------- Smooth scroll ---------- */
  useOverlayScroll(scrollRef, contentRef);

  /* Detail opens at the top; going back returns to where the list was. */
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc || prevSlug.current === slug) return;
    const to = slug ? 0 : listScroll.current;
    if (sc.__lenis) sc.__lenis.scrollTo(to, { immediate: true, force: true });
    sc.scrollTop = to;
    prevSlug.current = slug;
  }, [slug]);

  /* Route changed: clear fades, keep only the flying image that belongs to this step. */
  useEffect(() => {
    setListFading(false);
    setDetailFading(false);
    setFly((f) => (f && ((slug && f.mode === "open") || (!slug && f.mode === "close")) ? f : null));
  }, [slug]);

  useEffect(() => () => window.clearTimeout(navTimer.current), []);

  /* Safety net: never leave the flying image stuck on screen. */
  useEffect(() => {
    if (!fly) return undefined;
    const id = window.setTimeout(() => setFly(null), 3500);
    return () => window.clearTimeout(id);
  }, [fly]);

  /* ---------- OPEN: card -> role page ---------- */
  const startFly = useCallback(
    (nextSlug, origin) => {
      const sc = scrollRef.current;
      if (sc) listScroll.current = sc.scrollTop;
      if (!origin || !origin.rect || reduced) {
        navigate(`/career/${nextSlug}`);
        return;
      }
      setFly({
        id: ++flyId.current,
        mode: "open",
        slug: nextSlug,
        src: origin.src,
        from: origin.rect,
        to: null,
        rFrom: origin.radius || 10,
        rTo: 24,
        fadeFrom: 0,
        fadeTo: 1,
      });
      setListFading(true);
      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => navigate(`/career/${nextSlug}`), FADE_MS);
    },
    [reduced]
  );

  /* ---------- BACK: role page -> card ---------- */
  const startReturn = useCallback(
    (origin) => {
      if (!origin || !origin.rect || reduced) {
        navigate("/career");
        return;
      }
      setFly({
        id: ++flyId.current,
        mode: "close",
        slug: role ? role.slug : "",
        src: origin.src,
        from: origin.rect,
        to: null,
        rFrom: origin.radius || 24,
        rTo: 10,
        fadeFrom: 1,
        fadeTo: 0,
      });
      setDetailFading(true);
      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => navigate("/career"), FADE_MS);
    },
    [reduced, role]
  );

  /* The role page (open) or the deck (close) reports where the image has to land. */
  const handleFlyTarget = useCallback((rect, radius) => {
    setFly((f) => (f && !f.to ? { ...f, to: rect, rTo: radius ?? f.rTo } : f));
  }, []);

  const finishFly = useCallback(() => setFly(null), []);

  const detailFlying = !!(role && fly && fly.mode === "open" && fly.slug === role.slug);
  const returning = !role && !!fly && fly.mode === "close";

  /* Role colours softly tint the background glows on the detail step. */
  const tintA = role ? (theme === "light" ? role.holoMint : role.holoTint) : undefined;
  const tintB = role ? (theme === "light" ? role.holoTint : role.skyBottom) : undefined;

  return (
    <div className="ct-root absolute inset-0" data-theme={theme}>
      <CareerBackground tintA={tintA} tintB={tintB} />
      {/* a living constellation: the crew network links up, and the cursor joins in */}
      <SpaceBackdrop variant="crew" scrollRef={scrollRef} theme={theme} />

      <div
        ref={scrollRef}
        data-lenis-prevent
        className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef}>
          {role ? (
            <motion.div
              key="detail"
              animate={{ opacity: detailFading ? 0 : 1 }}
              transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
            >
              <CareerDetail
                key={role.slug}
                role={role}
                flying={detailFlying}
                onHeroMeasured={handleFlyTarget}
                onBack={startReturn}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={returning ? { opacity: 0 } : false}
              animate={{ opacity: listFading ? 0 : 1 }}
              transition={{ duration: returning ? 0.35 : FADE_MS / 1000, ease: "easeOut" }}
            >
              <CareerPage onOpenRole={startFly} returning={returning} onReturnMeasured={handleFlyTarget} />
            </motion.div>
          )}
          {/* the site footer at the end of every inner page */}
          <Footer standalone onHome={onClose} onNavigate={(path) => navigate(path)} />
        </div>
      </div>

      {/* The role image travelling between the card and the role page */}
      {fly && (
        <motion.div
          key={fly.id}
          aria-hidden="true"
          className="pointer-events-none"
          style={{ position: "fixed", zIndex: 15, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
          initial={{
            top: fly.from.top,
            left: fly.from.left,
            width: fly.from.width,
            height: fly.from.height,
            borderRadius: fly.rFrom,
          }}
          animate={
            fly.to
              ? {
                  top: fly.to.top,
                  left: fly.to.left,
                  width: fly.to.width,
                  height: fly.to.height,
                  borderRadius: fly.rTo,
                }
              : undefined
          }
          transition={{ duration: FLY_DURATION, ease: FLY_EASE }}
          onAnimationComplete={() => {
            if (fly.to) finishFly();
          }}
        >
          <img
            src={fly.src}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <motion.div
            className="ct-img-shade"
            style={{ position: "absolute", inset: 0 }}
            initial={{ opacity: fly.fadeFrom }}
            animate={{ opacity: fly.to ? fly.fadeTo : fly.fadeFrom }}
            transition={{ duration: FLY_DURATION, ease: FLY_EASE }}
          />
        </motion.div>
      )}

      {/* Back: a role → the list (its picture flies back to the card), the list → the home page */}
      <BackButton
        tone={theme === "light" ? "light" : "dark"}
        label={role ? "All roles" : "Back to home"}
        onClick={() => (role ? window.dispatchEvent(new Event("career-back")) : onClose())}
      />

      {/* theme toggle: right side, just under the navbar (follows it when it hides) */}
      <ThemeToggle theme={theme} onToggle={toggleTheme} className="ct-under-nav absolute right-4 z-20 sm:right-8" />
    </div>
  );
}

export default function CareerOverlay({ open, slug, onClose }) {
  const reduced = useReducedMotion();
  const { contentOn, mounted, covering, leaving, stage, handleBarDone } = useShutterStage(open, BAR_COUNT, () => {
    if (slug) window.dispatchEvent(new Event("career-back"));
    else onClose();
  });

  if (typeof document === "undefined" || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Clicktots careers"
      className="fixed inset-0"
      style={{ zIndex: 9000, pointerEvents: contentOn ? "none" : "auto" }}
    >
      {contentOn && (
        <div className="absolute inset-0" style={{ pointerEvents: "auto" }}>
          <CareerContent slug={slug} onClose={onClose} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ zIndex: 30 }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <motion.div
            key={i}
            style={{
              flex: 1,
              width: "100%",
              backgroundColor: BAR_COLOR,
              transformOrigin: covering ? "bottom" : "top",
              willChange: "transform",
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: covering ? 1 : 0 }}
            transition={{
              duration: reduced ? 0.01 : BAR_DURATION,
              ease: BAR_EASE,
              delay: reduced ? 0 : covering ? (BAR_COUNT - 1 - i) * STAGGER : leaving ? i * STAGGER : 0,
            }}
            onAnimationComplete={() => handleBarDone(i)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}