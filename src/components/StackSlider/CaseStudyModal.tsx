// Purpose: Implement the CaseStudyModal components module, keeping this responsibility separate for maintainability.
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { StackSlideItem } from './projects';
import { setScrollLocked } from '@/lib/scroll';

interface CaseStudyModalProps {
  item: StackSlideItem | null;
  items: StackSlideItem[];
  onClose: () => void;
  onSelect: (item: StackSlideItem) => void;
  /** raise above full-screen overlays (e.g. the /projects page) */
  zIndex?: number;
}

export function CaseStudyModal({
  item,
  items,
  onClose,
  onSelect,
  zIndex = 60,
}: CaseStudyModalProps) {
  useEffect(() => {
    if (!item) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setScrollLocked(true);
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      setScrollLocked(false);
      window.removeEventListener('keydown', handleKey);
    };
  }, [item, onClose]);

  const currentIdx = item ? items.findIndex((entry) => entry.id === item.id) : -1;
  const prevItem = currentIdx > 0 ? items[currentIdx - 1] : null;
  const nextItem =
    currentIdx >= 0 && currentIdx < items.length - 1 ? items[currentIdx + 1] : null;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-study-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ zIndex }}
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: item.washColor }}
            data-lenis-prevent
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 shadow-2xl text-white"
          >
            {/* Top Modal Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 backdrop-blur-md bg-black/35">
              <div className="flex items-center gap-2.5 text-xs text-white/75 font-mono tabular-nums">
                <span>{item.indexLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-sans">{item.client}</span>
                <span aria-hidden="true">·</span>
                <span>{item.year}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close case study"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/80 hover:text-white hover:border-white/35 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hero Media */}
            <div className="p-6 sm:p-8 space-y-8">
              <div className="overflow-hidden rounded-xl border border-white/10 aspect-[16/9] bg-black/40">
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Title + Lead */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5">
                  <p className="text-xs text-white/60 mb-2">{item.discipline}</p>
                  <h3
                    id="case-study-title"
                    className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white text-balance"
                  >
                    {item.word}
                  </h3>
                  <p className="mt-2 text-base text-white/80">{item.subtitle}</p>
                </div>

                <div className="md:col-span-7 space-y-5 text-sm sm:text-base leading-relaxed text-white/80">
                  <div>
                    <h4 className="text-xs font-medium text-white/55 mb-1.5">
                      The Brief
                    </h4>
                    <p>{item.challenge}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-white/55 mb-1.5">
                      Execution
                    </h4>
                    <p>{item.approach}</p>
                  </div>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                {item.metrics.map((metric) => (
                  <div key={metric.label}>
                    <p
                      className="font-display text-2xl sm:text-3xl font-semibold tabular-nums"
                      style={{ color: item.accentColor }}
                    >
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-white/65">{metric.label}</p>
                  </div>
                ))}
              </div>

              {/* Prev / Next Navigation */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={!prevItem}
                  onClick={() => prevItem && onSelect(prevItem)}
                  className="ct-btn ct-btn-ghost gap-2 px-4 py-2.5 text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{prevItem ? prevItem.word : 'First Project'}</span>
                </button>

                <button
                  type="button"
                  disabled={!nextItem}
                  onClick={() => nextItem && onSelect(nextItem)}
                  className="ct-btn ct-btn-ghost gap-2 px-4 py-2.5 text-xs sm:text-sm"
                >
                  <span>{nextItem ? nextItem.word : 'Last Project'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
