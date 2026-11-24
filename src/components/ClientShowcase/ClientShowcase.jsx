// Purpose: Implement the ClientShowcase components module, keeping this responsibility separate for maintainability.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollRect } from "@/lib/scroll";
import { Pointer } from "lucide-react";
import ClientBackground from "./ClientBackground";
import "./ClientShowcase.css";

/* ------------------------------------------------------------------ *
 *  CLIENTS – 7 real logos (public/clients/*.webp) + 5 real clients shown as
 *  text wordmarks until their logo files are added.
 *  To swap a wordmark later: replace `sample` with `src: "/clients/xyz.webp"`.
 *  hoverBg : circle colour when hovered / held (default white)
 *  glow    : colour of the light that blooms around the ball
 *  w / h   : logo size inside the ball, in % (optional)
 * ------------------------------------------------------------------ */
const CLIENTS = [
  { name: "Climate Changers", src: "/clients/climate.webp", glow: "#3f63c9", w: 74, h: 30 },
  { name: "Eumaxindia", sample: { text: "Eumaxindia", color: "#0B6FB8", size: 30 }, glow: "#3b9be0" },
  { name: "Shaya", src: "/clients/shaya.webp", glow: "#c42f45", w: 52, h: 58 },
  { name: "Icon Legal Services", sample: { text: "Icon Legal", color: "#7a4a1f", size: 31 }, glow: "#c98a4b" },
  { name: "Icon Gift Box", src: "/clients/icongift.webp", glow: "#f2b632", w: 76, h: 40 },
  { name: "Icon Media Entertainment", sample: { text: "Icon Media", color: "#6d28d9", size: 30 }, glow: "#8b5cf6" },
  { name: "Mani Mathew", src: "/clients/manimathew.webp", glow: "#1d8fa8", w: 58, h: 52 },
  { name: "Star Sea Food", sample: { text: "Star Sea Food", color: "#0f766e", size: 25 }, glow: "#14b8a6" },
  { name: "KingMakers IAS Academy", src: "/clients/kingmakers.webp", glow: "#1d3f9a", w: 76, h: 34 },
  { name: "NiloDesigners", sample: { text: "NiloDesigners", color: "#1e3a8a", size: 24 }, glow: "#3b82f6" },
  { name: "SSI TMT Bars", src: "/clients/ssi.webp", glow: "#f26f21", hoverBg: "#1a1a1a", w: 70, h: 46 },
  { name: "Anil Foods", src: "/clients/anil.webp", glow: "#f9a21f", w: 54, h: 60 },
];

/* ---- physics tuning ---- */
const GRAVITY = 2300; // px / s²
const BOUNCE_WALL = 0.42;
const BOUNCE_BALL = 0.5;
const MAX_THROW = 3200; // px / s
const SUB = 3; // sub-steps per frame
const ITER = 4; // collision passes per sub-step

function Logo({ client, mode }) {
  if (client.src) {
    return <img className={`cs-logo cs-logo-${mode}`} src={client.src} alt="" draggable={false} loading="lazy" decoding="async" />;
  }
  const { text, color, multi, size = 42 } = client.sample;
  const fill = mode === "white" ? "#fff" : color;
  return (
    <svg className={`cs-logo cs-logo-${mode} cs-sample`} viewBox="0 0 200 64" aria-hidden="true">
      <text
        x="100"
        y="44"
        textAnchor="middle"
        fontFamily="'Michroma', 'Eurostile', 'Arial Black', sans-serif"
        fontWeight="700"
        fontSize={size}
        letterSpacing="-1"
        fill={fill}
      >
        {multi && mode === "color"
          ? text.split("").map((ch, i) => (
              <tspan key={i} fill={multi[i % multi.length]}>
                {ch}
              </tspan>
            ))
          : text}
      </text>
    </svg>
  );
}

