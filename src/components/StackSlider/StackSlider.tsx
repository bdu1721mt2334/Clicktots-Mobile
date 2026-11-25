// Purpose: Implement the StackSlider components module, keeping this responsibility separate for maintainability.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  MotionValue,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Code2, Layers } from 'lucide-react';
import type { StackSlideItem } from './projects';
import { scrollToTarget } from '@/lib/scroll';

export interface StackSliderProps {
  items: StackSlideItem[];
  onSelectSlide?: (item: StackSlideItem) => void;
  onInspectCode?: () => void;
  /** opens the full /projects page */
  onExploreAll?: () => void;
  sectionId?: string;
  /**
   * Extra scroll (in vh) the stage stays pinned after the last slide has
   * landed, so the last card can rest before the page ends. 0 = original behaviour.
   */
  tailVh?: number;
  keyFactsRef?: React.RefObject<HTMLElement | null>;
}

interface RollingCardProps {
  item: StackSlideItem;
  index: number;
  smoothIndex: MotionValue<number>;
  isActive: boolean;
  prefersReducedMotion: boolean;
  onActivate: () => void;
  onOpenDetail: () => void;
}

function RollingCard({
  item,
  index,
  smoothIndex,
  isActive,
  prefersReducedMotion,
  onActivate,
  onOpenDetail,
}: RollingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const offset = useTransform(smoothIndex, (v) => index - v);

  const y = useTransform(offset, (o) => `${o * 104}%`);
  const scale = useTransform(offset, (o) => {
    const abs = Math.min(Math.abs(o), 2.4);
    return 1 - abs * 0.14;
  });
  const opacity = useTransform(offset, (o) => {
    const abs = Math.abs(o);
    if (abs > 2.15) return 0;
    return Math.max(0, 1 - abs * 0.44);
  });
  const rotateX = useTransform(offset, (o) => (prefersReducedMotion ? 0 : o * -7.5));
  const filter = useTransform(offset, (o) => {
    if (prefersReducedMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) {
      return 'none';
    }
    const blurPx = Math.min(Math.abs(o) * 6.5, 14);
    return blurPx < 0.08 ? 'none' : `blur(${blurPx.toFixed(2)}px)`;
  });
  const zIndex = useTransform(offset, (o) => 50 - Math.round(Math.abs(o) * 10));

  const handleClick = () => {
    if (isActive) {
      onOpenDetail();
    } else {
      onActivate();
    }
  };

  return (
    <motion.div
      style={{
        y,
        scale,
        opacity,
        rotateX,
        filter,
        zIndex,
        transformPerspective: 1200,
      }}
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full max-w-[660px] px-1 will-change-transform"
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          isActive
            ? `Open case study for ${item.word}: ${item.subtitle}`
            : `Scroll stack to ${item.word}`
        }
        className={`group relative block w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden text-left transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-black ${
          isActive
            ? 'cursor-pointer shadow-[0_32px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/15'
            : 'cursor-pointer ring-1 ring-white/10'
        }`}
      >
        {!imageFailed ? (
          <img
            src={item.image}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="h-full w-full flex flex-col items-center justify-center p-8 text-center"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${item.glowColor}, ${item.washColor})`,
            }}
          >
            <Layers className="w-8 h-8 text-white/60 mb-3" />
            <p className="font-display text-2xl font-semibold text-white">{item.word}</p>
            <p className="text-sm text-white/70 mt-1">{item.subtitle}</p>
          </div>
        )}

        {/* Measured scrim for legible card caption */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-300"
        />

        {/* Card Footer Metadata (zero pills, clean typographic separators) */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9.5px] sm:text-[10.5px] text-white/75 font-mono tabular-nums">
              <span>{item.indexLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans truncate">{item.discipline}</span>
            </div>
            <p className="mt-0.5 text-[11px] sm:text-[12.5px] leading-snug font-medium text-white truncate">
              {item.subtitle}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 transition-all duration-300 ${
              isActive
                ? 'text-white opacity-100 translate-y-0'
                : 'text-white/60 opacity-0 translate-y-1'
            }`}
          >
            <span>Inspect</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </button>
    </motion.div>
  );
}

interface LetterSwapTitleProps {
  text: string;
  prefersReducedMotion: boolean;
}

