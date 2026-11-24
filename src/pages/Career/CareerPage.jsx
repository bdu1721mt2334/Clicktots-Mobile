// Purpose: Main Career landing view (/career) with hero image, BlurReveal copy, and 5-card HoloFlipDeck.
//   Theme aware (dark / light). Opening a role goes through onOpenRole so the overlay can run the
//   "image flies to the top" transition; falls back to a plain navigate if no handler is passed.
import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import BlurReveal from "@/components/animations/BlurReveal";
import { navigate } from "@/lib/router";
import HoloFlipDeck from "./HoloFlipDeck";

export default function CareerPage({ onOpenRole, returning = false, onReturnMeasured }) {
  const scrollToRoles = () => {
    const el = document.getElementById("career-roles-deck");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleKnowMore = (slug, origin) => {
    if (onOpenRole) onOpenRole(slug, origin);
    else navigate(`/career/${slug}`);
  };

  return (
    <div className="min-h-full pb-24">
      {/* 1. Hero Section with Studio Image + BlurReveal */}
      <section className="relative mx-auto max-w-6xl px-5 pt-24 pb-12 sm:px-8 sm:pt-28">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="ct-chip ct-accent-ink inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em]"
          >
            Careers at ClickTots Technologies
          </motion.span>

          <h1 className="ct-ink mt-5 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.06]">
            <BlurReveal text="Come Join Our Team" by="word" delay={0.08} />
          </h1>

          <p className="ct-soft mt-4 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            <BlurReveal
              text="Build what brands click with. Join our Chennai studio of engineers, designers, and AI growth strategists crafting high-impact digital experiences."
              by="word"
              delay={0.25}
              duration={0.7}
            />
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex justify-center"
          >
            <button
              type="button"
              onClick={scrollToRoles}
              className="ct-btn ct-btn-primary gap-2 px-6 py-3 text-xs uppercase tracking-wider"
            >
              Explore Open Roles
              <ArrowDown className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Hero Image Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="ct-frame relative overflow-hidden rounded-3xl shadow-2xl"
        >
          <img
            src="/images/career-hero.webp"
            alt="ClickTots Technologies studio team collaborating"
            className="w-full h-[260px] sm:h-[420px] md:h-[480px] object-cover"
          />
          <div className="ct-hero-fade pointer-events-none absolute inset-0" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
            <div className="rounded-2xl border border-white/15 bg-black/50 px-4 py-2.5 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-widest text-[#0A84FF] font-semibold">
                Chennai · Hybrid Studio
              </p>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                5 Open Roles Across Engineering, Design &amp; Growth
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. Hanging 5-Card Holo Flip Deck Section */}
      <section id="career-roles-deck" className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
        <div className="text-center mb-2">
          <span className="ct-accent-ink text-[11px] font-mono uppercase tracking-[0.18em]">
            Interactive Role Badges
          </span>
          <h2 className="ct-ink mt-2 text-2xl sm:text-4xl font-semibold">Pick Your Role on the Line</h2>
        </div>

        <HoloFlipDeck onKnowMore={handleKnowMore} returning={returning} onReturnMeasured={onReturnMeasured} />
      </section>
    </div>
  );
}