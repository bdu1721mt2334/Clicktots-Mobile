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
  const veilRef = useRef(null);
  const dustCanvasRef = useRef(null);
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
    if (reducedRef.current || e.pointerType !== 'mouse') return;
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
    let dustCtx = null;
    let dustW = 0;
    let dustH = 0;
    let dustDpr = 1;
    let motes = [];
    let dustCleared = false;

    const initDust = () => {
      const c = dustCanvasRef.current;
      if (!c) return;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (!w || !h) return;
      const mobile = w < 768;
      dustW = w;
      dustH = h;
      dustDpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dustDpr);
      c.height = Math.round(h * dustDpr);
      dustCtx = c.getContext('2d');
      const count = mobile ? 44 : 96;
      let seed = 1337;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      motes = Array.from({ length: count }, () => {
        const x = rnd();
        const y = rnd();
        const dx = x - 0.5;
        const dy = y - 0.5;
        const d = Math.hypot(dx, dy) || 0.01;
        return {
          x,
          y,
          vx: (rnd() - 0.5) * 0.008,
          vy: (rnd() - 0.5) * 0.006 - 0.002,
          dirX: dx / d,
          dirY: dy / d,
          r: 0.65 + rnd() * 1.45,
          a: 0.25 + rnd() * 0.68,
          spread: 0.18 + rnd() * 0.34,
        };
      });
    };

    const drawDust = (dt, veilOut) => {
      if (!dustCtx || !dustW || !dustH) return;
      if (veilOut >= 0.999) {
        if (!dustCleared) {
          dustCtx.setTransform(1, 0, 0, 1, 0, 0);
          dustCtx.clearRect(0, 0, dustW * dustDpr, dustH * dustDpr);
          dustCleared = true;
        }
        return;
      }
      dustCleared = false;
      dustCtx.setTransform(dustDpr, 0, 0, dustDpr, 0, 0);
      dustCtx.clearRect(0, 0, dustW, dustH);
      const fade = 1 - veilOut;
      const move = !reducedRef.current;
      dustCtx.fillStyle = '#eef4ff';
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if (move) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.x < -0.02) m.x = 1.02;
          else if (m.x > 1.02) m.x = -0.02;
          if (m.y < -0.02) m.y = 1.02;
          else if (m.y > 1.02) m.y = -0.02;
        }
        const scatter = veilOut * m.spread;
        const px = (m.x + m.dirX * scatter) * dustW;
        const py = (m.y + m.dirY * scatter) * dustH;
        const alpha = m.a * fade;
        if (alpha <= 0.01) continue;
        dustCtx.globalAlpha = alpha;
        dustCtx.beginPath();
        dustCtx.arc(px, py, m.r, 0, Math.PI * 2);
        dustCtx.fill();
      }
      dustCtx.globalAlpha = 1;
    };

    initDust();
    const dustRo = typeof ResizeObserver !== 'undefined' && dustCanvasRef.current
      ? new ResizeObserver(() => {
          initDust();
          drawDust(0, easeOutCubic(range(Math.max(0, lastP), 0, 0.16)));
        })
      : null;
    if (dustRo && dustCanvasRef.current) dustRo.observe(dustCanvasRef.current);

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

      // Opening atmospheric veil ("Scroll to clear the market noise") clears on initial scroll
      const veilOut = easeOutCubic(range(p, 0, 0.16));
      const veil = veilRef.current;
      if (veil) {
        const vo = 1 - veilOut;
        veil.style.opacity = vo <= 0.001 ? '0' : vo.toFixed(3);
        veil.style.visibility = vo <= 0.001 ? 'hidden' : 'visible';
        veil.style.transform = veilOut <= 0.001 ? 'none' : `translate3d(0, ${(-veilOut * 24).toFixed(1)}px, 0)`;
      }

      if (p >= 0.18 && !burstFiredRef.current && window.innerWidth >= 768) {
        burstFiredRef.current = true;
        spawnBurst(0.5, 0.52, 34);
      } else if (p < 0.12) {
        burstFiredRef.current = false;
      }

      // Hero headline rises into view as the market-noise veil clears, then smoothly exits as astronaut rises
      const tIn = easeOutCubic(range(p, 0.08, 0.22));
      const tOut = range(p, 0.36, 0.48);
      const titleOp = tIn * (1 - tOut);
      const title = titleRef.current;
      if (title) {
        title.style.opacity = titleOp <= 0.001 ? '0' : titleOp.toFixed(3);
        title.style.visibility = titleOp <= 0.001 ? 'hidden' : 'visible';
        title.style.transform = `translate3d(0, ${(lerp(3.5, 0, tIn) - p * 6).toFixed(3)}vh, 0)`;
        if (word1Ref.current) word1Ref.current.style.transform = 'none';
        if (word2Ref.current) word2Ref.current.style.transform = 'none';
        if (clickBladeRef.current) {
          const bladeT = 0.85 + 0.15 * easeOutCubic(range(p, 0.08, 0.28));
          clickBladeRef.current.style.transform = `scaleX(${bladeT.toFixed(3)})`;
          clickBladeRef.current.style.opacity = String((titleOp * 0.9).toFixed(3));
        }
        if (clickGlowRef.current) {
          const glowT = 0.7 + 0.3 * easeOutCubic(range(p, 0.08, 0.28));
          clickGlowRef.current.style.opacity = String((glowT * 0.75 * titleOp).toFixed(3));
          clickGlowRef.current.style.transform = `scale(${lerp(0.95, 1.08, glowT).toFixed(3)})`;
        }
      }

      // Telemetry HUD fades in once the veil clears, fades out on exit
      if (hudRef.current) {
        const hudOp = easeOutCubic(range(p, 0.1, 0.22)) * (1 - range(p, 0.6, 0.7));
        hudRef.current.style.opacity = hudOp <= 0.001 ? '0' : hudOp.toFixed(3);
        hudRef.current.style.visibility = hudOp <= 0.001 ? 'hidden' : 'visible';
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
    drawDust(0, 0);

    const stopFrame = onFrame((time) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const root = rootRef.current;
      if (!root) return;
      const { p, rect } = pinProgress(root);
      if (rect.bottom < 0) return;

      // Gently drift cosmic dust motes ONLY while the opening veil is visible (0ms cost after p >= 0.16)
      const veilOut = easeOutCubic(range(p, 0, 0.16));
      if (veilOut < 0.999 || !dustCleared) {
        drawDust(dt, veilOut);
      }

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
    return () => {
      stopFrame();
      dustRo?.disconnect();
    };
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
        className={`absolute inset-0 lg:will-change-transform ${extra}`}
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
    <section id="top" data-nav-surface="dark" ref={rootRef} aria-label="Earthrise" className="relative" style={{ height: `${STAGE_VH}svh` }}>
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

        {/* Opening cosmic mist & drifting dust veil — exact market-noise atmosphere, clears smoothly on scroll */}
        <div
          ref={veilRef}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center"
          style={{
            opacity: 1,
            background:
              'radial-gradient(ellipse 68% 54% at 28% 36%, rgba(162, 182, 218, 0.34) 0%, rgba(78, 96, 132, 0.24) 42%, transparent 74%), radial-gradient(ellipse 52% 44% at 62% 44%, rgba(112, 134, 174, 0.20) 0%, rgba(36, 48, 74, 0.18) 48%, transparent 78%), radial-gradient(ellipse 80% 60% at 20% 52%, rgba(128, 148, 184, 0.22) 0%, transparent 65%), linear-gradient(180deg, rgba(4, 7, 13, 0.42) 0%, rgba(18, 26, 42, 0.32) 48%, rgba(4, 7, 13, 0.56) 100%)',
          }}
        >
          <canvas
            ref={dustCanvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full"
          />
          <div
            className="relative z-10 flex flex-col items-center px-6 py-4 rounded-2xl"
            style={{
              background:
                'radial-gradient(closest-side, rgba(2, 8, 22, 0.72) 0%, rgba(2, 8, 22, 0.36) 62%, transparent 100%)',
            }}
          >
            <p
              className="relative z-10 font-hero font-bold uppercase text-white"
              style={{
                fontSize: 'clamp(0.72rem, 1.28vw, 1.05rem)',
                letterSpacing: '0.18em',
                fontSynthesisWeight: 'auto',
                WebkitTextStroke: '0.35px rgba(255, 255, 255, 0.65)',
                textShadow:
                  '0 1px 2px rgba(0, 0, 0, 0.98), 0 2px 12px rgba(0, 6, 18, 0.95), 0 4px 28px rgba(0, 6, 18, 0.85)',
              }}
            >
              AI-POWERED DIGITAL MARKETING AGENCY &middot; CHENNAI
            </p>
            <p
              className="relative z-10 mt-3.5 font-hero font-bold uppercase text-white tracking-[0.2em] md:tracking-[0.3em]"
              style={{
                fontSize: 'clamp(0.88rem, 1.65vw, 1.4rem)',
                fontSynthesisWeight: 'auto',
                WebkitTextStroke: '0.55px rgba(255, 255, 255, 0.85)',
                textShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.98), 0 3px 16px rgba(0, 6, 18, 0.95), 0 6px 34px rgba(0, 6, 18, 0.9)',
              }}
            >
              SCROLL TO CLEAR THE MARKET NOISE
            </p>
            <span
              aria-hidden="true"
              className="relative z-10 mt-5 inline-block text-[1.15rem] font-bold text-white animate-bounce motion-reduce:animate-none"
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.95)' }}
            >
              &darr;
            </span>
          </div>
        </div>

        {/* Hero Headline + Live Physics "Click" Logo — fades in as the veil clears */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-x-0 top-[26%] px-3 sm:px-6 text-center md:top-[30%]"
          style={{ opacity: 0, visibility: 'hidden', perspective: '1000px' }}
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
              <span ref={word1Ref} className="title-word-1 inline-block lg:will-change-transform">
                {hero.line1}
              </span>
            </span>

            <span className="block pb-2">
              <span className="inline-block overflow-hidden align-baseline pb-1">
                <span ref={word2Ref} className="title-word-2 inline-block lg:will-change-transform">
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
                className="pointer-events-auto relative ml-[0.14em] inline-flex cursor-pointer items-baseline select-none lg:will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
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
                      className="click-chrome-glyph inline-block font-extrabold tracking-[-0.03em] lg:will-change-transform transition-transform duration-150 ease-out"
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
          <p
            className="mt-5 inline-block rounded-xl px-5 py-2 font-telemetry font-bold text-white uppercase tracking-[0.18em]"
            style={{
              fontSize: 'clamp(0.68rem, 1.15vw, 0.98rem)',
              fontSynthesisWeight: 'auto',
              WebkitTextStroke: '0.4px rgba(255, 255, 255, 0.75)',
              background:
                'radial-gradient(closest-side, rgba(2, 8, 22, 0.76) 0%, rgba(2, 8, 22, 0.42) 68%, transparent 100%)',
              textShadow:
                '0 1px 2px rgba(0, 0, 0, 1), 0 2px 10px rgba(0, 4, 14, 0.96), 0 0 22px rgba(0, 6, 18, 0.92)',
            }}
          >
            {hero.subhead}
          </p>
        </div>

        {ORDER.slice(3).map((n) => layer(n))}

        {/* Bottom-center scroll cue — fades in once the veil clears */}
        <div
          ref={hudRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 font-telemetry text-[0.7rem] tracking-[0.18em] text-white uppercase sm:inset-6 md:text-xs"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-4 py-1.5 font-bold text-white md:bottom-5"
            style={{
              fontSynthesisWeight: 'auto',
              background: 'rgba(2, 8, 20, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              textShadow: '0 1px 8px rgba(0, 0, 0, 0.95)',
            }}
          >
            Scroll <span className="inline-block animate-bounce motion-reduce:animate-none">↓</span>
          </div>
        </div>
      </div>
    </section>
  );
}