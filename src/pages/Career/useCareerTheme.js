// Purpose: Dark / light preference for the Career overlay (remembered in localStorage).
//   toggle(event) runs a circular reveal from the clicked button using the View Transitions API.
//   Browsers without it (or reduced-motion users) get the soft CSS colour fade from career.css.
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

const KEY = "clicktots-career-theme";

function readTheme() {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage can be blocked */
  }
  return "dark";
}

export default function useCareerTheme() {
  const [theme, setTheme] = useState(readTheme);

  const toggle = useCallback(
    (e) => {
      const next = theme === "dark" ? "light" : "dark";
      const apply = () => flushSync(() => setTheme(next));

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduced) {
        apply();
        return;
      }

      // Origin of the wipe = centre of the clicked button
      const rect = e?.currentTarget?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
      const y = rect ? rect.top + rect.height / 2 : 40;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      const transition = document.startViewTransition(apply);
      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            {
              duration: 750,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    },
    [theme]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return [theme, toggle];
}