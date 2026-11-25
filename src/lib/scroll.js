// Purpose: Provide the shared Lenis scrolling loop and scroll utilities used by the page.
import Lenis from "lenis";
import { frame, cancelFrame } from "motion/react";

/**
 * One loop for the whole page, run INSIDE framer-motion's frame scheduler so every frame is
 * "all reads, then all writes" for the whole site (ours and framer-motion's):
 *   read phase   → Lenis moves the scroll, the scroll value + every watched section's rect are read once
 *   render phase → every scroll-driven section writes its styles
 * Before, our loop and framer-motion's ran as two separate rAF callbacks that interleaved reads and writes,
 * so the browser had to redo style + layout several times per frame.
 */
const subscribers = new Set();

/* ── Batched geometry ──
   Scroll sections used to call el.getBoundingClientRect() inside their frame callback, AFTER other
   sections had already written styles that frame → every read forced a synchronous style + layout pass
   (several per frame, on every frame: "layout thrashing"). Now each section asks scrollRect(el): the
   loop measures all those elements ONCE at the start of the frame, while layout is still clean, and hands
   out the stored rects. Outside the loop (init, resize) scrollRect simply measures live. */
const watched = new Set();
const frameRects = new Map();
let inFrame = false;
let lastMeasuredY = NaN;
let layoutDirty = true;
let lastLayoutTick = 0;

export function scrollRect(el) {
  if (!el) return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
  if (!watched.has(el)) {
    watched.add(el);
    layoutDirty = true;
  }
  if (inFrame) {
    const r = frameRects.get(el);
    if (r) return r;
  }
  const r = el.getBoundingClientRect();
  if (inFrame) frameRects.set(el, r);
  return r;
}

let lenis = null;
let frameY = 0;
/** Page scroll position for this frame, read once at the start of the frame (never forces layout).
    Reading window.scrollY inside a scroll event, after styles were written, forced a full layout. */
export const getScrollY = () => frameY;
let paused = false;
let running = false;

const markDirty = () => {
  layoutDirty = true;
};

const readStep = ({ timestamp }) => {
  if (paused) return;
  lenis?.raf(timestamp);
  frameY = lenis ? lenis.animatedScroll : window.scrollY;
  // Refresh geometry only when scroll moved, layout resized/changed, or periodically (every 500ms)
  const moved = Math.abs(frameY - lastMeasuredY) > 0.05;
  if (!moved && !layoutDirty && timestamp - lastLayoutTick < 500) return;
  lastMeasuredY = frameY;
  layoutDirty = false;
  lastLayoutTick = timestamp;
  // one clean geometry read for every watched element, before anyone writes styles this frame
  frameRects.clear();
  watched.forEach((el) => {
    if (el.isConnected) frameRects.set(el, el.getBoundingClientRect());
    else watched.delete(el);
  });
};
const renderStep = ({ timestamp }) => {
  if (paused) return;
  inFrame = true;
  try {
    subscribers.forEach((fn) => fn(timestamp));
  } finally {
    inFrame = false;
  }
};

function stopLoop() {
  cancelFrame(readStep);
  cancelFrame(renderStep);
  running = false;
}

function kick() {
  if (running) return;
  running = true;
  frame.read(readStep, true); // keepAlive: every frame
  frame.render(renderStep, true);
}

export function startScroll(reducedMotion) {
  const isTouchMobile =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches ||
      ("ontouchstart" in window && navigator.maxTouchPoints > 0 && window.innerWidth < 1024));

  // Keep native compositor touch scrolling on Android/iOS; use Lenis smooth wheel on desktop
  if (!reducedMotion && !isTouchMobile) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.9 });
  }

  window.addEventListener("resize", markDirty, { passive: true });
  kick();

  return () => {
    window.removeEventListener("resize", markDirty);
    stopLoop();
    lenis?.destroy();
    lenis = null;
  };
}

export function onFrame(fn) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Smooth-scrolls to an element (or to a pixel offset / the top). */
export function scrollToTarget(target, duration = 1.6) {
  if (target == null) return;
  if (lenis) {
    lenis.scrollTo(target, { duration });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

/** Pause / resume page scrolling (used while a full-screen overlay is open).
    Counted: overlays can overlap (a project popup inside All Projects, one page closing while the next
    opens), so the page only unlocks when the LAST one lets go. Otherwise the home page's scrollbar came
    back next to the overlay's own one ("two scrollbars"). */
let lockCount = 0;
export function setScrollLocked(want) {
  lockCount = Math.max(0, lockCount + (want ? 1 : -1));
  const locked = lockCount > 0;
  if (locked === paused) return; // nothing changes while other overlays still hold the lock
  paused = locked;
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }
  if (locked) {
    lenis?.stop();
    stopLoop();
  } else {
    lenis?.start();
    kick();
  }
}
