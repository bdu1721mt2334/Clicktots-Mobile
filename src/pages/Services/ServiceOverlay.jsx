// Purpose: Implement the ServiceOverlay pages module, keeping this responsibility separate for maintainability.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import BackButton from "@/components/BackButton/BackButton";
import { setScrollLocked } from "@/lib/scroll";
import { getOrigin } from "@/lib/router";
import { useOverlayScroll } from "@/hooks/useOverlayScroll";
import useSiteTheme from "@/hooks/useSiteTheme";
import ServicePage from "./ServicePage";

/* The service page opens exactly like "About Clicktots":
   the page grows out of the thing you clicked (a service word or a ring card) – a
   clip-path that starts at its rectangle and expands to the full screen while the
   colour eases from the service colour to the page colour – then the content fades in.
   Closing shrinks it back into the same spot.

   Timings / easing are the same numbers as pages/About/AboutClicktots.jsx. */

const EASE = [0.22, 1, 0.36, 1];
const BG_END_LIGHT = "#E9E6DF";
const BG_END_DARK = "#060912";

function insetFromRect(r) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const radius = Math.min(r.height / 2, 40);
  return `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round ${radius}px)`;
}

export default function ServiceOverlay({ service, onClose, onNavigate }) {
  const open = !!service;
  const [settled, setSettled] = useState(false);
  const scrollRef = useRef(null);
  const [theme] = useSiteTheme();
  const isDark = theme === "dark";
  const bgEnd = isDark ? BG_END_DARK : BG_END_LIGHT;

  // remember where the click came from the moment the page opens
  const originRef = useRef(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) originRef.current = getOrigin();
  wasOpen.current = open;

  // keep the last service while the closing animation plays
  const lastService = useRef(service);
  if (service) lastService.current = service;
  const current = service || lastService.current;

  useEffect(() => {
    if (!open) setSettled(false);
  }, [open]);

  // tell the page it is closing (its hero picture flies back to where it came from)
  const wasOpenForClose = useRef(false);
  useLayoutEffect(() => {
    if (wasOpenForClose.current && !open) window.dispatchEvent(new Event("clicktots:service-closing"));
    wasOpenForClose.current = open;
  }, [open]);

  // switching to another service starts at the top of its page
  const slug = current ? current.slug : "";
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [slug]);

  /* smooth (Lenis) scrolling inside the service page – the site's own Lenis is stopped while it's open.
     The instance is kept on the scroller (__lenis) so the rocket story's step rail can scroll with it. */
  useOverlayScroll(scrollRef, null, [open, slug]);

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

  const rect = originRef.current;
  const from = rect ? insetFromRect(rect) : "inset(50% 50% 50% 50% round 999px)";
  const to = "inset(0px 0px 0px 0px round 0px)";
  const color = current ? current.color : "#c6f35c";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="service-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${current.name} – Clicktots`}
          className={`fixed inset-0 transition-colors duration-300 ${isDark ? "text-[#f5f7fa]" : "text-[#121110]"}`}
          style={{
            zIndex: 9000,
            willChange: settled ? "auto" : "clip-path",
            contain: "layout style paint",
          }}
          initial={{ clipPath: from, backgroundColor: color }}
          animate={{
            clipPath: to,
            backgroundColor: bgEnd,
            transition: { duration: 0.55, ease: EASE },
          }}
          onAnimationComplete={(def) => {
            if (def && typeof def === "object" && "clipPath" in def) setSettled(true);
          }}
          exit={{
            clipPath: from,
            backgroundColor: color,
            transition: { duration: 0.45, ease: EASE },
          }}
        >
          {/* the clicked label stays put while the page grows around it, then fades */}
          {rect && (
            <motion.div
              className="pointer-events-none absolute inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#10291a]"
              style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, transition: { delay: 0.15, duration: 0.25 } }}
              exit={{ opacity: 1, transition: { delay: 0.2, duration: 0.2 } }}
            >
              {current.name}
              <ArrowUpRight className="h-4 w-4" />
            </motion.div>
          )}

          {/* data-lenis-prevent: the site's smooth scroll must not hijack this inner scroller */}
          <motion.div
            ref={scrollRef}
            data-lenis-prevent
            className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.56, duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {/* switching service: new page content fades in from the top */}
            <motion.div
              key={current.slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.35 } }}
            >
              <ServicePage service={current} onClose={onClose} onNavigate={onNavigate} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.45, duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <BackButton tone={isDark ? "dark" : "light"} label="Back to home" onClick={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
