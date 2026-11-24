// Purpose: Implement the usePrefersReducedMotion hooks module, keeping this responsibility separate for maintainability.
import { useSyncExternalStore } from "react";

function subscribeReducedMotion(callback) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  }

  const legacyMq = mq;
  if (legacyMq.addListener) {
    legacyMq.addListener(callback);
    return () => legacyMq.removeListener(callback);
  }
  return () => {};
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}
