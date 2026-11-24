// Purpose: Implement the KeyFacts pages module, keeping this responsibility separate for maintainability.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useNear } from "@/hooks/useNear";
import BlurReveal from "@/components/animations/BlurReveal";
import { ASSET_ABOUT_PHOTO } from "@/pages/About/AboutReveal";
import { PORTFOLIO_SLIDES } from "@/components/StackSlider/projects";
import "./KeyFacts.css";

// the colour Key Facts' background turns into = the first Projects slide's background
const PROJECTS_BG = PORTFOLIO_SLIDES[0].washColor;

/* ════════════════════════════════════════════════════════════════════
   CONTENT — edit everything here.
   The numbers and partner names below are PLACEHOLDERS: replace them with
   Clicktots' real figures before going live.
   ════════════════════════════════════════════════════════════════════ */
const KEY_FACTS = {
  // Act I telemetry readout: the shutters close on the AI hand, these panels prove the scale.
  title: "Measured impact",
  subtitle: "What happens when 15+ years of Chennai\nagency craft runs on AI workflows.",
  brands: {
    label: "Brands scaled with AI",
    cycle: [
      { word: "AI SEO", image: "/cycle/seo.webp", pos: "62% 50%" },
      { word: "Predictive PPC", image: "/cycle/performance-ads.webp", pos: "50% 50%" },
      { word: "Algorithmic Social", image: "/cycle/social-media.webp", pos: "50% 40%" },
      { word: "AI Websites", image: "/cycle/webdesign.webp", pos: "50% 50%" },
      { word: "Brand Systems", image: "/cycle/branding.webp", pos: "35% 55%" },
      { word: "Content Engine", image: "/cycle/content.webp", pos: "40% 50%" },
    ],
    caption: "Predictive campaigns that put challenger brands on the map.",
    value: "50",
  },
  projects: {
    label: "growth systems shipped",
    value: "150",
    caption: "Strategy, generative creative and\nfull-stack code, delivered end to end.",
  },
  team: {
    label: "strategists & AI engineers",
    caption: "Marketers, developers and\nprompt architects. One standard.",
    value: "25",
    photo: ASSET_ABOUT_PHOTO.replace("w=2400", "w=1000"),
  },
  partnersTitle: "Ecosystems our AI optimizes",
  partners: ["Google Ads", "Meta Advantage+", "HubSpot AI", "Shopify", "WordPress"],
};

/* ── scroll-scrubbed card flip (same timing as the reference) ── */
const CARD_FLIP_DEG = -92;
const CARD_STAGGER = 0.6;
const CARD_DURATION = 2.65;
const CARDS_TIMELINE = CARD_DURATION + CARD_STAGGER * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const cardProgress = (v, index) =>
  clamp01((v * CARDS_TIMELINE - index * CARD_STAGGER) / CARD_DURATION);

function useMediaQuery(query, serverValue = true) {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/* ── Rolling digit counter ── */
function RollDigit({ digit, play, delay, duration, instant }) {
  return (
    <span className="kf-digit" aria-hidden="true">
      <motion.span
        className="kf-digit-col"
        initial={false}
        animate={{ y: play ? `${-digit * 10}%` : "0%" }}
        transition={
          instant
            ? { duration: 0 }
            : { duration, delay, ease: [0.645, 0.045, 0.355, 1] } // power3.inOut
        }
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="kf-digit-cell">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingNumber({ value, duration = 1.6 }) {
  const ref = useRef(null);
  const reduceMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const play = inView || reduceMotion;
  let n = 0;

  return (
    <span ref={ref} className="kf-roll">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {[...value].map((ch, i) =>
          /\d/.test(ch) ? (
            <RollDigit
              key={i}
              digit={Number(ch)}
              play={play}
              delay={0.1 * n++}
              duration={duration}
              instant={reduceMotion}
            />
          ) : (
            <span key={i} className="kf-static">
              {ch}
            </span>
          )
        )}
      </span>
    </span>
  );
}

function Stat({ value, duration, className }) {
  return (
    <span className={cn("kf-number flex items-start", className)}>
      <RollingNumber value={value} duration={duration} />
      <span className="kf-plus" aria-hidden="true">
        +
      </span>
    </span>
  );
}

/* ── Cycle: one timer drives the word AND its image, so they always change together ── */
function useCycle(length, hold = 2000, fade = 1200) {
  const [active, setActive] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (reduceMotion || length < 2) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % length), hold + fade);
    return () => clearInterval(id);
  }, [length, hold, fade, reduceMotion]);
  return active;
}

const CYCLE_FADE = 1200;

