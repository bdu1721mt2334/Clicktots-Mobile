// Purpose: Implement the useTextFade hooks module, keeping this responsibility separate for maintainability.
import { useEffect } from "react";

/* Site-wide text fade-in: headings, paragraphs, list items and captions fade up (with a soft
   blur) the first time they scroll into view. It is purely additive:
   - it only touches elements that have no inline opacity / transform / filter of their own,
     so the scroll-driven scenes (hero, ring, Work in Motion, rocket …) keep full control;
   - text that already has its own reveal (BlurReveal words, the services word-rise, …) is skipped;
   - once the fade has played, the helper classes are removed again, leaving the element untouched.
   Reduced motion: nothing is hidden and nothing animates. */

const SELECTOR = "h1,h2,h3,h4,h5,p,li,blockquote,figcaption,dt,dd,label";
const SKIP = ".rg-scope,[data-text-fade='off'],nav,header,canvas,svg,button,a>*:only-child";

const hasOwnMotion = (el) => {
  const st = el.style;
  if (st.opacity || st.transform || st.filter || st.translate) return true;
  // BlurReveal / word-rise: words are already animated spans inside
  return !!el.querySelector(":scope > span[aria-hidden='true'], :scope .rg-rise");
};

/** Attach the fade-in to every text element inside `root` (now and added later). Returns a cleanup.
 *  skipVisible: leave text that is already on screen when the page loads alone (the home page hero). */
export function attachTextFade(root, { skipVisible = true } = {}) {
  if (!root || typeof IntersectionObserver === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const seen = new WeakSet();
  let batch = 0;
  let batchTimer = 0;

  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((e) => {
          const el = e.target;
          io.unobserve(el);
          const delay = Math.min(batch++, 8) * 70;
          clearTimeout(batchTimer);
          batchTimer = setTimeout(() => (batch = 0), 200);
          el.style.setProperty("--ct-d", `${delay}ms`);
          requestAnimationFrame(() => el.classList.add("ct-in"));
          const done = () => {
            el.classList.remove("ct-fade", "ct-in");
            el.style.removeProperty("--ct-d");
          };
          el.addEventListener("transitionend", done, { once: true });
          setTimeout(done, 1800 + delay); // safety net
        });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );

  const register = () => {
    root.querySelectorAll(SELECTOR).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.closest(SKIP) || hasOwnMotion(el)) return;
      if (!el.textContent.trim()) return;
      if (skipVisible) {
        // anything already on screen at load is left alone (the hero etc. have their own intro)
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0 && window.scrollY < 40) return;
      }
      el.classList.add("ct-fade");
      io.observe(el);
    });
  };

  register();
  let t = 0;
  const mo = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(register, 250);
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
    return attachTextFade(document.getElementById("root"));
  }, [reduced]);
}
