// Purpose: Implement the FAQChatAccordion components module, keeping this responsibility separate for maintainability.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";

/* ------------------------------------------------------------------ *
 *  FAQ: chat-style accordion (from the supplied ruixen component).
 *  Questions are dark bubbles on the right, answers are light bubbles on the left.
 *
 *  - Only ONE answer is open at a time: opening another closes the previous one.
 *  - The first question is opened by default. When the section scrolls into view the
 *    bubbles arrive one by one, then the first answer opens (typing dots → text).
 *  - Height changes use CSS grid rows (0fr ↔ 1fr), so the bubbles below follow smoothly.
 *  - Colours are the Key Facts ones (#434343 text, #D2D2D2 → white background).
 * ------------------------------------------------------------------ */

const FAQ_HOLD_VH = 80; // extra scroll (in screen heights) while the FAQ stays pinned

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EXPO_STRONG = "cubic-bezier(0.22, 1, 0.36, 1)";

// Act IV · conversational clarity: answers read like messaging Clicktots' AI growth strategist.
export const FAQ_ITEMS = [
  {
    question: "What does Clicktots do?",
    answer:
      "We are an AI-powered digital marketing agency in Chennai. We combine predictive SEO, automated Google & Meta ad bidding, generative creative and custom web engineering so your brand gets found, remembered and chosen.",
  },
  {
    question: "How fast does AI speed up website & campaign launches?",
    answer:
      "AI takes the repetitive work off the critical path: research, keyword mapping, first-draft content and creative variations. Most business websites go live in 4 to 6 weeks, campaigns often sooner, and we agree the timeline with you up front.",
  },
  {
    question: "Will my site rank on both Google Search and AI answer engines (AEO/GEO)?",
    answer:
      "That's the goal we build for. Every site is mobile-first, fast and built with clean structure, schema and sitemaps from day one, plus content written to answer real questions, so search engines and AI assistants like ChatGPT, Gemini and Perplexity can understand and cite you.",
  },
  {
    question: "Do you tailor AI growth systems for startups and SMBs?",
    answer:
      "Absolutely. We shape the scope and budget around your goals, starting with the channels that will move the needle first and adding automation as you grow, so you only pay for what actually works.",
  },
  {
    question: "How do we start our AI growth audit?",
    answer:
      "Send us a message or book a short call. We review your website, search visibility and ad accounts, then share a clear plan, timeline and quote, usually within a few days.",
  },
];


/* ---- side space: a slow field of flowing contour lines (canvas) fills the empty left and right
   of the chat. The lines drift like a calm signal, bend away from the pointer, and fade out
   before they reach the conversation, so the chat stays the focus. Drawn only on wide screens,
   only while the section is on screen; with reduced motion one still frame is drawn. ---- */
function FAQFlowField({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    const ctx = cv.getContext("2d");
    if (!ctx) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LINES = 30;
    const STEP = 16;
    const mouse = { x: -9999, y: -9999, s: 0, target: 0 };
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    const t0 = performance.now();

    const size = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now) => {
      const t = (now - t0) / 1000;
      mouse.s += (mouse.target - mouse.s) * 0.08;
      ctx.clearRect(0, 0, w, h);
      const mid = w / 2;
      for (let i = 0; i < LINES; i++) {
        const k = i / (LINES - 1);
        const baseY = h * (0.03 + 0.94 * k);
        const accent = i % 6 === 2;
        ctx.beginPath();
        for (let x = 0; x <= w + STEP; x += STEP) {
          const edge = Math.min(1, Math.abs(x - mid) / (w * 0.5));
          const amp = 8 + 30 * edge;
          let y =
            baseY +
            Math.sin(x * 0.006 + t * 0.45 + i * 0.34) * amp +
            Math.sin(x * 0.014 - t * 0.3 + i * 0.8) * amp * 0.4;
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 170) {
            const f = 1 - d / 170;
            y += (dy >= 0 ? 1 : -1) * f * f * 26 * mouse.s;
          }
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = accent ? "rgba(10,132,255,0.55)" : "rgba(67,67,67,0.17)";
        ctx.lineWidth = accent ? 1.3 : 1;
        ctx.stroke();
      }
    };

    const loop = (now) => {
      if (!visible) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.target = mouse.y > 0 && mouse.y < r.height ? 1 : 0;
    };

    const wide = () => window.innerWidth >= 1024;
    size();
    const ro = new ResizeObserver(() => {
      size();
      if (reduced || !visible) draw(performance.now());
    });
    ro.observe(cv);

    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      visible = entry.isIntersecting && wide();
      if (visible && !reduced) raf = requestAnimationFrame(loop);
      else if (wide()) draw(performance.now());
    });
    io.observe(cv);
    if (!reduced) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      visible = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // transparent in the middle (where the chat sits), solid toward the screen edges
  const mask =
    "linear-gradient(to right, #000 0, #000 calc(50% - 30rem), transparent calc(50% - 23rem), transparent calc(50% + 23rem), #000 calc(50% + 30rem), #000 100%)";
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        opacity: 1,
      }}
    />
  );
}

