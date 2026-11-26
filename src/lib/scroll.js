// Purpose: Provide an idle-sleeping shared rAF loop and lazy-loaded Lenis smooth scroll with zero initial bundle bloat.
const subscribers = new Set();
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
let lenisRequested = false;
let frameY = typeof window !== "undefined" ? window.scrollY : 0;
export const getScrollY = () => frameY;

let paused = false;
let rafId = 0;
let idleFrames = 0;
let activeAlways = 0;

const markDirty = () => {
  layoutDirty = true;
  wakeLoop();
};

const step = (timestamp) => {
  rafId = 0;
  if (paused) return;

  lenis?.raf(timestamp);
  const nextY = lenis ? lenis.animatedScroll : window.scrollY;
  const moved = Math.abs(nextY - frameY) > 0.05 || Math.abs(nextY - lastMeasuredY) > 0.05;
  frameY = nextY;

  if (moved || layoutDirty || timestamp - lastLayoutTick >= 500) {
    lastMeasuredY = frameY;
    layoutDirty = false;
    lastLayoutTick = timestamp;
    frameRects.clear();
    watched.forEach((el) => {
      if (el.isConnected) frameRects.set(el, el.getBoundingClientRect());
      else watched.delete(el);
    });
  }

  inFrame = true;
  try {
    subscribers.forEach((fn) => fn(timestamp));
  } finally {
    inFrame = false;
  }

  const lenisActive = Boolean(lenis && (lenis.isScrolling || Math.abs(lenis.velocity || 0) > 0.01));
  if (moved || lenisActive || activeAlways > 0) {
    idleFrames = 0;
    rafId = requestAnimationFrame(step);
  } else if (idleFrames < 18) {
    idleFrames += 1;
    rafId = requestAnimationFrame(step);
  }
};

export function wakeLoop() {
  if (paused || typeof requestAnimationFrame === "undefined") return;
  idleFrames = 0;
  if (!rafId) {
    rafId = requestAnimationFrame(step);
  }
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

export function startScroll(reducedMotion) {
  const isTouchMobile =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches ||
      ("ontouchstart" in window && navigator.maxTouchPoints > 0 && window.innerWidth < 1024));

  let disposed = false;

  const ensureLenis = () => {
    if (disposed || reducedMotion || isTouchMobile || lenisRequested) return;
    lenisRequested = true;
    import("lenis")
      .then(({ default: Lenis }) => {
        if (disposed) return;
        lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.9 });
        if (paused) lenis.stop();
        wakeLoop();
      })
      .catch(() => {
        lenisRequested = false;
      });
  };

  const onScroll = () => wakeLoop();
  const onWheel = () => {
    ensureLenis();
    wakeLoop();
  };
  const onTouchMove = () => wakeLoop();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("resize", markDirty, { passive: true });

  return () => {
    disposed = true;
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("resize", markDirty);
    stopLoop();
    lenis?.destroy();
    lenis = null;
    lenisRequested = false;
  };
}

export function onFrame(fn) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function keepLoopAlive(active) {
  activeAlways = Math.max(0, activeAlways + (active ? 1 : -1));
  if (activeAlways > 0) wakeLoop();
}

export function scrollToTarget(target, duration = 1.6) {
  if (target == null) return;
  wakeLoop();
  if (lenis) {
    lenis.scrollTo(target, { duration });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

let lockCount = 0;
export function setScrollLocked(want) {
  lockCount = Math.max(0, lockCount + (want ? 1 : -1));
  const locked = lockCount > 0;
  if (locked === paused) return;
  paused = locked;
  if (typeof document !== "undefined") {
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }
  if (locked) {
    lenis?.stop();
    stopLoop();
  } else {
    lenis?.start();
    wakeLoop();
  }
}
