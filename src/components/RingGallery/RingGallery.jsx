// Purpose: Scroll-driven 3D Services Ring Gallery optimized for zero layout-thrash 120fps motion.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onFrame, scrollToTarget, scrollRect } from "@/lib/scroll";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { navigate } from "@/lib/router";
import { SERVICE_CARDS, serviceByCategory } from "@/pages/Services/servicesData";
import "./RingGallery.css";
import { useOrbitRefs, OrbitHud, orbitHeaderBottom, updateOrbit } from "./orbit/Orbit";

const COUNT = 10;
const PIN_VH = 660;
const SPIN_DEG = 540;
const STEP_DEG = 360 / COUNT;
const DWELL = 0.45;
const FOCUS_LIFT = 520;
const FOCUS_DIM = 0.6;
const RADIUS_GROW = 950;
const CARD_BASE = 0.86;
const CARD_GROW = 2.11;

const PHASE = {
  formEnd: 0.24,
  openStart: 0.2,
  openEnd: 0.48,
  coverStart: 0.6,
  coverEnd: 0.76,
  textAt: 0.72,
};
const SERVICES_SCROLL_AT = 0.9;
const TEXT_BG = "#ffffff";
const TEXT_INK = "#0a0e11";

const SERVICES = {
  Websites: { color: "#E5A93C", n: "01" },
  SEO: { color: "#2DD4BF", n: "02" },
  Design: { color: "#60A5FA", n: "03" },
  Branding: { color: "#E08263", n: "04" },
  Marketing: { color: "#FB923C", n: "05" },
};

const EYEBROW = "The autonomous growth stack";
const SENTENCE = [
  "Clicktots", "engineers", { cat: "Websites", text: "AI-ready websites" }, "that", "convert,",
  { cat: "SEO", text: "predictive SEO" }, "that", "dominates", "search,",
  { cat: "Design", text: "generative design" }, "people", "remember,",
  { cat: "Branding", text: "brand systems" }, "with", "an", "unmistakable", "voice,", "and",
  { cat: "Marketing", text: "autonomous performance marketing" }, "that", "compounds", "ROI.",
];
const FIRST_OFFSET = 0;