export default function FAQChatAccordion({
  title = "Have questions?",
  items = FAQ_ITEMS,
  typingDelay = 320,
  className,
}) {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef(null);
  // Entrance: the FAQ waits (invisible) until the shutter from Work in Motion has almost covered the
  // screen, then the title, divider and chat bubbles arrive one after another, slowly and softly.
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(null);
  const [showAnswer, setShowAnswer] = useState(null);
  const timerRef = useRef();
  const [stickTop, setStickTop] = useState(0);

  // pin the FAQ at the top; if its content is taller than the screen, pin by its bottom instead so nothing is cut off
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return undefined;
    const fit = () => setStickTop(Math.min(0, Math.round(window.innerHeight - el.offsetHeight)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return undefined;
    }
    const el = sectionRef.current;
    if (!el) return undefined;
    let done = false;
    const off = onFrame(() => {
      if (done) return;
      const top = scrollRect(el).top;
      // the FAQ top sits ~25vh down while the shutter starts, and reaches 0 when it is solid
      if (top < window.innerHeight * 0.1) {
        done = true;
        setInView(true);
      }
    });
    return off;
  }, [reduced]);

  const open = useCallback(
    (i, withTyping) => {
      clearTimeout(timerRef.current);
      setShowAnswer(null);
      setActive(i);
      if (withTyping && typingDelay > 0 && !reduced) {
        timerRef.current = setTimeout(() => setShowAnswer(i), typingDelay);
      } else {
        setShowAnswer(i);
      }
    },
    [typingDelay, reduced]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // once the bubbles have arrived, the first answer opens (typing dots → text)
  useEffect(() => {
    if (!inView) return undefined;
    const t = setTimeout(() => open(0, true), reduced ? 0 : 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const handleClick = (i) => {
    if (active === i) {
      clearTimeout(timerRef.current);
      setActive(null); // close; keep the content so it exits without a reverse morph
      return;
    }
    open(i, true); // the previous answer closes at the same moment
  };

  return (
    // The wrapper sits right under the last screen of Work in Motion (so the FAQ is already in place when
    // that section scrolls away) and is FAQ_HOLD_VH taller than the screen: the FAQ stays pinned there,
    // so it can be read and its entrance can play before the next section scrolls in.
    <div
      id="faq"
      className="relative z-0"
      style={reduced ? undefined : { marginTop: "-100svh", height: `calc(100svh + ${FAQ_HOLD_VH}svh)` }}
    >
    <section
      ref={sectionRef}
      aria-label="Frequently asked questions"
      className={cn("faq-root relative z-0 overflow-hidden", className)}
      style={{
        color: "#434343",
        minHeight: reduced ? undefined : "100svh",
        position: reduced ? undefined : "sticky",
        top: reduced ? undefined : stickTop,
      }}
    >
      {/* same background as Key Facts: #D2D2D2 at the top fading to white */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[linear-gradient(0deg,#FFFFFF_0%,#D2D2D2_100%)]"
      />

      <FAQFlowField active={inView || reduced} />

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="mb-10 text-center">
          <h2
            data-text-fade="off"
            className="kf-h2 faq-title"
            style={{
              opacity: inView || reduced ? 1 : 0,
              transform: inView || reduced ? "none" : "translate3d(0,26px,0)",
              filter: inView || reduced ? "none" : "blur(8px)",
              transition: reduced
                ? "none"
                : `opacity 1.1s ${EXPO_STRONG} 0.1s, transform 1.2s ${EXPO_STRONG} 0.1s, filter 1.1s ${EXPO_STRONG} 0.1s`,
            }}
          >
            {title}
          </h2>
        </div>

        {/* date separator draws outward from the middle */}
        <div className="mb-9 flex items-center gap-3">
          <div
            className="h-px flex-1 origin-right bg-[#9c9c9c]/60"
            style={{
              transform: inView || reduced ? "scaleX(1)" : "scaleX(0)",
              transition: `transform 1.3s ${EXPO_STRONG} 0.55s`,
            }}
          />
          <span
            className="text-[clamp(11px,0.9vw,14px)] font-medium text-[#434343]/60"
            style={{ opacity: inView || reduced ? 1 : 0, transition: "opacity .9s ease .9s" }}
          >
            Today
          </span>
          <div
            className="h-px flex-1 origin-left bg-[#9c9c9c]/60"
            style={{
              transform: inView || reduced ? "scaleX(1)" : "scaleX(0)",
              transition: `transform 1.3s ${EXPO_STRONG} 0.55s`,
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item, i) => {
            const isActive = active === i;
            const hasAnswer = showAnswer === i;
            const shown = inView || reduced;
            return (
              <div key={i}>
                {/* question: slides in from the right, one after another */}
                <div
                  className="flex justify-end"
                  style={{
                    opacity: shown ? 1 : 0,
                    transform: shown ? "none" : "translate3d(40px,24px,0)",
                    transition: reduced
                      ? "none"
                      : `opacity 1s ${EXPO_STRONG} ${0.8 + i * 0.2}s, transform 1.1s ${EXPO_STRONG} ${0.8 + i * 0.2}s`,
                  }}
                >
                  <motion.button
                    type="button"
                    className="max-w-[88%] cursor-pointer rounded-2xl rounded-br-[6px] bg-[#2F3135] px-5 py-3.5 text-left text-[clamp(13px,1.05vw,17px)] font-medium text-[#f1f1f1] outline-none transition-colors hover:bg-[#434343] focus-visible:ring-2 focus-visible:ring-[#c6f35c]"
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    onClick={() => handleClick(i)}
                    aria-expanded={isActive}
                    aria-controls={`faq-a-${i}`}
                  >
                    {item.question}
                  </motion.button>
                </div>

                {/* answer: outer grid handles the height, siblings follow */}
                <div
                  id={`faq-a-${i}`}
                  className="grid"
                  style={{
                    gridTemplateRows: isActive ? "1fr" : "0fr",
                    transition: isActive
                      ? `grid-template-rows 0.4s ${EXPO_STRONG}`
                      : `grid-template-rows 0.25s ${EXPO}`,
                  }}
                >
                  <div className="overflow-hidden">
                    <motion.div
                      initial={false}
                      animate={{ y: isActive ? 0 : 4, opacity: isActive ? 1 : 0 }}
                      transition={{
                        y: isActive ? { type: "spring", stiffness: 380, damping: 26 } : { duration: 0.15 },
                        opacity: { duration: isActive ? 0.25 : 0.12 },
                      }}
                    >
                      <div className="flex justify-start pt-2">
                        <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-bl-[6px] bg-[#e6e4e2] shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_6px_18px_-10px_rgba(0,0,0,.25)]">
                          {/* typing dots (collapse when the answer is ready) */}
                          <div
                            className="grid"
                            style={{
                              gridTemplateRows: hasAnswer ? "0fr" : "1fr",
                              transition: `grid-template-rows 0.3s ${EXPO}`,
                            }}
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-[5px] px-5 py-4" aria-hidden="true">
                                {[0, 0.15, 0.3].map((d) => (
                                  <span
                                    key={d}
                                    className="inline-block h-[5px] w-[5px] rounded-full bg-[#434343]/50"
                                    style={{ animation: `faqChatDot 1.2s ease-in-out ${d}s infinite` }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* answer text (expands when ready) */}
                          <div
                            className="grid"
                            style={{
                              gridTemplateRows: hasAnswer ? "1fr" : "0fr",
                              transition: `grid-template-rows 0.3s ${EXPO}`,
                            }}
                          >
                            <div className="overflow-hidden">
                              <p
                                className="px-5 py-3.5 text-[clamp(13px,1.05vw,17px)] leading-relaxed text-[#2F3135]"
                                data-text-fade="off"
                                style={{
                                  opacity: hasAnswer ? 1 : 0,
                                  transition: hasAnswer ? "opacity 0.2s ease 0.08s" : "opacity 0.1s ease",
                                }}
                              >
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
@keyframes faqChatDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.faq-root .faq-title{font-size:clamp(1.5rem,3vw,2.8rem)!important}
`}</style>
    </section>
    </div>
  );
}
