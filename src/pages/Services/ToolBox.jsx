// Purpose: "Tools we use" on a service page: a dark box the tool logos drop into as balls. Logos are white;
// hover / touch a ball and it lights up in the tool's real colours with a glow, and the caption says what
// we use it for. Balls can be grabbed and thrown, and "Drop again" re-runs the rain.
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Hand } from "lucide-react";
import { toolLogo } from "./toolLogos";
import "./toolbox.css";

/* physics tuning (same feel as the home page's client balls) */
const GRAVITY = 2300;
const BOUNCE_WALL = 0.45;
const BOUNCE_BALL = 0.5;
const MAX_THROW = 3000;
const SUB = 3;
const ITER = 4;

function Mark({ logo, color }) {
  if (logo.path) {
    return (
      <svg viewBox="0 0 24 24" className="tb-mark" aria-hidden="true">
        <path d={logo.path} fill={color} />
      </svg>
    );
  }
  // tools without an official mark: a neutral two-letter badge
  return (
    <svg viewBox="0 0 24 24" className="tb-mark" aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="none" stroke={color} strokeWidth="1.6" />
      <text x="12" y="15.6" textAnchor="middle" fontSize="9.5" fill={color} style={{ fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif", fontWeight: 700 }}>
        {logo.mono}
      </text>
    </svg>
  );
}

export default function ToolBox({ service }) {
  const tools = service.tools;
  const boxRef = useRef(null);
  const arenaRef = useRef(null);
  const ballRefs = useRef([]);
  const api = useRef({ rain: () => {} });
  const [focus, setFocus] = useState(null); // tool shown in the caption
  const [tip, setTip] = useState(null); // tool name that follows the cursor

  useEffect(() => {
    const arena = arenaRef.current;
    const box = boxRef.current;
    if (!arena || !box) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const N = tools.length;
    const balls = tools.map(() => ({ x: 0, y: -9999, vx: 0, vy: 0, wait: 0, live: false, held: false, inside: false }));
    let W = arena.clientWidth;
    let H = arena.clientHeight;
    let R = 48;
    let rained = false;
    let running = false;
    let raf = 0;
    let last = 0;
    let drag = null;
    let litTimer = 0;

    // ball size follows the box width: about 6 balls fit across
    const radiusFor = (w) => Math.max(22, Math.min(40, w / 12.5));
    const place = (b, i) => {
      const el = ballRefs.current[i];
      if (!el) return;
      el.style.transform = `translate3d(${(b.x - R).toFixed(1)}px, ${(b.y - R).toFixed(1)}px, 0)`;
      el.style.visibility = b.live ? "visible" : "hidden";
    };
    const placeAll = () => balls.forEach(place);
    const measure = () => {
      W = arena.clientWidth;
      H = arena.clientHeight;
      R = radiusFor(W);
      ballRefs.current.forEach((el) => el && (el.style.width = el.style.height = `${R * 2}px`));
      balls.forEach((b) => {
        if (!b.live) return;
        b.x = Math.min(Math.max(b.x, R), W - R);
        b.y = Math.min(b.y, H - R);
      });
      placeAll();
    };

    function step(dt) {
      for (let i = 0; i < N; i++) {
        const b = balls[i];
        if (!b.live) {
          if (rained && b.wait > 0) {
            b.wait -= dt;
            if (b.wait <= 0) {
              b.live = true;
              b.y = -R - Math.random() * 30;
            }
          }
          continue;
        }
        if (b.held && drag) {
          const nx = b.x + (drag.tx - b.x) * Math.min(1, dt * 38);
          const ny = b.y + (drag.ty - b.y) * Math.min(1, dt * 38);
          b.vx += ((nx - b.x) / dt - b.vx) * 0.35;
          b.vy += ((ny - b.y) / dt - b.vy) * 0.35;
          b.x = nx;
          b.y = ny;
        } else {
          b.vy += GRAVITY * dt;
          b.vx *= 0.9994;
          b.vy *= 0.9994;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
        }
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_THROW) {
          b.vx *= MAX_THROW / sp;
          b.vy *= MAX_THROW / sp;
        }
        if (b.y > R) b.inside = true;
      }
      for (let it = 0; it < ITER; it++) {
        for (let i = 0; i < N; i++) {
          const a = balls[i];
          if (!a.live) continue;
          for (let j = i + 1; j < N; j++) {
            const c = balls[j];
            if (!c.live) continue;
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const min = R * 2;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2) || 0.0001;
            const nx = dx / d;
            const ny = dy / d;
            const ia = a.held ? 0 : 1;
            const ic = c.held ? 0 : 1;
            const tot = ia + ic;
            if (!tot) continue;
            const over = min - d;
            a.x -= nx * over * (ia / tot);
            a.y -= ny * over * (ia / tot);
            c.x += nx * over * (ic / tot);
            c.y += ny * over * (ic / tot);
            const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
            if (vn < 0) {
              const jn = (-(1 + BOUNCE_BALL) * vn) / tot;
              a.vx -= jn * ia * nx;
              a.vy -= jn * ia * ny;
              c.vx += jn * ic * nx;
              c.vy += jn * ic * ny;
            }
          }
        }
        for (let i = 0; i < N; i++) {
          const b = balls[i];
          if (!b.live) continue;
          if (b.x < R) {
            b.x = R;
            if (b.vx < 0) b.vx = -b.vx * BOUNCE_WALL;
          } else if (b.x > W - R) {
            b.x = W - R;
            if (b.vx > 0) b.vx = -b.vx * BOUNCE_WALL;
          }
          if (b.y > H - R) {
            b.y = H - R;
            if (b.vy > 0) b.vy = Math.abs(b.vy) < 90 ? 0 : -b.vy * BOUNCE_WALL;
            b.vx *= 0.992;
          }
          // it's a box: once a ball is in, the lid keeps it in
          if (b.inside && b.y < R) {
            b.y = R;
            if (b.vy < 0) b.vy = -b.vy * BOUNCE_WALL;
          }
        }
      }
    }

    const frame = (t) => {
      if (!running) return;
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      for (let s = 0; s < SUB; s++) step(dt / SUB);
      placeAll();
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const rain = (instant = reduced) => {
      measure();
      rained = true;
      balls.forEach((b, i) => {
        b.x = ((i * 0.61803 + 0.1) % 1) * (W - 2 * R) + R;
        b.y = -R - Math.random() * 40;
        b.vx = (Math.random() - 0.5) * 160;
        b.vy = 220 + Math.random() * 220;
        b.wait = instant ? 0 : 0.05 + i * 0.11 + Math.random() * 0.05;
        b.live = !!instant;
        b.held = false;
        b.inside = false;
      });
      if (instant) {
        for (let k = 0; k < 480; k++) step(1 / 120);
        balls.forEach((b) => ((b.vx = 0), (b.vy = 0)));
      }
      placeAll();
      run();
    };
    api.current.rain = () => rain(false);

    /* hold, drag, throw */
    const local = (e) => {
      const r = arena.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const light = (i, on) => {
      const el = ballRefs.current[i];
      if (el) el.classList.toggle("tb-lit", on);
    };
    const onDown = (e) => {
      const el = e.target.closest?.(".tb-ball");
      if (!el) return;
      const i = ballRefs.current.indexOf(el);
      const b = balls[i];
      if (i < 0 || !b || !b.live) return;
      e.preventDefault();
      const p = local(e);
      drag = { i, id: e.pointerId, ox: p.x - b.x, oy: p.y - b.y, tx: b.x, ty: b.y };
      b.held = true;
      b.vx = b.vy = 0;
      el.classList.add("tb-held");
      clearTimeout(litTimer);
      ballRefs.current.forEach((_, k) => light(k, k === i));
      setFocus(tools[i]);
      setTip(tools[i]);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      run();
    };
    const onMove = (e) => {
      // spotlight that follows the pointer inside the box
      const r = box.getBoundingClientRect();
      box.style.setProperty("--mx", `${e.clientX - r.left}px`);
      box.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (!drag || e.pointerId !== drag.id) return;
      const p = local(e);
      drag.tx = Math.min(Math.max(p.x - drag.ox, R), W - R);
      drag.ty = Math.min(Math.max(p.y - drag.oy, R), H - R);
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const i = drag.i;
      balls[i].held = false;
      const el = ballRefs.current[i];
      el?.classList.remove("tb-held");
      if (e.pointerType === "mouse" && el && !el.matches(":hover")) setTip(null);
      drag = null;
      // on touch the colours stay a moment after letting go
      litTimer = setTimeout(() => {
        light(i, false);
        if (e.pointerType !== "mouse") setTip(null);
      }, e.pointerType === "mouse" ? 0 : 1600);
    };
    arena.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    // rain when the box comes into view; only simulate while it is visible
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!rained && entry.intersectionRatio >= 0.3) rain();
          else if (rained) run();
        } else stop();
      },
      { threshold: [0, 0.3] }
    );
    io.observe(box);
    const ro = new ResizeObserver(measure);
    ro.observe(arena);
    measure();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(litTimer);
      arena.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [tools]);

  const cur = focus ? toolLogo(focus) : null;

  return (
    <section
      ref={boxRef}
      className="tb"
      style={{ "--c": service.color }}
      aria-labelledby={`tb-title-${service.slug}`}
      data-text-fade="off"
    >
      <div className="tb-top">
        <span className="tb-count">
          <Hand size={13} strokeWidth={2} aria-hidden="true" /> {tools.length} tools · grab &amp; throw
        </span>
        <button type="button" className="tb-again" onClick={() => api.current.rain()}>
          <RotateCcw size={13} /> Drop again
        </button>
      </div>

      <div ref={arenaRef} className="tb-arena">
        <div className="tb-floor" aria-hidden="true" />
        {tools.map((t, i) => {
          const logo = toolLogo(t);
          return (
            <div
              key={t}
              ref={(el) => (ballRefs.current[i] = el)}
              className="tb-ball"
              role="img"
              aria-label={`${t}${logo.use ? ` – ${logo.use}` : ""}`}
              style={{ "--hex": logo.hex, "--glow": logo.glow }}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                setFocus(t);
                setTip(t);
              }}
              onPointerLeave={(e) => e.pointerType === "mouse" && !e.currentTarget.classList.contains("tb-held") && setTip(null)}
            >
              <span className="tb-face">
                <span className="tb-logo tb-white">
                  <Mark logo={logo} color="#ffffff" />
                </span>
                <span className="tb-logo tb-color">
                  <Mark logo={logo} color={logo.hex} />
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* the hovered tool's name, following the cursor */}
      <div className={`tb-tip${tip ? " is-on" : ""}`} aria-hidden="true">
        {tip && (
          <span key={tip} className="tb-tip-in">
            <i style={{ background: toolLogo(tip).hex === "#000000" ? "#fff" : toolLogo(tip).hex }} />
            {tip}
          </span>
        )}
      </div>

      {/* caption: what the touched tool is for */}
      <p className="tb-caption" aria-live="polite">
        {cur ? (
          <span key={focus} className="tb-cap-in">
            <i style={{ background: cur.hex === "#000000" ? "#fff" : cur.hex }} />
            <b>{focus}</b>
            {cur.use && <span> — {cur.use}</span>}
          </span>
        ) : (
          <span className="tb-cap-in tb-cap-hint">Hover or tap a tool to see what we use it for</span>
        )}
      </p>
    </section>
  );
}
