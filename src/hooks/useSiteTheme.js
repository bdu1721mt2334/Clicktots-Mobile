// Purpose: Site-wide day (light) / dark theme preference with circular View Transitions wipe.
// Syncs with Career overlay via localStorage + custom event so toggling anywhere keeps the whole site aligned.
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

export const SITE_THEME_KEY = "clicktots-site-theme";
export const SITE_THEME_EVENT = "clicktots:site-theme";

export function readSiteTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(SITE_THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage can be blocked */
  }
  return "light";
}

function applyDomTheme(next) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.siteTheme = next;
  }
}

export default function useSiteTheme() {
  const [theme, setTheme] = useState(() => {
    const initial = readSiteTheme();
    applyDomTheme(initial);
    return initial;
  });

  useEffect(() => {
    applyDomTheme(theme);
    try {
      window.localStorage.setItem(SITE_THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Listen for toggles triggered from other overlays (e.g. Career)
  useEffect(() => {
    const onSync = (e) => {
      const next = e?.detail;
      if ((next === "light" || next === "dark") && next !== theme) {
        applyDomTheme(next);
        setTheme(next);
      }
    };
    window.addEventListener(SITE_THEME_EVENT, onSync);
    return () => window.removeEventListener(SITE_THEME_EVENT, onSync);
  }, [theme]);

  const toggle = useCallback(
    (e) => {
      const next = theme === "dark" ? "light" : "dark";
      const apply = () => {
        applyDomTheme(next);
        try {
          window.localStorage.setItem(SITE_THEME_KEY, next);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new CustomEvent(SITE_THEME_EVENT, { detail: next }));
        flushSync(() => setTheme(next));
      };

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (typeof document === "undefined" || !document.startViewTransition || reduced) {
        apply();
        return;
      }

      const rect = e?.currentTarget?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
      const y = rect ? rect.top + rect.height / 2 : 80;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(apply);
      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 700,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .catch(() => {});
    },
    [theme]
  );

  return [theme, toggle];
}
