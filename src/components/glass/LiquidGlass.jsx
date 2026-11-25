// Purpose: Implement the LiquidGlass components module, keeping this responsibility separate for maintainability.
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/* ───────────────────────── environment ───────────────────────── */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const SSR_ENV = { refraction: false, reducedMotion: false, reducedTransparency: false };

function detectChromium() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator;
  const brands = nav.userAgentData?.brands?.map((b) => b.brand).join(" ") ?? "";
  if (/Chromium|Google Chrome|Microsoft Edge|Opera|Brave/i.test(brands)) return true;
  const ua = nav.userAgent || "";
  return /\b(Chrome|Chromium|HeadlessChrome)\/\d/.test(ua) && !/Firefox|FxiOS/.test(ua);
}

/** Runtime capabilities. SSR-safe: everything is false until mounted. */
export function useGlassEnv() {
  const [env, setEnv] = useState(SSR_ENV);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mm = (q) => window.matchMedia(q);
    const rm = mm("(prefers-reduced-motion: reduce)");
    const rt = mm("(prefers-reduced-transparency: reduce)");
    const hc = mm("(prefers-contrast: more)");
    const read = () => {
      const isMobileOrTouch =
        window.innerWidth < 1024 || window.matchMedia("(pointer: coarse)").matches;
      setEnv({
        refraction: !isMobileOrTouch && detectChromium() && !rt.matches && !hc.matches,
        reducedMotion: rm.matches,
        reducedTransparency: rt.matches || hc.matches,
      });
    };
    read();
    [rm, rt, hc].forEach((q) => q.addEventListener?.("change", read));
    return () => [rm, rt, hc].forEach((q) => q.removeEventListener?.("change", read));
  }, []);
  return env;
}

export function useReducedMotion() {
  return useGlassEnv().reducedMotion;
}

/* ───────────────────────── physics ───────────────────────── */

/** Semi-implicit Euler spring integrated in rAF. Drives transforms through `onUpdate`. */
export class Spring {
  constructor(value, onUpdate, cfg = {}) {
    this.value = this.target = value;
    this.onUpdate = onUpdate;
    this.velocity = 0;
    this.stiffness = cfg.stiffness ?? 380;
    this.damping = cfg.damping ?? 30;
    this.mass = cfg.mass ?? 1;
    this.precision = cfg.precision ?? 0.001;
    this.raf = 0;
    this.last = 0;
  }

  /** Animate to `target`, optionally injecting a velocity (units/s). */
  to(target, velocity) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
    if (!this.raf && typeof requestAnimationFrame !== "undefined") {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** Jump without animating. */
  set(v) {
    this.stop();
    this.value = this.target = v;
    this.velocity = 0;
    this.onUpdate(v, this);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  get active() {
    return this.raf !== 0;
  }

  tick = (now) => {
    const dt = Math.min(Math.max((now - this.last) / 1000, 0), 1 / 30);
    this.last = now;
    const steps = 4;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const f = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      this.velocity += (f / this.mass) * h;
      this.value += this.velocity * h;
    }
    const p = this.precision;
    if (Math.abs(this.velocity) < p * 10 && Math.abs(this.value - this.target) < p) {
      this.value = this.target;
      this.velocity = 0;
      this.raf = 0;
      this.onUpdate(this.value, this);
      return;
    }
    this.onUpdate(this.value, this);
    this.raf = requestAnimationFrame(this.tick);
  };
}

/** A stable Spring for the component's lifetime. */
export function useSpring(initial, onUpdate, cfg) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const ref = useRef(null);
  if (!ref.current) ref.current = new Spring(initial, (v) => cb.current(v), cfg);
  useEffect(() => () => ref.current?.stop(), []);
  return ref.current;
}

/** Area-preserving stretch along a velocity vector (px/s). */
export function stretchTransform(vx, vy, gain = 0.00018, max = 0.32) {
  const speed = Math.hypot(vx, vy);
  if (speed < 1) return "";
  const a = Math.atan2(vy, vx);
  const s = 1 + Math.min(max, speed * gain);
  return `rotate(${a}rad) scale(${s}, ${1 / s}) rotate(${-a}rad)`;
}

