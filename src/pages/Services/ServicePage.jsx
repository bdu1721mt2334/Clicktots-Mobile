// Purpose: Implement the ServicePage pages module, keeping this responsibility separate for maintainability.
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import BlurReveal from "@/components/animations/BlurReveal";
import { SERVICES_DATA } from "./servicesData";
import { storyFor } from "./storyData";
import RocketStory, { storyScreens } from "./story/RocketStory";
import HeroImage from "./HeroImage";
import ToolBox from "./ToolBox";
import Footer from "@/components/Footer/Footer";
import { attachTextFade } from "@/hooks/useTextFade";

/* The content of one service page (/Webdevelopment, /SEO, /Design, /Branding, /Marketing).
   It lives inside ServiceOverlay (the About-style expand animation).
   Page flow: hero → rocket story (story/RocketStory: the hero flies away, a rocket explains every
   step in space) → what's included → tools box (ToolBox) → FAQ → CTA → footer.
   Text fades in as it scrolls into view (the same fade as the home page).
   Everything here is about the SERVICE – no Projects data or components are used.
   All text: servicesData.js · tool logos: toolLogos.js */

const EASE = [0.22, 1, 0.36, 1];
const INK = "#1a1d1f";

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 26, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "0px 0px -8% 0px" },
  transition: { duration: 0.8, ease: EASE, delay },
});

