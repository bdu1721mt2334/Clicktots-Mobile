// Purpose: Implement the AllProjects pages module, keeping this responsibility separate for maintainability.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import BackButton from "@/components/BackButton/BackButton";
import Footer from "@/components/Footer/Footer";
import { useOverlayScroll } from "@/hooks/useOverlayScroll";
import { navigate } from "@/lib/router";
import { setScrollLocked } from "@/lib/scroll";
import { ALL_PROJECTS, PROJECT_CATEGORIES } from "@/components/StackSlider/projects";
import { CaseStudyModal } from "@/components/StackSlider/CaseStudyModal";
import { TiltCard } from "@/components/TiltCard/TiltCard";
import BlurReveal from "@/components/animations/BlurReveal";
import SpaceBackdrop from "@/components/SpaceBackdrop/SpaceBackdrop";
import useSiteTheme from "@/hooks/useSiteTheme";

/* ── Shutter-bar page transition ─────────────────────────────────────────────
   Same animation as About Us → Key Facts (ShutterTransition.jsx): 5 horizontal
   bars grow up from the bottom one after another until they cover the screen.
   Here it is time-based instead of scroll-based:
     cover  → bars rise and hide the home page
     reveal → the /projects page is mounted underneath, bars slide away upward
   Closing runs the same thing again (cover → unmount → reveal the home page). */
const BAR_COUNT = 5;
const STAGGER = 0.09;
const BAR_DURATION = 0.6;
const BAR_EASE = [0.76, 0, 0.24, 1]; // power2.inOut, like the original
const BAR_COLOR = "#D2D2D2"; // same bar colour as ShutterTransition
const EASE = [0.22, 1, 0.36, 1];

// `ref` is forwarded so AnimatePresence popLayout can measure the card (React 19 passes ref as a prop)
function WorkCard({ item, index, onOpen, ref }) {
  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.55, ease: EASE, delay: Math.min(index, 8) * 0.05 },
      }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      className="list-none"
    >
      {/* TiltCard: leans toward the pointer, light sheen follows it, photo drifts behind */}
      <TiltCard
        src={item.image}
        alt={item.imageAlt}
        ariaLabel={`Open case study for ${item.word}: ${item.subtitle}`}
        onClick={() => onOpen(item)}
        fallbackBackground={`radial-gradient(circle at 35% 30%, ${item.glowColor}, ${item.washColor})`}
        className="group"
      >
        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
          {item.category}
        </span>

        <span className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex items-end justify-between gap-4">
          <span className="block min-w-0">
            <span className="flex items-center gap-2 text-[10px] sm:text-[11px] text-white/75 font-mono tabular-nums">
              <span>{item.indexLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans truncate">{item.discipline}</span>
            </span>
            <BlurReveal
              text={item.subtitle}
              as="span"
              delay={0.15 + Math.min(index, 8) * 0.05}
              duration={0.8}
              blur={8}
              y={10}
              className="mt-0.5 block text-xs sm:text-sm font-medium text-white leading-snug"
            />
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 text-white opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0">
            <span>Inspect</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </span>
      </TiltCard>
    </motion.li>
  );
}