/** Tracks pointer velocity (px/s) over the last ~80ms. */
export function createVelocityTracker() {
  let samples = [];
  return {
    reset() {
      samples = [];
    },
    push(x, y, t = performance.now()) {
      samples.push({ x, y, t });
      while (samples.length > 2 && t - samples[0].t > 80) samples.shift();
    },
    get() {
      if (samples.length < 2) return { vx: 0, vy: 0 };
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = Math.max((b.t - a.t) / 1000, 1 / 240);
      return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    },
  };
}

/* ───────────────────────── optics: displacement + specular maps ───────────────────────── */

const LUT_N = 512;
let LUT = null;

/** Convex squircle bevel, t: 0 at the rim → 1 where the slab becomes flat. */
const surface = (t) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);
const surfaceSlope = (t) => {
  const tt = Math.min(Math.max(t, 1e-4), 1);
  return Math.pow(1 - tt, 3) * Math.pow(1 - Math.pow(1 - tt, 4), -0.75);
};

function lut() {
  if (LUT) return LUT;
  const disp = new Float32Array(LUT_N);
  const nxy = new Float32Array(LUT_N);
  const nz = new Float32Array(LUT_N);
  const IOR = 1.5;
  let max = 0;
  for (let i = 0; i < LUT_N; i++) {
    const t = i / (LUT_N - 1);
    const s = surfaceSlope(t);
    const theta = Math.atan(s);
    const refr = Math.asin(Math.sin(theta) / IOR);
    const thickness = 0.55 + surface(t);
    const d = Math.tan(theta - refr) * thickness;
    disp[i] = d;
    max = Math.max(max, d);
    const l = Math.hypot(s, 1);
    nxy[i] = s / l;
    nz[i] = 1 / l;
  }
  for (let i = 0; i < LUT_N; i++) disp[i] /= max;
  LUT = { disp, nxy, nz };
  return LUT;
}

const sample = (arr, t) => {
  const f = Math.min(Math.max(t, 0), 1) * (LUT_N - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, LUT_N - 1);
  return arr[i] + (arr[j] - arr[i]) * (f - i);
};

let canvas = null;

/**
 * Builds the displacement map (R,G = dx,dy around 128) and the specular rim
 * image for a w×h rounded rect. Returns data URLs.
 */