function LetterSwapTitle({ text, prefersReducedMotion }: LetterSwapTitleProps) {
  // Real client names are longer than the old one-word titles: wrap only between
  // words (never mid-word) and step the size down for long single words.
  const words = text.split(' ');
  const longest = Math.max(...words.map((w) => w.length));
  const size =
    longest > 10
      ? 'text-[2.6rem] sm:text-5xl xl:text-[4.4rem]'
      : 'text-5xl sm:text-6xl xl:text-[5.5rem]';

  if (prefersReducedMotion) {
    return (
      <h2 className={`font-display ${size} font-semibold tracking-tight leading-[0.95] text-white text-balance`}>
        {text}
      </h2>
    );
  }

  let idx = -1;
  return (
    <div className="relative min-h-[1.05em]">
      <h2
        className={`font-display ${size} font-semibold tracking-tight leading-[0.95] text-white`}
        aria-label={text}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={text} className="inline-flex flex-wrap gap-x-[0.24em]">
            {words.map((word, w) => (
              <span key={`${text}-w${w}`} className="inline-flex whitespace-nowrap">
                {Array.from(word).map((char) => {
                  idx += 1;
                  return (
                    <span
                      key={`${text}-${idx}`}
                      className="inline-block overflow-hidden align-bottom py-[0.04em] -my-[0.04em]"
                    >
                      <motion.span
                        initial={{ y: '105%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        exit={{ y: '-105%', opacity: 0 }}
                        transition={{
                          duration: 0.44,
                          ease: [0.16, 1, 0.3, 1],
                          delay: idx * 0.024,
                        }}
                        className="inline-block will-change-transform"
                      >
                        {char}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            ))}
          </motion.span>
        </AnimatePresence>
      </h2>
    </div>
  );
}

export function StackSlider({
  items,
  onSelectSlide,
  onInspectCode,
  onExploreAll,
  sectionId = 'c-stack-slider',
  tailVh = 0,
  keyFactsRef,
}: StackSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Fraction of the section's scroll travel used by the slides; the rest is the pinned tail.
  const slideVh = Math.max(items.length, 1) * 90;
  const slideShare = tailVh > 0 ? (slideVh - 100) / (slideVh + tailVh - 100) : 1;

  const rawIndex = useTransform(
    scrollYProgress,
    [0, slideShare],
    [0, Math.max(0, items.length - 1)]
  );

  const smoothIndex = useSpring(rawIndex, {
    stiffness: prefersReducedMotion ? 500 : 190,
    damping: prefersReducedMotion ? 50 : 28,
    mass: 0.55,
  });

  useMotionValueEvent(smoothIndex, 'change', (latest) => {
    const clamped = Math.max(0, Math.min(items.length - 1, Math.round(latest)));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
    }
  });

  /* ── Entry: texts glide in from the LEFT (blurry → sharp), images from the RIGHT ──
     Driven by how far the slider has travelled up into the viewport; it starts
     only after the full-page colour wash (see Projects.jsx) has taken over. */
  const { scrollYProgress: enterRaw } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start'],
  });
  const enter = useSpring(enterRaw, { stiffness: 70, damping: 26, mass: 0.8, restDelta: 0.0005 });
  const textP = useTransform(enter, [0.05, 0.65], [0, 1]);
  const imageP = useTransform(enter, [0.1, 0.75], [0, 1]);
  const travel = prefersReducedMotion ? 0 : 1;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const blurMax = prefersReducedMotion || isMobile ? 0 : 18;
  const textX = useTransform(textP, [0, 1], [-110 * travel, 0]);
  const imageX = useTransform(imageP, [0, 1], [150 * travel, 0]);
  const textFilter = useTransform(textP, (v) => (v >= 0.995 || !blurMax ? 'none' : `blur(${((1 - v) * blurMax).toFixed(2)}px)`));
  const imageFilter = useTransform(imageP, (v) => (v >= 0.995 || !blurMax ? 'none' : `blur(${((1 - v) * blurMax).toFixed(2)}px)`));
  const edgeOpacity = useTransform(textP, [0, 1], [0, 1]);

  // Dynamic frame background color wash interpolated smoothly across slides
  const inputRange = items.map((_, i) => i);
  const washColors = items.map((item) => item.washColor);
  const glowColors = items.map((item) => item.glowColor);

  const washBg = useTransform(smoothIndex, inputRange, washColors);
  const ambientGlow = useTransform(smoothIndex, inputRange, glowColors);

  const { scrollYProgress: kfScroll } = useScroll({
    target: keyFactsRef ?? containerRef,
    offset: keyFactsRef ? ['start start', 'end start'] : ['start end', 'start end'],
  });
  const blueOpacity = useTransform(kfScroll, [0.5, 1], [keyFactsRef ? 0 : 1, 1]);

  // Services panel slides up OVER the pinned slider: dim the slider as it gets covered
  const totalVh = slideVh + tailVh;
  const coverFrom = Math.max(0, (totalVh - 200) / Math.max(1, totalVh - 100));
  const coverDim = useTransform(scrollYProgress, [coverFrom, 1], [0, tailVh > 60 ? 0.7 : 0]);

  const glowGradient = useMotionTemplate`radial-gradient(62% 58% at 68% 50%, ${ambientGlow}, transparent 74%)`;
  const topFadeMask = useMotionTemplate`linear-gradient(to bottom, ${washBg} 0%, transparent 100%)`;
  const bottomFadeMask = useMotionTemplate`linear-gradient(to top, ${washBg} 0%, transparent 100%)`;

  const scrollToSlide = useCallback(
    (targetIdx: number) => {
      const el = containerRef.current;
      if (!el || items.length <= 1) return;
      const clamped = Math.max(0, Math.min(items.length - 1, targetIdx));
      const rect = el.getBoundingClientRect();
      const containerTop = window.scrollY + rect.top;
      const scrollableDistance = (el.offsetHeight - window.innerHeight) * slideShare;
      if (scrollableDistance <= 0) return;
      const targetScrollY =
        containerTop + (clamped / (items.length - 1)) * scrollableDistance;
      // goes through the page's Lenis instance so it glides like the rest of the site
      scrollToTarget(targetScrollY, prefersReducedMotion ? 0 : 1.1);
    },
    [items.length, prefersReducedMotion, slideShare]
  );

  // Keyboard navigation when section is in active viewport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inActiveStage = rect.top <= 120 && rect.bottom >= window.innerHeight - 120;
      if (!inActiveStage) return;

      if (e.key === 'ArrowDown' && activeIndex < items.length - 1) {
        e.preventDefault();
        scrollToSlide(activeIndex + 1);
      } else if (e.key === 'ArrowUp' && activeIndex > 0) {
        e.preventDefault();
        scrollToSlide(activeIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items.length, scrollToSlide]);

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[activeIndex] ?? items[0];

  return (
    <section
      id={sectionId}
      ref={containerRef}
      aria-label="Selected Works Stack Slider"
      style={{ height: `${slideVh + tailVh}vh` }}
      className="relative w-full"
    >
      <div
        style={{ backgroundColor: '#FFFFFF' }}
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: '#05080d', opacity: coverDim, zIndex: 60 }}
        />
        {/* Slide wash background: synchronized with Key Facts' 50%→100% transition */}
        <motion.div
          aria-hidden="true"
          style={{ backgroundColor: washBg, opacity: blueOpacity }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Chromatic Ambient Wash Layer */}
        <motion.div
          aria-hidden="true"
          style={{ background: glowGradient, opacity: blueOpacity }}
          className="pointer-events-none absolute inset-0"
        />

        {/* Top utility strip: counter */}
        <motion.div
          style={{ opacity: edgeOpacity, x: textX, filter: textFilter }}
          className="relative z-20 mx-auto w-full max-w-[1360px] px-4 sm:px-6 md:px-12 pt-[72px] sm:pt-24 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-xs font-mono tabular-nums tracking-wide text-white/65">
            <span>Selected Works</span>
            <span aria-hidden="true">/</span>
            <span className="text-white">
              {currentItem.indexLabel} — {String(items.length).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onInspectCode && (
              <button
                type="button"
                onClick={onInspectCode}
                className="ct-btn ct-btn-ghost gap-2 px-3.5 py-2 text-xs shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Component Code</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Main 12-Column Stage */}
        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 sm:px-6 md:px-12 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center content-center gap-4 sm:gap-6 lg:gap-10 py-2 sm:py-4 pb-2 sm:pb-20 lg:pb-4">
          {/* Left Column: Giant Letter-Swapping Word + Editorial Context */}
          <motion.div
            style={{ x: textX, opacity: textP, filter: textFilter }}
            className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-center will-change-transform"
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white/65 mb-3">
              <span>{currentItem.client}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{currentItem.year}</span>
            </div>

            <LetterSwapTitle
              text={currentItem.word}
              prefersReducedMotion={prefersReducedMotion}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentItem.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="mt-2.5 sm:mt-5 max-w-md"
              >
                <p className="text-xs sm:text-sm md:text-base leading-relaxed text-white/80">
                  {currentItem.description}
                </p>

                <div className="mt-4 pt-4 border-t border-white/12 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
                  <span>{currentItem.deliverable}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className="font-medium"
                    style={{ color: currentItem.accentColor }}
                  >
                    {currentItem.outcome}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Primary CTA + Vertical Stepper Controls */}
            <div className="mt-4 sm:mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onSelectSlide?.(currentItem)}
                className="ct-btn ct-btn-light gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shrink-0"
              >
                <span>Explore Case Study</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {onExploreAll && (
                <button
                  type="button"
                  onClick={onExploreAll}
                  className="ct-btn ct-btn-ghost gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm shrink-0"
                >
                  <span>Explore all work</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => scrollToSlide(activeIndex - 1)}
                  disabled={activeIndex === 0}
                  aria-label="Previous project slide"
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/85 hover:text-white hover:border-white/35 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSlide(activeIndex + 1)}
                  disabled={activeIndex === items.length - 1}
                  aria-label="Next project slide"
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/15 text-white/85 hover:text-white hover:border-white/35 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>

          </motion.div>

          {/* Center/Right Column: Rolling Vertical Stack with Depth-of-Field Blur */}
          <motion.div
            style={{ x: imageX, opacity: imageP, filter: imageFilter }}
            className="order-1 lg:order-2 lg:col-span-6 relative h-[clamp(230px,40svh,360px)] sm:h-[300px] md:h-[340px] lg:h-[clamp(360px,62vh,580px)] w-full overflow-hidden will-change-transform"
          >
            {items.map((item, idx) => (
              <RollingCard
                key={item.id}
                item={item}
                index={idx}
                smoothIndex={smoothIndex}
                isActive={idx === activeIndex}
                prefersReducedMotion={prefersReducedMotion}
                onActivate={() => scrollToSlide(idx)}
                onOpenDetail={() => onSelectSlide?.(item)}
              />
            ))}

            {/* Seamless Edge Fade Masks synced to live Wash Background */}
            <motion.div
              aria-hidden="true"
              style={{ background: topFadeMask }}
              className="pointer-events-none absolute inset-x-0 top-0 h-16 sm:h-24 z-[60]"
            />
            <motion.div
              aria-hidden="true"
              style={{ background: bottomFadeMask }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-24 z-[60]"
            />
          </motion.div>

          {/* Far Right Column: Vertical Index Scrubber */}
          <motion.nav
            aria-label="Slide index navigation"
            style={{ opacity: imageP, x: imageX }}
            className="hidden lg:flex lg:col-span-1 flex-col items-end justify-center gap-3"
          >
            {items.map((item, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Jump to ${item.word}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="group flex items-center gap-3 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
                >
                  <span
                    className={`font-mono text-xs tabular-nums transition-colors duration-200 ${
                      isCurrent
                        ? 'text-white font-medium'
                        : 'text-white/40 group-hover:text-white/75'
                    }`}
                  >
                    {item.indexLabel}
                  </span>
                  <span
                    className={`block h-px transition-all duration-300 ${
                      isCurrent
                        ? 'w-7 bg-white'
                        : 'w-3 bg-white/30 group-hover:w-5 group-hover:bg-white/60'
                    }`}
                  />
                </button>
              );
            })}
          </motion.nav>
        </div>

        {/* Quiet Bottom Scroll Hint / Mobile Scrubber */}
        <motion.div
          style={{ opacity: edgeOpacity }}
          className="relative z-20 mx-auto w-full max-w-[1360px] px-6 md:px-12 pb-6 flex items-center justify-between gap-4"
        >
          <p className="text-xs text-white/50">
            Scroll vertically or use arrow keys to roll through the stack
          </p>

          <div className="flex lg:hidden items-center gap-0.5">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSlide(idx)}
                aria-label={`Jump to ${item.word}`}
                className="min-h-[44px] px-1.5 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
