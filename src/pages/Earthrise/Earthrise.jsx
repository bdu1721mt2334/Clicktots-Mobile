// Purpose: Implement the Earthrise pages module, keeping this responsibility separate for maintainability.
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { clamp, easeOutCubic, lerp, pinProgress, range } from '@/lib/math';
import { onFrame } from '@/lib/scroll';

const STAGE_VH = 440;

// Act I · Signal in the Noise — the dust is market noise; scrolling clears it.
const hero = {
  line1: 'Growth starts with an',
  line2: 'Intelligent Click', // must end with "Click" (the animated brand mark)
  subhead: 'Where human creativity meets predictive AI marketing',
  kicker: 'AI-powered digital marketing agency · Chennai',
  prompt: 'Scroll to clear the market noise',
  site: 'Mare Tranquillitatis · 0.67°N 23.47°E',
  signal: 'Signal lock · 99.4%',
};

const BRAND_LETTERS = ['C', 'l', 'i', 'c', 'k'];

const ORDER = ['sky', 'earth', 'moonscape', 'frame', 'astronaut', 'ground'];

const FIT = 'absolute inset-0 size-full object-cover object-[58%_50%] md:object-center';

export function Earthrise() {
  const rootRef = useRef(null);
  const layerRefs = useRef({});
  const veilRef = useRef(null);
  const dustRef = useRef(null);
  const titleRef = useRef(null);
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
  const burstFiredRef = useRef(false);
  const clickImpulseRef = useRef(0);
  const hoverStateRef = useRef({ active: false, nx: 0, ny: 0 });

  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const spawnBurst = (originX = 0.5, originY = 0.5, count = 44) => {
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
  };

  const handleClickBrand = (e) => {
    const canvas = clickCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ox = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0.15, 0.85);
      const oy = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0.2, 0.8);
      spawnBurst(ox, oy, 48);
    } else {
      spawnBurst(0.5, 0.5, 48);
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
    el.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    hoverStateRef.current = { active: false, nx: 0, ny: 0 };
  };

  // Sync dust + Click FX canvas resolutions.
  useEffect(() => {
    const targets = [dustRef.current, clickCanvasRef.current].filter(Boolean);
    if (!targets.length) return;
    const sync = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of targets) {
        c.width = Math.round(c.clientWidth * dpr);
        c.height = Math.round(c.clientHeight * dpr);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    for (const c of targets) ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = dustRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const motes = Array.from({length: 140}, () => ({x: rand(), y: rand(), r: 0.4 + rand() * 1.6, s: 0.3 + rand(), a: 0.2 + rand() * 0.6}));
    let lastP = -1;
    let lastTime = 0;

    const set = (name, y, scale = 1, opacity = 1) => {
      const el = layerRefs.current[name];
      if (!el) return;
      el.style.transform = `translate3d(0, ${y}vh, 0) scale(${scale})`;
      el.style.opacity = String(opacity);
    };

    return onFrame((time) => {
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const root = rootRef.current;
      if (!root) return;
      const {p, rect} = pinProgress(root);
      if (rect.bottom < 0) return;

      // Dust drifts every frame while it's visible.
      const veil = 1 - range(p, 0, 0.18);
      if (veil > 0.001) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const dpr = canvas.width / Math.max(1, w);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#dfe6f2';
        for (const m of motes) {
          if (!reducedRef.current) {
            m.x += 0.006 * m.s * dt;
            m.y -= 0.004 * m.s * dt;
            if (m.x > 1) m.x -= 1;
            if (m.y < 0) m.y += 1;
          }
          ctx.globalAlpha = m.a * veil;
          ctx.beginPath();
          ctx.arc(m.x * w, (m.y - p * 0.6) * h, m.r * (1 + p * 4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Render live "Click" spark particle physics every frame
      const fxCanvas = clickCanvasRef.current;
      if (fxCanvas) {
        const fxCtx = fxCanvas.getContext('2d');
        if (fxCtx) {
          const fw = fxCanvas.clientWidth;
          const fh = fxCanvas.clientHeight;
          const dpr = fxCanvas.width / Math.max(1, fw);
          fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          fxCtx.clearRect(0, 0, fw, fh);

          const sparks = sparksRef.current;
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
        }
      }

      // Smoothly decay interactive click impulse + drive magnetic hover on "Click"
      if (clickImpulseRef.current > 0.001) {
        clickImpulseRef.current *= Math.pow(0.06, dt);
      } else {
        clickImpulseRef.current = 0;
      }

      const snapT = range(p, 0.25, 0.34);
      let scrollPress = 0;
      if (!reducedRef.current && snapT > 0 && snapT < 1) {
        if (snapT < 0.28) {
          scrollPress = lerp(0, -0.09, easeOutCubic(snapT / 0.28));
        } else if (snapT < 0.65) {
          scrollPress = lerp(-0.09, 0.07, easeOutCubic((snapT - 0.28) / 0.37));
        } else {
          scrollPress = lerp(0.07, 0, easeOutCubic((snapT - 0.65) / 0.35));
        }
      }

      const impulsePress = -Math.sin(clickImpulseRef.current * Math.PI) * 0.1;
      if (clickBrandRef.current) {
        const s = 1 + scrollPress + impulsePress;
        const y = -(scrollPress + impulsePress) * 28;
        clickBrandRef.current.style.transform = `translate3d(0, ${y}px, 0) scale(${s})`;
      }

      // Per-letter 3D slot-reel reveal + cursor magnetic tilt
      BRAND_LETTERS.forEach((_, idx) => {
        const el = clickLetterRefs.current[idx];
        if (!el) return;
        if (reducedRef.current) {
          el.style.transform = 'none';
          el.style.filter = 'none';
          return;
        }

        const start = 0.12 + idx * 0.018;
        const reelT = easeOutCubic(range(p, start, start + 0.12));
        const reelY = lerp(52, 0, reelT);
        const reelRotX = lerp(-85, 0, reelT);
        const reelScale = lerp(0.8, 1, reelT);

        const hover = hoverStateRef.current;
        const charCenter = (idx - 2) / 2;
        const proximity = hover.active ? Math.max(0, 1 - Math.abs(hover.nx - charCenter) * 0.65) : 0;
        const hoverY = -proximity * 6;
        const hoverRotY = hover.active ? (hover.nx - charCenter) * 14 : 0;
        const hoverRotX = hover.active ? -hover.ny * 12 : 0;

        el.style.transform = `translate3d(0, ${reelY + hoverY}px, 0) rotateX(${reelRotX + hoverRotX}deg) rotateY(${hoverRotY}deg) scale(${reelScale + proximity * 0.06})`;
        el.style.filter = `blur(${(1 - reelT) * 9}px)`;
      });

      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const exit = range(p, 0.7, 1);
      const settle = easeOutCubic(range(p, 0, 0.5));

      // Veil clears upward.
      if (veilRef.current) {
        veilRef.current.style.opacity = String(veil);
        veilRef.current.style.transform = `translate3d(0, ${-range(p, 0, 0.18) * 24}vh, 0) scale(${1 + range(p, 0, 0.18) * 0.25})`;
      }
      if (canvas) {
        canvas.style.opacity = String(veil);
      }

      // Far → near layers.
      set('sky', lerp(0, -6, p), lerp(1.14, 1, settle));
      const rise = easeOutCubic(range(p, 0.04, 0.5));
      set('earth', lerp(34, 0, rise) - exit * 12, lerp(0.92, 1, rise));
      set('moonscape', lerp(9, 0, settle) - exit * 26);
      const rim = easeOutCubic(range(p, 0.28, 0.58));
      set('frame', -exit * 44, lerp(1.6, 1, rim), rim);
      const up = easeOutCubic(range(p, 0.36, 0.62));
      set('astronaut', lerp(28, 0, up) - exit * 58, 1, clamp(up * 2));
      const ground = easeOutCubic(range(p, 0.34, 0.6));
      set('ground', lerp(36, 0, ground) - exit * 78);

      // Fire particle burst when scroll hits the Click lock moment
      if (p >= 0.255 && !burstFiredRef.current) {
        burstFiredRef.current = true;
        spawnBurst(0.5, 0.52, 42);
      } else if (p < 0.2) {
        burstFiredRef.current = false;
      }

      // --- UNIQUE GSAP-STYLE STAGGERED CINEMATIC TEXT REVEAL ---
      const tIn = easeOutCubic(range(p, 0.08, 0.24));
      const tOut = range(p, 0.42, 0.52);
      const title = titleRef.current;

      if (title) {
        title.style.opacity = String(tIn * (1 - tOut));
        title.style.transform = `translate3d(0, ${-p * 6}vh, 0)`;

        const word1 = title.querySelector('.title-word-1');
        const word2 = title.querySelector('.title-word-2');

        const progress1 = easeOutCubic(range(p, 0.08, 0.20));
        const progress2 = easeOutCubic(range(p, 0.12, 0.24));

        if (word1) {
          word1.style.transform = reducedRef.current
            ? 'none'
            : `translate3d(0, ${lerp(45, 0, progress1)}px, 0) rotateX(${lerp(-25, 0, progress1)}deg)`;
          word1.style.filter = reducedRef.current ? 'none' : `blur(${(1 - progress1) * 10}px)`;
        }

        if (word2) {
          word2.style.transform = reducedRef.current
            ? 'none'
            : `translate3d(0, ${lerp(45, 0, progress2)}px, 0) rotateX(${lerp(-25, 0, progress2)}deg)`;
          word2.style.filter = reducedRef.current ? 'none' : `blur(${(1 - progress2) * 10}px)`;
        }

        // Specular horizon blade & ambient aura behind "Click"
        if (clickBladeRef.current) {
          const bladeT = easeOutCubic(range(p, 0.25, 0.36));
          clickBladeRef.current.style.transform = `scaleX(${bladeT})`;
          clickBladeRef.current.style.opacity = String(bladeT * 0.9);
        }

        if (clickGlowRef.current) {
          const glowT = easeOutCubic(range(p, 0.24, 0.35));
          clickGlowRef.current.style.opacity = String(glowT * 0.75);
          clickGlowRef.current.style.transform = `scale(${lerp(0.7, 1.08, glowT)})`;
        }
      }

      // Telemetry HUD.
      if (hudRef.current) {
        hudRef.current.style.opacity = String(range(p, 0.02, 0.1) * (1 - range(p, 0.62, 0.72)));
      }
      const secs = p * 5400;
      if (clockRef.current) {
        clockRef.current.textContent = `T+ ${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
      }
      if (elevRef.current) {
        elevRef.current.textContent = `${(rise * 12.5).toFixed(1)}°`;
      }
    });
  }, []);

  const line2Prefix = hero.line2.replace(/Click$/, '');

  const layer = (name, extra = '') => (
    <div
      key={name}
      ref={(el) => {
        if (el) layerRefs.current[name] = el;
      }}
      className={`absolute inset-0 will-change-transform ${extra}`}
    >
      <picture>
        <source media="(max-width: 767px)" srcSet={`/layers/m/${name}.webp`} />
        <img src={`/layers/d/${name}.webp`} alt="" aria-hidden="true" className={FIT} decoding="async" fetchPriority={name === 'sky' ? 'high' : 'low'} />
      </picture>
      {name === 'ground' && <div className="absolute inset-x-0 top-full h-[110vh] bg-black" />}
    </div>
  );

  return (
    <section id="top" ref={rootRef} aria-label="Earthrise" className="relative" style={{height: `${STAGE_VH}svh`}}>
      <style>{`
        @keyframes clickChromeSweep {
          0%, 18% { background-position: 180% 50%; }
          58%, 100% { background-position: -80% 50%; }
        }
        .click-chrome-glyph {
          background-image:
            radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 1) 0%, rgba(186, 230, 253, 0.92) 32%, transparent 65%),
            linear-gradient(112deg, #e2e8f0 0%, #ffffff 30%, #7dd3fc 46%, #ffffff 52%, #93c5fd 65%, #f8fafc 100%);
          background-size: 100% 100%, 240% 100%;
          background-position: center, 180% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: none; /* the h1's shadow would paint over the gradient letters */
          filter: drop-shadow(0 6px 24px rgba(56, 189, 248, 0.28));
          animation: clickChromeSweep 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .click-chrome-glyph {
            animation: none;
            background-position: center, 50% 50%;
          }
        }
      `}</style>

      <div className="sticky top-0 h-screen-s overflow-hidden bg-void">
        {ORDER.slice(0, 3).map((n) => layer(n))}

        {/* Unique Staggered Split-Line Title Reveal + Live Physics "Click" Logo */}
        <div ref={titleRef} className="pointer-events-none absolute inset-x-0 top-[26%] px-3 sm:px-6 text-center md:top-[30%]" style={{opacity: 0, perspective: '1000px'}}>
          {/* soft dark halo behind the words only – keeps them readable over the bright clouds */}
          <span aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 h-[150%] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(2_8_20/0.55),rgb(2_8_20/0.25)_55%,transparent)] blur-2xl" />
          <h1 className="ct-hero-title font-hero font-normal text-white [text-shadow:0_0_1px_rgb(0_0_0/0.9),0_1px_3px_rgb(0_0_0/0.75),0_2px_12px_rgb(0_6_18/0.7),0_6px_40px_rgb(0_6_18/0.6)]" style={{fontSize: 'clamp(1rem, 3.8vw, 4rem)', lineHeight: 1.15}}>
            <span className="block overflow-hidden pb-1">
              <span className="title-word-1 inline-block will-change-transform">{hero.line1}</span>
            </span>

            <span className="block pb-2">
              <span className="inline-block overflow-hidden align-baseline pb-1">
                <span className="title-word-2 inline-block will-change-transform">{line2Prefix}</span>
              </span>

              {/* Interactive 3D Slot-Reel + Particle-Burst "Click" Brand Mark */}
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
                    spawnBurst(0.5, 0.5, 48);
                    clickImpulseRef.current = 1;
                  }
                }}
                aria-label="Click brand mark"
                className="pointer-events-auto relative ml-[0.14em] inline-flex cursor-pointer items-baseline select-none will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
                style={{perspective: '900px'}}
              >
                {/* Live physics particle burst canvas */}
                <canvas
                  ref={clickCanvasRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[340%] w-[280%] -translate-x-1/2 -translate-y-1/2"
                />

                {/* Soft volumetric glow behind the wordmark */}
                <span
                  ref={clickGlowRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-[0.25em] inset-y-[0.05em] -z-20 rounded-full bg-sky-400/25 blur-2xl"
                  style={{opacity: 0}}
                />

                {/* 3D rolling letters (the wrapper adds a dark outline so they read over bright clouds) */}
                <span className="inline-flex items-baseline [filter:drop-shadow(0_0_1px_rgb(0_0_0/0.85))_drop-shadow(0_2px_6px_rgb(0_6_18/0.7))]" style={{perspective: '900px'}}>
                {BRAND_LETTERS.map((char, idx) => (
                  <span
                    key={idx}
                    ref={(el) => {
                      clickLetterRefs.current[idx] = el;
                    }}
                    className="click-chrome-glyph inline-block font-extrabold tracking-[-0.03em] will-change-transform"
                  >
                    {char}
                  </span>
                ))}
                </span>

                {/* Razor-thin specular horizon blade */}
                <span
                  ref={clickBladeRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-[-6%] -bottom-[0.04em] left-[-6%] h-[1.5px] origin-center bg-gradient-to-r from-transparent via-sky-200 to-transparent"
                  style={{opacity: 0, transform: 'scaleX(0)'}}
                />
              </span>
            </span>
          </h1>
          <p className="mt-4 font-telemetry text-label font-medium text-white uppercase [text-shadow:0_0_2px_rgb(0_0_0/0.9),0_1px_4px_rgb(0_0_0/0.8),0_0_18px_rgb(0_6_18/0.75)]">{hero.subhead}</p>
        </div>

        {ORDER.slice(3).map((n) => layer(n))}

        {/* Cosmic dust on the lens. */}
        <div
          ref={veilRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 30% 40%, rgba(170,184,210,0.55), transparent 70%), radial-gradient(50% 60% at 75% 60%, rgba(120,140,180,0.5), transparent 70%), radial-gradient(80% 80% at 50% 50%, rgba(20,26,40,0.85), rgba(5,7,12,0.95))',
          }}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <p className="font-telemetry text-label text-regolith/80 uppercase">{hero.kicker}</p>
            <p className="mt-3 px-4 font-hero text-[10px] sm:text-[0.8125rem] tracking-[0.22em] sm:tracking-[0.5em] text-white/90 uppercase">
              {hero.prompt}
            </p>
            <span aria-hidden="true" className="mt-6 inline-block animate-bounce text-regolith/70 motion-reduce:animate-none">
              ↓
            </span>
          </div>
        </div>
        <canvas ref={dustRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

        {/* Telemetry HUD. */}
        <div ref={hudRef} aria-hidden="true" className="pointer-events-none absolute inset-4 font-telemetry text-[0.625rem] tracking-[0.14em] text-regolith/75 uppercase sm:inset-6 md:text-label" style={{opacity: 0}}>
          <div className="brackets absolute inset-0 text-regolith/40" />
          <div className="absolute top-16 left-3 space-y-1 md:top-20 md:left-4">
            <p ref={clockRef}>T+ 00:00:00</p>
            <p className="text-regolith/50">Mission clock</p>
          </div>
          <div className="absolute top-16 right-3 hidden space-y-1 text-right md:top-20 md:right-4 md:block">
            <p>
              ROI horizon elev <span ref={elevRef} className="text-earth">0.0°</span>
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