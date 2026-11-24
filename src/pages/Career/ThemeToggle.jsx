// Purpose: Round sun/moon button for the Career overlay. Icon rotates + fades on change.
import { AnimatePresence, motion } from "motion/react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ theme, onToggle, className = "" }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle} // passes the click event so the wipe starts from the button
      className={`ct-fab flex h-12 w-12 items-center justify-center rounded-lg cursor-pointer overflow-hidden ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}