export function renderGlassMaps(w, h, radius, bezel, dpr = 1, draft = false) {
  if (typeof document === "undefined") return null;
  const L = lut();
  if (!canvas) canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const rn = Math.min(Math.max(r, bezel), hw, hh);

  const build = (scale, kind) => {
    const mw = Math.max(2, Math.round(w * scale));
    const mh = Math.max(2, Math.round(h * scale));
    canvas.width = mw;
    canvas.height = mh;
    const img = ctx.createImageData(mw, mh);
    const data = img.data;
    const l1x = -0.5, l1y = -0.72, l1z = 0.48;
    const l2x = 0.55, l2y = 0.7, l2z = 0.45;
    for (let j = 0; j < mh; j++) {
      const py = (j + 0.5) / scale - hh;
      const ay = Math.abs(py);
      for (let i = 0; i < mw; i++) {
        const px = (i + 0.5) / scale - hw;
        const ax = Math.abs(px);
        const o = (j * mw + i) * 4;
        const qx = ax - hw + r;
        const qy = ay - hh + r;
        const dist = qx > 0 && qy > 0 ? Math.hypot(qx, qy) - r : Math.max(qx, qy) - r;
        const inside = -dist;
        if (kind === "disp") {
          data[o + 2] = 128;
          data[o + 3] = 255;
        }
        if (inside <= 0 || inside >= bezel) {
          if (kind === "disp") {
            data[o] = 128;
            data[o + 1] = 128;
          }
          continue;
        }
        const t = inside / bezel;
        const nx0 = ax - hw + rn;
        const ny0 = ay - hh + rn;
        let nx, ny;
        if (nx0 > 0 && ny0 > 0) {
          const l = Math.hypot(nx0, ny0);
          nx = nx0 / l;
          ny = ny0 / l;
        } else if (nx0 > ny0) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
        if (px < 0) nx = -nx;
        if (py < 0) ny = -ny;
        if (kind === "disp") {
          const m = sample(L.disp, t);
          data[o] = Math.round(128 - nx * m * 127);
          data[o + 1] = Math.round(128 - ny * m * 127);
        } else {
          const sxy = sample(L.nxy, t);
          const sz = sample(L.nz, t);
          const Nx = nx * sxy, Ny = ny * sxy, Nz = sz;
          const d1 = Math.max(0, Nx * l1x + Ny * l1y + Nz * l1z);
          const d2 = Math.max(0, Nx * l2x + Ny * l2y + Nz * l2z);
          const rim = Math.pow(sxy, 7);
          const a = Math.min(1, 0.95 * Math.pow(d1, 5) * sxy + 0.42 * Math.pow(d2, 5) * sxy + 0.22 * rim);
          data[o] = 255;
          data[o + 1] = 255;
          data[o + 2] = 255;
          data[o + 3] = Math.round(a * 255);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const base = Math.min(1, (draft ? 300 : 520) / Math.max(w, h));
  const disp = build(base, "disp");
  const specScale = draft ? base : Math.min(Math.min(dpr, 2), 1100 / Math.max(w, h));
  const spec = build(specScale, "spec");
  return { disp, spec };
}

/* ───────────────────────── styles ───────────────────────── */

const ScopeCtx = createContext(false);

/** Renders the glass stylesheet once for every LiquidGlass inside it. */
export function GlassScope({ children }) {
  return (
    <ScopeCtx.Provider value={true}>
      <style>{GLASS_CSS}</style>
      {children}
    </ScopeCtx.Provider>
  );
}

/* ───────────────────────── component ───────────────────────── */

export const LiquidGlass = forwardRef(function LiquidGlass(
  {
    as: Tag = "div",
    variant = "regular",
    tone = "light",
    radius = "capsule",
    tint,
    dim = false,
    interactive = false,
    pressScale = 0.96,
    bezel,
    refraction = 1,
    dispersion = 0.05,
    blur,
    shadow = true,
    className,
    style,
    children,
    ...rest
  },
  ref
) {
  const scoped = useContext(ScopeCtx);
  const rawId = useId();
  const fid = "fd-lg-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const el = useRef(null);
  const specEl = useRef(null);
  const feImg = useRef(null);
  const dR = useRef(null);
  const dG = useRef(null);
  const dB = useRef(null);
  useImperativeHandle(ref, () => el.current);
  const env = useGlassEnv();

  const params = useRef({ radius, bezel, refraction, dispersion, refract: env.refraction });
  params.current = { radius, bezel, refraction, dispersion, refract: env.refraction };

  useIsoLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    let raf = 0;
    let timer = 0;
    let lastKey = "";
    const apply = (draft = false) => {
      raf = 0;
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      if (w < 4 || h < 4) return;
      const p = params.current;
      const rad =
        p.radius === "capsule"
          ? Math.min(w, h) / 2
          : Math.min(p.radius === "auto" ? parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0 : p.radius, w / 2, h / 2);
      const bz = Math.max(4, Math.min(p.bezel ?? Math.min(Math.max(Math.min(w, h) * 0.26, 6), 40), Math.min(w, h) / 2));
      const dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
      const key = [w, h, rad, bz, dpr].join(":");
      if (key !== lastKey) {
        const maps = renderGlassMaps(w, h, rad, bz, dpr, draft);
        if (!maps) return;
        if (!draft) lastKey = key;
        if (specEl.current) specEl.current.style.backgroundImage = `url("${maps.spec}")`;
        feImg.current?.setAttribute("href", maps.disp);
      }
      const scale = bz * 0.9 * p.refraction * 2;
      const disp = Math.min(Math.max(p.dispersion, 0), 0.3);
      if (dR.current) dR.current.setAttribute("scale", String(scale * (1 - disp)));
      if (dG.current) dG.current.setAttribute("scale", String(scale));
      if (dB.current) dB.current.setAttribute("scale", String(scale * (1 + disp)));
      if (p.refract) node.style.setProperty("--fd-lg-url", `url(#${fid})`);
      else node.style.removeProperty("--fd-lg-url");
    };

    let first = true;
    const onResize = () => {
      feImg.current?.setAttribute("width", String(node.offsetWidth));
      feImg.current?.setAttribute("height", String(node.offsetHeight));
      if (first) {
        first = false;
        return;
      }
      apply(true);
      if (typeof window !== "undefined") {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => apply(false));
        }, 120);
      }
    };

    onResize();
    apply(false);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(node);
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
      if (typeof window !== "undefined") window.clearTimeout(timer);
    };
  }, [fid, radius, bezel, refraction, dispersion, env.refraction]);

  const press = useSpring(1, (v) => el.current?.style.setProperty("--fd-lg-s", v.toFixed(4)), { stiffness: 520, damping: 22 });

  useEffect(() => {
    const node = el.current;
    if (!node || !interactive) return;
    const pos = (e) => {
      const r = node.getBoundingClientRect();
      const s = Number(node.style.getPropertyValue("--fd-lg-s")) || 1;
      node.style.setProperty("--fd-lg-mx", `${((e.clientX - r.left) / s).toFixed(1)}px`);
      node.style.setProperty("--fd-lg-my", `${((e.clientY - r.top) / s).toFixed(1)}px`);
    };
    const down = (e) => {
      if (node.disabled || node.getAttribute("aria-disabled") === "true") return;
      pos(e);
      node.classList.add("fd-lg--pressed");
      node.classList.remove("fd-lg--released");
      if (env.reducedMotion) return;
      press.stiffness = 900;
      press.damping = 48;
      press.to(pressScale);
    };
    const up = () => {
      if (!node.classList.contains("fd-lg--pressed")) return;
      node.classList.remove("fd-lg--pressed");
      node.classList.add("fd-lg--released");
      if (env.reducedMotion) return;
      press.stiffness = 420;
      press.damping = 14;
      press.to(1, (1 - pressScale) * 18);
    };
    const key = (e) => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      node.style.setProperty("--fd-lg-mx", "50%");
      node.style.setProperty("--fd-lg-my", "50%");
      node.classList.add("fd-lg--pressed");
      if (!env.reducedMotion) {
        press.stiffness = 900;
        press.damping = 48;
        press.to(pressScale);
      }
    };
    const keyUp = (e) => {
      if (e.key === " " || e.key === "Enter") up();
    };

    node.addEventListener("pointermove", pos);
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointerenter", pos);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    node.addEventListener("keydown", key);
    node.addEventListener("keyup", keyUp);
    node.addEventListener("blur", up);
    return () => {
      node.removeEventListener("pointermove", pos);
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointerenter", pos);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      node.removeEventListener("keydown", key);
      node.removeEventListener("keyup", keyUp);
      node.removeEventListener("blur", up);
    };
  }, [interactive, pressScale, env.reducedMotion, press]);

  const vars = {};
  if (radius !== "auto") vars["--fd-lg-r"] = radius === "capsule" ? "9999px" : `${radius}px`;
  if (blur !== undefined) vars["--fd-lg-blur"] = `${blur}px`;
  if (tint) vars["--fd-lg-tint"] = tint;

  const cls = [
    "fd-lg",
    `fd-lg--${variant}`,
    variant === "regular" ? `fd-lg--${tone}` : "fd-lg--dark",
    tint ? "fd-lg--tinted" : "",
    dim ? "fd-lg--dim" : "",
    interactive ? "fd-lg--interactive" : "",
    shadow ? "" : "fd-lg--flat",
    env.refraction ? "fd-lg--refract" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={el} className={cls} style={{ ...vars, ...style }} {...rest}>
      {!scoped && <style>{GLASS_CSS}</style>}
      <svg className="fd-lg-svg" aria-hidden="true" focusable="false" width="0" height="0">
        <filter id={fid} colorInterpolationFilters="sRGB">
          <feImage ref={feImg} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
          <feDisplacementMap ref={dR} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dr" />
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feDisplacementMap ref={dG} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dg" />
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
          <feDisplacementMap ref={dB} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="db" />
          <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
          <feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
          <feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
        </filter>
      </svg>
      <span className="fd-lg-layer fd-lg-fill" aria-hidden="true" />
      {dim && <span className="fd-lg-layer fd-lg-dimmer" aria-hidden="true" />}
      <span ref={specEl} className="fd-lg-layer fd-lg-spec" aria-hidden="true" />
      <span className="fd-lg-layer fd-lg-edge" aria-hidden="true" />
      {interactive && <span className="fd-lg-layer fd-lg-glow" aria-hidden="true" />}
      {children}
    </Tag>
  );
});

