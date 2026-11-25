// Purpose: iOS-style "liquid glass" tab bar.
//   - clear glass bar with a bright rim
//   - a clear glass LENS slides between tabs (spring + stretch while moving, drag to scrub)
//   - the text UNDER the lens turns blue (accent) and is slightly magnified; the rest stays white.
//     Two label rows: the white row has a hole cut where the lens is (mask), the blue row is clipped to the
//     lens (clip-path) – both follow the lens every frame, so a half-covered word is half blue, like iOS.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GlassScope, LiquidGlass, createVelocityTracker, useGlassEnv, useSpring } from "./LiquidGlass";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function GlassTabBar({
  tabs,
  value,
  onChange,
  onTabHover,
  minimizeOnScroll,
  tone = "dark",
  accent = "#0A84FF",
  className,
  style,
}) {
  const env = useGlassEnv();
  const list = useRef(null);
  const lens = useRef(null);
  const row = useRef(null);
  const accentClip = useRef(null);
  const accentRow = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(-1); // tab under the pointer: its label rolls (white + accent copy together)
  const active = Math.max(0, tabs.findIndex((t) => t.id === value));

  /* lens springs: x + width, with stretch from velocity */
  const paint = () => {
    const n = lens.current;
    if (!n) return;
    const v = env.reducedMotion ? 0 : lx.velocity;
    const stretch = Math.min(0.28, Math.abs(v) * 0.00035);
    const sx = 1 + stretch + lp.value * 0.08;
    n.style.transform = `translateX(${lx.value.toFixed(2)}px) scale(${sx.toFixed(4)}, ${(1 - stretch * 0.5 + lp.value * 0.08).toFixed(4)})`;
    n.style.width = `${lw.value.toFixed(2)}px`;
    // where the lens really is (after the stretch)
    const W = list.current?.clientWidth || 0;
    const w = lw.value * sx;
    const left = lx.value + lw.value / 2 - w / 2;
    const right = left + w;
    const mid = (left + right) / 2;
    if (accentClip.current) accentClip.current.style.clipPath = `inset(3px ${Math.max(0, W - right).toFixed(1)}px 3px ${Math.max(0, left).toFixed(1)}px round 999px)`;
    if (accentRow.current) accentRow.current.style.transformOrigin = `${mid.toFixed(1)}px 50%`;
    if (row.current) {
      const m = `linear-gradient(90deg,#000 ${(left + 2).toFixed(1)}px,transparent ${(left + 6).toFixed(1)}px,transparent ${(right - 6).toFixed(1)}px,#000 ${(right - 2).toFixed(1)}px)`;
      row.current.style.webkitMaskImage = m;
      row.current.style.maskImage = m;
    }
  };
  const lx = useSpring(0, paint, { stiffness: 420, damping: 30 });
  const lw = useSpring(0, paint, { stiffness: 420, damping: 32 });
  const lp = useSpring(0, paint, { stiffness: 540, damping: 26 });

  const measure = useCallback(
    (i) => {
      const l = list.current;
      const btn = l?.querySelectorAll("[role=tab]")[i];
      if (!l || !btn) return null;
      return { x: btn.offsetLeft, w: btn.offsetWidth };
    },
    []
  );

  const moveTo = useCallback(
    (i, instant = false) => {
      const m = measure(i);
      if (!m) return;
      if (instant || env.reducedMotion) {
        lx.set(m.x);
        lw.set(m.w);
      } else {
        lx.to(m.x);
        lw.to(m.w);
      }
    },
    [measure, env.reducedMotion, lx, lw]
  );

  const first = useRef(true);
  useIso(() => {
    moveTo(active, first.current);
    first.current = false;
  }, [active, moveTo]);

  useEffect(() => {
    const l = list.current;
    if (!l || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!draggingRef.current) moveTo(activeRef.current, true);
    });
    ro.observe(l);
    return () => ro.disconnect();
  }, [moveTo]);

  const activeRef = useRef(active);
  activeRef.current = active;
  const draggingRef = useRef(false);

  /* scrub: drag across the bar */
  useEffect(() => {
    const l = list.current;
    if (!l) return;
    const vt = createVelocityTracker();
    let startX = 0;
    let startLens = 0;
    let moved = false;
    let pid = -1;

    const nearest = (cx) => {
      const btns = Array.from(l.querySelectorAll("[role=tab]"));
      let best = 0;
      let bd = Infinity;
      btns.forEach((b, i) => {
        const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - cx);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };

    const down = (e) => {
      if (e.button !== 0 || l.classList.contains("is-min")) return;
      pid = e.pointerId;
      startX = e.clientX;
      startLens = lx.value;
      moved = false;
      vt.reset();
      vt.push(e.clientX, 0);
      const idx = nearest(e.clientX - l.getBoundingClientRect().left);
      if (idx === activeRef.current && !env.reducedMotion) lp.to(1);
    };

    const move = (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) {
        moved = true;
        draggingRef.current = true;
        setDragging(true);
        l.setPointerCapture(pid);
        if (!env.reducedMotion) lp.to(1);
      }
      vt.push(e.clientX, 0);
      const max = l.clientWidth - lw.value;
      let x = startLens + dx;
      if (x < 0) x *= 0.3;
      if (x > max) x = max + (x - max) * 0.3;
      lx.stiffness = 900;
      lx.damping = 50;
      lx.to(x);
      const idx = nearest(x + lw.value / 2);
      const m = measure(idx);
      if (m) lw.to(m.w);
    };

    const up = (e) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      lp.to(0);
      if (!moved) return;
      draggingRef.current = false;
      setDragging(false);
      lx.stiffness = 420;
      lx.damping = 30;
      const { vx } = vt.get();
      const idx = nearest(lx.value + lw.value / 2 + vx * 0.05);
      const t = tabs[idx];
      if (t && t.id !== value) onChange(t.id);
      else moveTo(idx);

      const stop = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      l.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => l.removeEventListener("click", stop, { capture: true }), 0);
    };

    l.addEventListener("pointerdown", down);
    l.addEventListener("pointermove", move);
    l.addEventListener("pointerup", up);
    l.addEventListener("pointercancel", up);
    return () => {
      l.removeEventListener("pointerdown", down);
      l.removeEventListener("pointermove", move);
      l.removeEventListener("pointerup", up);
      l.removeEventListener("pointercancel", up);
    };
  }, [tabs, value, onChange, measure, moveTo, env.reducedMotion, lx, lw, lp]);

  const onKey = (e) => {
    const n = tabs.length;
    const map = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: n - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const i = (map[e.key] + n) % n;
    onChange(tabs[i].id);
    list.current?.querySelectorAll("[role=tab]")[i]?.focus();
  };

  const cls = ["fd-gtab", minimized ? "is-min" : "", dragging ? "is-drag" : "", `fd-gtab--${tone}`, className ?? ""].filter(Boolean).join(" ");

  return (
    <GlassScope>
      <nav className={cls} style={{ ...(accent ? { "--fd-gtab-accent": accent } : null), ...style }} aria-label="Primary">
        <style>{tabCss}</style>
        <LiquidGlass
          className="fd-gtab-bar"
          variant="clear"
          tone={tone}
          radius="capsule"
          bezel={24}
          refraction={1.15}
          dispersion={0.08}
          blur={tone === "light" ? 12 : 6}
          style={
            tone === "light"
              ? {
                  "--fd-lg-fill": "rgba(246, 243, 236, 0.94)",
                  "--fd-lg-fg": "#121110",
                  "--fd-lg-sat": "1.35",
                  "--fd-lg-bright": "1.02",
                  "--fd-lg-spec-o": "0.5",
                  "--fd-lg-shadow":
                    "0 12px 30px -12px rgba(18, 17, 16, 0.28), 0 2px 6px rgba(18, 17, 16, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(18, 17, 16, 0.08)",
                }
              : {
                  "--fd-lg-fill": "rgba(10, 14, 22, 0.56)",
                  "--fd-lg-fg": "#FFFFFF",
                  "--fd-lg-sat": "1.6",
                  "--fd-lg-bright": "1.05",
                  "--fd-lg-spec-o": "0.9",
                  "--fd-lg-shadow":
                    "0 12px 32px -14px rgba(0, 0, 0, 0.58), 0 1px 2px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(255, 255, 255, 0.08)",
                }
          }
        >
          <div ref={list} className={`fd-gtab-list${minimized ? " is-min" : ""}`} role="tablist" aria-orientation="horizontal" onKeyDown={onKey}>
            <span ref={lens} className="fd-gtab-lens" aria-hidden="true">
              <i className="fd-gtab-rim" />
            </span>
            <div ref={row} className="fd-gtab-row">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`fd-gtab-${t.id}`}
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                className={`fd-gtab-tab${hovered === i ? " is-roll" : ""}`}
                onMouseEnter={() => {
                  setHovered(i);
                  onTabHover?.(t.id);
                }}
                onMouseLeave={() => setHovered((h) => (h === i ? -1 : h))}
                onFocus={() => {
                  setHovered(i);
                  onTabHover?.(t.id);
                }}
                onBlur={() => setHovered((h) => (h === i ? -1 : h))}
                onClick={() => {
                  if (minimized) setMinimized(false);
                  else onChange(t.id);
                }}
              >
                {t.icon && (
                  <span className="fd-gtab-ico" aria-hidden="true">
                    {t.icon}
                  </span>
                )}
                <RollLabel label={t.label} />
              </button>
            ))}
            </div>
            {/* the same labels in the accent colour, visible only inside the lens (slightly magnified) */}
            <div ref={accentClip} className="fd-gtab-accent" aria-hidden="true">
              <div ref={accentRow} className="fd-gtab-accent-row">
                {tabs.map((t, i) => (
                  <span key={t.id} className={`fd-gtab-tab fd-gtab-tab--ghost${hovered === i ? " is-roll" : ""}`}>
                    {t.icon && <span className="fd-gtab-ico">{t.icon}</span>}
                    <RollLabel label={t.label} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </LiquidGlass>
      </nav>
    </GlassScope>
  );
}

/* hover: the label rolls up and the same word rises in from below (same motion as "Talk to Our Experts") */
function RollLabel({ label }) {
  return (
    <span className="fd-gtab-lbl fd-gtab-roll">
      <span className="fd-gtab-roll-a">{label}</span>
      <span className="fd-gtab-roll-b" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

const tabCss = `
.fd-gtab,.fd-gtab *,.fd-gtab *::before,.fd-gtab *::after{box-sizing:border-box}
.fd-gtab{--fd-gtab-accent:#0A84FF;--fd-gtab-h:44px;--fd-gtab-pad:4px;
  display:inline-flex;align-items:center;margin:0;padding:0;background:none;border:0;color:#FFFFFF}
/* normal-size text (the site font is very wide, so 11.5px reads like ~14px of a normal font) */
.fd-gtab .fd-gtab-tab,.fd-gtab .fd-gtab-lbl{font-size:11.5px;line-height:1;font-weight:400;letter-spacing:0.02em}

/* the bar: clear glass, bright rim, a whisper of dark so white text stays readable on dark areas */
.fd-gtab-bar{flex:1 1 auto;min-width:0;height:var(--fd-gtab-h);padding:var(--fd-gtab-pad);max-width:760px;
  --fd-lg-fill:rgba(10,14,22,0.42);--fd-lg-sat:1.6;--fd-lg-bright:1.05;--fd-lg-spec-o:0.9;
  --fd-lg-shadow:0 12px 32px -14px rgba(0,0,0,0.55),0 1px 2px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -1px 0 rgba(255,255,255,0.08);
  transition:max-width var(--fd-dur-3) var(--fd-ease-out),height var(--fd-dur-3) var(--fd-ease-out),background-color 0.25s ease,box-shadow 0.25s ease}
.fd-gtab-bar::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0) 45%,rgba(255,255,255,0) 70%,rgba(255,255,255,0.06));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,0.18)}
/* light-surface bar: crisp warm frosted glass with strong hairline border & bold black text */
.fd-gtab--light .fd-gtab-bar{
  --fd-lg-fill:rgba(246,243,236,0.9);--fd-lg-sat:1.35;--fd-lg-bright:1.02;--fd-lg-spec-o:0.55;
  --fd-lg-shadow:0 12px 30px -12px rgba(18,17,16,0.28),0 2px 6px rgba(18,17,16,0.08),inset 0 1px 0 rgba(255,255,255,0.92),inset 0 -1px 0 rgba(18,17,16,0.06)}
.fd-gtab--light .fd-gtab-bar::after{
  background:linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0) 48%,rgba(18,17,16,0.03));
  box-shadow:inset 0 0 0 1px rgba(18,17,16,0.16)}
.fd-gtab.is-min .fd-gtab-bar{flex:0 0 auto;max-width:var(--fd-gtab-h)}
.fd-gtab-list{position:relative;display:flex;align-items:center;height:100%;margin:0;padding:0 2px;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.fd-gtab-row{display:flex;align-items:center;height:100%;flex:1 1 auto;min-width:0}

/* the lens: clear glass bubble, white specular top, iridescent (rainbow) rim like iOS */
.fd-gtab-lens{position:absolute;left:0;top:2px;bottom:2px;width:0;margin:0;padding:0;border-radius:999px;pointer-events:none;transform-origin:50% 50%;will-change:transform,width;z-index:0;
  background:radial-gradient(120% 140% at 50% 0%,rgba(255,255,255,0.18),rgba(255,255,255,0.06) 55%,rgba(255,255,255,0.1));
  box-shadow:inset 0 1px 1px rgba(255,255,255,0.75),inset 0 -1px 1px rgba(255,255,255,0.18),inset 0 0 12px rgba(255,255,255,0.08),0 6px 18px -6px rgba(0,0,0,0.5);
  -webkit-backdrop-filter:blur(1.5px) saturate(1.8) brightness(1.12);backdrop-filter:blur(1.5px) saturate(1.8) brightness(1.12)}
.fd-gtab-rim{position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;opacity:0.7;
  background:conic-gradient(from 200deg,rgba(255,255,255,0.9),rgba(255,120,210,0.85),rgba(120,200,255,0.9),rgba(255,236,140,0.85),rgba(170,130,255,0.85),rgba(255,255,255,0.9));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);
  filter:blur(0.4px);transition:opacity 0.25s}
.fd-gtab.is-drag .fd-gtab-rim{opacity:1;filter:blur(0.6px) saturate(1.3)}
.fd-gtab.is-drag .fd-gtab-lens{box-shadow:inset 0 1px 2px rgba(255,255,255,0.9),inset 0 -1px 2px rgba(255,255,255,0.25),inset 0 0 16px rgba(255,255,255,0.12),0 10px 24px -6px rgba(0,0,0,0.55)}
.fd-gtab--light .fd-gtab-lens{background:rgba(255,255,255,0.92);
  box-shadow:inset 0 1px 1px rgba(255,255,255,1),0 4px 12px -4px rgba(18,17,16,0.22),0 0 0 1px rgba(18,17,16,0.12)}

/* tabs (white on dark surfaces, bold black on light surfaces) */
.fd-gtab-tab{position:relative;z-index:1;flex:1 1 auto;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;height:100%;margin:0;padding:0 15px;border:0;border-radius:999px;background:none;color:#FFFFFF;
  text-shadow:0 1px 2px rgba(0,0,0,0.45),0 0 10px rgba(0,0,0,0.25);cursor:pointer;-webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent;
  opacity:0.94;transition:opacity var(--fd-dur-2) var(--fd-ease-out),color 0.2s ease,transform var(--fd-dur-3) var(--fd-spring)}
.fd-gtab-tab:hover{opacity:1}
.fd-gtab-tab:active{transform:scale(0.96);transition-duration:var(--fd-dur-1)}
.fd-gtab-lbl{display:block;margin:0;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.fd-gtab-tab:focus-visible{outline:2px solid color-mix(in srgb,var(--fd-gtab-accent) 70%,transparent);outline-offset:2px}
.fd-gtab.fd-gtab--light .fd-gtab-tab,.fd-gtab.fd-gtab--light .fd-gtab-lbl,.fd-gtab.fd-gtab--light .fd-gtab-roll>span{font-weight:700 !important;font-synthesis-weight:auto !important}
.fd-gtab.fd-gtab--light .fd-gtab-tab{color:#121110 !important;opacity:1 !important;text-shadow:none !important}
.fd-gtab.fd-gtab--light .fd-gtab-tab:hover{color:#000000 !important;opacity:1 !important}

/* the accent copy: only inside the lens – blue, glowing, slightly magnified */
.fd-gtab-accent{position:absolute;inset:0;z-index:2;pointer-events:none;clip-path:inset(0 100% 0 0)}
.fd-gtab-accent-row{display:flex;align-items:center;height:100%;padding:0 2px;transform:scale(1.07);will-change:transform}
.fd-gtab-tab--ghost{cursor:default;opacity:1;color:var(--fd-gtab-accent);
  text-shadow:0 0 12px color-mix(in srgb,var(--fd-gtab-accent) 55%,transparent),0 1px 1px rgba(0,0,0,0.25)}
.fd-gtab.fd-gtab--light .fd-gtab-tab--ghost{color:#0058cc !important;font-weight:700 !important;font-synthesis-weight:auto !important;text-shadow:none !important}
/* text roll on hover */
.fd-gtab-roll{display:grid;overflow:hidden;text-overflow:clip;padding:0.18em 0;margin:-0.18em 0}
.fd-gtab-roll>span{grid-area:1/1;white-space:nowrap;transition:transform 0.5s cubic-bezier(0.22,1,0.36,1)}
.fd-gtab-roll-b{transform:translateY(130%)}
.fd-gtab-tab.is-roll .fd-gtab-roll-a{transform:translateY(-130%)}
.fd-gtab-tab.is-roll .fd-gtab-roll-b{transform:translateY(0)}
@media (hover:none){.fd-gtab-tab.is-roll .fd-gtab-roll-a{transform:none}.fd-gtab-tab.is-roll .fd-gtab-roll-b{transform:translateY(130%)}}
@media (max-width:767px){
  .fd-gtab{--fd-gtab-h:42px}
  .fd-gtab-bar{max-width:calc(100vw - 24px)}
  .fd-gtab-tab{padding:0 7px}
  .fd-gtab .fd-gtab-tab,.fd-gtab .fd-gtab-lbl{font-size:9px;letter-spacing:0}
}
@media (min-width:768px) and (max-width:1023px){
  .fd-gtab-bar{max-width:min(560px,calc(100vw - 32px))}
  .fd-gtab-tab{padding:0 12px}
  .fd-gtab .fd-gtab-tab,.fd-gtab .fd-gtab-lbl{font-size:10.5px}
}
@media (min-width:1024px) and (max-width:1279px){
  .fd-gtab{--fd-gtab-h:38px}
  .fd-gtab-bar{max-width:580px}
  .fd-gtab-tab{padding:0 8.5px}
  .fd-gtab .fd-gtab-tab,.fd-gtab .fd-gtab-lbl{font-size:9.2px;letter-spacing:0.01em}
}
@media (prefers-reduced-motion: reduce){
  .fd-gtab-roll>span{transition:none}
  .fd-gtab-bar,.fd-gtab-tab{transition-duration:0ms}
  .fd-gtab-tab:active{transform:none}
}
`;