export default function ClientShowcase() {
  const sectionRef = useRef(null);
  const arenaRef = useRef(null);
  const ballRefs = useRef([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const arena = arenaRef.current;
    const section = sectionRef.current;
    if (!arena || !section) return;

    const N = CLIENTS.length;
    const balls = CLIENTS.map(() => ({ x: 0, y: -9999, vx: 0, vy: 0, wait: 0, live: false, held: false }));
    let W = arena.clientWidth;
    let H = arena.clientHeight;
    let R = 60;
    let rained = false;
    let running = false;
    let raf = 0;
    let last = 0;
    let drag = null; // { i, id, ox, oy, tx, ty }

    const radiusFor = (w) => Math.max(40, Math.min(74, w / 15.5));

    const place = (b, i) => {
      const el = ballRefs.current[i];
      if (!el) return;
      el.style.transform = `translate3d(${b.x - R}px, ${b.y - R}px, 0)`;
      el.style.visibility = b.live ? "visible" : "hidden";
    };
    const placeAll = () => balls.forEach(place);

    const sizeBalls = () => {
      ballRefs.current.forEach((el) => {
        if (el) {
          el.style.width = el.style.height = `${R * 2}px`;
        }
      });
    };

    const measure = () => {
      W = arena.clientWidth;
      H = arena.clientHeight;
      R = radiusFor(W);
      sizeBalls();
      balls.forEach((b) => {
        if (!b.live) return;
        b.x = Math.min(Math.max(b.x, R), W - R);
        b.y = Math.min(b.y, H - R);
      });
      placeAll();
    };

    /* ---------- the rain ---------- */
    const startRain = (instant) => {
      rained = true;
      balls.forEach((b, i) => {
        const slot = ((i * 0.61803) % 1) * (W - 2 * R) + R; // spread across the width
        b.x = slot + (Math.random() - 0.5) * R * 0.5;
        b.y = -R - Math.random() * 40;
        b.vx = (Math.random() - 0.5) * 140;
        b.vy = 260 + Math.random() * 240;
        b.wait = instant ? 0 : 0.1 + i * 0.09 + Math.random() * 0.05;
        b.live = !!instant;
        b.held = false;
      });
      if (instant) {
        for (let k = 0; k < 420; k++) step(1 / 120);
        balls.forEach((b) => ((b.vx = 0), (b.vy = 0)));
      }
      placeAll();
    };
    const resetRain = () => {
      rained = false;
      drag = null;
      balls.forEach((b) => {
        b.live = false;
        b.held = false;
        b.y = -9999;
      });
      ballRefs.current.forEach((el) => el && el.classList.remove("cs-held"));
      placeAll();
    };

    /* ---------- physics ---------- */
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
          const mvx = (nx - b.x) / dt;
          const mvy = (ny - b.y) / dt;
          b.vx += (mvx - b.vx) * 0.35;
          b.vy += (mvy - b.vy) * 0.35;
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
      }

      for (let it = 0; it < ITER; it++) {
        // balls vs balls
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
        // balls vs walls (no ceiling for the rain; a far one for throws)
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
            b.vx *= 0.992; // rolling friction on the floor
          }
          if (b.y < -H) {
            b.y = -H;
            if (b.vy < 0) b.vy = -b.vy * BOUNCE_WALL;
          }
        }
      }
    }

    /* ---------- title letters react to the cursor, like the background dots ---------- */
    const chars = [...arena.querySelectorAll(".cs-ch")].map((el) => ({ el, x: 0, y: 0 }));
    const mouse = { x: -9999, y: -9999 };
    const onTitleMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("pointermove", onTitleMove);

    const titleStep = () => {
      if (!section.classList.contains("cs-ready")) return;
      const RANGE = 150;
      // read every letter first, then write: interleaving them forced a style recalc per letter
      const rects = chars.map((c) => c.el.getBoundingClientRect());
      chars.forEach((c, ci) => {
        const r = rects[ci];
        const cx = r.left + r.width / 2 - c.x;
        const cy = r.top + r.height / 2 - c.y;
        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = d < RANGE ? 1 - d / RANGE : 0;
        c.x += ((dx / d) * f * 20 - c.x) * 0.14;
        c.y += ((dy / d) * f * 20 - c.y) * 0.14;
        c.el.style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)`;
        c.el.style.setProperty("--g", f.toFixed(3));
      });
    };

    /* ---------- frame loop ---------- */
    const frame = (t) => {
      if (!running) return;
      const dtFrame = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      for (let s = 0; s < SUB; s++) step(dtFrame / SUB);
      titleStep();
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

    /* ---------- pointer (hold, drag, throw) ---------- */
    const local = (e) => {
      const r = arena.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const clampTarget = (p) => {
      if (!drag) return;
      drag.tx = Math.min(Math.max(p.x - drag.ox, R), W - R);
      drag.ty = Math.min(Math.max(p.y - drag.oy, -H * 0.5), H - R);
    };
    const onDown = (e) => {
      const el = e.target.closest?.(".cs-ball");
      if (!el) return;
      const i = ballRefs.current.indexOf(el);
      const b = balls[i];
      if (i < 0 || !b || !b.live) return;
      e.preventDefault();
      const p = local(e);
      drag = { i, id: e.pointerId, ox: p.x - b.x, oy: p.y - b.y, tx: b.x, ty: b.y, sx: e.clientX, sy: e.clientY, t: performance.now() };
      b.held = true;
      b.vx = b.vy = 0;
      el.classList.add("cs-held");
      el.style.zIndex = 5;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      run();
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      clampTarget(local(e));
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const el = ballRefs.current[drag.i];
      balls[drag.i].held = false;
      // a quick tap (no drag) switches the ball's light on / off and keeps it lit
      const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
      if (el && e.type === "pointerup" && moved < 10 && performance.now() - drag.t < 450) {
        const on = !el.classList.contains("cs-lit");
        ballRefs.current.forEach((b) => b && b.classList.remove("cs-lit"));
        if (on) el.classList.add("cs-lit");
      }
      if (el) {
        el.classList.remove("cs-held");
        el.style.zIndex = "";
      }
      drag = null;
    };
    arena.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    /* ---------- scroll driver ----------
       - colour: white until the section is halfway up, fully black at the top
       - ENTER (top ≤ 55% of the screen): title rises + balls rain, straight away
       - RESET (section fully below the screen again): everything resets, so it replays next time */
    let readyTimer = 0;
    const unsubColor = onFrame(() => {
      const r = scrollRect(section);
      const vh = window.innerHeight;

      const start = vh * 0.45;
      const p = Math.min(1, Math.max(0, (start - r.top) / start));
      section.style.setProperty("--cs-p", p.toFixed(3));

      if (!rained && r.top <= vh * 0.55 && r.bottom > 0) {
        section.classList.add("cs-in");
        clearTimeout(readyTimer);
        readyTimer = setTimeout(() => section.classList.add("cs-ready"), 1400);
        measure();
        startRain(reduced);
        run();
      } else if (rained && (r.top >= vh * 0.98 || r.bottom <= 0)) {
        section.classList.remove("cs-in");
        clearTimeout(readyTimer);
        section.classList.remove("cs-ready");
        resetRain();
      }
    });

    // only run the physics while the section is on screen
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) run();
      else stop();
    });
    io.observe(section);

    const ro = new ResizeObserver(measure);
    ro.observe(arena);
    measure();
    placeAll();

    return () => {
      stop();
      unsubColor();
      io.disconnect();
      ro.disconnect();
      clearTimeout(readyTimer);
      arena.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", onTitleMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [reduced]);

  return (
    <section ref={sectionRef} id="client-showcase" className="cs-section" aria-label="Our valuable clients">
      <div className="cs-bezel">
        <div ref={arenaRef} className="cs-arena">
          <ClientBackground />

          <div className="cs-title">
          <h2 className="cs-heading" aria-label="Brands connected to our growth network">
            {["Brands", "connected", "to", "our", "growth", "network"].map((w, i) => (
              <span key={`${w}-${i}`} aria-hidden="true">
                <span className="cs-word">
                  <span className="cs-rise" style={{ "--d": `${0.05 + i * 0.12}s` }}>
                    {[...w].map((ch, k) => (
                      <span key={k} className="cs-ch">
                        {ch}
                      </span>
                    ))}
                  </span>
                </span>{" "}
                {i === 2 && <br />}
              </span>
            ))}
          </h2>
          {/* Act II · neural brand network: the mesh is the shared intelligence graph */}
          <p className="cs-sub cs-sub-full">
            From Chennai heritage leaders like Anil Foods, SSI TMT Bars and KingMakers IAS Academy to
            high-growth digital challengers — every campaign strengthens our collective AI intelligence.
          </p>
          {/* phones: shorter copy */}
          <p className="cs-sub cs-sub-short">
            Chennai leaders to digital challengers. Every campaign makes our AI sharper.
          </p>
          </div>

          {/* touch screens: how to play with the balls (top of the section, above the title) */}
          <p className="cs-hint">
            <Pointer className="cs-hint-hand" size={14} strokeWidth={2} aria-hidden="true" />
            Tap a ball to light it up
          </p>

          {CLIENTS.map((c, i) => (
            <div
              key={c.name}
              ref={(el) => (ballRefs.current[i] = el)}
              className="cs-ball"
              role="img"
              aria-label={c.name}
              style={{
                "--glow": c.glow,
                "--hover-bg": c.hoverBg || "#ffffff",
                "--lw": `${c.w || 66}%`,
                "--lh": `${c.h || 34}%`,
              }}
            >
              <div className="cs-face">
                <span className="cs-logo-box">
                  <Logo client={c} mode="white" />
                  <Logo client={c} mode="color" />
                </span>
                <span className="cs-light" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}