// Purpose: Job detail & application form view (/career/:slug, e.g. /career/web-developer).
//   NEW: when opened from a card, `flying` is true while the role image glides up from the card.
//   The page frame is already here, the image lands in it, then the role text fades in.
//   Back buttons: "Back to All Careers" (top) and "Back to role details" (inside the form).
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  Send,
  Sparkles,
  Upload,
  FileText,
} from "lucide-react";
import { navigate } from "@/lib/router";
import BlurReveal from "@/components/animations/BlurReveal";

const EASE = [0.22, 1, 0.36, 1];

export default function CareerDetail({ role, flying = false, onHeroMeasured, onBack }) {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    portfolioUrl: "",
    coverNote: "",
  });

  const heroRef = useRef(null);

  /* Tell the overlay where the hero image should land (measured after scroll reset + layout). */
  useEffect(() => {
    if (!flying || !onHeroMeasured) return undefined;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        const el = heroRef.current;
        if (!el) return;
        const b = el.getBoundingClientRect();
        onHeroMeasured({ top: b.top, left: b.left, width: b.width, height: b.height });
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
    // Mount only: `flying` is true on first render when we come from a card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Back: the image flies down into its card. Falls back to a plain navigate when the image
     is not on screen (page scrolled far down) or the opening animation is still running. */
  const backRef = useRef(null);
  backRef.current = () => {
    const el = heroRef.current;
    if (!flying && onBack && el) {
      const b = el.getBoundingClientRect();
      const visible = b.height > 0 && b.bottom > 120 && b.top < window.innerHeight - 120;
      if (visible) {
        onBack({
          rect: { top: b.top, left: b.left, width: b.width, height: b.height },
          src: role.image,
          radius: 24,
        });
        return;
      }
    }
    navigate("/career");
  };

  // Esc (handled in CareerOverlay) asks for the same thing as the Back button.
  useEffect(() => {
    const h = () => backRef.current && backRef.current();
    window.addEventListener("career-back", h);
    return () => window.removeEventListener("career-back", h);
  }, []);

  const show = !flying;
  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.4, delay: show ? delay : 0, ease: EASE },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const scrollToTop = () => {
    document.getElementById("career-role-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const backToDetails = () => {
    setShowForm(false);
    setSubmitted(false);
    setTimeout(scrollToTop, 60);
  };

  const inputCls = "ct-input w-full rounded-xl px-4 py-3 text-sm";
  const labelCls = "ct-label block text-xs font-mono uppercase mb-1.5";

  return (
    <div id="career-role-top" className="min-h-full px-5 pt-32 pb-24 sm:px-8 sm:pt-36">
      <div className="mx-auto max-w-4xl">
        {/* step 2 -> step 1: the overlay's "All roles" Back pill (under the navbar) does this now */}
        <button
          type="button"
          onClick={() => backRef.current()}
          className="hidden ct-chip ct-chip-btn ct-soft items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Careers
        </button>

        {/* Role image (framed like the list hero) + role header */}
        <div className="mt-8">
          <div
            ref={heroRef}
            className="ct-frame relative h-[260px] sm:h-[380px] w-full overflow-hidden rounded-3xl shadow-2xl"
            style={{ opacity: flying ? 0 : 1 }}
          >
            <img src={role.image} alt={role.title} className="h-full w-full object-cover" />
            <div className="ct-img-shade pointer-events-none absolute inset-0" />
            <motion.div
              className="absolute bottom-5 left-5 right-5"
              initial={false}
              animate={{ opacity: flying ? 0 : 1 }}
              transition={{ duration: 0.35, delay: flying ? 0 : 0.1 }}
            >
              <div className="inline-block rounded-2xl border border-white/15 bg-black/50 px-4 py-2.5 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-widest text-[#0A84FF] font-semibold">
                  {role.rarityLabel}
                </p>
                <p className="text-xs sm:text-sm text-white/90 mt-0.5">{role.cardType}</p>
              </div>
            </motion.div>
          </div>

          <motion.div {...reveal(0.05)} className="pt-8">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="ct-accent-ink inline-flex items-center rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/35 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
                {role.department}
              </span>
              <span className="ct-soft inline-flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                {role.location}
              </span>
              <span className="ct-soft inline-flex items-center gap-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5" />
                {role.type}
              </span>
              <span className="ct-soft inline-flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                {role.experience}
              </span>
            </div>

            <h1 className="ct-ink text-3xl sm:text-5xl font-semibold tracking-tight">
              {/* key restarts the word reveal once the image has landed */}
              <BlurReveal key={flying ? "wait" : "go"} text={role.title} by="word" delay={0.05} />
            </h1>

            <p className="ct-soft mt-4 text-sm sm:text-base leading-relaxed max-w-2xl">{role.shortSummary}</p>
          </motion.div>
        </div>

        {/* Job Description & Eligibility */}
        <motion.div {...reveal(0.2)} className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="ct-surface-soft rounded-3xl p-6 sm:p-8">
            <h2 className="ct-ink text-lg font-semibold mb-4">What You&apos;ll Build</h2>
            <ul className="ct-soft space-y-3 text-sm leading-relaxed">
              {role.responsibilities.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A84FF]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ct-surface-soft rounded-3xl p-6 sm:p-8">
            <h2 className="ct-ink text-lg font-semibold mb-4">Eligibility &amp; Skills</h2>
            <ul className="ct-soft space-y-3 text-sm leading-relaxed">
              {role.eligibility.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A84FF]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="ct-accent-ink text-sm font-semibold uppercase tracking-wider mt-7 mb-3">Why ClickTots</h3>
            <ul className="ct-mute space-y-2 text-xs">
              {role.perks.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Apply CTA Below Eligibility */}
        {!showForm && (
          <motion.div {...reveal(0.3)} className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setTimeout(() => {
                  document.getElementById("career-apply-form")?.scrollIntoView({ behavior: "smooth" });
                }, 80);
              }}
              className="ct-btn ct-btn-primary gap-2 px-8 py-3.5 text-xs uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              Apply for {role.cardName}
            </button>
          </motion.div>
        )}

        {/* Application Form with Resume Upload (step 3) */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              id="career-apply-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="ct-panel mt-10 rounded-3xl p-6 sm:p-10 shadow-2xl"
            >
              {submitted ? (
                <div className="py-10 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="ct-ink text-2xl font-semibold">Application Submitted</h3>
                  <p className="ct-soft mt-2 text-sm max-w-md">
                    Thank you, {formData.fullName || "candidate"}. Our hiring team at ClickTots Technologies received
                    your <span className="ct-ink font-medium">{role.title}</span> application
                    {resumeFile ? ` (${resumeFile.name})` : ""} and will reach out shortly.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={backToDetails}
                      className="ct-btn ct-chip ct-chip-btn ct-soft gap-2 px-6 py-2.5 text-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to role details
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/career")}
                      className="ct-btn ct-btn-primary px-6 py-2.5 text-xs"
                    >
                      Explore Other Roles
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={backToDetails}
                    className="ct-btn ct-chip ct-chip-btn ct-soft mb-6 gap-2 px-4 py-2 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to role details
                  </button>

                  <div className="mb-6">
                    <span className="ct-accent-ink text-[11px] font-mono uppercase tracking-[0.15em]">
                      Application Form
                    </span>
                    <h2 className="ct-ink mt-1 text-2xl font-semibold">Apply for {role.title}</h2>
                    <p className="ct-mute mt-1 text-xs">
                      Complete your details and attach your resume—our team reviews every submission.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input
                          required
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Arjun Kumar"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Email Address *</label>
                        <input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="arjun@example.com"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>Phone Number *</label>
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Current City *</label>
                        <input
                          required
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Chennai, Tamil Nadu"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Years of Experience *</label>
                        <input
                          required
                          type="text"
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          placeholder="2 Years"
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>GitHub / Portfolio / LinkedIn URL *</label>
                      <input
                        required
                        type="url"
                        value={formData.portfolioUrl}
                        onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                        placeholder="https://github.com/username"
                        className={inputCls}
                      />
                    </div>

                    {/* Resume File Upload */}
                    <div>
                      <label className={labelCls}>Upload Resume (PDF, DOC, DOCX) *</label>
                      <label className="ct-dropzone flex flex-col items-center justify-center rounded-2xl px-4 py-6 text-center cursor-pointer">
                        <input
                          required
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="sr-only"
                          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        />
                        {resumeFile ? (
                          <div className="flex items-center gap-2.5 text-sm text-emerald-500 font-medium">
                            <FileText className="w-5 h-5" />
                            <span>{resumeFile.name}</span>
                            <span className="ct-faint text-xs">
                              ({Math.max(1, Math.round(resumeFile.size / 1024))} KB)
                            </span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-[#0A84FF] mb-2" />
                            <span className="ct-ink text-sm font-medium">Click to upload your resume</span>
                            <span className="ct-faint text-xs mt-1">PDF, DOC, or DOCX (max 10 MB)</span>
                          </>
                        )}
                      </label>
                    </div>

                    <div>
                      <label className={labelCls}>Why ClickTots? (Projects or Note)</label>
                      <textarea
                        rows={3}
                        value={formData.coverNote}
                        onChange={(e) => setFormData({ ...formData, coverNote: e.target.value })}
                        placeholder="Share a quick highlight of a project or achievement you're proud of..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="ct-btn ct-btn-primary w-full sm:w-auto gap-2 px-8 py-3.5 text-xs uppercase tracking-wider"
                    >
                      <Send className="w-4 h-4" />
                      Submit Application
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}