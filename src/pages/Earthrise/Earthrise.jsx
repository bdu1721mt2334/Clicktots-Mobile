// Purpose: Implement the Earthrise hero module with instant first paint and 120fps scroll parallax.
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { clamp, easeOutCubic, lerp, pinProgress, range } from '@/lib/math';
import { onFrame } from '@/lib/scroll';

const STAGE_VH = 400;

const hero = {
  line1: 'Growth starts with an',
  line2: 'Intelligent Click', // must end with "Click" (the animated brand mark)
  subhead: 'Where human creativity meets predictive AI marketing',
  site: 'Mare Tranquillitatis · 0.67°N 23.47°E',
  signal: 'Signal lock · 99.4%',
};

const BRAND_LETTERS = ['C', 'l', 'i', 'c', 'k'];

const ORDER = ['sky', 'earth', 'moonscape', 'frame', 'astronaut', 'ground'];
const ABOVE_FOLD = new Set(['sky', 'earth', 'moonscape']);

const FIT = 'absolute inset-0 size-full object-cover object-[58%_50%] md:object-center';

export function Earthrise() {
  const rootRef = useRef(null);
  const layerRefs = useRef({});
  const titleRef = useRef(null);
  const word1Ref = useRef(null);
  const word2Ref = useRef(null);
  const hudRef = useRef(null);
  const clockRef = useRef(null);
  const elevRef = useRef(null);

  // Dedicated refs for the "Click" logo effect
  const clickBrandRef = useRef(null);
  const clickCanvasRef = useRef(null);
  const clickLetterRefs = useRef([]);
  const clickBladeRef = useRef(null);
  const clickGlowRef = useRef(null);

  const sparksRef = useRef([]);
  const sparksDirtyRef = useRef(false);
  const burstFiredRef = useRef(false);
  const clickImpulseRef = useRef(0);
  const hoverStateRef = useRef({ active: false, nx: 0, ny: 0 });
  const hoverDirtyRef = useRef(false);

  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const spawnBurst = (originX = 0.5, originY = 0.5, count = 36) => {
    if (reducedRef.current) return;
    const canvas = clickCanvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    const palette = ['#ffffff', '#bae6fd', '#7dd3fc', '#60a5fa', '#fef3c7'];
    const cx = originX * w;
    const cy = originY * h;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 1.6 + Math.random() * 5.2;
      sparksRef.current.push({
        x: cx + (Math.random() - 0.5) * (w * 0.28),
        y: cy + (Math.random() - 0.5) * (h * 0.14),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.72 - 0.6,
        size: 0.9 + Math.random() * 2.1,
        alpha: 0.75 + Math.random() * 0.25,
        decay: 0.016 + Math.random() * 0.018,
        color: palette[i % palette.length],
      });
    }
    sparksDirtyRef.current = true;
  };

  const handleClickBrand = (e) => {
    const canvas = clickCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ox = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0.15, 0.85);
      const oy = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0.2, 0.8);
      spawnBurst(ox, oy, 42);
    } else {
      spawnBurst(0.5, 0.5, 42);
    }
    clickImpulseRef.current = 1;
  };

  const handlePointerMove = (e) => {
    if (reducedRef.current) return;
    const el = clickBrandRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = clamp(((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2, -1, 1);
    const ny = clamp(((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2, -1, 1);
    hoverStateRef.current = { active: true, nx, ny };
    hoverDirtyRef.current = true;
    el.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    hoverStateRef.current = { active: false, nx: 0, ny: 0 };
    hoverDirtyRef.current = true;
  };

  // Sync Click FX canvas resolution only when resized.
  useEffect(() => {
    const c = clickCanvasRef.current;
    if (!c) return;
    const sync = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let lastP = -1;
    let lastTime = 0;
    let fxCtx = null;

    const set = (name, y, scale = 1, opacity = 1) => {
      const el = layerRefs.current[name];
      if (!el) return;
      el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0) scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity === 1 ? '1' : opacity.toFixed(3);
    };

    const applyInitial = (p) => {
      const exit = range(p, 0.68, 1);
      const settle = easeOutCubic(range(p, 0, 0.48));

      // Above-the-fold layers start crisp & visible immediately (no empty/foggy beginning screen)
      set('sky', lerp(0, -6, p), lerp(1.08, 1, settle), 1);
      const rise = easeOutCubic(range(p, 0, 0.48));
      set('earth', lerp(10, 0, rise) - exit * 12, lerp(0.95, 1, rise), 1);
      set('moonscape', lerp(3, 0, settle) - exit * 26, 1, 1);

      const rim = easeOutCubic(range(p, 0.24, 0.54));
      set('frame', -exit * 44, lerp(1.6, 1, rim), rim);
      const up = easeOutCubic(range(p, 0.32, 0.58));
      set('astronaut', lerp(28, 0, up) - exit * 58, 1, clamp(up * 2));
      const ground = easeOutCubic(range(p, 0.30, 0.56));
      set('ground', lerp(36, 0, ground) - exit * 78, 1, 1);

      if (p >= 0.18 && !burstFiredRef.current) {
        burstFiredRef.current = true;
        spawnBurst(0.5, 0.52, 34);
      } else if (p < 0.12) {
        burstFiredRef.current = false;
      }

      // Hero headline is immediately visible at p = 0 and smoothly exits as astronaut rises
      const tOut = range(p, 0.36, 0.48);
      const title = titleRef.current;
      if (title) {
        title.style.opacity = String((1 - tOut).toFixed(3));
        title.style.transform = `translate3d(0, ${(-p * 6).toFixed(3)}vh, 0)`;
        if (word1Ref.current) word1Ref.current.style.transform = 'none';
        if (word2Ref.current) word2Ref.current.style.transform = 'none';
        if (clickBladeRef.current) {
          const bladeT = 0.85 + 0.15 * easeOutCubic(range(p, 0, 0.22));
          clickBladeRef.current.style.transform = `scaleX(${bladeT.toFixed(3)})`;
          clickBladeRef.current.style.opacity = String(((1 - tOut) * 0.9).toFixed(3));
        }
        if (clickGlowRef.current) {
          const glowT = 0.7 + 0.3 * easeOutCubic(range(p, 0, 0.22));
          clickGlowRef.current.style.opacity = String((glowT * 0.75 * (1 - tOut)).toFixed(3));
          clickGlowRef.current.style.transform = `scale(${lerp(0.95, 1.08, glowT).toFixed(3)})`;
        }
      }

      // Telemetry HUD visible right away, fades out on exit
      if (hudRef.current) {
        hudRef.current.style.opacity = String((1 - range(p, 0.6, 0.7)).toFixed(3));
      }
      const secs = p * 5400;
      if (clockRef.current) {
        clockRef.current.textContent = `T+ ${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
      }
      if (elevRef.current) {
        elevRef.current.textContent = `${(4.2 + rise * 8.3).toFixed(1)}°`;
      }
    };

    // Paint initial frame immediately so there is zero flash on mount
    applyInitial(0);

    return onFrame((time) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const root = rootRef.current;
      if (!root) return;
      const { p, rect } = pinProgress(root);
      if (rect.bottom < 0) return;

      // Render "Click" spark particle physics ONLY when sparks are active
      const sparks = sparksRef.current;
      if (sparks.length > 0 || sparksDirtyRef.current) {
        const fxCanvas = clickCanvasRef.current;
        if (fxCanvas) {
          if (!fxCtx) fxCtx = fxCanvas.getContext('2d');
          if (fxCtx) {
            const fw = fxCanvas.clientWidth;
            const fh = fxCanvas.clientHeight;
            const dpr = fxCanvas.width / Math.max(1, fw);
            fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            fxCtx.clearRect(0, 0, fw, fh);

            for (let i = sparks.length - 1; i >= 0; i--) {
              const s = sparks[i];
              s.x += s.vx * (dt * 60);
              s.y += s.vy * (dt * 60);
              s.vx *= 0.935;
              s.vy = s.vy * 0.935 - 0.02;
              s.alpha -= s.decay * (dt * 60);
              if (s.alpha <= 0.01) {
                sparks.splice(i, 1);
                continue;
              }
              fxCtx.globalAlpha = s.alpha;
              fxCtx.fillStyle = s.color;
              fxCtx.beginPath();
              fxCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
              fxCtx.fill();
            }
            fxCtx.globalAlpha = 1;
            if (sparks.length === 0) sparksDirtyRef.current = false;
          }
        }
      }

      const pChanged = Math.abs(p - lastP) >= 0.00005;
      const hadImpulse = clickImpulseRef.current > 0.001;
      if (hadImpulse) {
        clickImpulseRef.current *= Math.pow(0.06, dt);
        if (clickImpulseRef.current <= 0.001) clickImpulseRef.current = 0;
      }

      if (pChanged || hadImpulse) {
        const snapT = range(p, 0.17, 0.27);
        let scrollPress = 0;
        if (!reducedRef.current && snapT > 0 && snapT < 1) {
          if (snapT < 0.28) scrollPress = lerp(0, -0.09, easeOutCubic(snapT / 0.28));
          else if (snapT < 0.65) scrollPress = lerp(-0.09, 0.07, easeOutCubic((snapT - 0.28) / 0.37));
          else scrollPress = lerp(0.07, 0, easeOutCubic((snapT - 0.65) / 0.35));
        }

        const impulsePress = -Math.sin(clickImpulseRef.current * Math.PI) * 0.1;
        if (clickBrandRef.current) {
          const s = 1 + scrollPress + impulsePress;
          const y = -(scrollPress + impulsePress) * 28;
          clickBrandRef.current.style.transform =
            Math.abs(s - 1) < 0.0002 && Math.abs(y) < 0.05
              ? 'none'
              : `translate3d(0, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
        }
      }

      // Per-letter magnetic hover tilt (only write when hover state changes)
      if (hoverDirtyRef.current) {
        hoverDirtyRef.current = false;
        const hover = hoverStateRef.current;
        BRAND_LETTERS.forEach((_, idx) => {
          const el = clickLetterRefs.current[idx];
          if (!el) return;
          if (reducedRef.current || !hover.active) {
            el.style.transform = 'none';
            return;
          }
          const charCenter = (idx - 2) / 2;
          const proximity = Math.max(0, 1 - Math.abs(hover.nx - charCenter) * 0.65);
          const hoverY = -proximity * 6;
          const hoverRotY = (hover.nx - charCenter) * 14;
          const hoverRotX = -hover.ny * 12;
          el.style.transform = `translate3d(0, ${hoverY.toFixed(2)}px, 0) rotateX(${hoverRotX.toFixed(2)}deg) rotateY(${hoverRotY.toFixed(2)}deg) scale(${(1 + proximity * 0.06).toFixed(4)})`;
        });
      }

      if (!pChanged) return;
      lastP = p;
      applyInitial(p);
    });
  }, []);

  const line2Prefix = hero.line2.replace(/Click$/, '');

  const layer = (name, extra = '') => {
    const isInitial = ABOVE_FOLD.has(name);
    return (
      <div
        key={name}
        ref={(el) => {
          if (el) layerRefs.current[name] = el;
        }}
        className={`absolute inset-0 will-change-transform ${extra}`}
        style={isInitial ? undefined : { opacity: 0 }}
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={`/layers/m/${name}.webp`} />
          <img
            src={`/layers/d/${name}.webp`}
            alt=""
            aria-hidden="true"
            width={1280}
            height={724}
            className={FIT}
            decoding={isInitial ? 'sync' : 'async'}
            fetchPriority={name === 'moonscape' || name === 'sky' ? 'high' : isInitial ? 'auto' : 'low'}
            loading={isInitial ? 'eager' : 'lazy'}
          />
        </picture>
        {name === 'ground' && <div className="absolute inset-x-0 top-full h-[110vh] bg-black" />}
      </div>
    );
  };

  return (
    <section id="top" ref={rootRef} aria-label="Earthrise" className="relative" style={{ height: `${STAGE_VH}svh` }}>
      <style>{`
        .click-chrome-glyph {
          background-image:
            radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 1) 0%, rgba(186, 230, 253, 0.92) 32%, transparent 65%),
            linear-gradient(112deg, #e2e8f0 0%, #ffffff 30%, #7dd3fc 46%, #ffffff 52%, #93c5fd 65%, #f8fafc 100%);
          background-size: 100% 100%, 100% 100%;
          background-position: center, center;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: none;
        }
        @media (min-width: 1024px) {
          .click-chrome-glyph {
            filter: drop-shadow(0 6px 24px rgba(56, 189, 248, 0.28));
          }
        }
      `}</style>

      <div className="sticky top-0 h-screen-s overflow-hidden bg-void">
        {ORDER.slice(0, 3).map((n) => layer(n))}

        {/* Hero Headline + Live Physics "Click" Logo — immediately visible on first paint */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-x-0 top-[26%] px-3 sm:px-6 text-center md:top-[30%]"
          style={{ opacity: 1, perspective: '1000px' }}
        >
          {/* soft dark halo behind the words only – pure radial gradient (no GPU blur filter) */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -z-10 h-[180%] w-[min(96vw,1160px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(2_8_20/0.58),rgb(2_8_20/0.24)_58%,transparent)]"
          />
          <h1
            className="ct-hero-title font-hero font-normal text-white [text-shadow:0_0_1px_rgb(0_0_0/0.9),0_1px_3px_rgb(0_0_0/0.75),0_2px_12px_rgb(0_6_18/0.7),0_6px_40px_rgb(0_6_18/0.6)]"
            style={{ fontSize: 'clamp(1rem, 3.8vw, 4rem)', lineHeight: 1.15 }}
          >
            <span className="block overflow-hidden pb-1">
              <span ref={word1Ref} className="title-word-1 inline-block will-change-transform">
                {hero.line1}
              </span>
            </span>

            <span className="block pb-2">
              <span className="inline-block overflow-hidden align-baseline pb-1">
                <span ref={word2Ref} className="title-word-2 inline-block will-change-transform">
                  {line2Prefix}
                </span>
              </span>

              {/* Interactive Particle-Burst "Click" Brand Mark */}
              <span
                ref={clickBrandRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handleClickBrand}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    spawnBurst(0.5, 0.5, 42);
                    clickImpulseRef.current = 1;
                  }
                }}
                aria-label="Click brand mark"
                className="pointer-events-auto relative ml-[0.14em] inline-flex cursor-pointer items-baseline select-none will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                style={{ perspective: '900px' }}
              >
                <canvas
                  ref={clickCanvasRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[340%] w-[280%] -translate-x-1/2 -translate-y-1/2"
                />

                <span
                  ref={clickGlowRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-[0.35em] -inset-y-[0.15em] -z-20 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.32),rgba(56,189,248,0.1)_55%,transparent)]"
                  style={{ opacity: 0.55 }}
                />

                <span
                  className="inline-flex items-baseline lg:[filter:drop-shadow(0_0_1px_rgb(0_0_0/0.85))_drop-shadow(0_2px_6px_rgb(0_6_18/0.7))]"
                  style={{ perspective: '900px' }}
                >
                  {BRAND_LETTERS.map((char, idx) => (
                    <span
                      key={idx}
                      ref={(el) => {
                        clickLetterRefs.current[idx] = el;
                      }}
                      className="click-chrome-glyph inline-block font-extrabold tracking-[-0.03em] will-change-transform transition-transform duration-150 ease-out"
                    >
                      {char}
                    </span>
                  ))}
                </span>

                <span
                  ref={clickBladeRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-[-6%] -bottom-[0.04em] left-[-6%] h-[1.5px] origin-center bg-gradient-to-r from-transparent via-sky-200 to-transparent"
                  style={{ opacity: 0.9, transform: 'scaleX(0.85)' }}
                />
              </span>
            </span>
          </h1>
          <p className="mt-4 font-telemetry text-label font-medium text-white uppercase [text-shadow:0_0_2px_rgb(0_0_0/0.9),0_1px_4px_rgb(0_0_0/0.8),0_0_18px_rgb(0_6_18/0.75)]">
            {hero.subhead}
          </p>
        </div>

        {ORDER.slice(3).map((n) => layer(n))}

        {/* Telemetry HUD — visible immediately */}
        <div
          ref={hudRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 font-telemetry text-[0.625rem] tracking-[0.14em] text-regolith/75 uppercase sm:inset-6 md:text-label"
          style={{ opacity: 1 }}
        >
          <div className="brackets absolute inset-0 text-regolith/40" />
          <div className="absolute top-16 left-3 space-y-1 md:top-20 md:left-4">
            <p ref={clockRef}>T+ 00:00:00</p>
            <p className="text-regolith/50">Mission clock</p>
          </div>
          <div className="absolute top-16 right-3 hidden space-y-1 text-right md:top-20 md:right-4 md:block">
            <p>
              ROI horizon elev <span ref={elevRef} className="text-earth">4.2°</span>
            </p>
            <p className="text-regolith/50">Brand above horizon</p>
          </div>
          <div className="absolute bottom-3 left-3 space-y-1 md:bottom-4 md:left-4">
            <p className="text-earth/90">{hero.signal}</p>
            <p>{hero.site}</p>
          </div>
          <div className="absolute right-3 bottom-3 flex items-center gap-2 md:right-4 md:bottom-4">
            Scroll <span className="inline-block animate-bounce motion-reduce:animate-none">↓</span>
          </div>
        </div>
      </div>
    </section>
  );
}