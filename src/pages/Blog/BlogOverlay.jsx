// Purpose: The Blog overlay (/blog and /blog/<slug>).
//   Opening / closing: the same shutter-bar transition as "Explore all work" (AllProjects.jsx) – 5 bars rise
//   from the bottom one after another to cover the page, the blog is mounted underneath, then the bars slide
//   away upward. Closing runs it again in reverse.
//   Inside: the journal list (BlogPage) or one article (BlogArticle), chosen by the URL. Switching between
//   them keeps the overlay open; the list's scroll position is restored when you come back.
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import BackButton from "@/components/BackButton/BackButton";
import { useShutterStage } from "@/hooks/useShutterStage";
import Footer from "@/components/Footer/Footer";
import { useOverlayScroll } from "@/hooks/useOverlayScroll";
import { navigate } from "@/lib/router";
import SpaceBackdrop from "@/components/SpaceBackdrop/SpaceBackdrop";
import BlogPage from "./BlogPage";
import BlogArticle from "./BlogArticle";
import { findPost } from "./blogData";

const BAR_COUNT = 5;
const STAGGER = 0.09;
const BAR_DURATION = 0.6;
const BAR_EASE = [0.76, 0, 0.24, 1];
const BAR_COLOR = "#D2D2D2";

function BlogContent({ slug, onClose }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const listScroll = useRef(0);
  const prevSlug = useRef(slug);
  const post = slug ? findPost(slug) : null;

  // smooth scrolling, also over the fixed footer
  useOverlayScroll(scrollRef, contentRef);

  // list → article: remember where the list was, start the article at the top. article → list: restore.
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc || prevSlug.current === slug) return;
    const to = slug ? 0 : listScroll.current;
    if (sc.__lenis) sc.__lenis.scrollTo(to, { immediate: true, force: true });
    sc.scrollTop = to;
    prevSlug.current = slug;
  }, [slug]);

  const rememberList = () => {
    if (scrollRef.current) listScroll.current = scrollRef.current.scrollTop;
  };

  return (
    <div className="absolute inset-0 bg-[#07080c] text-white">
      {/* deep-field stars + nebula; ideas streak past as shooting stars */}
      <SpaceBackdrop variant="journal" scrollRef={scrollRef} />
      <div ref={scrollRef} data-lenis-prevent className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div ref={contentRef}>
          {post ? (
            <BlogArticle key={post.slug} post={post} scrollRef={scrollRef} />
          ) : (
            <BlogPage scrollRef={scrollRef} onBeforeOpen={rememberList} />
          )}
          {/* the site footer at the end of every inner page */}
          <Footer standalone onHome={onClose} onNavigate={(path) => navigate(path)} />
        </div>
      </div>
      {/* Back: an article → the list, the list → the home page */}
      <BackButton
        label={post ? "All articles" : "Back to home"}
        onClick={() => (post ? navigate("/blog", { replace: true }) : onClose())}
      />
    </div>
  );
}

export default function BlogOverlay({ open, slug, onClose }) {
  const reduced = useReducedMotion();
  const { contentOn, mounted, covering, leaving, stage, handleBarDone } = useShutterStage(open, BAR_COUNT, () => {
    if (slug) navigate("/blog", { replace: true });
    else onClose();
  });

  if (typeof document === "undefined" || !mounted) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Clicktots blog" className="fixed inset-0" style={{ zIndex: 9000, pointerEvents: contentOn ? "none" : "auto" }}>
      {contentOn && (
        <div className="absolute inset-0" style={{ pointerEvents: "auto" }}>
          <BlogContent slug={slug} onClose={onClose} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ zIndex: 30 }}>
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
    document.body,
  );
}