/* columns that slide in from a side (dir -1 = left, 1 = right); children stagger in */
const fromSide = (dir) => ({
  initial: "hide",
  whileInView: "show",
  viewport: { once: false, amount: 0.25 },
  variants: {
    show: {
      transition: { staggerChildren: 0.07, delayChildren: dir > 0 ? 0.15 : 0 },
    },
  },
});
const itemV = (dir, dist = 60) => ({
  hide: { opacity: 0, x: dir * dist, filter: "blur(8px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: EASE },
  },
});
const fadeUp = {
  hide: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

const openExpertForm = () => window.dispatchEvent(new Event("clicktots:talk"));

function FaqItem({ q, a, color }) {
  return (
    <details className="group border-b border-black/10 py-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm sm:text-base text-[#1a1d1f]">
        <span>{q}</span>
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none text-[#1a1d1f] transition-transform duration-300 group-open:rotate-45"
          style={{ background: color }}
        >
          +
        </span>
      </summary>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60">
        {a}
      </p>
    </details>
  );
}

function Tick({ color }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#1a1d1f]"
      style={{ background: color }}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

/* fallback for a service without a scroll story: the plain step list */
function FlowList({ service }) {
  return (
    <section className="mt-20 sm:mt-28" aria-labelledby="flow-title">
      <motion.p
        {...rise()}
        className="text-[11px] uppercase tracking-[0.2em] text-black/55"
      >
        How Clicktots works
      </motion.p>
      <motion.h2
        {...rise(0.05)}
        id="flow-title"
        className="mt-3 max-w-2xl text-2xl sm:text-3xl leading-snug"
      >
        Our {service.name.toLowerCase()} process, step by step
      </motion.h2>

      <ol className="relative mt-10 m-0 p-0 list-none">
        <span
          aria-hidden="true"
          className="absolute left-[19px] top-2 bottom-2 w-px"
          style={{
            background: `linear-gradient(${service.color}, rgba(0,0,0,0.08))`,
          }}
        />
        {service.flow.map((step, i) => (
          <motion.li
            key={step.title}
            {...rise(0.04)}
            className="relative grid grid-cols-[40px_1fr] gap-5 pb-10 last:pb-0 sm:gap-8"
          >
            <span
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-[11px] tabular-nums text-[#1a1d1f]"
              style={{ background: service.color }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] transition-shadow hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.3)]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base sm:text-lg">{step.title}</h3>
                <span className="text-[11px] tracking-wide text-black/45">
                  {step.time}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-black/65">
                {step.text}
              </p>
              <p className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed">
                <Tick color={service.color} />
                <span>
                  <span className="text-black/45">You get: </span>
                  {step.gives}
                </span>
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

export default function ServicePage({ service, onClose, onNavigate }) {
  const pageRef = useRef(null);
  const slug = service?.slug;
  // the site-wide text fade, inside this page too (the overlay lives outside #root)
  useEffect(
    () => attachTextFade(pageRef.current, { skipVisible: false }),
    [slug],
  );

  /* The rocket story is heavy (hundreds of elements + the 3D scene). Mount it only after the opening
     animation has finished (or the moment the visitor tries to scroll), so the click → page → flying
     picture stays perfectly smooth. Until then an empty block keeps the page the same height. */
  const [storyOn, setStoryOn] = useState(false);
  useEffect(() => {
    setStoryOn(false);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setStoryOn(true);
    };
    const t = setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 600 }) : go()), 1400);
    const evs = ["wheel", "touchmove", "keydown"];
    evs.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    return () => {
      done = true;
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, go));
    };
  }, [slug]);

  /* The hero stays pinned while the rocket story plays over it (RocketStory moves the hero's text,
     picture and background itself). Taller heroes (phones) scroll first and pin once their bottom
     reaches the bottom of the screen. */
  const pinRef = useRef(null);
  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return undefined;
    const update = () => {
      pin.style.top = `${Math.min(0, window.innerHeight - pin.offsetHeight)}px`;
    };
    const ro = new ResizeObserver(update);
    ro.observe(pin);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [slug]);

  if (!service) return null;

  const idx = SERVICES_DATA.findIndex((s) => s.slug === service.slug);
  const next = SERVICES_DATA[(idx + 1) % SERVICES_DATA.length];
  const story = storyFor(service);

  return (
    <div
      ref={pageRef}
      className="min-h-full text-[#1a1d1f]"
      style={{ color: INK }}
    >
      {/* ── top bar (right side is left free for the floating close button) ── */}
      {/* hero + story: the hero is pinned while the story panel scrolls over it */}
      <div className="relative">
        <div ref={pinRef} className="sticky z-[1]" style={{ top: 0 }}>
          <div className="relative flex min-h-[100svh] flex-col overflow-hidden">
            {/* page colour behind the hero: fades out to reveal space when the rocket launches */}
            <div data-rk-bg aria-hidden="true" className="absolute inset-0 bg-[#f2f2f0]" />
            <header data-rk-head className="relative mx-auto flex w-full max-w-[1200px] items-center gap-4 px-6 pt-6 pr-24 sm:pt-8 md:px-12 md:pr-28">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to home"
                className="cursor-pointer transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50 rounded"
              >
                <img
                  src="/assets/clicktots-logo.webp"
                  alt="Clicktots Technologies"
                  className="h-7 sm:h-9 w-auto"
                />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-[11px] tracking-wide text-black/50 whitespace-nowrap">
                <span>Our Services</span>
                <span aria-hidden="true">/</span>
                <span className="text-[#1a1d1f]">{service.name}</span>
              </div>
            </header>

            <main className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 pb-16 md:px-12">
              {/* ── hero ── */}
              <section className="pt-14 sm:pt-20">
                {/* text on the left, the service picture in the free space on the right */}
                <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
                  <div data-rk-text className="min-w-0">
                    <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-black/55">
                      Our Services · {service.n}
                    </p>

                    <h1 className="mt-5 text-2xl sm:text-3xl xl:text-4xl leading-[1.1] tracking-tight">
                      <BlurReveal
                        text={service.name}
                        delay={0.2}
                        duration={1.1}
                        blur={14}
                        y={18}
                      />
                    </h1>

                    <BlurReveal
                      as="p"
                      text={service.tagline}
                      delay={0.45}
                      duration={0.9}
                      className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-black/80"
                    />
                    <BlurReveal
                      as="p"
                      text={service.intro}
                      delay={0.65}
                      duration={0.9}
                      className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-black/60"
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: 0.8, ease: EASE, delay: 0.85 },
                      }}
                      className="mt-8 flex flex-wrap gap-3"
                    >
                      <button
                        type="button"
                        onClick={openExpertForm}
                        className="ct-btn ct-btn-primary gap-2 px-6 py-3 text-xs uppercase tracking-wider"
                      >
                        Talk to Our Experts <ArrowUpRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="ct-btn ct-btn-ghost-ink gap-2 px-6 py-3 text-xs uppercase tracking-wider"
                      >
                        <ArrowLeft className="h-4 w-4" /> Back to home
                      </button>
                    </motion.div>
                  </div>

                  <div data-rk-image className="lg:-mt-6">
                    <HeroImage key={service.slug} service={service} />
                  </div>
                </div>
              </section>
            </main>

            {/* clear "scroll" prompt at the bottom of the hero – fades away as soon as the visitor scrolls */}
            {story && (
              <div data-rk-cue className="rk-cue" style={{ "--c": service.color }} aria-hidden="true">
                <div className="rk-cue-body">
                <span className="rk-cue-mouse">
                  <i />
                </span>
                <span className="rk-cue-t">
                  Scroll down to launch the mission
                  <small>Watch the rocket explain every step</small>
                </span>
                <span className="rk-cue-arrows">
                  <b />
                  <b />
                </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── rocket story: the process, told by a rocket flying through space ── */}
        {story ? (
          storyOn ? (
            <RocketStory key={service.slug} service={service} story={story} />
          ) : (
            <div aria-hidden="true" style={{ height: `calc(${100 + storyScreens(service.flow.length) * 100}svh)`, marginTop: "-100svh", marginBottom: "-30svh" }} />
          )
        ) : (
          <div />
        )}
      </div>

      <main className="mx-auto w-full max-w-[1200px] px-6 pb-24 md:px-12">
        {!story && <FlowList service={service} />}

        {/* ── what's included (left) + tools box (right) ── */}
        <section
          className={`${story ? "-mt-16 sm:-mt-24 pt-6 relative z-10" : "mt-20 sm:mt-28"} grid items-start gap-10 md:grid-cols-2 md:gap-12`}
          data-text-fade="off"
        >
          <motion.div {...fromSide(-1)}>
            <motion.h2 variants={itemV(-1)} className="text-xl sm:text-2xl">
              What's included
            </motion.h2>
            <ul className="mt-6 m-0 p-0 list-none space-y-3">
              {service.deliverables.map((d) => (
                <motion.li
                  key={d}
                  variants={itemV(-1)}
                  className="flex items-start gap-3 text-sm leading-relaxed text-black/70"
                >
                  <Tick color={service.color} />
                  {d}
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...fromSide(1)} className="min-w-0">
            <motion.h2
              variants={itemV(1)}
              id={`tb-title-${service.slug}`}
              className="text-xl sm:text-2xl"
            >
              Tools we use
            </motion.h2>
            {/* logo balls in a dark box, sized to fit this column */}
            <motion.div variants={itemV(1, 70)}>
              <ToolBox key={service.slug} service={service} />
            </motion.div>
          </motion.div>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-20 sm:mt-28" aria-labelledby="faq-title">
          <h2 id="faq-title" className="text-xl sm:text-2xl">
            Questions we hear a lot
          </h2>
          <motion.div
            className="mt-6 border-t border-black/10"
            initial="hide"
            whileInView="show"
            viewport={{ once: false, amount: 0.2 }}
            variants={{
              show: {
                transition: { staggerChildren: 0.1, delayChildren: 0.1 },
              },
            }}
          >
            {service.faqs.map((f) => (
              <motion.div key={f.q} variants={fadeUp} data-text-fade="off">
                <FaqItem q={f.q} a={f.a} color={service.color} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── CTA + other services ── */}
        <section
          className="mt-20 sm:mt-28 rounded-3xl border border-black/10 p-8 sm:p-12"
          style={{
            background: `radial-gradient(circle at 85% 0%, ${service.color}55, transparent 55%), #ffffff`,
          }}
        >
          <h2 className="max-w-xl text-xl sm:text-3xl leading-snug">
            Ready to start your {service.name.toLowerCase()} project?
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openExpertForm}
              className="ct-btn ct-btn-primary gap-2 px-6 py-3 text-xs uppercase tracking-wider"
            >
              Talk to Our Experts <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(next.path)}
              className="ct-btn ct-btn-ghost-ink gap-2 px-6 py-3 text-xs uppercase tracking-wider"
            >
              Next: {next.name} <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="All services" className="mt-8 flex flex-wrap gap-2">
            {SERVICES_DATA.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => onNavigate(s.path)}
                aria-current={s.slug === service.slug ? "page" : undefined}
                className={`ct-btn px-4 py-2 text-xs border ${
                  s.slug === service.slug
                    ? "border-[#0071e3] bg-[#0071e3] text-white"
                    : "border-black/20 text-black/70 hover:border-[#0a84ff] hover:text-[#0a84ff]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </nav>
        </section>
      </main>

      {/* ── the site footer, on every service page ── */}
      <Footer standalone onHome={onClose} onNavigate={onNavigate} />
    </div>
  );
}
