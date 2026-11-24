// Purpose: Implement the AboutContent pages module, keeping this responsibility separate for maintainability.
import { useLayoutEffect, useRef } from "react";
import Footer from "@/components/Footer/Footer";
import { navigate } from "@/lib/router";
import Lenis from "lenis";
import { ArrowRight, Code, PenTool, Rocket, Search, TrendingUp } from "lucide-react";
import BlurReveal from "@/components/animations/BlurReveal";
import "./AboutContent.css";

const SERVICES = [
  ["Search & SEO", "Show up where your customers are already looking."],
  ["Social media", "Content and communities that people actually follow."],
  ["Performance ads", "Paid campaigns tuned for leads and sales, not vanity numbers."],
  ["Web design & development", "Fast, clear websites built to convert."],
  ["Branding & creative", "Logos, visuals and stories that make you memorable."],
  ["Video & content", "Short-form video and copy that carry your message."],
];

const STEPS = [
  {
    n: "01",
    title: "Discover",
    Icon: Search,
    text: "Your business, customers, market and goals come first, creating a clear plan before any design work begins.",
    tags: ["Strategy", "Research", "Positioning"],
  },
  {
    n: "02",
    title: "Design",
    Icon: PenTool,
    text: "Your brand and website take shape through clear ideas, simple page journeys and designs made for real customers.",
    tags: ["Brand Identity", "UX and UI", "Prototypes"],
  },
  {
    n: "03",
    title: "Build",
    Icon: Code,
    text: "Approved designs become a fast, accessible website with clean code, simple editing and strong performance on every device.",
    tags: ["Development", "CMS", "Performance"],
  },
  {
    n: "04",
    title: "Launch",
    Icon: Rocket,
    text: "Every page, form, link and connection is tested before launch, helping the website go live smoothly and without unwanted surprises.",
    tags: ["Quality Testing", "Migration", "Go-Live"],
  },
  {
    n: "05",
    title: "Grow",
    Icon: TrendingUp,
    text: "Search, paid advertising and website improvements help bring the right visitors, increase enquiries and support steady growth after launch.",
    tags: ["SEO", "Website Conversion", "Paid Advertising"],
  },
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function AboutContent({ scrollRef, onExploreWork, onClose }) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const scroller = scrollRef?.current;
    const root = rootRef.current;
    if (!scroller || !root) return undefined;

    /* ── 1. Smooth wheel scrolling inside the overlay (the page Lenis is stopped while it is open) ── */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduced
      ? null
      : new Lenis({
          wrapper: scroller,
          content: root,
          lerp: 0.12,
          smoothWheel: true,
          wheelMultiplier: 1,
          autoRaf: true,
        });

    const stack = root.querySelector(".ab-stack");
    const slots = [...root.querySelectorAll(".ab-slot")];
    const cards = slots.map((s) => s.querySelector(".ab-card"));
    const contents = slots.map((s) => s.querySelector(".ab-card-content"));
    const box = root.querySelector(".sp");
    const draw = root.querySelector("[data-draw]");
    const steps = [...root.querySelectorAll("[data-draw-step]")];

    const pathLen = draw?.getTotalLength ? draw.getTotalLength() : 0;
    if (draw && pathLen) {
      draw.style.strokeDasharray = String(pathLen);
      draw.style.strokeDashoffset = String(pathLen);
    }
    box?.classList.add("is-drawing");

    cards.forEach((card, i) => {
      if (card) {
        card.style.willChange = "transform, opacity";
        card.style.transformOrigin = "top center";
      }
      if (slots[i]) slots[i].style.zIndex = String(cards.length - i);
    });

    const GAP = 8;
    const PEEK = 38;

    /* ── 2. Measure ONCE (and on resize). Nothing is measured inside the frame loop,
          and the stack has a fixed height, so scrolling never triggers layout. ── */
    let heights = cards.map(() => 88);
    let stackAbs = 0;
    let boxAbs = 0;
    let boxH = 1;
    let stepAbs = [];
    let vh = scroller.clientHeight || window.innerHeight;
    let signature = "";

    const absTop = (el, sr, st) => el.getBoundingClientRect().top - sr.top + st;

    const measure = () => {
      heights = cards.map((c) => c?.offsetHeight || 88);
      if (stack) {
        stack.style.height = `${heights.reduce((sum, h) => sum + h + GAP, 0)}px`;
      }
      const sr = scroller.getBoundingClientRect();
      const st = scroller.scrollTop;
      vh = scroller.clientHeight || window.innerHeight;
      stackAbs = stack ? absTop(stack, sr, st) : 0;
      if (box) {
        boxAbs = absTop(box, sr, st);
        const br = box.getBoundingClientRect();
        boxH = Math.max(1, br.height);
        // the line ends at the centre of the LAST step's dot (it used to run on past the final card)
        const line = box.querySelector(".sp-line");
        const lastDot = steps.length ? steps[steps.length - 1].querySelector(".sp-dot") : null;
        if (line && lastDot) {
          const dr = lastDot.getBoundingClientRect();
          const lineH = Math.max(1, dr.top - br.top + dr.height / 2);
          line.style.bottom = "auto";
          line.style.height = `${lineH.toFixed(1)}px`;
          boxH = lineH; // drawing completes exactly when that dot is reached
        }
      }
      stepAbs = steps.map((step) => absTop(step, sr, st));
      signature = `${root.clientWidth}|${heights.join(",")}`;
    };

    const smoothedProgress = cards.map((_, i) => (i === 0 ? 1 : 0));
    const lastKey = cards.map(() => "");
    let offsets = cards.map(() => 0);

    let drawCur = 0;
    let lastDrawnPath = -1;
    let raf = 0;
    let lastTime;
    let disposed = false;

    const tick = (time) => {
      if (disposed) return;

      const dt = lastTime === undefined ? 16.67 : Math.min(32, time - lastTime);
      lastTime = time;
      const alpha = 1 - Math.exp(-dt / 26);

      const scrollTop = scroller.scrollTop;
      const triggerStart = vh * 0.84;
      const triggerEnd = vh * 0.46;
      const range = Math.max(120, triggerStart - triggerEnd);

      let settled = true;

      /* progress of each card, from where its slot is on screen (pure math, no DOM reads) */
      for (let i = 1; i < slots.length; i++) {
        const slotTop = stackAbs + offsets[i] - scrollTop;
        const target = easeOutCubic(clamp01((triggerStart - slotTop) / range));
        smoothedProgress[i] += (target - smoothedProgress[i]) * alpha;
        if (Math.abs(target - smoothedProgress[i]) < 0.0005) {
          smoothedProgress[i] = target;
        } else {
          settled = false;
        }
      }

      /* stack layout: each slot sits under the previous one (offsets), moved with transform only */
      let acc = 0;
      const nextOffsets = [];
      for (let i = 0; i < cards.length; i++) {
        nextOffsets[i] = acc;
        const p = smoothedProgress[i];
        const peek = i === 0 ? 1 : smoothedProgress[i - 1];
        acc +=
          i === 0
            ? heights[0] + GAP
            : peek * (PEEK + (heights[i] + GAP - PEEK) * p);
      }
      offsets = nextOffsets;

      if (box) {
        const target = clamp01((vh * 0.65 - (boxAbs - scrollTop)) / boxH);
        drawCur += (target - drawCur) * alpha;
        if (Math.abs(target - drawCur) < 0.0004) {
          drawCur = target;
        } else {
          settled = false;
        }
      }

      /* writes: transform / opacity / custom props only (compositor friendly) */
      cards.forEach((card, i) => {
        const slot = slots[i];
        const content = contents[i];
        if (!card || !slot || !content) return;

        const p = smoothedProgress[i];
        const peek = i === 0 ? 1 : smoothedProgress[i - 1];
        const off = offsets[i];
        const key = `${p.toFixed(3)}|${peek.toFixed(3)}|${off.toFixed(1)}`;
        if (key === lastKey[i]) return;
        lastKey[i] = key;
        settled = false;

        slot.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0)`;
        card.style.setProperty("--k", p.toFixed(3));
        card.style.opacity = i === 0 ? "1" : Math.min(1, peek * 1.4).toFixed(3);

        const rotX = -78 * (1 - p);
        const scaleX = 0.965 + 0.035 * p;
        card.style.transform =
          p > 0.999
            ? "perspective(1000px) rotateX(0deg) scaleX(1)"
            : `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) scaleX(${scaleX.toFixed(4)})`;

        content.style.opacity = (p < 0.15 ? 0 : Math.min(1, (p - 0.15) / 0.85)).toFixed(3);
        card.style.setProperty("--shade-top", (0.09 * (1 - p)).toFixed(3));
        card.style.setProperty("--shade-bottom", (0.05 * (1 - p)).toFixed(3));
      });

      if (draw && pathLen && Math.abs(drawCur - lastDrawnPath) >= 0.0005) {
        lastDrawnPath = drawCur;
        draw.style.strokeDashoffset = (pathLen * (1 - drawCur)).toFixed(1);
        settled = false;
      }

      const threshold = vh * 0.65;
      steps.forEach((step, idx) => {
        const isOn = stepAbs[idx] - scrollTop < threshold;
        if (step.classList.contains("is-on") !== isOn) step.classList.toggle("is-on", isOn);
      });

      if (!settled) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        lastTime = undefined;
      }
    };

    const wake = () => {
      if (disposed || raf) return;
      lastTime = undefined;
      raf = requestAnimationFrame(tick);
    };

    const remeasure = () => {
      const before = signature;
      measure();
      if (signature !== before) {
        lastKey.fill("");
        lenis?.resize();
      }
      wake();
    };

    measure();
    wake();

    scroller.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);
    cards.forEach((c) => c && ro.observe(c));
    document.fonts?.ready.then(remeasure);
    const lateTimer = setTimeout(remeasure, 120);

    return () => {
      disposed = true;
      clearTimeout(lateTimer);
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
      ro.disconnect();
      lenis?.destroy();
    };
  }, [scrollRef]);

  return (
    <div ref={rootRef} className="ab">
      {/* SECTION 1: About Clicktots Technologies */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-24 sm:px-12 md:px-16 lg:pt-32">
        <div className="grid gap-10 border-b border-neutral-400/50 pb-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <BlurReveal
              as="p"
              text="About Clicktots Technologies"
              delay={0.05}
              className="mb-4 block text-[0.65rem] uppercase tracking-[0.2em] text-neutral-700"
            />
            <BlurReveal
              as="h1"
              text="Creativity starts with a click."
              delay={0.15}
              stagger={0.09}
              duration={1.1}
              blur={14}
              y={18}
              className="block text-[clamp(1.5rem,3.2vw+0.5rem,2.9rem)] font-normal leading-[1.2] text-[#262626]"
            />
          </div>
          <div className="lg:col-span-5">
            <BlurReveal
              as="p"
              text="We are a digital marketing agency in Chennai. We help brands get found, get noticed and get chosen — with strategy, creative and performance marketing that work together instead of in silos."
              delay={0.32}
              stagger={0.03}
              className="block text-[clamp(0.75rem,0.4vw+0.62rem,0.9rem)] leading-[1.9] text-[#333]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: What we do */}
      <section className="relative w-full py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-12 md:px-16">
          <div className="grid items-start gap-12 lg:grid-cols-12">
            <div className="lg:sticky lg:top-24 lg:col-span-5 lg:pt-1">
              <BlurReveal
                as="h2"
                text="What we do"
                stagger={0.09}
                duration={1.1}
                blur={14}
                y={18}
                className="block text-[clamp(1.4rem,2.6vw+0.5rem,2.6rem)] font-normal leading-[1.2] text-[#262626]"
              />
              <BlurReveal
                as="p"
                text="End-to-end digital growth capabilities designed to turn attention into measurable revenue."
                delay={0.25}
                stagger={0.03}
                className="mt-5 block max-w-sm text-[0.7rem] leading-[1.9] text-[#333] sm:text-[0.75rem]"
              />
            </div>

            <div className="ab-stack lg:col-span-7">
              {SERVICES.map(([name, text], i) => (
                <div key={name} className="ab-slot">
                  <div className="ab-card px-6 py-5 sm:px-8 sm:py-6">
                    <div className="ab-card-content flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-baseline gap-4 sm:w-1/2">
                        <span className="text-[0.6rem] text-neutral-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-[clamp(0.8rem,0.8vw+0.5rem,1.05rem)] font-normal leading-snug text-[#262626]">
                          {name}
                        </h3>
                      </div>
                      <p className="text-[0.66rem] leading-[1.8] text-[#2e2e2e] sm:w-5/12">
                        {text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: How we work */}
      <section className="ab-st ab-st-scroll">
        <div className="ab-st-wrap">
          <header className="ab-st-head">
            <BlurReveal as="p" text="Process" className="ab-eyebrow" />
            <h2 className="ab-st-h2">
              <BlurReveal text="How we" stagger={0.1} duration={1.1} blur={14} y={18} />{" "}
              <BlurReveal text="work" delay={0.2} duration={1.1} blur={14} y={18} className="ab-hl" />
            </h2>
            <BlurReveal
              as="p"
              text="From first discovery to sustained growth—scroll to follow our five-stage process."
              delay={0.3}
              stagger={0.03}
              className="ab-lead block"
            />
          </header>

          <div className="sp">
            <svg
              className="sp-line"
              viewBox="0 0 40 1250"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className="sp-track"
                d="M20 0 C34 125 6 250 20 375 S34 625 20 750 S6 1000 20 1125 S34 1200 20 1250"
              />
              <path
                className="sp-draw"
                data-draw
                d="M20 0 C34 125 6 250 20 375 S34 625 20 750 S6 1000 20 1125 S34 1200 20 1250"
              />
            </svg>

            <ol className="sp-list">
              {STEPS.map(({ n, title, Icon, text, tags }) => (
                <li key={n} className="sp-item" data-draw-step>
                  <span className="sp-dot">
                    <Icon aria-hidden="true" strokeWidth={2} />
                  </span>
                  <div className="sp-card">
                    <span className="sp-date">{n}</span>
                    <BlurReveal as="h3" text={title} className="sp-title" />
                    <BlurReveal as="p" text={text} delay={0.1} stagger={0.02} className="sp-text" />
                    <div className="sp-tags">
                      {tags.map((t) => (
                        <span key={t} className="sp-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* SECTION 4: Explore Our Work CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-8 sm:px-12 md:px-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[4px] bg-[#262626] px-8 py-9 text-white sm:flex-row sm:items-center sm:px-12">
          <div>
            <BlurReveal
              as="h3"
              text="Ready to get found, noticed, and chosen?"
              stagger={0.07}
              duration={1}
              className="block text-[clamp(0.95rem,1.4vw+0.5rem,1.5rem)] font-normal leading-snug"
            />
            <BlurReveal
              as="p"
              text="See how we bring strategy, creative, and performance together."
              delay={0.25}
              stagger={0.03}
              className="mt-2 block text-[0.68rem] leading-[1.8] text-neutral-300"
            />
          </div>
          <button
            type="button"
            onClick={onExploreWork}
            className="ct-btn ct-btn-light shrink-0 gap-2.5 px-6 py-3 text-[0.65rem] uppercase tracking-[0.08em]"
          >
            Explore Our Work
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* the site footer at the end of every inner page */}
      <Footer standalone onHome={onClose} onNavigate={(path) => navigate(path)} />
    </div>
  );
}
