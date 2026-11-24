// Purpose: one animated "deep space" background for the overlay pages, so Blog, Career and Projects carry the
// same space story as the home page and the service rockets – each with its own twist:
//
//   variant="journal"   Blog      – drifting starfield + soft nebula; "ideas" streak across as shooting stars
//   variant="crew"      Career    – a living constellation: stars link up into a crew network, and the
//                                   cursor joins in (lines reach out to it). Blue to match the Career accent.
//   variant="orbit"     Projects  – a planet rising in the corner with mission orbits; satellites (our
//                                   launched projects) circle it, leaving faint trails
//
// Every variant: stars sit on 3 depths and move with the page scroll (parallax) and the pointer.
// Light theme (Career) swaps to navy ink at low alpha. Reduced motion: one still frame. Pauses when the tab
// is hidden. Pure canvas 2D, no dependencies; sized to its parent (put it as the first child of a
// position:relative / absolute container, behind the scroller).
import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

const PALETTE = {
  journal: { star: "235,242,255", accent: "120,170,255", neb: ["70,110,255", "150,90,255", "40,170,220"] },
  crew: { star: "232,242,255", accent: "10,132,255", neb: ["10,132,255", "80,120,255", "90,200,255"] },
  orbit: { star: "230,240,255", accent: "90,169,255", neb: ["50,110,230", "20,160,200", "120,90,240"] },
};

