// Purpose: Implement the ClientBackground components module, keeping this responsibility separate for maintainability.
import { useEffect, useRef } from "react";

export default function ClientBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let W = 0, H = 0, raf = 0, running = false;
    const mouse = { x: -999, y: -999 };
    let dots = [];

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      const mobile = W < 768;
      const dpr = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = mobile
        ? Math.min(22, Math.max(12, Math.round((W * H) / 28000)))
        : Math.round(Math.min(90, (W * H) / 16000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 1.6,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const isDark = document.documentElement.dataset.siteTheme === "dark";
      const LINK = Math.min(150, W < 768 ? 110 : W / 7);
      const link2 = LINK * LINK;
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(17,21,29,0.34)";
      ctx.lineWidth = 1;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        if (!reduce) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
        if (finePointer) {
          const mx = a.x - mouse.x, my = a.y - mouse.y;
          const m2 = mx * mx + my * my;
          if (m2 < 14400 && m2 > 0) {
            const md = Math.sqrt(m2);
            a.x += (mx / md) * 0.8;
            a.y += (my / md) * 0.8;
          }
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < link2) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / LINK) * (isDark ? 0.28 : 0.26);
            ctx.strokeStyle = isDark
              ? `rgba(120,170,255,${alpha})`
              : `rgba(10,132,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      if (!running) return;
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (finePointer) window.addEventListener("pointermove", onMove, { passive: true });

    // only animate while the section is on screen
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        loop();
      } else if (!e.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      if (finePointer) window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="cs-bg" aria-hidden="true" />;
}