// Purpose: Smooth (Lenis) scrolling for full-screen overlay pages, shared by Projects, Blog, Career,
//   Case Study and the Service pages.
//   Why it matters: every overlay ends with the site footer, which is position:fixed (revealed from underneath).
//   Browsers do NOT chain wheel scrolling from a fixed element into the scroller behind it, so with plain native
//   scrolling the page stops responding whenever the pointer is over the footer. Lenis listens on the wrapper
//   itself, so the wheel works everywhere on the page. With reduced motion (no Lenis) a small forwarder does it.
import { useEffect } from "react";
import Lenis from "lenis";

export function useOverlayScroll(scrollRef, contentRef, deps = []) {
  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = contentRef?.current || wrapper?.firstElementChild;
    if (!wrapper || !content) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const onWheel = (e) => {
        if (e.target.closest?.(".ft")) wrapper.scrollTop += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      };
      wrapper.addEventListener("wheel", onWheel, { passive: true });
      return () => wrapper.removeEventListener("wheel", onWheel);
    }

    const lenis = new Lenis({ wrapper, content, lerp: 0.1, smoothWheel: true, autoRaf: true });
    wrapper.__lenis = lenis; // kept on the scroller so pages can scroll with it (jump links, step rails)
    return () => {
      lenis.destroy();
      delete wrapper.__lenis;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
