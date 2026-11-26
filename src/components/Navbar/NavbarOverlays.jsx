// Purpose: Lazy-loaded Navbar overlays (Services dropdown, Talk to Our Experts modal, Mobile drawer) so motion/react, lucide-react, and servicesData stay out of the initial page-load bundle.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navigate } from "@/lib/router";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { LiquidGlass } from "@/components/glass/LiquidGlass";
import { SERVICE_CARDS, serviceByCategory } from "@/pages/Services/servicesData";
import {
  PhoneCall,
  Send,
  CheckCircle2,
  X,
  ArrowUpRight,
  BarChart3,
  Share2,
  Code2,
  Search,
  Sparkles,
  TrendingUp,
  Target,
  ShoppingBag,
  Video,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

const SERVICE_ICONS = {
  "Predictive Analytics": BarChart3,
  "Algorithmic Social": Share2,
  "Full-Stack Web Dev": Code2,
  "Technical & AI SEO": Search,
  "Generative Content": Sparkles,
  "Growth Strategy": TrendingUp,
  "Google & Meta PPC": Target,
  "E-Commerce Scaling": ShoppingBag,
  "Video & Motion Ads": Video,
  "CRO & AI Chat Funnels": MessageSquare,
};

const DROP_EASE = [0.22, 1, 0.36, 1];
const MENU_SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };
const PILL_SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.7 };

const SPARKLES = [
  { top: "6%", left: "78%", delay: 0 },
  { top: "72%", left: "10%", delay: 0.35 },
  { top: "20%", left: "6%", delay: 0.7 },
  { top: "82%", left: "80%", delay: 0.5 },
];

const menuVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...MENU_SPRING, staggerChildren: 0.022, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: DROP_EASE } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function ServicesMenu({ open, isLight = false, onClose }) {
  const [hovered, setHovered] = useState(null);
  const lightRef = useRef(null);

  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  const onPointerMove = (e) => {
    const el = lightRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.setProperty("--mo", "1");
  };
  const onPointerLeave = () => {
    lightRef.current?.style.setProperty("--mo", "0");
    setHovered(null);
  };

  return (
    <div className="pointer-events-none absolute left-1/2 top-full w-[min(640px,calc(100vw-3rem))] -translate-x-1/2">
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {open && (
            <motion.div
              key="services-menu"
              variants={menuVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ transformOrigin: "50% 0%" }}
              className="pointer-events-auto pt-3 will-change-transform"
            >
              <LiquidGlass
                variant="clear"
                tone={isLight ? "light" : "dark"}
                radius={26}
                bezel={28}
                refraction={1.35}
                dispersion={0.12}
                blur={isLight ? 14 : 10}
                style={
                  isLight
                    ? {
                        "--fd-lg-fill": "rgba(246, 243, 236, 0.95)",
                        "--fd-lg-sat": "1.35",
                        "--fd-lg-bright": "1.02",
                        "--fd-lg-spec-o": "0.55",
                        "--fd-lg-shadow":
                          "0 26px 60px -16px rgba(18, 17, 16, 0.3), 0 8px 20px -10px rgba(18, 17, 16, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(18, 17, 16, 0.06), inset 0 0 0 1px rgba(18, 17, 16, 0.14)",
                      }
                    : {
                        "--fd-lg-fill": "rgba(10, 14, 22, 0.86)",
                        "--fd-lg-sat": "1.6",
                        "--fd-lg-bright": "1.06",
                        "--fd-lg-spec-o": "0.95",
                        "--fd-lg-shadow":
                          "0 30px 70px -18px rgba(0, 0, 0, 0.78), 0 8px 24px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
                      }
                }
              >
                <div
                  ref={lightRef}
                  onPointerMove={onPointerMove}
                  onPointerLeave={onPointerLeave}
                  className="relative overflow-hidden rounded-[26px] p-3"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 rounded-[inherit] ${
                      isLight
                        ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.12)_28%,transparent_60%)]"
                        : "bg-[linear-gradient(180deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0.035)_26%,transparent_55%)]"
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-x-10 -top-24 h-40 rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.07)_45%,rgba(255,255,255,0.11)_50%,rgba(255,255,255,0.07)_55%,transparent)] blur-xl"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500"
                    style={{
                      opacity: "var(--mo, 0)",
                      background: isLight
                        ? "radial-gradient(380px circle at var(--mx, 50%) var(--my, 0%), rgba(10, 132, 255, 0.1), rgba(255, 255, 255, 0.25) 35%, transparent 65%)"
                        : "radial-gradient(380px circle at var(--mx, 50%) var(--my, 0%), rgba(140, 198, 255, 0.12), rgba(255, 255, 255, 0.04) 35%, transparent 65%)",
                    }}
                  />

                  <div className="relative grid grid-cols-2 gap-1.5" role="menu" aria-label="Services">
                    {SERVICE_CARDS.map((card) => {
                      const svc = serviceByCategory(card.category);
                      const Icon = SERVICE_ICONS[card.title] || Sparkles;
                      const isHot = hovered === card.title;
                      return (
                        <motion.button
                          key={card.title}
                          variants={itemVariants}
                          type="button"
                          role="menuitem"
                          data-hot={isHot || undefined}
                          onPointerEnter={() => setHovered(card.title)}
                          onFocus={() => setHovered(card.title)}
                          onClick={(e) => {
                            onClose();
                            if (svc?.path) {
                              navigate(svc.path, { rect: e.currentTarget.getBoundingClientRect() });
                            }
                          }}
                          className="group relative flex cursor-pointer items-center gap-3.5 rounded-2xl px-2.5 py-2 text-left outline-none transition-transform duration-200 active:scale-[0.98] focus-visible:ring-1 focus-visible:ring-[#0A84FF]/60"
                        >
                          {isHot && (
                            <motion.span
                              layoutId="services-hover-pill"
                              transition={PILL_SPRING}
                              aria-hidden="true"
                              className={
                                isLight
                                  ? "absolute inset-0 rounded-2xl bg-[#121110]/[0.07] shadow-[inset_0_0_0_1px_rgba(18,17,16,0.12),0_4px_14px_-8px_rgba(18,17,16,0.18)]"
                                  : "absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(255,255,255,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_0_0_1px_rgba(255,255,255,0.09),0_6px_18px_-8px_rgba(0,0,0,0.6)]"
                              }
                            />
                          )}

                          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.65)_0%,rgba(10,132,255,0.2)_45%,transparent_70%)] opacity-0 blur-md scale-50 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[hot]:scale-110 group-data-[hot]:opacity-100"
                            />
                            {SPARKLES.map((sp, i) => (
                              <motion.span
                                key={i}
                                aria-hidden="true"
                                className={`pointer-events-none absolute h-[3px] w-[3px] rounded-full ${
                                  isLight
                                    ? "bg-[#0066cc] shadow-[0_0_6px_1px_rgba(10,132,255,0.75)]"
                                    : "bg-[#cfe6ff] shadow-[0_0_6px_2px_rgba(94,176,255,0.9)]"
                                }`}
                                style={{ top: sp.top, left: sp.left }}
                                initial={false}
                                animate={
                                  isHot
                                    ? { opacity: [0, 1, 0], scale: [0.3, 1.2, 0.3] }
                                    : { opacity: 0, scale: 0.3 }
                                }
                                transition={
                                  isHot
                                    ? { duration: 1.1, repeat: Infinity, delay: sp.delay, ease: "easeInOut" }
                                    : { duration: 0.2 }
                                }
                              />
                            ))}
                            <Icon
                              className={`relative h-6 w-6 transition-[transform,color,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[hot]:scale-[1.18] group-data-[hot]:-rotate-6 group-active:scale-105 ${
                                isLight
                                  ? "text-[#121110] group-data-[hot]:text-[#0062cc]"
                                  : "text-white/90 group-data-[hot]:text-[#8cc6ff] group-data-[hot]:drop-shadow-[0_0_6px_rgba(94,176,255,1)]"
                              }`}
                              strokeWidth={isLight ? 2 : 1.75}
                            />
                          </span>

                          <span className="relative min-w-0 flex-1">
                            <span
                              className={`block text-[9px] font-bold uppercase tracking-[0.12em] transition-colors duration-300 ${
                                isLight
                                  ? "text-[#4c4841] group-data-[hot]:text-[#0062cc]"
                                  : "text-white/60 group-data-[hot]:text-[#8cc6ff]"
                              }`}
                              style={{ fontSynthesisWeight: "auto" }}
                            >
                              {card.category}
                            </span>
                            <span
                              className={`mt-0.5 block truncate text-[12px] font-bold transition-[color,transform] duration-300 group-data-[hot]:translate-x-0.5 ${
                                isLight
                                  ? "text-[#121110] group-data-[hot]:text-[#000000]"
                                  : "text-white group-data-[hot]:text-white"
                              }`}
                              style={{ fontSynthesisWeight: "auto" }}
                            >
                              {card.title}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </LiquidGlass>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

const sendLead = async (data) => data;

export function ExpertModal({ open, submitted, onSubmitted, onClose }) {
  const [busy, setBusy] = useState(false);
  const firstField = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstField.current?.focus(), 350);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendLead(Object.fromEntries(new FormData(e.currentTarget)));
      onSubmitted();
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-3 text-[12px] text-white placeholder:text-white/40 outline-none transition-colors focus:border-[#0A84FF] focus:bg-white/[0.09]";

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="expert-modal"
          className="fixed inset-0 z-[9700] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ct-expert-title"
            data-lenis-prevent
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: MENU_SPRING }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.2 } }}
            className="ct-ultra-glass relative w-full max-w-[460px] max-h-[92svh] overflow-y-auto rounded-[22px] border border-white/20 p-6 sm:p-8 text-white"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-[#0A84FF]/30 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#5eb0ff]" strokeWidth={1.6} />
                <h2 id="ct-expert-title" className="mt-4 text-lg">Thank you!</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/70">
                  Our growth team will reach out within one business day.
                </p>
                <button type="button" onClick={onClose} className="ct-btn ct-btn-primary mt-6 px-6 py-3 text-xs uppercase tracking-wider">
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#8cc6ff]">
                  <PhoneCall className="h-3.5 w-3.5" /> Free strategy call
                </p>
                <h2 id="ct-expert-title" className="mt-3 pr-10 text-xl leading-snug">
                  Talk to our experts
                </h2>
                <p className="mt-2 text-[11.5px] leading-relaxed text-white/65">
                  Tell us where you want to grow. We reply within one business day.
                </p>
                <form onSubmit={onSubmit} className="mt-6 grid gap-3">
                  <input ref={firstField} name="name" required autoComplete="name" placeholder="Your name" className={field} />
                  <input name="phone" type="tel" required autoComplete="tel" placeholder="Phone / WhatsApp" className={field} />
                  <input name="email" type="email" autoComplete="email" placeholder="Email (optional)" className={field} />
                  <select name="service" defaultValue="" className={`${field} appearance-none`}>
                    <option value="" className="bg-[#0b0f17]">What do you need help with?</option>
                    {SERVICE_CARDS.map((c) => (
                      <option key={c.title} value={c.title} className="bg-[#0b0f17]">
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <textarea name="message" rows={3} placeholder="A line about your business (optional)" className={`${field} resize-none`} />
                  <button type="submit" disabled={busy} className="ct-btn ct-btn-primary mt-1 w-full gap-2 px-6 py-3.5 text-xs uppercase tracking-wider">
                    <Send className="h-4 w-4" /> {busy ? "Sending…" : "Request my call"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function MobileDrawer({
  open,
  tabs,
  activeTab,
  mobileServicesOpen,
  setMobileServicesOpen,
  onClose,
  onTabChange,
  onOpenExpert,
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9500] lg:hidden pointer-events-auto" data-lenis-prevent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
          />
          <motion.aside
            initial={{ x: "104%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1, transition: { type: "spring", stiffness: 210, damping: 30, mass: 0.9 } }}
            exit={{ x: "104%", opacity: 0.6, transition: { duration: 0.42, ease: [0.4, 0, 0.2, 1] } }}
            className="ct-drawer ct-ultra-glass absolute right-0 top-0 bottom-0 w-1/2 min-w-[200px] max-w-[380px] flex flex-col overflow-y-auto overscroll-contain will-change-transform"
            style={{
              paddingTop: "max(1.25rem, env(safe-area-inset-top))",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
              paddingLeft: "1rem",
              paddingRight: "max(1rem, env(safe-area-inset-right))",
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
              <img src="/assets/clicktots-logo-dark.webp" alt="Clicktots" width="120" height="28" className="h-6 sm:h-7 w-auto min-w-0 object-contain" />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-[#0A84FF]/30 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-4 flex flex-1 flex-col gap-1.5" aria-label="Mobile">
              {tabs.map((tab, ti) => {
                const isActive = (activeTab || "home") === tab.id;
                const isServices = tab.id === "services";
                return (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.12 + ti * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
                    exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
                  >
                    <button
                      type="button"
                      aria-expanded={isServices ? mobileServicesOpen : undefined}
                      aria-controls={isServices ? "ct-m-services" : undefined}
                      onClick={() => {
                        if (isServices) return setMobileServicesOpen((v) => !v);
                        onClose();
                        onTabChange?.(tab.id);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        isActive || (isServices && mobileServicesOpen)
                          ? "bg-[#0A84FF]/20 text-[#8cc6ff] border border-[#0A84FF]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                          : "text-white/85 hover:bg-[#0A84FF]/15 hover:text-white border border-transparent"
                      }`}
                    >
                      {tab.label}
                      {isServices && (
                        <ChevronDown
                          aria-hidden="true"
                          strokeWidth={2.25}
                          className={`h-4 w-4 transition-transform duration-300 ${mobileServicesOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </button>
                    {isServices && (
                      <AnimatePresence initial={false}>
                        {mobileServicesOpen && (
                          <motion.ul
                            id="ct-m-services"
                            key="m-services"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1, transition: { duration: 0.42, ease: DROP_EASE } }}
                            exit={{ height: 0, opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1.5 mb-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                              {SERVICE_CARDS.map((card, ci) => {
                                const svc = serviceByCategory(card.category);
                                const Icon = SERVICE_ICONS[card.title] || Sparkles;
                                return (
                                  <motion.li
                                    key={card.title}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: 0.04 + ci * 0.025, duration: 0.32, ease: DROP_EASE } }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        onClose();
                                        if (svc?.path) navigate(svc.path, { rect: e.currentTarget.getBoundingClientRect() });
                                      }}
                                      className="group flex w-full items-center gap-2 rounded-xl px-1.5 py-2 text-left transition-colors duration-200 hover:bg-white/[0.07] cursor-pointer"
                                    >
                                      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                                        <span
                                          aria-hidden="true"
                                          className="pointer-events-none absolute inset-0.5 rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.75)_0%,rgba(10,132,255,0.25)_45%,transparent_70%)] opacity-0 blur-md scale-50 transition-[opacity,transform] duration-500 group-hover:scale-110 group-hover:opacity-100"
                                        />
                                        <Icon
                                          className="relative h-5 w-5 text-white/80 transition-[transform,color,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.15] group-hover:-rotate-6 group-hover:text-[#8cc6ff] group-hover:drop-shadow-[0_0_6px_rgba(94,176,255,1)]"
                                          strokeWidth={1.75}
                                        />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[7.5px] uppercase tracking-[0.1em] text-white/50 transition-colors group-hover:text-[#8cc6ff]/85">
                                          {card.category}
                                        </span>
                                        <span className="mt-0.5 block text-[10px] leading-snug font-bold text-white/90 transition-colors group-hover:text-white">
                                          {card.title}
                                        </span>
                                      </span>
                                    </button>
                                  </motion.li>
                                );
                              })}
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    )}
                  </motion.div>
                );
              })}
            </nav>

            <LiquidGlass
              as="button"
              type="button"
              onClick={() => {
                onClose();
                onOpenExpert();
              }}
              variant="regular"
              tint="#007AFF"
              radius="capsule"
              interactive
              pressScale={0.96}
              refraction={1.25}
              dispersion={0.06}
              blur={14}
              style={{ lineHeight: 1, paddingLeft: 12, paddingRight: 4 }}
              className="mt-6 shrink-0 group relative flex w-full items-center justify-between gap-2 h-10 text-white shadow-[0_8px_30px_-6px_rgba(0,122,255,0.6)] cursor-pointer select-none active:scale-95"
            >
              <span className="relative z-10 grid min-w-0 overflow-hidden whitespace-nowrap text-[9px] font-bold tracking-[0.01em] text-white drop-shadow-sm">
                <span className="col-start-1 row-start-1 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[130%] motion-reduce:transition-none">
                  Talk to Our Experts
                </span>
                <span
                  aria-hidden="true"
                  className="col-start-1 row-start-1 translate-y-[130%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 motion-reduce:transition-none"
                >
                  Launch AI Growth Audit
                </span>
              </span>
              <span className="ct-cta-chip" style={{ width: 30, height: 30 }} aria-hidden="true">
                <ArrowUpRight className="ct-cta-a w-3 h-3 text-white" strokeWidth={2.4} />
                <ArrowUpRight className="ct-cta-b w-3 h-3 text-white" strokeWidth={2.4} />
              </span>
            </LiquidGlass>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