function ProjectsPageContent({ onClose, onOpenProject, selected, onCloseProject, onSelectProject }) {
  const [filter, setFilter] = useState("All");
  const [theme] = useSiteTheme();
  const isDark = theme === "dark";

  const tabs = useMemo(
    () => [
      { id: "All", count: ALL_PROJECTS.length },
      ...PROJECT_CATEGORIES.map((c) => ({
        id: c,
        count: ALL_PROJECTS.filter((p) => p.category === c).length,
      })).filter((t) => t.count > 0),
    ],
    []
  );

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  useOverlayScroll(scrollRef, contentRef);
  const visible = useMemo(
    () => (filter === "All" ? ALL_PROJECTS : ALL_PROJECTS.filter((p) => p.category === filter)),
    [filter]
  );

  // Esc closes the page (the case-study modal handles its own Esc first)
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !selected && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onClose]);

  return (
    <div
      className={`stack-slider-scope absolute inset-0 transition-colors duration-300 ${
        isDark ? "bg-[#0B0C0E] text-white" : "bg-[#E9E6DF] text-[#121110]"
      }`}
    >
      {/* mission orbits: a planet rises in the corner, satellites (launched projects) circle it */}
      <SpaceBackdrop variant="orbit" scrollRef={scrollRef} theme={theme} />
      <BackButton tone={isDark ? "dark" : "light"} label="Back to home" onClick={onClose} />
      {/* data-lenis-prevent: the page's smooth-scroll must not hijack this inner scroller */}
      <div
        ref={scrollRef}
        data-lenis-prevent
        className="absolute inset-0 overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef}>
        <header className="mx-auto w-full max-w-[1360px] px-6 md:px-12 pt-28 sm:pt-32 flex items-center justify-start gap-4">
          <div
            className={`flex items-center gap-3 text-xs font-mono tabular-nums tracking-wide ${
              isDark ? "text-white/65" : "text-black/60"
            }`}
          >
            <span>Selected Works</span>
            <span aria-hidden="true">/</span>
            <span className={isDark ? "text-white" : "text-[#121110]"}>All Projects</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] px-6 md:px-12 pb-24">
          <div className="pt-10 sm:pt-14">
            <h1
              className={`font-display text-2xl sm:text-3xl xl:text-5xl font-semibold tracking-tight leading-[1.1] ${
                isDark ? "text-white" : "text-[#121110]"
              }`}
            >
              <BlurReveal text="All" delay={0.35} duration={1.1} blur={14} y={18} />{" "}
              <BlurReveal text="work" delay={0.5} duration={1.1} blur={14} y={18} />
            </h1>
            <BlurReveal
              as="p"
              text="Websites, SEO, design and more. Pick a category to filter, or open any project for the full case study."
              delay={0.7}
              duration={0.9}
              className={`mt-4 max-w-xl text-sm sm:text-base leading-relaxed ${
                isDark ? "text-white/70" : "text-black/70"
              }`}
            />
          </div>

          {/* filter tabs */}
          <motion.div
            role="tablist"
            aria-label="Filter projects by category"
            className="mt-6 sm:mt-10 flex flex-wrap gap-1.5 sm:gap-2"
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE, delay: 0.9 } }}
          >
            {tabs.map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(t.id)}
                  className={`ct-btn gap-1.5 sm:gap-2 border px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm ${
                    active
                      ? "border-[#0071e3] bg-[#0071e3] text-white"
                      : isDark
                        ? "border-white/20 text-white/80 hover:border-[#0a84ff] hover:text-white"
                        : "border-black/20 bg-white/55 text-[#121110] hover:border-[#0071e3] hover:text-[#0071e3]"
                  }`}
                >
                  <span>{t.id === "All" ? "All work" : t.id}</span>
                  <span
                    className={`font-mono text-[9.5px] sm:text-xs tabular-nums ${
                      active ? "text-white/75" : isDark ? "text-white/45" : "text-black/50"
                    }`}
                  >
                    {String(t.count).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* separate cards, same style as the slider cards */}
          <motion.ul
            layout
            className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 p-0 m-0"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((item, i) => (
                <WorkCard key={item.id} item={item} index={i} onOpen={onOpenProject} />
              ))}
            </AnimatePresence>
          </motion.ul>
        </main>
        {/* the site footer at the end of every inner page */}
        <Footer standalone onHome={onClose} onNavigate={(path) => navigate(path)} />
        </div>
      </div>

      <CaseStudyModal
        item={selected}
        items={visible}
        onClose={onCloseProject}
        onSelect={onSelectProject}
        zIndex={9400}
      />
    </div>
  );
}

export default function AllProjects({ open, onClose }) {
  const reduced = useReducedMotion();
  // hidden → cover → reveal → idle → closeCover → closeReveal → hidden
  const [stage, setStage] = useState("hidden");
  const [contentOn, setContentOn] = useState(false);
  const [selected, setSelected] = useState(null);
  const contentKey = useRef(0);

  // follow the `open` prop (set from the /projects URL)
  useEffect(() => {
    if (open && stage === "hidden") {
      contentKey.current += 1;
      setStage("cover");
    } else if (!open && (stage === "cover" || stage === "reveal" || stage === "idle")) {
      setStage("closeCover");
    }
  }, [open, stage]);

  const mounted = stage !== "hidden";

  useEffect(() => {
    if (!mounted) return undefined;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [mounted]);

  const handleBarDone = (i) => {
    if (stage === "cover" && i === 0) {
      setContentOn(true);
      setStage("reveal");
    } else if (stage === "reveal" && i === BAR_COUNT - 1) {
      setStage("idle");
    } else if (stage === "closeCover" && i === 0) {
      setContentOn(false);
      setSelected(null);
      setStage("closeReveal");
    } else if (stage === "closeReveal" && i === BAR_COUNT - 1) {
      setStage("hidden");
    }
  };

  if (typeof document === "undefined" || !mounted) return null;

  const covering = stage === "cover" || stage === "closeCover";
  const leaving = stage === "reveal" || stage === "closeReveal";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All projects"
      className="fixed inset-0"
      style={{ zIndex: 9000, pointerEvents: contentOn ? "none" : "auto" }}
    >
      {contentOn && (
        <div className="absolute inset-0" style={{ pointerEvents: "auto" }}>
          <ProjectsPageContent
            key={contentKey.current}
            onClose={onClose}
            selected={selected}
            onOpenProject={setSelected}
            onCloseProject={() => setSelected(null)}
            onSelectProject={setSelected}
          />
        </div>
      )}

      {/* ── Shutter bars ── */}
      <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ zIndex: 20 }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <motion.div
            key={i}
            style={{
              flex: 1,
              width: "100%",
              backgroundColor: BAR_COLOR,
              transformOrigin: covering ? "bottom" : "top",
              willChange: "transform",
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: covering ? 1 : 0 }}
            transition={{
              duration: reduced ? 0.01 : BAR_DURATION,
              ease: BAR_EASE,
              delay: reduced
                ? 0
                : covering
                  ? (BAR_COUNT - 1 - i) * STAGGER
                  : leaving
                    ? i * STAGGER
                    : 0,
            }}
            onAnimationComplete={() => handleBarDone(i)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}
