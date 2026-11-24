// Purpose: one case study (/case-study/<slug>).
//   The picture clicked in the grid flies from its tile to the front (fixed "flyer" → the hero frame), then
//   the text fades in: meta, the title word by word (blur → sharp), the summary, and every section below
//   fades up as it scrolls in (attachTextFade on the overlay, the site's own text fade).
//   Opened directly (no click), the page simply fades in.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CASE_STUDIES } from "./caseStudyData";
import { openCase, takeFlight, closeCase, FRAME_CROP } from "./caseFlight";

const EASE = [0.22, 1, 0.36, 1];
const FLY_MS = 950;
const GLIDE = "cubic-bezier(0.76, 0, 0.24, 1)";
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function CaseStudyDetail({ item, scrollRef }) {
  const idx = CASE_STUDIES.findIndex((c) => c.slug === item.slug);
  const next = CASE_STUDIES[(idx + 1) % CASE_STUDIES.length];

  /* ── the picture flies in from its grid tile ── */
  const frameRef = useRef(null);
  const flyRef = useRef(null);
  const [flight] = useState(() => (reducedMotion() ? null : takeFlight()));
  const [landed, setLanded] = useState(!flight);
  const [flyerOn, setFlyerOn] = useState(!!flight);

  useLayoutEffect(() => {
    if (!flight) return undefined;
    const fly = flyRef.current;
    const box = frameRef.current;
    if (!fly || !box) return undefined;
    // start the page at the top BEFORE measuring: the list was scrolled down to the grid, and measuring first
    // made the frame look far above the screen, so the picture flew off to the side
    const sc = scrollRef?.current;
    if (sc) {
      sc.__lenis?.scrollTo(0, { immediate: true, force: true });
      sc.scrollTop = 0;
    }
    const from = flight.rect;
    const to = box.getBoundingClientRect();
    const at = (r, radius) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${radius}px` });
    const anim = fly.animate(
      [
        { ...at(from, 14), boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)" },
        { offset: 0.55, ...at({ left: (from.left + to.left) / 2, top: (from.top + to.top) / 2 - 30, width: (from.width + to.width) / 2, height: (from.height + to.height) / 2 }, 20), boxShadow: "0 70px 120px -40px rgba(0,0,0,.9)" },
        { ...at(to, 24), boxShadow: "0 50px 110px -50px rgba(10, 132, 255,.45)" },
      ],
      { duration: FLY_MS, easing: GLIDE, fill: "both" },
    );
    // the crop glides from the tile's band to the frame's centred crop
    const crop = fly.querySelector("img")?.animate([{ objectPosition: flight.crop || FRAME_CROP }, { objectPosition: FRAME_CROP }], { duration: FLY_MS, easing: GLIDE, fill: "both" });
    let raf = 0;
    anim.onfinish = () => {
      setLanded(true);
      // remove the flyer only after the frame's picture has painted (two frames): no blink
      raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setFlyerOn(false))));
    };
    return () => {
      anim.cancel();
      crop?.cancel();
      cancelAnimationFrame(raf);
    };
  }, [flight, scrollRef]);

  /* back: the picture flies home to its tile in the grid (CaseStudyGrid picks it up) */
  const back = () => closeCase(item, frameRef.current);
  // the overlay's Back button / Esc ask for the same thing
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const h = () => backRef.current();
    window.addEventListener("case-back", h);
    return () => window.removeEventListener("case-back", h);
  }, []);

  const d0 = flight ? 0.55 : 0.1; // text starts once the picture is nearly there
  const words = item.title.split(" ");
  const fadeUp = (delay) => ({ initial: { opacity: 0, y: 16, filter: "blur(6px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { delay, duration: 0.8, ease: EASE } } });

  return (
    <article className="csd">
      {/* top bar */}
      <div className="csd-top">
        <button type="button" className="csd-btn" onClick={back}>
          <ArrowLeft size={15} /> All case studies
        </button>
        <span className="csd-crumb">
          Case Study <i>/</i> {item.sector}
        </span>
      </div>

      {/* the picture on stage */}
      <div ref={frameRef} className="csd-frame" style={{ opacity: landed ? 1 : 0 }}>
        <img src={item.image} alt={item.title} style={{ objectPosition: FRAME_CROP }} />
        <div className="csd-frame-shade" />
      </div>

      {/* headline */}
      <header className="csd-head" data-text-fade="off">
        <motion.p className="csd-meta" {...fadeUp(d0)}>
          <span className="csd-chip">{item.sector}</span>
          <span>{item.year}</span>
          <span aria-hidden="true">·</span>
          <span>{item.duration}</span>
        </motion.p>
        <h1 className="csd-title">
          {words.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              className="csd-word"
              initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: d0 + 0.1 + i * 0.045, duration: 0.85, ease: EASE } }}
            >
              {w}
            </motion.span>
          ))}
        </h1>
        <motion.p className="csd-lede" {...fadeUp(d0 + 0.4)}>
          {item.summary}
        </motion.p>
        <motion.ul className="csd-tags" {...fadeUp(d0 + 0.55)}>
          {item.services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </motion.ul>
      </header>

      {/* results */}
      <section className="csd-results" aria-label="Results">
        {item.results.map((r) => (
          <div key={r.label} className="csd-stat">
            <p className="csd-stat-v">{r.value}</p>
            <p className="csd-stat-l">{r.label}</p>
          </div>
        ))}
      </section>

      {/* story */}
      <section className="csd-sec">
        <p className="csd-k">01 · The challenge</p>
        <p className="csd-p">{item.challenge}</p>
      </section>

      <section className="csd-sec">
        <p className="csd-k">02 · What we did</p>
        <ol className="csd-steps">
          {item.approach.map((s, i) => (
            <li key={s.title}>
              <span className="csd-step-n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="csd-sec">
        <p className="csd-k">03 · The outcome</p>
        <p className="csd-p">
          {item.results.map((r) => `${r.value} ${r.label}`).join(" · ")}. Every number is tracked in a shared dashboard the client
          can open any time, and we keep testing to push it further.
        </p>
        <button type="button" className="csd-cta" onClick={() => window.dispatchEvent(new Event("clicktots:talk"))}>
          Start a project like this <ArrowUpRight size={15} />
        </button>
      </section>

      {/* next case */}
      <button
        type="button"
        className="csd-next"
        onClick={(e) => openCase(next, e.currentTarget.querySelector("img"), { replace: true })}
      >
        <span className="csd-next-img">
          <img src={next.image} alt="" />
        </span>
        <span className="csd-next-txt">
          <span className="csd-k">Next case study</span>
          <span className="csd-next-t">{next.title}</span>
        </span>
        <ArrowUpRight className="csd-next-ico" size={22} />
      </button>

      {/* the flying picture (above everything, fixed to the screen) */}
      {flyerOn &&
        createPortal(
          <div ref={flyRef} aria-hidden="true" style={{ position: "fixed", zIndex: 9600, overflow: "hidden", pointerEvents: "none", background: "#121826" }}>
            <img src={flight.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>,
          document.body,
        )}
    </article>
  );
}