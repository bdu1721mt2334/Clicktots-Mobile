// Purpose: Floating day / dark mode toggle button matching Career's rotating Sun / Moon switch.
import { AnimatePresence, motion } from "motion/react";
import { Sun, Moon } from "lucide-react";

export default function SiteThemeToggle({ theme, onToggle, hidden = false }) {
  if (hidden) return null;
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to day (light) mode" : "Switch to dark mode"}
      title={isDark ? "Switch to Day Mode" : "Switch to Dark Mode"}
      data-site-toggle=""
      className="ct-site-theme-btn fixed right-4 top-[66px] sm:right-8 sm:top-[78px] z-[9200] flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />
          ) : (
            <Moon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