/* Full-card image layer: cross-fades with a slow zoom, same timing as the word */
function CycleImages({ items, active }) {
  // the pictures load once the card is near the screen (not during page load), all at once, so the
  // cross-fade never flashes an unloaded image
  const boxRef = useRef(null);
  const near = useNear(boxRef);

  return (
    <div ref={boxRef} className="absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {items.map(({ image, word, pos }, i) => (
        <img
          key={word}
          src={near ? image : undefined}
          alt=""
          draggable="false"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: pos || "50% 50%",
            opacity: i === active ? 1 : 0,
            transform: i === active ? "scale(1)" : "scale(1.08)",
            transition: `opacity ${CYCLE_FADE}ms ease-in-out, transform ${CYCLE_FADE * 2}ms ease-out`,
          }}
        />
      ))}
      {/* stronger top + bottom shade so the label, word and number stay readable on bright photos */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,26,15,0.7)_0%,rgba(6,26,15,0.1)_30%,rgba(6,26,15,0.25)_55%,rgba(6,26,15,0.9)_100%)]" />
    </div>
  );
}

function CycleWords({ items, active }) {
  return (
    <div className="relative mb-2 ml-auto flex h-9 w-full items-end justify-end">
      {items.map(({ word }, i) => (
        <span
          key={word}
          aria-hidden={i !== active}
          className="absolute bottom-0 right-0 whitespace-nowrap text-right text-[1.3rem] font-medium leading-none tracking-[-0.04em] text-[#c6f35c]"
          style={{
            opacity: i === active ? 1 : 0,
            transition: `opacity ${CYCLE_FADE}ms ease-in-out`,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

/* ── A card that flips up from the top edge as you scroll (desktop) ── */
function FlipCard({ progress, index, enabled, className, children }) {
  const rotateX = useTransform(
    progress,
    (v) => CARD_FLIP_DEG * (1 - cardProgress(v, index))
  );
  const opacity = useTransform(progress, (v) => cardProgress(v, index));
  const visibility = useTransform(progress, (v) =>
    cardProgress(v, index) > 0 ? "visible" : "hidden"
  );

  return (
    <motion.div
      data-kf-card="true"
      className={className}
      style={
        enabled
          ? {
            rotateX,
            opacity,
            visibility,
            transformOrigin: "center top",
            backfaceVisibility: "hidden",
            willChange: "transform, opacity",
          }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

/* ── Bottom hairline that draws itself, with a rotating plus that follows the cursor ── */
function LinePlus({ fade }) {
  const blockRef = useRef(null);
  const plusRef = useRef(null);
  const done = useRef(false);
  const { scrollYProgress } = useScroll({
    target: blockRef,
    offset: ["start end", "start center"],
  });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    done.current = v >= 1;
    if (!done.current) x.set(0);
  });

  const onMove = (e) => {
    if (!done.current || !blockRef.current || !plusRef.current) return;
    const b = blockRef.current.getBoundingClientRect();
    const half = plusRef.current.getBoundingClientRect().width / 2;
    const limit = Math.max(0, b.width / 2 - half);
    const fromCenter = e.clientX - (b.left + b.width / 2);
    x.set(Math.min(Math.max(fromCenter, -limit), limit));
  };

  return (
    <motion.div style={{ opacity: fade }} className="absolute bottom-0 left-0 right-0 z-0 mx-auto max-w-[1800px] px-4 md:translate-y-1/2 md:px-6 lg:px-10">
      <div
        ref={blockRef}
        onMouseMove={onMove}
        onMouseLeave={() => x.set(0)}
        className="relative flex items-center justify-center py-3"
      >
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2 bg-[#434343]/15"
          style={{ width }}
        />
        <motion.svg
          ref={plusRef}
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
          aria-hidden="true"
          className="relative h-4 w-4 lg:h-[13px] lg:w-[13px]"
          style={{ rotate, x: springX }}
        >
          <line x1="6.5" y1="0" x2="6.5" y2="13" strokeWidth="1" stroke="#272727" />
          <line x1="0" y1="6.5" x2="13" y2="6.5" strokeWidth="1" stroke="#272727" />
        </motion.svg>
      </div>
    </motion.div>
  );
}

const CARD_BASE =
  "relative shrink-0 snap-center overflow-hidden rounded-lg w-[78vw] max-w-[20rem] " +
  "h-[54svh] min-h-[330px] max-h-[27rem] md:h-[23rem] md:w-[calc((100%-2.5rem)/3)] lg:h-[27rem] lg:w-full";

function BrandsCard({ progress, enabled }) {
  const { brands } = KEY_FACTS;
  const active = useCycle(brands.cycle.length, 2000, CYCLE_FADE);
  return (
    <FlipCard
      progress={progress}
      index={0}
      enabled={enabled}
      className={cn(CARD_BASE, "bg-[#08170e] text-[#d8d8d8]")}
    >
      <div className="kf-aurora" aria-hidden="true" />
      <CycleImages items={brands.cycle} active={active} />
      <div className="relative z-[2] flex h-full flex-col justify-between p-6 lg:p-7">
        <span className="kf-title block">{brands.label}</span>
        <div>
          <CycleWords items={brands.cycle} active={active} />
          <div className="flex items-center justify-between gap-x-4">
            <p className="kf-small w-9/12 whitespace-pre-line opacity-90">{brands.caption}</p>
            <Stat value={brands.value} duration={1.55} className="text-[#d8d8d8]" />
          </div>
        </div>
      </div>
    </FlipCard>
  );
}

/* ── Phones: the section pins and vertical scroll slides the 3 cards in from the right, one by one ── */
const MOBILE_CARD_GAP = 16;
function MobileFactsSlider({ title, children }) {
  const pinRef = useRef(null);
  const [cardW, setCardW] = useState(() =>
    typeof window === "undefined" ? 300 : Math.min(window.innerWidth * 0.8, 340)
  );
  const [active, setActive] = useState(0);
  const count = Array.isArray(children) ? children.length : 1;

  useEffect(() => {
    const fit = () => setCardW(Math.min(window.innerWidth * 0.8, 340));
    window.addEventListener("resize", fit, { passive: true });
    return () => window.removeEventListener("resize", fit);
  }, []);

  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  // short hold on the first and the last card, so each one can be read before it moves
  const slide = useTransform(scrollYProgress, (v) => {
    const raw = clamp01((v - 0.06) / 0.88) * (count - 1);
    const k = Math.min(count - 2, Math.floor(raw));
    const f = clamp01((raw - k - 0.3) / 0.7); // each card rests for the first 30% of its step
    return k + f * f * (3 - 2 * f);
  });
  const smooth = useSpring(slide, { stiffness: 140, damping: 26, mass: 0.5, restDelta: 0.001 });
  const x = useTransform(smooth, (v) => -v * (cardW + MOBILE_CARD_GAP));
  useMotionValueEvent(slide, "change", (v) => setActive(Math.round(v)));

  return (
    <div ref={pinRef} className="relative" style={{ height: `${100 + (count - 1) * 85}svh` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        {title}
        <motion.div
          className="flex"
          style={{
            x,
            gap: MOBILE_CARD_GAP,
            paddingLeft: `calc((100vw - ${cardW}px) / 2)`,
            willChange: "transform",
          }}
        >
          {Array.isArray(children)
            ? children.map((c, i) => (
              <div key={i} className="kf-m-card shrink-0" style={{ width: cardW }}>
                {c}
              </div>
            ))
            : children}
        </motion.div>
        <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full bg-[#434343] transition-all duration-300"
              style={{ width: i === active ? 22 : 6, opacity: i === active ? 0.85 : 0.25 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function KeyFacts({ sectionRef: externalRef }) {
  const internalRef = useRef(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // phones: the cards are pinned (tall); the blue fade into Projects follows the partner strip below them instead
  const tailRef = useRef(null);
  const fadeRef = isDesktop ? internalRef : tailRef;
  // callback refs: the shared ref (read by Projects) is filled during commit, before any scroll hook reads it
  const setSectionEl = (el) => {
    internalRef.current = el;
    if (externalRef && isDesktop && el) externalRef.current = el;
  };
  const setTailEl = (el) => {
    tailRef.current = el;
    if (externalRef && !isDesktop && el) externalRef.current = el;
  };

  // Cards flip up between "section top at viewport centre" and "section top at top"
  const { scrollYProgress } = useScroll({
    target: internalRef,
    offset: ["start center", "start start"],
  });
  // scrub: 2 in GSAP = a little lag, which a spring reproduces
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.6,
    restDelta: 0.0005,
  });

  // Keep the light background for the first 50% of Key Facts, then fade to
  // 100% Projects blue (#121821) by the time Projects reaches the top.
  const { scrollYProgress: bgScroll } = useScroll({
    target: fadeRef,
    offset: ["start start", "end start"],
  });
  const blueOpacity = useTransform(bgScroll, [0.5, 1], [0, 1]);
  const lineFade = useTransform(bgScroll, [0.5, 0.85], [1, 0]);

  const { projects, team } = KEY_FACTS;
  const partnerItem = (name, key) => (
    <div
      key={key}
      className="flex items-center justify-center border-r border-[#9c9c9c]/15 px-6 last:border-0 lg:px-10"
    >
      <span className="whitespace-nowrap text-[1.1rem] font-semibold tracking-[-0.04em] text-[#434343]/70">
        {name}
      </span>
    </div>
  );

  const titleEl = (
    <div className="mb-8 flex flex-col items-center gap-4 text-center lg:mb-12">
            <BlurReveal
              as="h2"
              by="char"
              stagger={0.05}
              text={KEY_FACTS.title}
              className="kf-h2"
            />
            <BlurReveal
              as="p"
              by="word"
              delay={0.3}
              text={KEY_FACTS.subtitle}
              className="kf-small"
            />
          </div>
  );
  const cards = [
    <BrandsCard key="brands" progress={progress} enabled={isDesktop} />,
    <FlipCard
            key="projects"
            progress={progress}
            index={1}
            enabled={isDesktop}
            className={cn(
              CARD_BASE,
              "flex flex-col justify-between bg-[#e6e4e2] p-8 text-center lg:p-10"
            )}
          >
            <span className="kf-title block text-[#434343]">{projects.label}</span>
            <div className="relative flex flex-1 flex-col items-center justify-center">
              <div className="absolute left-1/2 top-1/2 h-[9.5rem] w-[9.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white lg:h-[10.5rem] lg:w-[10.5rem]" />
              <div className="relative z-[2] flex items-center">
                <Stat value={projects.value} duration={1.85} className="text-[#434343]" />
              </div>
            </div>
            <p className="kf-small whitespace-pre-line text-[#434343] opacity-80">
              {projects.caption}
            </p>
          </FlipCard>,
    <FlipCard
            key="team"
            progress={progress}
            index={2}
            enabled={isDesktop}
            className={cn(CARD_BASE, "group bg-[#2F3135] text-[#d8d8d8]")}
          >
            <div className="relative z-[3] flex h-full flex-col justify-between p-6 lg:p-7">
              <span className="kf-title block text-right">{team.label}</span>
              <div className="relative my-4 min-h-0 flex-1 overflow-hidden rounded-sm lg:my-8">
                <img
                  src={team.photo}
                  alt="The Clicktots team"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-[1.01] object-cover object-top grayscale transition duration-700 ease-out group-hover:scale-[1.06] group-hover:grayscale-0"
                />
              </div>
              <div className="flex items-end justify-between">
                <p className="kf-small whitespace-pre-line text-[#d8d8d8]/60">{team.caption}</p>
                <Stat value={team.value} duration={1.55} className="text-[#d8d8d8]" />
              </div>
            </div>
          </FlipCard>
  ];

  return (
    <section
      id="key-facts"
      ref={setSectionEl}
      className="kf-root relative z-20 pb-8 pt-10 md:pt-20 max-md:overflow-x-clip lg:pb-10"
    >
      {/* background layers: light gradient, with the Projects colour fading in over it */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[linear-gradient(0deg,#FFFFFF_0%,#D2D2D2_100%)]"
      />
      {/* Stays light until 50% scroll through Key Facts, then fades to 100% Projects blue */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundColor: PROJECTS_BG, opacity: blueOpacity }}
      />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6 lg:px-10">
        {isDesktop ? (
          <>
            {titleEl}
            <div
              className="kf-hide-scrollbar flex flex-wrap justify-center gap-5 lg:flex-nowrap"
              style={{ perspective: 1400, transformStyle: "preserve-3d" }}
            >
              {cards}
            </div>
          </>
        ) : (
          <div className="-mx-6">
            <MobileFactsSlider title={<div className="px-6">{titleEl}</div>}>{cards}</MobileFactsSlider>
          </div>
        )}

        {/* Partners */}
        <div ref={setTailEl} className="mt-10 flex flex-col gap-8 md:mt-14 lg:mt-20">
          <BlurReveal
            as="span"
            by="word"
            stagger={0.05}
            text={KEY_FACTS.partnersTitle}
            className="kf-title block text-center text-black"
          />
          <div className="-mx-4 hidden justify-center lg:-mx-10 lg:flex">
            {KEY_FACTS.partners.map((p) => partnerItem(p, p))}
          </div>
          <div className="relative -mx-6 block w-auto overflow-hidden lg:hidden">
            <div className="kf-marquee-track">
              {[...KEY_FACTS.partners, ...KEY_FACTS.partners].map((p, i) =>
                partnerItem(p, `${p}-${i}`)
              )}
            </div>
          </div>
        </div>
      </div>

      <LinePlus fade={lineFade} />
    </section>
  );
}