const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export default function SpaceBackdrop({ variant = "journal", scrollRef, theme = "dark", className = "", style }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;
    const g = canvas.getContext("2d");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pal = PALETTE[variant] || PALETTE.journal;
    const r = rng(variant.length * 977 + 13);

    const S = { w: 0, h: 0, dpr: 1 };
    let stars = [];
    let nodes = [];
    let nebula = null;
    let shooters = [];
    let nextShot = 1.2;
    let clock = 0;
    let last = 0;
    let raf = 0;
    const ptr = { x: 0.5, y: 0.4, sx: 0.5, sy: 0.4, px: -9999, py: -9999, in: false };

    const build = () => {
      const area = S.w * S.h;
      const n = Math.min(340, Math.round(area / 5200));
      stars = Array.from({ length: n }, () => {
        const z = r() < 0.6 ? 0.25 : r() < 0.75 ? 0.55 : 1; // three depths
        return { x: r(), y: r(), z, rad: (0.35 + r() * 0.9) * (0.6 + z * 0.7), tw: 0.5 + r() * 2.2, ph: r() * TAU, warm: r() < 0.15 };
      });
      if (variant === "crew") {
        const m = Math.min(95, Math.max(28, Math.round(area / 15000)));
        nodes = Array.from({ length: m }, () => ({
          x: r() * S.w,
          y: r() * S.h,
          vx: (r() - 0.5) * 9,
          vy: (r() - 0.5) * 9,
          rad: 1 + r() * 1.8,
          lead: r() < 0.14, // a few brighter "leads"
          ph: r() * TAU,
        }));
      }
      /* nebula: three soft colour clouds, rendered once at low resolution and scaled up */
      const nw = Math.max(64, Math.round(S.w / 4));
      const nh = Math.max(64, Math.round(S.h / 4));
      nebula = document.createElement("canvas");
      nebula.width = nw;
      nebula.height = nh;
      const ng = nebula.getContext("2d");
      const spots =
        variant === "orbit"
          ? [[0.85, 0.85, 0.7], [0.15, 0.1, 0.55], [0.55, 0.45, 0.35]]
          : variant === "crew"
            ? [[0.5, -0.05, 0.75], [0.1, 0.7, 0.5], [0.92, 0.55, 0.45]]
            : [[0.2, 0.15, 0.6], [0.85, 0.35, 0.5], [0.5, 0.95, 0.55]];
      spots.forEach(([x, y, rad], i) => {
        const R = Math.max(nw, nh) * rad;
        const grd = ng.createRadialGradient(x * nw, y * nh, 0, x * nw, y * nh, R);
        grd.addColorStop(0, `rgba(${pal.neb[i]},0.22)`);
        grd.addColorStop(0.5, `rgba(${pal.neb[i]},0.07)`);
        grd.addColorStop(1, `rgba(${pal.neb[i]},0)`);
        ng.fillStyle = grd;
        ng.fillRect(0, 0, nw, nh);
      });
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      S.w = w;
      S.h = h;
      S.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * S.dpr);
      canvas.height = Math.round(h * S.dpr);
      build();
      draw(0);
    };

    const scrollY = () => scrollRef?.current?.scrollTop || 0;

    /* ── layers ── */
    const drawStars = (light, sy, dx, dy) => {
      const ink = light ? "20,32,60" : pal.star;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const par = s.z;
        const y = ((((s.y * S.h - sy * 0.06 * par + dy * par + clock * 2.2 * par) % S.h) + S.h) % S.h);
        const x = ((((s.x * S.w + dx * par) % S.w) + S.w) % S.w);
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(clock * s.tw + s.ph);
        const a = (light ? 0.22 : 0.35 + 0.6 * par) * tw;
        g.fillStyle = `rgba(${s.warm && !light ? "255,214,170" : ink},${a.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, s.rad, 0, TAU);
        g.fill();
        if (par === 1 && !light && tw > 0.9) {
          // brightest near stars get a tiny cross glint
          g.fillStyle = `rgba(${ink},${((tw - 0.9) * 3).toFixed(3)})`;
          g.fillRect(x - s.rad * 4, y - 0.4, s.rad * 8, 0.8);
          g.fillRect(x - 0.4, y - s.rad * 4, 0.8, s.rad * 8);
        }
      }
    };

    const drawShooters = (dt) => {
      if (!reduced) {
        nextShot -= dt;
        if (nextShot <= 0) {
          nextShot = 2.4 + r() * 3.6;
          const fromLeft = r() < 0.5;
          shooters.push({ x: fromLeft ? r() * S.w * 0.5 : S.w * (0.5 + r() * 0.5), y: r() * S.h * 0.45, ang: fromLeft ? 0.38 + r() * 0.3 : Math.PI - 0.38 - r() * 0.3, len: 120 + r() * 160, life: 0, dur: 0.9 + r() * 0.6, sp: 520 + r() * 380 });
        }
      }
      shooters = shooters.filter((m) => m.life < m.dur);
      shooters.forEach((m) => {
        m.life += dt;
        const t = m.life / m.dur;
        const hx = m.x + Math.cos(m.ang) * m.sp * m.life;
        const hy = m.y + Math.sin(m.ang) * m.sp * m.life;
        const tx = hx - Math.cos(m.ang) * m.len;
        const ty = hy - Math.sin(m.ang) * m.len;
        const a = Math.sin(t * Math.PI);
        const grd = g.createLinearGradient(tx, ty, hx, hy);
        grd.addColorStop(0, `rgba(${pal.accent},0)`);
        grd.addColorStop(1, `rgba(255,255,255,${(0.85 * a).toFixed(3)})`);
        g.strokeStyle = grd;
        g.lineWidth = 1.4;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(hx, hy);
        g.stroke();
        g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        g.beginPath();
        g.arc(hx, hy, 1.6, 0, TAU);
        g.fill();
      });
    };

    const drawConstellation = (light, dt, sy) => {
      const D = Math.min(170, Math.max(110, S.w / 9));
      const ink = light ? "26,40,70" : pal.accent;
      const off = -sy * 0.12; // the network scrolls a little slower than the page
      nodes.forEach((n) => {
        if (!reduced) {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x < -20) n.x = S.w + 20;
          if (n.x > S.w + 20) n.x = -20;
          if (n.y < -20) n.y = S.h + 20;
          if (n.y > S.h + 20) n.y = -20;
        }
      });
      const Y = (n) => ((((n.y + off) % (S.h + 40)) + S.h + 40) % (S.h + 40)) - 20;
      g.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const ay = Y(a);
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = ay - Y(b);
          const d2 = dx * dx + dy * dy;
          if (d2 > D * D) continue;
          const al = (1 - Math.sqrt(d2) / D) * (light ? 0.22 : 0.32);
          g.strokeStyle = `rgba(${ink},${al.toFixed(3)})`;
          g.beginPath();
          g.moveTo(a.x, ay);
          g.lineTo(b.x, Y(b));
          g.stroke();
        }
        // the cursor joins the crew
        if (ptr.in) {
          const dx = a.x - ptr.px;
          const dy = ay - ptr.py;
          const d = Math.hypot(dx, dy);
          if (d < D * 1.35) {
            const al = (1 - d / (D * 1.35)) * (light ? 0.4 : 0.6);
            g.strokeStyle = `rgba(${ink},${al.toFixed(3)})`;
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(a.x, ay);
            g.lineTo(ptr.px, ptr.py);
            g.stroke();
            g.lineWidth = 0.8;
          }
        }
      }
      nodes.forEach((n) => {
        const y = Y(n);
        const pulse = reduced ? 1 : 0.7 + 0.3 * Math.sin(clock * 1.6 + n.ph);
        if (n.lead && !light) {
          const R = n.rad * 7;
          const grd = g.createRadialGradient(n.x, y, 0, n.x, y, R);
          grd.addColorStop(0, `rgba(${pal.accent},${(0.45 * pulse).toFixed(3)})`);
          grd.addColorStop(1, `rgba(${pal.accent},0)`);
          g.fillStyle = grd;
          g.beginPath();
          g.arc(n.x, y, R, 0, TAU);
          g.fill();
        }
        g.fillStyle = light ? `rgba(26,40,70,${(0.5 * pulse).toFixed(3)})` : n.lead ? `rgba(255,236,200,${pulse.toFixed(3)})` : `rgba(${pal.star},${(0.75 * pulse).toFixed(3)})`;
        g.beginPath();
        g.arc(n.x, y, n.rad, 0, TAU);
        g.fill();
      });
    };

    const drawOrbit = (sy, dx, dy) => {
      const R = Math.max(S.w, S.h) * 0.42;
      const cx = S.w * 0.95 + dx * 0.4;
      const cy = S.h * 1.08 + dy * 0.4 - Math.min(sy * 0.05, S.h * 0.08);
      /* orbits behind the planet (back halves) */
      const tilt = -0.2;
      const orbits = [
        { rx: R * 1.35, ry: R * 0.34, sp: 0.07, n: 2, col: "120,190,255" },
        { rx: R * 1.75, ry: R * 0.46, sp: -0.045, n: 3, col: "230,168,46" },
        { rx: R * 2.25, ry: R * 0.6, sp: 0.03, n: 2, col: "160,140,255" },
      ];
      const ell = (o, from, to) => {
        g.beginPath();
        g.ellipse(cx, cy, o.rx, o.ry, tilt, from, to);
        g.stroke();
      };
      g.setLineDash([2, 7]);
      g.lineWidth = 1;
      orbits.forEach((o) => {
        g.strokeStyle = `rgba(${o.col},0.16)`;
        ell(o, Math.PI, TAU);
      });
      g.setLineDash([]);
      /* the planet: dark disc, blue atmosphere rim lit from the top-left */
      const atm = g.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.18);
      atm.addColorStop(0, "rgba(90,169,255,0.35)");
      atm.addColorStop(0.35, "rgba(90,169,255,0.12)");
      atm.addColorStop(1, "rgba(90,169,255,0)");
      g.fillStyle = atm;
      g.beginPath();
      g.arc(cx, cy, R * 1.18, 0, TAU);
      g.fill();
      const body = g.createRadialGradient(cx - R * 0.45, cy - R * 0.55, R * 0.1, cx, cy, R);
      body.addColorStop(0, "#1b2f55");
      body.addColorStop(0.55, "#0c1426");
      body.addColorStop(1, "#05080f");
      g.fillStyle = body;
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.fill();
      // faint latitude bands
      g.save();
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.clip();
      g.strokeStyle = "rgba(140,190,255,0.06)";
      g.lineWidth = 1;
      for (let k = -4; k <= 4; k++) {
        g.beginPath();
        g.ellipse(cx, cy + k * R * 0.2, R, R * 0.07, tilt, 0, TAU);
        g.stroke();
      }
      g.restore();
      // rim light
      g.strokeStyle = "rgba(150,205,255,0.55)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(cx, cy, R, Math.PI * 1.05, Math.PI * 1.62);
      g.stroke();
      /* front halves + satellites with trails */
      g.setLineDash([2, 7]);
      orbits.forEach((o) => {
        g.strokeStyle = `rgba(${o.col},0.22)`;
        ell(o, 0, Math.PI);
      });
      g.setLineDash([]);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const pt = (o, a) => {
        const ex = Math.cos(a) * o.rx;
        const ey = Math.sin(a) * o.ry;
        return [cx + ex * ct - ey * st, cy + ex * st + ey * ct];
      };
      orbits.forEach((o, oi) => {
        for (let k = 0; k < o.n; k++) {
          const a = clock * o.sp * TAU + (k / o.n) * TAU + oi;
          const behind = Math.sin(a) < 0 && Math.hypot(...pt(o, a).map((v, i) => v - (i ? cy : cx))) < R;
          if (behind) continue; // hidden behind the planet
          // trail
          for (let t = 1; t <= 14; t++) {
            const [x, y] = pt(o, a - Math.sign(o.sp) * t * 0.012);
            g.fillStyle = `rgba(${o.col},${(0.4 * (1 - t / 14)).toFixed(3)})`;
            g.beginPath();
            g.arc(x, y, 1.6 * (1 - t / 18), 0, TAU);
            g.fill();
          }
          const [x, y] = pt(o, a);
          const grd = g.createRadialGradient(x, y, 0, x, y, 9);
          grd.addColorStop(0, `rgba(${o.col},0.8)`);
          grd.addColorStop(1, `rgba(${o.col},0)`);
          g.fillStyle = grd;
          g.beginPath();
          g.arc(x, y, 9, 0, TAU);
          g.fill();
          g.fillStyle = "#fff";
          g.beginPath();
          g.arc(x, y, 1.9, 0, TAU);
          g.fill();
        }
      });
    };

    const draw = (dt) => {
      if (!S.w) return;
      const light = themeRef.current === "light";
      g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      g.clearRect(0, 0, S.w, S.h);
      // pointer parallax (smoothed)
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 3);
      ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 3);
      const dx = (ptr.sx - 0.5) * -26;
      const dy = (ptr.sy - 0.5) * -18;
      const sy = scrollY();
      if (nebula) {
        g.globalAlpha = light ? 0.55 : 1;
        const drift = reduced ? 0 : Math.sin(clock * 0.05) * 30;
        g.drawImage(nebula, -40 + dx * 0.3 + drift, -40 + dy * 0.3 - sy * 0.03, S.w + 80, S.h + 80);
        g.globalAlpha = 1;
      }
      drawStars(light, sy, dx, dy);
      if (variant === "journal" && !light) drawShooters(dt);
      if (variant === "crew") drawConstellation(light, dt, sy);
      if (variant === "orbit") drawOrbit(sy, dx, dy);
    };

    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      clock += dt;
      draw(dt);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      if (!document.hidden && !raf && !reduced) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const onMove = (e) => {
      const rect = host.getBoundingClientRect();
      ptr.x = (e.clientX - rect.left) / (rect.width || 1);
      ptr.y = (e.clientY - rect.top) / (rect.height || 1);
      ptr.px = e.clientX - rect.left;
      ptr.py = e.clientY - rect.top;
      ptr.in = true;
      if (reduced) draw(1);
    };
    const onLeave = () => {
      ptr.in = false;
    };
    const onScroll = () => {
      if (reduced) draw(0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    const sc = scrollRef?.current;
    sc?.addEventListener("scroll", onScroll, { passive: true });
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      sc?.removeEventListener("scroll", onScroll);
    };
  }, [variant, scrollRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none", zIndex: 0, ...style }}
    />
  );
}
