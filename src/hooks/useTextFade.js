// Purpose: Site-wide scroll text fade-in & fade-out hook (continuous while scrolling up and down).
import { useEffect } from "react";

/* Site-wide text fade-in & fade-out: headings, paragraphs, list items, and captions smoothly fade
   in as they enter the viewport and fade out as they leave while scrolling up or down.
   - Purely additive: skips elements with inline opacity/transform/filter or custom word reveals.
   - Respects [data-text-fade='off'] on scroll-pinned canvas/SVG sections (hero, branches, rocket).
   - Reduced motion: nothing is hidden and nothing animates. */

const SELECTOR = "h1,h2,h3,h4,h5,p,li,blockquote,figcaption,dt,dd,label";
const SKIP = ".rg-scope,[data-text-fade='off'],nav,header,canvas,svg,button,a>*:only-child";

const hasOwnMotion = (el) => {
  const st = el.style;
  if (st.opacity || st.transform || st.filter || st.translate) return true;
  // BlurReveal / word-rise: words are already animated spans inside
  return !!el.querySelector(":scope > span[aria-hidden='true'], :scope .rg-rise");
};

/** Attach continuous fade-in / fade-out to every text element inside `root` (now and added later). */
export function attachTextFade(root, { skipVisible = false } = {}) {
  if (!root || typeof IntersectionObserver === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const seen = new WeakSet();
  let batch = 0;
  let batchTimer = 0;

  const io = new IntersectionObserver(
    (entries) => {
      const entering = [];
      for (const e of entries) {
        if (e.isIntersecting) {
          entering.push(e);
        } else {
          const el = e.target;
          el.style.removeProperty("--ct-d");
          el.classList.remove("ct-in");
        }
      }
      if (entering.length) {
        entering
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((e) => {
            const el = e.target;
            const delay = Math.min(batch++, 6) * 55;
            clearTimeout(batchTimer);
            batchTimer = setTimeout(() => (batch = 0), 180);
            el.style.setProperty("--ct-d", `${delay}ms`);
            requestAnimationFrame(() => el.classList.add("ct-in"));
          });
      }
    },
    { rootMargin: "-4% 0px -6% 0px", threshold: 0.04 }
  );

  const register = () => {
    root.querySelectorAll(SELECTOR).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.closest(SKIP) || hasOwnMotion(el)) return;
      if (!el.textContent.trim()) return;
      const r = el.getBoundingClientRect();
      const onScreenNow = r.top < window.innerHeight * 0.94 && r.bottom > 0;
      if (skipVisible && onScreenNow && window.scrollY < 40) return;
      el.classList.add("ct-fade");
      if (onScreenNow) {
        el.classList.add("ct-in");
      }
      io.observe(el);
    });
  };

  register();
  let t = 0;
  const mo = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(register, 200);
  });
  mo.observe(root, { childList: true, subtree: true });

  return () => {
    io.disconnect();
    mo.disconnect();
    clearTimeout(t);
    clearTimeout(batchTimer);
  };
}

export function useTextFade(reduced) {
  useEffect(() => {
    if (reduced) return undefined;
    return attachTextFade(document.getElementById("root"), { skipVisible: false });
  }, [reduced]);
}
