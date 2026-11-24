// Purpose: Implement the AboutClicktots pages module, keeping this responsibility separate for maintainability.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import BackButton from "@/components/BackButton/BackButton";
import { setScrollLocked } from "@/lib/scroll";
import RobotBackdrop from "@/pages/About/robot/RobotBackdrop";
import AboutContent from "@/pages/About/AboutContent";

const EASE = [0.22, 1, 0.36, 1];
const OPEN_MS = 550;
const CONTENT_MOUNT_MS = 560;
const ROBOT_MOUNT_MS = 120; // the robot is pre-built: attach it while the opening wipe is still running
const BG_START = "#0a84ff"; // = the "Inside our AI engine" button the page grows out of
const BG_END = "#f2f2f0";

function insetFromRect(r) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 8px)`; // = the button's corner
}

function DeferredBackdrop({ scrollRef }) {
  const present = useIsPresent();
  const [go, setGo] = useState(false);
  // The robot is normally pre-built on the home page, so it is attached as soon as the opening wipe ends.
  useEffect(() => {
    const t = setTimeout(() => setGo(true), ROBOT_MOUNT_MS);
    return () => clearTimeout(t);
  }, []);
  if (!present || !go) return null;
  return (
    <motion.div className="absolute inset-0">
      {/* the Three.js robot: scroll-driven over the whole page, our content sits above it */}
      <RobotBackdrop scrollRef={scrollRef} />
    </motion.div>
  );
}

function DeferredContent({ scrollRef, onExploreWork, onClose }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), CONTENT_MOUNT_MS);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return null;
  return <AboutContent scrollRef={scrollRef} onExploreWork={onExploreWork} onClose={onClose} />;
}

export default function AboutClicktots({ open, originRect, onClose, onExploreWork }) {
  const scrollRef = useRef(null);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) setSettled(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const paused = [...document.querySelectorAll("video")].filter((v) => !v.paused);
    paused.forEach((v) => v.pause());
    return () => paused.forEach((v) => v.play().catch(() => {}));
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setScrollLocked(true);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      setScrollLocked(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const from = originRect
    ? insetFromRect(originRect)
    : "inset(50% 50% 50% 50% round 999px)";
  const to = "inset(0px 0px 0px 0px round 0px)";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="about-clicktots"
          role="dialog"
          aria-modal="true"
          aria-label="About Clicktots"
          className="fixed inset-0 text-[#262626]"
          style={{
            zIndex: 9000,
            willChange: settled ? "auto" : "clip-path",
            contain: "layout style paint",
          }}
          initial={{ clipPath: from, backgroundColor: BG_START }}
          animate={{
            clipPath: to,
            backgroundColor: BG_END,
            transition: { duration: 0.55, ease: EASE },
          }}
          onAnimationComplete={(def) => {
            if (def && typeof def === "object" && "clipPath" in def) setSettled(true);
          }}
          exit={{
            clipPath: from,
            backgroundColor: BG_START,
            transition: { duration: 0.45, ease: EASE },
          }}
        >
          <DeferredBackdrop scrollRef={scrollRef} />
          {/* light veil: keeps the text crisp while the robot stays clearly visible */}
          <div className="pointer-events-none absolute inset-0 bg-[#f2f2f0]/25" />

          {originRect && (
            <motion.div
              className="pointer-events-none absolute inline-flex items-center justify-center gap-1.5 md:gap-2 text-[10.5px] md:text-xs lg:text-sm font-semibold uppercase tracking-wider text-[#10291a] whitespace-nowrap"
              style={{
                left: originRect.left,
                top: originRect.top,
                width: originRect.width,
                height: originRect.height,
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, transition: { delay: 0.15, duration: 0.25 } }}
              exit={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }}
            >
              About Clicktots
              <ArrowUpRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </motion.div>
          )}

          <motion.div
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto overscroll-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.56, duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <DeferredContent scrollRef={scrollRef} onExploreWork={onExploreWork} onClose={onClose} />
          </motion.div>

          {/* same Back pill as the other inner pages (the old X sat under the navbar's blue button) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.45, duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <BackButton tone="light" label="Back to home" onClick={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
