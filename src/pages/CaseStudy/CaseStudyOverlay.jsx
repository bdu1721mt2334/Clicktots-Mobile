// Purpose: The Case Study overlay (/case-study and /case-study/<slug>). Opens and closes with the same
//   shutter-bar transition as Blog and Career: 5 bars rise to cover the page, the case study mounts underneath,
//   the bars slide away. Inside: the intro + grid (CaseStudyPage) or one case (CaseStudyDetail), chosen by the
//   URL. Switching keeps the overlay open; going back to the list skips the intro and restores the scroll.
//   Text inside fades up as it scrolls in (attachTextFade, the site's own text fade).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { useOverlayScroll } from "@/hooks/useOverlayScroll";
import BackButton from "@/components/BackButton/BackButton";
import { useShutterStage } from "@/hooks/useShutterStage";
import Footer from "@/components/Footer/Footer";
import { navigate } from "@/lib/router";
import { attachTextFade } from "@/hooks/useTextFade";
import CaseStudyPage from "./CaseStudyPage";
import CaseStudyDetail from "./CaseStudyDetail";
import { findCaseStudy } from "./caseStudyData";

const BAR_COUNT = 5;
const STAGGER = 0.09;
const BAR_DURATION = 0.6;
const BAR_EASE = [0.76, 0, 0.24, 1];
const BAR_COLOR = "#D2D2D2";

function CaseStudyContent({ slug, onClose }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const listScroll = useRef(0);
  const introDone = useRef(false); // the preloader plays once per opening
  const prevSlug = useRef(slug);
  const [leaving, setLeaving] = useState(false);
  const item = slug ? findCaseStudy(slug) : null;

  // site text fade inside the overlay (the overlay lives outside #root, where the global one runs)
  useEffect(() => attachTextFade(scrollRef.current, { skipVisible: false }), []);

  // smooth scrolling, also over the fixed footer (see useOverlayScroll)
  useOverlayScroll(scrollRef, contentRef);

  // list → case: remember where the list was, start at the top. case → list: restore.
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc || prevSlug.current === slug) return;
    const to = item ? 0 : listScroll.current;
    sc.__lenis?.scrollTo(to, { immediate: true, force: true });
    sc.scrollTop = to;
    prevSlug.current = slug;
    setLeaving(false);
  }, [slug, item]);

  useEffect(() => {
    if (!item) {
      const t = setTimeout(() => (introDone.current = true), 4500);
      return () => clearTimeout(t);
    }
    introDone.current = true;
    return undefined;
  }, [item]);

  const openCase = () => {
    if (scrollRef.current) listScroll.current = scrollRef.current.scrollTop;
    setLeaving(true);
  };

  return (
    <div className="absolute inset-0 bg-[#0b0f17] text-white">
      <div ref={scrollRef} data-lenis-prevent className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div ref={contentRef}>
          {item ? (
            <CaseStudyDetail key={item.slug} item={item} scrollRef={scrollRef} />
          ) : (
            <CaseStudyPage scrollRef={scrollRef} skipIntro={introDone.current} leaving={leaving} onOpenCase={openCase} />
          )}
          {/* the site footer at the end of every inner page */}
          <Footer standalone onHome={onClose} onNavigate={(path) => navigate(path)} />
        </div>
      </div>
      {/* Back: a case → the grid (the picture flies home), the grid → the home page */}
      <BackButton
        label={item ? "All case studies" : "Back to home"}
        onClick={() => (item ? window.dispatchEvent(new Event("case-back")) : onClose())}
      />
    </div>
  );
}

export default function CaseStudyOverlay({ open, slug = null, onClose }) {
  const reduced = useReducedMotion();
  const { contentOn, mounted, covering, leaving, stage, handleBarDone } = useShutterStage(open, BAR_COUNT, () => {
    if (slug) window.dispatchEvent(new Event("case-back"));
    else onClose();
  });

  if (typeof document === "undefined" || !mounted) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Clicktots case study" className="fixed inset-0" style={{ zIndex: 9000, pointerEvents: contentOn ? "none" : "auto" }}>
      {contentOn && (
        <div className="absolute inset-0" style={{ pointerEvents: "auto" }}>
          <CaseStudyContent slug={slug} onClose={onClose} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ zIndex: 300 }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <motion.div
            key={i}
            style={{ flex: 1, width: "100%", backgroundColor: BAR_COLOR, transformOrigin: covering ? "bottom" : "top", willChange: "transform" }}
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