export function scrollToServices() {
  const section = document.getElementById("ring-gallery");
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(1, section.offsetHeight - window.innerHeight);
  scrollToTarget(top + span * SERVICES_SCROLL_AT, 2.2);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mod = (n, m) => ((n % m) + m) % m;
const power2InOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const pad = (n) => String(n).padStart(2, "0");
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export default function RingGallery() {
  const reduced = useReducedMotion();

  const CARDS = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const c = SERVICE_CARDS[i % SERVICE_CARDS.length];
        const svc = serviceByCategory(c.category);
        return {
          title: svc.name,
          n: i + 1,
          category: c.category,
          label: c.title.toUpperCase(),
          image: c.image,
          color: svc.color,
          on: "#0A0E11",
          path: svc.path,
          video: c.video,
        };
      }),
    []
  );

  const cardAt = useCallback((slot) => CARDS[mod(FIRST_OFFSET - slot, COUNT)], [CARDS]);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const orbit = useOrbitRefs();
  const frameRef = useRef(null);
  const wallRef = useRef(null);
  const centreRef = useRef(null);
  const cardRefs = useRef([]);
  const tiltRefs = useRef([]);
  const lastDragRef = useRef(0);
  const previewRef = useRef(null);
  const pageRef = useRef(null);
  const textRef = useRef(null);
  const activeRef = useRef(null);
  const [active, setActive] = useState(null);

  const PREVIEWS = useMemo(() => {
    const out = {};
    for (const cat of Object.keys(SERVICES)) {
      const svc = serviceByCategory(cat);
      const card = SERVICE_CARDS.find((c) => c.category === cat);
      out[cat] = { image: card.image, name: svc.name, color: svc.color, text: svc.tagline };
    }
    return out;
  }, []);

  const setFocus = useCallback((cat) => {
    activeRef.current = cat;
    setActive(cat);
    stageRef.current?.classList.toggle("rg-hovering", !!cat);
    if (cat) st.current.pv.fresh = true;
    st.current.dirty = true;
  }, []);

  const st = useRef({
    last: 0,
    rot: 0,
    dragRot: 0,
    dragging: false,
    dragStart: null,
    tilts: Array.from({ length: COUNT }, () => ({ rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0 })),
    par: { x: 0, y: 0, tx: 0, ty: 0 },
    pointer: { x: 0, y: 0 },
    pv: { x: 0, y: 0, left: false, below: false, fresh: true },
    offscreen: true,
    dirty: true,
    lastQ: -1,
    lastPre: -1,
    lastFrameTop: "",
    lastRad: -1,
  });

  const tiltCard = useCallback((slot, ev) => {
    const el = cardRefs.current[slot];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5;
    const y = (ev.clientY - r.top) / r.height - 0.5;
    const t = st.current.tilts[slot];
    t.tx = -16 * y;
    t.ty = 20 * x;
    t.tz = 36;
    st.current.dirty = true;
  }, []);

  const resetTilt = useCallback((slot) => {
    const t = st.current.tilts[slot];
    t.tx = 0;
    t.ty = 0;
    t.tz = 0;
    st.current.dirty = true;
  }, []);

  const onCardEnter = (slot) => {
    const v = cardRefs.current[slot]?.querySelector("video");
    const card = cardAt(slot);
    if (v && card.video && !reduced) {
      if (!v.src) v.src = card.video;
      v.play().then(() => v.classList.add("rg-playing")).catch(() => {});
    }
  };

  const onCardLeave = (slot) => {
    const v = cardRefs.current[slot]?.querySelector("video");
    if (v) {
      v.classList.remove("rg-playing");
      v.pause();
    }
    resetTilt(slot);
  };

  const onCardClick = (ev, slot) => {
    ev.preventDefault();
    if (performance.now() - lastDragRef.current < 50) return;
    const card = cardAt(slot);
    const img = ev.currentTarget.querySelector(".rg-card-face img");
    navigate(card.path, {
      rect: ev.currentTarget.getBoundingClientRect(),
      image: card.image,
      imageRect: img ? img.getBoundingClientRect() : null,
      imageTitle: card.title,
    });
  };

  const onPointerDown = (ev) => {
    if (ev.button !== 0 || ev.target.closest(".rg-card")) return;
    const s = st.current;
    s.dragging = true;
    s.dragStart = { x: ev.clientX, y: ev.clientY, base: s.dragRot, moved: false };
    wallRef.current?.classList.add("rg-dragging");
    wallRef.current?.setPointerCapture?.(ev.pointerId);
  };
  const onPointerMove = (ev) => {
    const s = st.current;
    if (!s.dragging || !s.dragStart) return;
    const dx = ev.clientX - s.dragStart.x;
    if (Math.abs(dx) > 4) s.dragStart.moved = true;
    s.dragRot = s.dragStart.base + 0.22 * dx;
    s.dirty = true;
  };
  const endDrag = () => {
    const s = st.current;
    if (s.dragging && s.dragStart?.moved) lastDragRef.current = performance.now();
    s.dragRot = Math.round(s.dragRot / STEP_DEG) * STEP_DEG;
    s.dragging = false;
    s.dragStart = null;
    s.dirty = true;
    wallRef.current?.classList.remove("rg-dragging");
  };

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const wall = wallRef.current;
    const centre = centreRef.current;
    if (!section || !stage || !frame || !wall || !centre) return;

    const s = st.current;
    const card0Cat = (slot) => cardAt(slot).category;
    const parallaxEls = Array.from(stage.querySelectorAll(".rg-parallax"));
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // Cache layout dimensions outside the rAF loop so ZERO forced synchronous layout occurs while scrolling
    const metrics = {
      ww: window.innerWidth,
      hh: window.innerHeight,
      textH: textRef.current ? textRef.current.offsetHeight : 16,
      headerBottom: orbitHeaderBottom(orbit),
    };
    const measure = () => {
      metrics.ww = window.innerWidth;
      metrics.hh = stage.offsetHeight || window.innerHeight;
      metrics.textH = textRef.current ? textRef.current.offsetHeight : 16;
      metrics.headerBottom = orbitHeaderBottom(orbit);
      s.dirty = true;
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(stage);
    if (textRef.current) ro?.observe(textRef.current);
    window.addEventListener("resize", measure, { passive: true });

    const onPointer = (ev) => {
      s.pointer.x = ev.clientX;
      s.pointer.y = ev.clientY;
      if (ev.pointerType === "mouse" && finePointer && !reduced) {
        s.par.tx = (ev.clientX / Math.max(1, metrics.ww)) * 2 - 1;
        s.par.ty = (ev.clientY / Math.max(1, metrics.hh)) * 2 - 1;
        s.dirty = true;
      }
    };
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

    const pauseAllVideos = () => {
      cardRefs.current.forEach((el) => {
        const v = el?.querySelector("video");
        if (v && !v.paused) {
          v.pause();
          v.classList.remove("rg-playing");
        }
      });
    };

    const unsub = onFrame((time) => {
      const rect = scrollRect(section);
      const { ww, hh } = metrics;

      if (rect.bottom < -300 || rect.top > hh + 300) {
        if (!s.offscreen) {
          s.offscreen = true;
          pauseAllVideos();
        }
        s.last = 0;
        return;
      }
      s.offscreen = false;

      const dtSec = s.last ? Math.min(0.05, Math.max(0.001, (time - s.last) / 1000)) : 1 / 60;
      s.last = time;

      const span = Math.max(1, rect.height - hh);
      const q = clamp01(-rect.top / span);
      const pre = clamp01(1 - rect.top / hh);

      const rawSpin = q * SPIN_DEG;
      const stepK = Math.floor(rawSpin / STEP_DEG);
      const stepF = rawSpin / STEP_DEG - stepK;
      const snapped = (stepK + power2InOut(clamp01((stepF - DWELL) / (1 - DWELL)))) * STEP_DEG;
      const expansion = reduced
        ? 1
        : power2InOut(clamp01((q - PHASE.openStart) / (PHASE.openEnd - PHASE.openStart)));
      const spinScroll = reduced ? rawSpin : rawSpin + (snapped - rawSpin) * expansion;
      const rotTarget = spinScroll + s.dragRot;

      // Frame-rate independent exponential damping — identical silky feel at 60Hz, 90Hz, and 120Hz
      const rotLambda = s.dragging ? 24 : 11;
      const nextRot = reduced ? rotTarget : damp(s.rot, rotTarget, rotLambda, dtSec);
      const rotMoving = Math.abs(nextRot - s.rot) > 0.004 || Math.abs(rotTarget - nextRot) > 0.01;
      s.rot = rotMoving ? nextRot : rotTarget;

      // Check whether any hover tilt, parallax, or preview is still settling
      let motionActive =
        s.dirty ||
        rotMoving ||
        Math.abs(q - s.lastQ) > 0.00005 ||
        Math.abs(pre - s.lastPre) > 0.0005 ||
        !!activeRef.current;

      if (!motionActive && finePointer && !reduced) {
        if (Math.abs(s.par.tx - s.par.x) > 0.001 || Math.abs(s.par.ty - s.par.y) > 0.001) {
          motionActive = true;
        } else {
          for (let i = 0; i < COUNT; i++) {
            const ti = s.tilts[i];
            if (Math.abs(ti.tx - ti.rx) > 0.02 || Math.abs(ti.ty - ti.ry) > 0.02 || Math.abs(ti.tz - ti.rz) > 0.05) {
              motionActive = true;
              break;
            }
          }
        }
      }

      if (!motionActive) return;
      s.dirty = false;
      s.lastQ = q;
      s.lastPre = pre;

      const formation = reduced
        ? 1
        : clamp01(0.5 * clamp01((pre - 0.15) / 0.85) + 0.5 * clamp01(q / PHASE.formEnd));
      const cover = clamp01((q - PHASE.coverStart) / (PHASE.coverEnd - PHASE.coverStart));
      const entered = expansion > 0.9;

      // Rounded slide-over over Projects
      const rad = reduced ? 0 : Math.round(40 * (1 - pre));
      if (rad !== s.lastRad) {
        s.lastRad = rad;
        stage.style.borderRadius = rad ? `${rad}px ${rad}px 0 0` : "0px";
        stage.style.boxShadow = rad > 0 ? `0 -30px 80px rgba(0,0,0,${(0.55 * (1 - pre)).toFixed(3)})` : "none";
      }

      stage.classList.toggle("rg-revealed", expansion > 0.55 || reduced);
      stage.classList.toggle("rg-entered", q > PHASE.textAt || reduced);

      const ce = power2InOut(cover);
      if (pageRef.current) pageRef.current.style.opacity = ce.toFixed(3);
      const base = ww <= 820 ? 10 : 16;
      const frameTopNum = base + (Math.max(base, metrics.textH) - base) * ce;
      const frameTopStr = `${frameTopNum.toFixed(1)}px`;
      if (s.lastFrameTop !== frameTopStr) {
        s.lastFrameTop = frameTopStr;
        frame.style.top = frameTopStr;
      }

      const frameH = Math.max(120, hh - frameTopNum - base);
      const wallScale = ww <= 820 ? 0.8 : hh <= 760 ? 0.9 : 1.1;
      const fit = Math.min(1.3, (ww - 32) / 1340, (0.82 * hh) / 800) / wallScale;
      const headerBottom = frameTopNum + metrics.headerBottom + 18;
      const ringTop = 0.25 * hh * Math.min(1.2, Math.max(0.5, (fit * wallScale) / 0.92));
      const ringCentreY = Math.min(0.58 * hh, Math.max(0.44 * hh, headerBottom + ringTop));
      const SMALL = ww <= 767 ? 0.6 : ww <= 1023 ? 0.78 : 1;
      const mul = 1 + (SMALL - 1) * expansion;
      const A = wallScale * (fit + (1 - fit) * expansion) * mul;
      const tilt = -22 * (1 - expansion);
      const radius = 460 + RADIUS_GROW * expansion;
      const anchor =
        -radius * Math.sin((tilt * Math.PI) / 180) +
        460 * Math.sin((-22 * Math.PI) / 180) * (1 - expansion);
      const pers = 1000 + (760 - 1000) * expansion;
      const roll = -20 * (1 - expansion);
      const introOff = ringCentreY - (frameTopNum + frameH / 2);

      wall.style.setProperty("--perspective", `${(pers * A).toFixed(1)}px`);
      wall.style.setProperty("--origin-y", `${(introOff * (1 - expansion)).toFixed(1)}px`);
      centre.style.setProperty("--intro-offset", `${(introOff * (1 - expansion) + anchor * A).toFixed(1)}px`);
      centre.style.setProperty("--intro-x", `${(160 * Math.sin((roll * Math.PI) / 180) * A).toFixed(1)}px`);
      centre.style.setProperty("--intro-tilt", `${tilt.toFixed(2)}deg`);
      centre.style.setProperty("--intro-roll", `${roll.toFixed(2)}deg`);
      centre.style.setProperty("--intro-scale", `${((fit + (1 - fit) * expansion) * mul).toFixed(4)}`);
      centre.style.setProperty("--intro-sz", `${A.toFixed(4)}`);

      let focusSlot = 0;
      let focusAbs = 999;
      let frontSlot = 0;
      let frontAbs = 999;
      const tiltCos = Math.cos((tilt * Math.PI) / 180);
      const expSq = expansion * expansion;
      const baseCardScale = CARD_BASE + CARD_GROW * expSq;
      const flipZ = (radius * radius) / pers;
      const focusAmt = reduced ? 0 : expSq;

      for (let slot = 0; slot < COUNT; slot++) {
        const el = cardRefs.current[slot];
        if (!el) continue;

        const angle = mod((360 * slot) / COUNT + s.rot + 180, 360) - 180;
        const absAngle = Math.abs(angle);
        if (absAngle < focusAbs) {
          focusAbs = absAngle;
          focusSlot = slot;
        }
        if (180 - absAngle < frontAbs) {
          frontAbs = 180 - absAngle;
          frontSlot = slot;
        }
        const n = mod(angle + 180, 360);
        const a = n / 360;
        const i = clamp01((formation - 0.7 * a) / 0.3);
        const f = 1 - Math.pow(1 - i, 3);
        const yaw = -180 + n * f;
        const c = radius - (1 - f) * a * 24;
        const yawRad = (yaw * Math.PI) / 180;
        const x = -Math.sin(yawRad) * c;
        const z = -Math.cos(yawRad) * c;
        const appear = Math.min(1, 2.5 * i);
        const hidden = z * tiltCos >= pers - 70 || (entered && absAngle > 96);

        const focus = activeRef.current;
        const dim = focus && card0Cat(slot) !== focus ? "1" : "0";
        if (el.dataset.dim !== dim) {
          el.dataset.dim = dim;
          el.classList.toggle("rg-dim", dim === "1");
        }

        const fa = absAngle / (STEP_DEG * 0.9);
        const fw = fa >= 1 ? 0 : 1 - fa * fa * (3 - 2 * fa);
        const lift = FOCUS_LIFT * fw * focusAmt;
        const focusScale = 1 + 0.1 * fw * focusAmt;
        const veil = (FOCUS_DIM * (1 - fw) * focusAmt).toFixed(2);
        if (el.dataset.veil !== veil) {
          el.dataset.veil = veil;
          el.style.setProperty("--rg-fdim", veil);
        }

        const opStr = hidden ? "0" : appear.toFixed(3);
        if (el.dataset.op !== opStr) {
          el.dataset.op = opStr;
          el.style.opacity = opStr;
          el.style.pointerEvents = hidden ? "none" : "auto";
        }
        if (!hidden) {
          const flip = z > flipZ ? " rotateY(180deg)" : "";
          el.style.transform = `translate3d(${x.toFixed(2)}px,0,${(z + lift).toFixed(2)}px) rotateY(${yaw.toFixed(2)}deg) scale(${(
            baseCardScale * focusScale
          ).toFixed(4)})${flip}`;
        }

        if (finePointer) {
          const ti = s.tilts[slot];
          if (reduced) {
            ti.rx = ti.tx;
            ti.ry = ti.ty;
            ti.rz = ti.tz;
          } else {
            ti.rx = damp(ti.rx, ti.tx, 14, dtSec);
            ti.ry = damp(ti.ry, ti.ty, 14, dtSec);
            ti.rz = damp(ti.rz, ti.tz, 14, dtSec);
          }
          const wrap = tiltRefs.current[slot];
          if (wrap) {
            wrap.style.transform =
              Math.abs(ti.rx) < 0.01 && Math.abs(ti.ry) < 0.01 && Math.abs(ti.rz) < 0.02
                ? "none"
                : `translateZ(${ti.rz.toFixed(1)}px) rotateX(${ti.rx.toFixed(2)}deg) rotateY(${ti.ry.toFixed(2)}deg)`;
          }
        }
      }

      updateOrbit(orbit, {
        stage,
        reduced,
        formation,
        expansion,
        cover,
        focusSlot,
        frontSlot,
        cardAt,
        count: COUNT,
      });

      const pvEl = previewRef.current;
      if (pvEl && activeRef.current && finePointer) {
        const pv = s.pv;
        const w = 260;
        const h = 252;
        const { x: px, y: py } = s.pointer;
        if (!pv.left && px + 18 + w > ww - 36) pv.left = true;
        else if (pv.left && px - w - 18 < 36) pv.left = false;
        if (!pv.below && py - h - 22 < 36) pv.below = true;
        else if (pv.below && py + 22 + h > hh - 36) pv.below = false;
        let left = pv.left ? px - w - 18 : px + 18;
        let top = pv.below ? py + 22 : py - h - 22;
        left = Math.max(12, Math.min(ww - w - 12, left));
        top = Math.max(12, Math.min(hh - h - 12, top));
        if (pvEl.firstElementChild) {
          pvEl.firstElementChild.style.transformOrigin = `${pv.left ? "100%" : "0%"} ${pv.below ? "0%" : "100%"}`;
        }
        if (pv.fresh || reduced) {
          pv.x = left;
          pv.y = top;
          pv.fresh = false;
        } else {
          pv.x = damp(pv.x, left, 16, dtSec);
          pv.y = damp(pv.y, top, 16, dtSec);
        }
        pvEl.style.transform = `translate3d(${pv.x.toFixed(1)}px,${pv.y.toFixed(1)}px,0)`;
      }

      if (finePointer && !reduced && parallaxEls.length) {
        const p = s.par;
        p.x = damp(p.x, p.tx, 6, dtSec);
        p.y = damp(p.y, p.ty, 6, dtSec);
        for (const el of parallaxEls) {
          const d = +el.dataset.depth;
          el.style.setProperty("--px", `${(-p.x * d).toFixed(2)}px`);
          el.style.setProperty("--py", `${(-p.y * d * 0.5).toFixed(2)}px`);
        }
      }
    });

    return () => {
      unsub();
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      if (finePointer) window.removeEventListener("pointermove", onPointer);
      pauseAllVideos();
    };
  }, [reduced, CARDS, cardAt]);

  const pv = active ? PREVIEWS[active] : null;
  let wordIndex = 0;

  return (
    <section
      id="ring-gallery"
      ref={sectionRef}
      className="rg-scope relative z-30 w-full"
      style={{ height: `${100 + PIN_VH}vh`, marginTop: "-100vh" }}
      aria-label="Clicktots services and related work"
    >
      <div ref={stageRef} className="rg-stage" style={{ "--rg-text-bg": TEXT_BG, "--rg-text-ink": TEXT_INK }}>
        <div ref={pageRef} className="rg-page" aria-hidden="true" />

        <div ref={frameRef} className="rg-frame">
          <div className="rg-scene rg-parallax" data-depth="10" aria-hidden="true" />

          <div
            ref={wallRef}
            className="rg-wall"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="rg-lens">
              <div ref={centreRef} className="rg-centre">
                {Array.from({ length: COUNT }, (_, slot) => {
                  const card = cardAt(slot);
                  return (
                    <a
                      key={slot}
                      ref={(el) => (cardRefs.current[slot] = el)}
                      className="rg-card"
                      href={card.path}
                      style={{ "--world": card.color, "--on": card.on }}
                      aria-label={`${card.title} — ${card.label}`}
                      onMouseEnter={() => onCardEnter(slot)}
                      onMouseLeave={() => onCardLeave(slot)}
                      onMouseMove={(ev) => tiltCard(slot, ev)}
                      onClick={(ev) => onCardClick(ev, slot)}
                    >
                      <div ref={(el) => (tiltRefs.current[slot] = el)} className="rg-card-tilt">
                        <div className="rg-card-frame" />
                        <div className="rg-card-face">
                          <img src={card.image} alt="" draggable={false} loading="lazy" decoding="async" />
                          {card.video && <video muted loop playsInline preload="none" poster={card.image} />}
                          <span className="rg-tag">
                            <b>No. {pad(card.n)}</b>
                            <span>{card.label}</span>
                          </span>
                          <span className="rg-arrow" aria-hidden="true">↗</span>
                          <span className="rg-caption">
                            <span className="rg-title">{card.title}</span>
                            <span className="rg-line" />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rg-mist rg-atmosphere" aria-hidden="true" />

          {/* 360° orbit header + live card counter */}
          <OrbitHud refs={orbit} count={COUNT} />
        </div>

        {/* ── services sentence on the white page ── */}
        <div ref={textRef} className="rg-text">
          <h2 className="rg-eyebrow">
            <span className="rg-word">
              <span className="rg-rise" style={{ "--d": "0s" }}>
                {EYEBROW}
              </span>
            </span>
          </h2>
          <p className="rg-sentence">
            {SENTENCE.map((w, i) => {
              const delay = `${0.05 + wordIndex++ * 0.035}s`;
              if (typeof w === "string") {
                return (
                  <span key={i}>
                    <span className="rg-word">
                      <span className="rg-rise" style={{ "--d": delay }}>{w}</span>
                    </span>{" "}
                  </span>
                );
              }
              const svc = SERVICES[w.cat];
              const page = serviceByCategory(w.cat);
              return (
                <span key={i}>
                  <a
                    href={page.path}
                    className={`rg-choice${active === w.cat ? " rg-active" : ""}`}
                    style={{ "--world": svc.color, "--on": "#0A0E11" }}
                    onMouseEnter={() => setFocus(w.cat)}
                    onMouseLeave={() => setFocus(null)}
                    onFocus={() => setFocus(w.cat)}
                    onBlur={() => setFocus(null)}
                    onClick={(ev) => {
                      ev.preventDefault();
                      const media = previewRef.current?.querySelector(".rg-preview-media img");
                      const mr = media && active === w.cat ? media.getBoundingClientRect() : null;
                      const pvw = PREVIEWS[w.cat];
                      setFocus(null);
                      if (page)
                        navigate(page.path, {
                          rect: ev.currentTarget.getBoundingClientRect(),
                          image: pvw ? pvw.image : null,
                          imageRect: mr && mr.width > 0 ? mr : null,
                        });
                    }}
                    aria-label={`${page ? page.name : w.cat} — see how Clicktots works`}
                  >
                    <span className="rg-marker" />
                    <span className="rg-choice-words">
                      {w.text.split(" ").map((part, j, all) => (
                        <span key={j}>
                          <span className="rg-word">
                            <span className="rg-rise" style={{ "--d": delay }}>{part}</span>
                          </span>
                          {j < all.length - 1 ? " " : null}
                        </span>
                      ))}
                    </span>
                    <span className="rg-underline" />
                    <sup>{svc.n}</sup>
                  </a>{" "}
                </span>
              );
            })}
          </p>
        </div>
      </div>

      {createPortal(
        <div ref={previewRef} className={`rg-preview${active ? " rg-visible" : ""}`} aria-hidden="true">
          <div className="rg-preview-card">
            <div className="rg-preview-media">
              {pv && <img src={pv.image} alt="" />}
            </div>
            <div className="rg-preview-info">
              <div className="rg-preview-meta">
                <i style={{ background: pv ? pv.color : "#fff" }} />
                <span>{pv ? pv.name.toUpperCase() : ""}</span>
              </div>
              <div className="rg-preview-copy">{pv ? pv.text : ""}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