export const GLASS_CSS = `
.fd-lg{
  --fd-ease-out:cubic-bezier(0.22,1,0.36,1);--fd-ease-in-out:cubic-bezier(0.65,0,0.35,1);--fd-spring:cubic-bezier(0.34,1.56,0.64,1);
  --fd-dur-1:120ms;--fd-dur-2:240ms;--fd-dur-3:420ms;--fd-dur-4:700ms;
  --fd-lg-url:blur(0px);
  --fd-lg-blur:8px;--fd-lg-sat:1.8;--fd-lg-bright:1.06;--fd-lg-contrast:0.92;
  --fd-lg-fill:rgba(255,255,255,0.32);
  --fd-lg-fg:#0B0B0F;
  --fd-lg-edge-a:rgba(255,255,255,0.95);--fd-lg-edge-b:rgba(255,255,255,0.18);--fd-lg-edge-c:rgba(255,255,255,0.55);
  --fd-lg-shadow:0 12px 32px -10px rgba(10,10,20,0.28),0 2px 6px -1px rgba(10,10,20,0.10);
  --fd-lg-spec-o:0.9;
  isolation:isolate;box-sizing:border-box;margin:0;border:0;
  background:transparent;color:var(--fd-lg-fg);text-decoration:none;
  -webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent;
  -webkit-backdrop-filter:blur(var(--fd-lg-blur)) saturate(var(--fd-lg-sat)) brightness(var(--fd-lg-bright)) contrast(var(--fd-lg-contrast));
  backdrop-filter:var(--fd-lg-url) blur(var(--fd-lg-blur)) saturate(var(--fd-lg-sat)) brightness(var(--fd-lg-bright)) contrast(var(--fd-lg-contrast));
  box-shadow:var(--fd-lg-shadow);
}
:where(.fd-lg){position:relative;padding:0;border-radius:var(--fd-lg-r,0px);font:500 15px/1.25 "Michroma", "Eurostile", "Arial Black", sans-serif;letter-spacing:normal;text-align:center}
.fd-lg *,.fd-lg *::before,.fd-lg *::after{box-sizing:border-box}
.fd-lg--flat{--fd-lg-shadow:none}
.fd-lg--regular.fd-lg--dark{--fd-lg-fill:rgba(30,30,36,0.42);--fd-lg-fg:#FFFFFF;--fd-lg-bright:0.92;--fd-lg-edge-a:rgba(255,255,255,0.55);--fd-lg-edge-b:rgba(255,255,255,0.08);--fd-lg-edge-c:rgba(255,255,255,0.28);--fd-lg-spec-o:0.55;--fd-lg-shadow:0 14px 36px -12px rgba(0,0,0,0.6),0 2px 6px -1px rgba(0,0,0,0.3)}
.fd-lg--clear{--fd-lg-blur:0.5px;--fd-lg-sat:1.3;--fd-lg-bright:1.03;--fd-lg-contrast:1;--fd-lg-fill:rgba(255,255,255,0.05);--fd-lg-fg:#FFFFFF;--fd-lg-spec-o:1;--fd-lg-shadow:0 10px 30px -10px rgba(0,0,0,0.35),0 1px 3px rgba(0,0,0,0.12);text-shadow:0 1px 2px rgba(0,0,0,0.28)}
.fd-lg--clear:not(.fd-lg--refract){--fd-lg-blur:2.5px;--fd-lg-sat:1.5;--fd-lg-fill:rgba(255,255,255,0.12)}
.fd-lg--regular:not(.fd-lg--refract){--fd-lg-blur:16px}
.fd-lg--tinted{--fd-lg-fg:#FFFFFF;text-shadow:none}
.fd-lg--tinted.fd-lg--regular{--fd-lg-fill:color-mix(in srgb,var(--fd-lg-tint) 84%,transparent)}
.fd-lg--tinted.fd-lg--clear{--fd-lg-fill:color-mix(in srgb,var(--fd-lg-tint) 58%,transparent)}
.fd-lg-svg{position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;display:block;margin:0;padding:0;border:0}
.fd-lg-layer{position:absolute;inset:0;z-index:-1;display:block;margin:0;padding:0;border:0;border-radius:inherit;pointer-events:none;background:none}
.fd-lg-fill{background:var(--fd-lg-fill);box-shadow:inset 0 0 18px -6px rgba(255,255,255,0.22)}
.fd-lg-dimmer{background:rgba(0,0,0,0.35)}
.fd-lg-spec{background-size:100% 100%;background-repeat:no-repeat;opacity:var(--fd-lg-spec-o);transition:opacity var(--fd-dur-2) var(--fd-ease-out)}
.fd-lg-edge{padding:1px;background:linear-gradient(140deg,var(--fd-lg-edge-a),var(--fd-lg-edge-b) 34%,var(--fd-lg-edge-b) 62%,var(--fd-lg-edge-c));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.fd-lg--interactive{transform:var(--fd-lg-pre,translate(0,0)) scale(var(--fd-lg-s,1));cursor:pointer;touch-action:manipulation}
.fd-lg-glow{opacity:0;transition:opacity var(--fd-dur-3) var(--fd-ease-out);
  background:radial-gradient(circle at var(--fd-lg-mx,50%) var(--fd-lg-my,50%),rgba(255,255,255,0.55),rgba(255,255,255,0.14) 38%,transparent 70%);
  background-size:100% 100%;mix-blend-mode:plus-lighter}
.fd-lg--interactive:hover .fd-lg-glow{opacity:0.35}
.fd-lg--pressed .fd-lg-glow{opacity:1;transition-duration:var(--fd-dur-1)}
.fd-lg--released .fd-lg-glow{transition-duration:var(--fd-dur-4)}
.fd-lg:focus-visible{outline:2px solid color-mix(in srgb,#0A84FF 70%,transparent);outline-offset:2px}
.fd-lg[disabled],.fd-lg[aria-disabled="true"]{cursor:default}
@media (prefers-reduced-transparency: reduce){
  .fd-lg{-webkit-backdrop-filter:none;backdrop-filter:none;text-shadow:none}
  .fd-lg .fd-lg-fill{background:#ECECF0}
  .fd-lg--dark .fd-lg-fill{background:#2A2A31}
  .fd-lg--tinted .fd-lg-fill{background:var(--fd-lg-tint)}
  .fd-lg--regular.fd-lg--light:not(.fd-lg--tinted){--fd-lg-fg:#0B0B0F}
  .fd-lg-spec{opacity:0.25}
  .fd-lg-dimmer{display:none}
}
@media (prefers-contrast: more){
  .fd-lg{-webkit-backdrop-filter:none;backdrop-filter:none;text-shadow:none}
  .fd-lg .fd-lg-fill{background:#FFFFFF}
  .fd-lg--dark .fd-lg-fill{background:#000000}
  .fd-lg--tinted .fd-lg-fill{background:var(--fd-lg-tint)}
  .fd-lg--regular.fd-lg--light:not(.fd-lg--tinted){--fd-lg-fg:#000000}
  .fd-lg-spec,.fd-lg-dimmer{display:none}
  .fd-lg-edge{-webkit-mask:none;mask:none;background:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.75)}
  .fd-lg--dark .fd-lg-edge{box-shadow:inset 0 0 0 1px rgba(255,255,255,0.8)}
}
@media (prefers-reduced-motion: reduce){
  .fd-lg--interactive{transform:var(--fd-lg-pre,none)}
  .fd-lg-glow{transition-duration:var(--fd-dur-1)}
}
`;
