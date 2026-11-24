// Purpose: The picture in the top-right of a service page's hero. When the page was opened from a ring
// card (or the hover preview of a service word), that same picture flies from where it was clicked into
// this spot while the page reveals around it, and lands as the hero text finishes appearing.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { getOrigin, getOriginImage } from "@/lib/router";
import { SERVICE_CARDS } from "./servicesData";
import "./heroImage.css";
import ShuttleIcon from "./story/ShuttleIcon";

const FLY_MS = 1250; // lands while the hero text is still revealing
const GLIDE = "cubic-bezier(0.65, 0, 0.18, 1)";
const EASE = [0.22, 1, 0.36, 1];

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HeroImage({ service }) {
  const boxRef = useRef(null);
  const flyRef = useRef(null);

  // decided once, when the page opens: the clicked picture (if any) or the service's own picture
  const [origin] = useState(() => getOriginImage());
  const fallback = SERVICE_CARDS.find((c) => c.category === service.category);
  const src = origin?.src || fallback?.image;
  const title = origin?.title || fallback?.title || service.tagline;
  const [flying] = useState(() => !!origin?.rect && !prefersReduced());
  const [landed, setLanded] = useState(!flying);
  const [flyerOn, setFlyerOn] = useState(flying);

  useLayoutEffect(() => {
    if (!flying) return undefined;
    const fly = flyRef.current;
    const box = boxRef.current;
    if (!fly || !box) return undefined;
    const from = origin.rect;
    const to = box.getBoundingClientRect();
    const at = (r, radius) => ({
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      borderRadius: `${radius}px`,
    });
    // left/top/width/height (not scale) so the photo never stretches on the way
    const anim = fly.animate(
      [
        { ...at(from, 16), boxShadow: "0 10px 30px -10px rgba(0,0,0,.35)" },
        { ...at(to, 28), boxShadow: `0 40px 80px -40px ${service.color}` },
      ],
      { duration: FLY_MS, easing: GLIDE, fill: "both" }
    );
    anim.onfinish = () => {
      setLanded(true);
      requestAnimationFrame(() => setFlyerOn(false));
    };
    return () => anim.cancel();
  }, [flying, origin, service.color]);

  // closing the page: the picture flies back to the card / word it came from, while the page shrinks
  // into it. Built outside React so it can finish after this page has unmounted.
  const imgRef = useRef(null);
  const backTo = useRef(origin?.rect || getOrigin());
  useEffect(() => {
    const onClosing = () => {
      const box = boxRef.current;
      const to = backTo.current;
      if (!box || !to || prefersReduced()) return;
      const from = box.getBoundingClientRect();
      // only when the picture is (at least partly) on screen
      if (from.bottom < 0 || from.top > window.innerHeight || from.width < 2) return;
      const fly = document.createElement("div");
      fly.setAttribute("aria-hidden", "true");
      Object.assign(fly.style, {
        position: "fixed",
        zIndex: "9500",
        overflow: "hidden",
        pointerEvents: "none",
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        borderRadius: "28px",
      });
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      Object.assign(img.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
      fly.appendChild(img);
      document.body.appendChild(fly);
      if (imgRef.current) imgRef.current.style.opacity = "0";
      const at = (r, radius) => ({
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: `${radius}px`,
      });
      const anim = fly.animate(
        [
          { ...at(from, 28), opacity: 1 },
          { ...at(to, 16), opacity: 1, offset: 0.85 },
          { ...at(to, 16), opacity: 0 },
        ],
        { duration: 700, easing: GLIDE, fill: "both" }
      );
      anim.onfinish = () => fly.remove();
      setTimeout(() => fly.remove(), 1500); // safety net
    };
    window.addEventListener("clicktots:service-closing", onClosing);
    return () => window.removeEventListener("clicktots:service-closing", onClosing);
  }, [src]);

  return (
    <>
      <motion.div
        ref={boxRef}
        // while the picture is still flying in, this frame stays invisible (no empty grey box)
        className={`relative w-full overflow-hidden rounded-[28px] aspect-[16/10] lg:aspect-[4/5] ${landed ? "border border-black/10 bg-[#e4e4e0]" : ""}`}
        style={{ boxShadow: landed ? `0 40px 80px -40px ${service.color}` : "none" }}
        // without a flight the picture simply eases in with the text
        initial={flying ? false : { opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 1, ease: EASE, delay: 0.75 } }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: landed ? 1 : 0 }}
        />

        {/* No label box: the picture stays clear. Top-left a glass tag with the number + service,
            bottom-right a slowly spinning ring of text around an arrow (the service + its promise),
            bottom-left the little rocket the scroll story launches from (data-rk-origin). */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={landed ? { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: flying ? 0.05 : 1.1 } } : {}}
          className="hi-tag"
        >
          <i style={{ background: service.color, boxShadow: `0 0 10px ${service.color}` }} />
          <b>{service.n}</b>
          <span>{service.name}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -40 }}
          animate={landed ? { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.9, ease: EASE, delay: flying ? 0.15 : 1.25 } } : {}}
          className="hi-seal"
          style={{ "--c": service.color }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 120 120" className="hi-seal-ring">
            <defs>
              <path id={`hi-arc-${service.slug}`} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
            </defs>
            <text>
              <textPath href={`#hi-arc-${service.slug}`} textLength="282">
                {`${service.name} · ${title} · `.toUpperCase()}
              </textPath>
            </text>
          </svg>
          <span className="hi-seal-core">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={landed ? { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE, delay: flying ? 0.3 : 1.4 } } : {}}
          className="hi-rocket"
          style={{ "--c": service.color }}
          aria-hidden="true"
        >
          <span data-rk-origin className="hi-rocket-ship"><ShuttleIcon className="rk-svg" /></span>
          <span>Scroll to launch</span>
        </motion.div>
      </motion.div>

      {/* the flying copy of the clicked picture (above the opening page) */}
      {flyerOn &&
        createPortal(
          <div
            ref={flyRef}
            aria-hidden="true"
            className="pointer-events-none fixed overflow-hidden"
            style={{ zIndex: 9500, left: origin.rect.left, top: origin.rect.top, width: origin.rect.width, height: origin.rect.height, borderRadius: 16, willChange: "left, top, width, height" }}
          >
            <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
          </div>,
          document.body
        )}
    </>
  );
}