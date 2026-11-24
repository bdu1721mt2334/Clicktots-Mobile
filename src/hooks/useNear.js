// Purpose: true once an element comes within `margin` of the viewport (and stays true). Used to start
// downloading pictures / heavy code for sections far down the page only when the visitor gets close,
// so they don't compete with the hero during page load.
import { useEffect, useState } from "react";

export function useNear(ref, margin = "150% 0px 150% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setNear(true);
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
