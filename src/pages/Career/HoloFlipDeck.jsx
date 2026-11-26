// Purpose: Interactive 5-card Holo Flip Badge deck hanging on a fixed top rope.
//   - Desktop & Tablet (>= 700px): displays 2 hanging cards side-by-side; clicking Next/Prev slides
//     1 card out and brings the next card in smoothly while the remaining card shifts across the rope.
//   - Mobile (< 700px): displays 1 centered hanging card.
//   - Front: Title, role image, "More About" summary, and "Click Card to Flip & Apply" prompt.
//   - Back: Important role details (Location, Experience, Key Skills) + "More Details & Apply" button.
//   - Pressing "More" flips that card back to its front, measures its image rect, and hands it to
//     onKnowMore(slug, { rect, src, radius }) for the fly-to-detail transition.
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowUpRight, MapPin, Clock, Sparkles } from "lucide-react";
import { CAREER_ROLES } from "./careerData";

const CARD_W = 296;
const CARD_H = 414;
const HAIR = 2;
const WIRE_W = 1.4;
const TAU = Math.PI * 2;
const SLIDE_EASE = [0.22, 1, 0.36, 1];

// Remembered between visits to the list (module scope survives the deck unmounting).
let lastDeckIndex = 0;

const DEFAULTS = {
  hover: 50,
  flipStiffness: 60,
  flipDamping: 16,
  swingStiffness: 48,
  swingDamping: 20,
  swingKick: 70,
  idleSway: 20,
  restAngle: 0.8,
  tiltMax: 12,
  tiltStiffness: 170,
  tiltDamping: 22,
  perspective: 1000,
  sheenOpacity: 45,
  glare: 35,
  lineY: 11,
  lineSag: 14,
  stringLength: 36,
  wireColor: "#9A9DA0",
  cardRadius: 16,
  shadowOpacity: 18,
  textColor: "#1E1B22",
  mutedColor: "#5C5862",
  holoBlue: "#C6DDF6",
  holoPink: "#EFC6E9",
  holoYellow: "#F1EEC0",
  cardColor: "#F2F1EC",
  size: 94,
};

function SetGlyph({ size, color }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", flexShrink: 0 }}>
      <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <path d="M12 6.5 L13.3 10.7 L17.5 12 L13.3 13.3 L12 17.5 L10.7 13.3 L6.5 12 L10.7 10.7 Z" fill={color} />
    </svg>
  );
}

/* Single hanging 3D HoloFlip card with its own spring physics (swing, 3D hover tilt, click-to-flip) */
const HangingRoleCard = forwardRef(function HangingRoleCard(
  {
    role,
    slotX,
    beadY,
    stepX,
    k,
    Wc,
    Hc,
    cardOffset,
    wireW,
    wireA,
    radius,
    shadow,
    keyInset,
    keyRadius,
    latticePath,
    slideDir,
    phaseOffset,
    onMore,
    onCursorChange,
  },
  ref
) {
  const hitBoxRef = useRef(null);
  const swingRef = useRef(null);
  const cardRef = useRef(null);
  const sheenRef = useRef(null);
  const glareFrontRef = useRef(null);
  const holoRef = useRef(null);
  const glareBackRef = useRef(null);
  const imageRef = useRef(null);

  const flipFastRef = useRef(false);
  const leavingRef = useRef(false);
  const ptrRef = useRef({ x: 0, y: 0, vx: 0, inside: false });

  const stRef = useRef({
    flip: 0,
    flipV: 0,
    flipT: 0,
    sw: DEFAULTS.restAngle * (phaseOffset % 2 === 0 ? 1 : -1),
    swV: -slideDir * DEFAULTS.swingKick * 0.55,
    tx: 0,
    txV: 0,
    ty: 0,
    tyV: 0,
    over: 0,
    idleT: phaseOffset * 1.7,
    wasOver: false,
    last: -1,
  });

  const px = (v) => v * k;

  useImperativeHandle(ref, () => ({
    measureImage() {
      const el = imageRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        radius: px(10),
      };
    },
    flipToFrontAndLaunch(cb) {
      if (leavingRef.current) return;
      leavingRef.current = true;
      const st = stRef.current;
      flipFastRef.current = true;
      st.flipT = Math.round(st.flipT / 360) * 360;
      st.swV += 30;
      const startedAt = performance.now();
      const waitForFront = () => {
        const settled = Math.abs(st.flip - st.flipT) < 6 && Math.abs(st.flipV) < 120;
        if (settled || performance.now() - startedAt > 560) {
          const measured = imageRef.current
            ? (() => {
                const r = imageRef.current.getBoundingClientRect();
                return {
                  rect: { top: r.top, left: r.left, width: r.width, height: r.height },
                  src: role.image,
                  radius: px(10),
                };
              })()
            : null;
          cb(measured);
          window.setTimeout(() => {
            leavingRef.current = false;
            flipFastRef.current = false;
          }, 1600);
        } else {
          requestAnimationFrame(waitForFront);
        }
      };
      requestAnimationFrame(waitForFront);
    },
  }));

  useEffect(() => {
    const st = stRef.current;
    const ptr = ptrRef.current;
    const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let raf = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      let dt = st.last < 0 ? 0 : (now - st.last) / 1000;
      st.last = now;
      dt = Math.min(Math.max(dt, 0), 1 / 20);
      const sdt = dt;
      const hov = DEFAULTS.hover / 50;
      const reduced = !!mq?.matches;

      st.idleT += sdt;

      let overT = 0;
      let u = 0;
      let v = 0;
      if (ptr.inside) {
        overT = 1;
        u = ptr.x;
        v = ptr.y;
        if (!st.wasOver) {
          const sign = ptr.vx !== 0 ? Math.sign(ptr.vx) : Math.sign(u) || 1;
          st.swV += DEFAULTS.swingKick * 0.35 * hov * sign;
        }
      }
      st.wasOver = overT > 0.5;
      overT *= Math.min(1, hov);

      const idle = DEFAULTS.idleSway / 10;
      const t = st.idleT;
      const swayT =
        DEFAULTS.restAngle * (phaseOffset % 2 === 0 ? 1 : -1) +
        idle * (0.65 * Math.sin((t * TAU) / 3.3) + 0.35 * Math.sin((t * TAU) / 5.1 + 1.3));
      const yawI = idle * 1.4 * Math.sin((t * TAU) / 4.3 + 0.7);
      const pitchI = idle * 0.45 * Math.sin((t * TAU) / 3.7 + 2.1);
      const tyT = yawI + u * DEFAULTS.tiltMax * hov * overT;
      const txT = pitchI - v * DEFAULTS.tiltMax * hov * overT;

      const wrap = Math.round(st.flipT / 360) * 360;
      if (wrap !== 0) {
        st.flipT -= wrap;
        st.flip -= wrap;
      }

      if (reduced) {
        st.flip = st.flipT;
        st.flipV = 0;
        st.sw = DEFAULTS.restAngle;
        st.swV = 0;
        st.tx = 0;
        st.ty = 0;
        st.over += (overT - st.over) * (1 - Math.exp(-dt * 8));
      } else {
        const n = Math.max(1, Math.ceil(sdt / (1 / 240)));
        const h = sdt / n;
        for (let i = 0; i < n; i++) {
          const fk = flipFastRef.current ? 300 : DEFAULTS.flipStiffness;
          const fd = flipFastRef.current ? 32 : DEFAULTS.flipDamping;
          st.flipV += (-fk * (st.flip - st.flipT) - fd * st.flipV) * h;
          st.flip += st.flipV * h;
          st.swV += (-DEFAULTS.swingStiffness * (st.sw - swayT) - (DEFAULTS.swingDamping / 10) * st.swV) * h;
          st.sw += st.swV * h;
          st.txV += (-DEFAULTS.tiltStiffness * (st.tx - txT) - DEFAULTS.tiltDamping * st.txV) * h;
          st.tx += st.txV * h;
          st.tyV += (-DEFAULTS.tiltStiffness * (st.ty - tyT) - DEFAULTS.tiltDamping * st.tyV) * h;
          st.ty += st.tyV * h;
        }
        st.over += (overT - st.over) * (1 - Math.exp(-sdt * 8));
      }

      if (swingRef.current) swingRef.current.style.transform = `rotate(${st.sw.toFixed(3)}deg)`;
      if (cardRef.current)
        cardRef.current.style.transform = `rotateX(${st.tx.toFixed(3)}deg) rotateY(${(st.flip + st.ty).toFixed(3)}deg)`;

      const nu = DEFAULTS.tiltMax > 0 ? st.ty / DEFAULTS.tiltMax : 0;
      const nv = DEFAULTS.tiltMax > 0 ? st.tx / DEFAULTS.tiltMax : 0;
      const fs = Math.sin((st.flip * Math.PI) / 180);
      const drift = 10 * Math.sin(t * 0.9) + 6 * Math.sin(t * 0.53 + 1.1);
      const pos = Math.max(0, Math.min(100, 50 + nu * 35 + fs * 30 + drift));
      const posY = Math.max(0, Math.min(100, 50 - nv * 25 + drift * 0.5));
      const gpos = Math.max(0, Math.min(100, 50 + nu * 45 + fs * 40));

      if (sheenRef.current) {
        sheenRef.current.style.opacity = String((st.over * DEFAULTS.sheenOpacity) / 100);
        sheenRef.current.style.backgroundPosition = `${pos}% ${posY}%`;
      }
      if (glareFrontRef.current) {
        glareFrontRef.current.style.opacity = String((st.over * DEFAULTS.glare) / 100);
        glareFrontRef.current.style.backgroundPosition = `${gpos}% ${posY}%`;
      }
      if (holoRef.current) holoRef.current.style.backgroundPosition = `${pos}% ${posY}%`;
      if (glareBackRef.current) {
        glareBackRef.current.style.opacity = String(((0.35 + 0.65 * st.over) * DEFAULTS.glare) / 100);
        glareBackRef.current.style.backgroundPosition = `${100 - gpos}% ${posY}%`;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseOffset]);

  const handlePointerMove = (e) => {
    const el = hitBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1));
    ptrRef.current.vx = nx - ptrRef.current.x;
    ptrRef.current.x = nx;
    ptrRef.current.y = ny;
    ptrRef.current.inside = true;
  };

  const handlePointerLeave = () => {
    ptrRef.current.inside = false;
  };

  const handlePointerDown = (e) => {
    if (e.target && e.target.closest("[data-deck-ui]")) return;
    if (leavingRef.current) return;
    const el = hitBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const sign = e.clientX >= r.left + r.width / 2 ? 1 : -1;
    const st = stRef.current;
    st.flipT += 180 * sign;
    st.swV += DEFAULTS.swingKick * sign;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      st.flip = st.flipT;
      st.flipV = 0;
    }
  };

  const holoGradient = `linear-gradient(125deg, ${DEFAULTS.holoPink} 0%, ${DEFAULTS.holoBlue} 18%, ${role.holoMint} 34%, #FFFFFF 48%, ${DEFAULTS.holoYellow} 60%, ${role.holoTint} 78%, ${DEFAULTS.holoPink} 100%)`;
  const glareGradient = `linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 62%)`;

  return (
    <motion.div
      custom={slideDir}
      initial={(dir) => ({
        x: slotX + (dir >= 0 ? stepX : -stepX),
        y: beadY,
        opacity: 0,
        scale: 0.94,
      })}
      animate={{
        x: slotX,
        y: beadY,
        opacity: 1,
        scale: 1,
      }}
      exit={(dir) => ({
        x: slotX + (dir >= 0 ? -stepX : stepX),
        y: beadY,
        opacity: 0,
        scale: 0.94,
      })}
      transition={{ duration: 0.48, ease: SLIDE_EASE }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        willChange: "transform, opacity",
      }}
    >
      {/* Attachment bead sitting on the rope */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -3.4,
          top: -3.4,
          width: 6.8,
          height: 6.8,
          borderRadius: "50%",
          background: DEFAULTS.wireColor,
          zIndex: 12,
          pointerEvents: "none",
        }}
      />

      {/* Swinging pendulum pivot */}
      <div
        ref={swingRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transformOrigin: "0 0",
          transform: `rotate(${DEFAULTS.restAngle}deg)`,
        }}
      >
        {/* Vertical drop wire */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -wireW / 2,
            top: 0,
            width: wireW,
            height: cardOffset + px(30),
            background: DEFAULTS.wireColor,
            opacity: wireA,
            pointerEvents: "none",
          }}
        />

        {/* Interactive 3D Card Container */}
        <div
          ref={hitBoxRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          style={{
            position: "absolute",
            left: -Wc / 2,
            top: cardOffset,
            width: Wc,
            height: Hc,
            perspective: DEFAULTS.perspective,
            cursor: "pointer",
          }}
        >
          <div
            ref={cardRef}
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transformOrigin: "50% 50%",
            }}
          >
            {/* FRONT FACE */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: radius,
                overflow: "hidden",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                boxShadow: shadow,
                background: DEFAULTS.cardColor,
                color: DEFAULTS.textColor,
                padding: px(16),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: keyInset,
                  borderRadius: keyRadius,
                  boxShadow: `inset 0 0 0 ${HAIR}px rgba(0,0,0,0.06)`,
                  pointerEvents: "none",
                }}
              />

              {/* Header Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: px(8),
                  paddingTop: px(2),
                }}
              >
                <span
                  style={{
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(14.2),
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: DEFAULTS.textColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {role.cardName}
                </span>
                <div style={{ display: "flex", gap: px(2), flexShrink: 0 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <svg key={i} viewBox="0 0 12 12" width={px(9)} height={px(9)} style={{ display: "block" }}>
                      <path
                        d="M6 0.8 L7.5 4.2 L11.2 4.6 L8.4 7.1 L9.2 10.8 L6 8.9 L2.8 10.8 L3.6 7.1 L0.8 4.6 L4.5 4.2 Z"
                        fill={i < role.rarity ? DEFAULTS.textColor : "rgba(0,0,0,0.14)"}
                      />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Role Image */}
              <div
                ref={imageRef}
                style={{
                  position: "relative",
                  width: "100%",
                  height: px(188),
                  borderRadius: px(10),
                  overflow: "hidden",
                  background: role.skyTop,
                  boxShadow: `inset 0 0 0 ${HAIR}px rgba(0,0,0,0.08)`,
                }}
              >
                <img
                  src={role.image}
                  alt={role.title}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(11,18,48,0.68) 100%)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: px(10),
                    bottom: px(10),
                    padding: `${px(4)}px ${px(9)}px`,
                    borderRadius: 999,
                    background: "rgba(10, 132, 255, 0.95)",
                    color: "#FFFFFF",
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(8.5),
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {role.rarityLabel}
                </span>
              </div>

              {/* Department Pill */}
              <div
                style={{
                  width: "100%",
                  height: px(26),
                  borderRadius: px(7),
                  background: "rgba(0,0,0,0.055)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: `0 ${px(10)}px`,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(8.5),
                    color: DEFAULTS.textColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  {role.cardType}
                </span>
                <SetGlyph size={px(11)} color={DEFAULTS.textColor} />
              </div>

              {/* More About + Flip Prompt */}
              <div style={{ display: "flex", flexDirection: "column", gap: px(8) }}>
                <div>
                  <div
                    style={{
                      fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                      fontSize: px(8),
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: DEFAULTS.mutedColor,
                      marginBottom: px(3),
                    }}
                  >
                    More About Role
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                      fontSize: px(10),
                      lineHeight: 1.38,
                      color: DEFAULTS.textColor,
                      fontWeight: 500,
                    }}
                  >
                    {role.frontBlurb}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: px(8),
                    borderTop: `${HAIR}px solid rgba(0,0,0,0.06)`,
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(9),
                    fontWeight: 700,
                    color: "#121821",
                  }}
                >
                  <span>{role.cardNumber}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: px(4),
                      color: "#0060c7",
                    }}
                  >
                    Click Card to Flip &amp; Apply →
                  </span>
                </div>
              </div>

              <div
                ref={sheenRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: holoGradient,
                  backgroundSize: "250% 250%",
                  mixBlendMode: "multiply",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
              <div
                ref={glareFrontRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: glareGradient,
                  backgroundSize: "250% 250%",
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* BACK FACE */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: radius,
                overflow: "hidden",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: role.holoMint,
                color: DEFAULTS.textColor,
                boxShadow: shadow,
                padding: px(18),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                ref={holoRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: holoGradient,
                  backgroundSize: "250% 250%",
                  backgroundPosition: "50% 50%",
                }}
              />
              <div
                ref={glareBackRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  background: glareGradient,
                  backgroundSize: "250% 250%",
                  opacity: (0.28 * DEFAULTS.glare) / 100,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  background: "rgba(255, 255, 255, 0.56)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: keyInset,
                  zIndex: 1,
                  borderRadius: keyRadius,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, display: "block" }}>
                  <path d={latticePath} stroke="rgba(10,13,20,0.06)" strokeWidth={1} fill="none" />
                </svg>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: keyInset,
                  zIndex: 1,
                  borderRadius: keyRadius,
                  boxShadow: `inset 0 0 0 ${HAIR}px rgba(10,13,20,0.12)`,
                  pointerEvents: "none",
                }}
              />

              {/* Back Header */}
              <div style={{ position: "relative", zIndex: 2 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(8.2),
                    fontWeight: 700,
                    fontSynthesisWeight: "auto",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#1B2230",
                  }}
                >
                  <span>ClickTots Careers</span>
                  <span>{role.cardNumber}</span>
                </div>
                <h3
                  style={{
                    margin: `${px(8)}px 0 0`,
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(15.5),
                    fontWeight: 700,
                    fontSynthesisWeight: "auto",
                    lineHeight: 1.24,
                    color: "#080B12",
                  }}
                >
                  {role.title}
                </h3>
              </div>

              {/* Back Key Details */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: px(10),
                  fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: px(5),
                    padding: px(10),
                    borderRadius: px(10),
                    background: "rgba(255,255,255,0.88)",
                    border: "1px solid rgba(10,13,20,0.18)",
                    fontSize: px(9.5),
                    color: "#0A0D14",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: px(6), fontWeight: 700, fontSynthesisWeight: "auto", color: "#0A0D14" }}>
                    <MapPin size={px(12)} color="#0060C7" strokeWidth={2.4} />
                    <span>{role.location} · {role.type}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: px(6), fontWeight: 700, fontSynthesisWeight: "auto", color: "#0A0D14" }}>
                    <Clock size={px(12)} color="#0060C7" strokeWidth={2.4} />
                    <span>Experience: {role.experience}</span>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: px(8.2),
                      fontWeight: 700,
                      fontSynthesisWeight: "auto",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#1B2230",
                      marginBottom: px(5),
                    }}
                  >
                    Key Skills
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: px(5) }}>
                    {role.keySkills.map((sk) => (
                      <span
                        key={sk}
                        style={{
                          padding: `${px(3.5)}px ${px(8)}px`,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.92)",
                          border: "1px solid rgba(10,13,20,0.2)",
                          fontSize: px(8.5),
                          fontWeight: 700,
                          fontSynthesisWeight: "auto",
                          color: "#080B12",
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: px(9.6),
                    lineHeight: 1.45,
                    fontWeight: 600,
                    fontSynthesisWeight: "auto",
                    color: "#0B0E16",
                  }}
                >
                  {role.shortSummary}
                </p>
              </div>

              {/* Back CTA Button */}
              <div style={{ position: "relative", zIndex: 2 }}>
                <button
                  data-deck-ui
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCursorChange(null);
                    onMore(role.slug);
                  }}
                  onMouseEnter={(e) => onCursorChange({ x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => onCursorChange({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => onCursorChange(null)}
                  style={{
                    width: "100%",
                    padding: `${px(10)}px ${px(14)}px`,
                    borderRadius: 8,
                    border: "none",
                    background: "#0071E3",
                    color: "#FFFFFF",
                    fontSynthesisWeight: "auto",
                    fontFamily: "'Michroma', 'Eurostile', 'Arial Black', sans-serif",
                    fontSize: px(10),
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: px(6),
                    cursor: "pointer",
                  }}
                >
                  <span>More Details &amp; Apply</span>
                  <ArrowUpRight size={px(13)} />
                </button>
              </div>
            </div>

            {/* Metal Clip */}
            {["", "rotateY(180deg) "].map((turn) => (
              <div
                key={turn}
                style={{
                  position: "absolute",
                  left: Wc / 2 - px(9),
                  top: -px(9),
                  width: px(18),
                  height: px(14),
                  borderRadius: `${px(9)}px ${px(9)}px ${px(3)}px ${px(3)}px`,
                  background: "linear-gradient(180deg, #D9DCDF 0%, #9EA3A8 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                  transform: `${turn}translateZ(0.5px)`,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: px(4),
                    width: px(5),
                    height: px(5),
                    marginLeft: -px(2.5),
                    borderRadius: "50%",
                    background: "#7C8186",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default function HoloFlipDeck({ onKnowMore, returning = false, onReturnMeasured }) {
  const stageRef = useRef(null);
  const cardHandlesRef = useRef({});

  const [currentIndex, setCurrentIndex] = useState(() => lastDeckIndex);
  const [slideDir, setSlideDir] = useState(1);
  const [box, setBox] = useState({ w: 960, h: 600 });
  const [applyCursor, setApplyCursor] = useState(null);

  const count = CAREER_ROLES.length;
  const twoUp = box.w >= 700;

  useEffect(() => {
    lastDeckIndex = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cx = box.w / 2;
  const lineY = (box.h * DEFAULTS.lineY) / 100;
  const sag = DEFAULTS.lineSag;
  const lineWidthPct = twoUp ? 84 : 74;
  const lineHalf = (box.w * lineWidthPct) / 200;
  const x0 = cx - lineHalf;
  const x1 = cx + lineHalf;

  // Height of the quadratic Bezier rope M x0 lineY Q cx (lineY + 2*sag) x1 lineY at any x
  const ropeYAt = (x) => {
    const t = Math.max(0, Math.min(1, (x - x0) / Math.max(1, x1 - x0)));
    return lineY + 4 * t * (1 - t) * sag;
  };

  const maxCardW = twoUp ? Math.max(180, (box.w - 168 - 44) / 2) : box.w * 0.78;
  const midBeadY = lineY + sag;
  const room = Math.max(
    0.1,
    Math.min((box.h * 0.93 - midBeadY) / (DEFAULTS.stringLength + 6 + CARD_H), maxCardW / CARD_W)
  );
  const k = room * (DEFAULTS.size / 100);
  const px = (v) => v * k;

  const Wc = Math.round(px(CARD_W));
  const Hc = Math.round(px(CARD_H));
  const stringLen = px(DEFAULTS.stringLength);
  const cardOffset = stringLen + px(6);

  const gap = twoUp ? Math.max(28, Math.min(84, (box.w - 168 - Wc * 2) * 0.45)) : 0;
  const stepX = twoUp ? Wc + gap : Math.min(box.w * 0.65, Wc + 120);
  const slots = twoUp
    ? [
        { idx: currentIndex, x: cx - stepX / 2 },
        { idx: (currentIndex + 1) % count, x: cx + stepX / 2 },
      ]
    : [{ idx: currentIndex, x: cx }];

  const primaryRole = CAREER_ROLES[currentIndex];
  const secondaryRole = twoUp ? CAREER_ROLES[(currentIndex + 1) % count] : null;

  /* Coming back from a role page: report where the first visible card's image sits */
  useEffect(() => {
    if (!returning || !onReturnMeasured) return undefined;
    let frames = 0;
    let raf = 0;
    const step = () => {
      frames += 1;
      if (frames < 4) {
        raf = requestAnimationFrame(step);
        return;
      }
      const handle = cardHandlesRef.current[primaryRole.slug];
      const measured = handle?.measureImage?.();
      if (measured) onReturnMeasured(measured.rect, measured.radius);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToCard = useCallback(
    (nextIndex, direction) => {
      const dir = direction >= 0 ? 1 : -1;
      setSlideDir(dir);
      setCurrentIndex((nextIndex + count) % count);
    },
    [count]
  );

  const handleMore = useCallback(
    (slug) => {
      const idx = CAREER_ROLES.findIndex((r) => r.slug === slug);
      if (idx >= 0) lastDeckIndex = idx;
      const handle = cardHandlesRef.current[slug];
      if (handle?.flipToFrontAndLaunch) {
        handle.flipToFrontAndLaunch((origin) => onKnowMore(slug, origin));
      } else {
        onKnowMore(slug, null);
      }
    },
    [onKnowMore]
  );

  const cordPath = `M ${x0} ${lineY} Q ${cx} ${lineY + 2 * sag} ${x1} ${lineY}`;
  const wireW = Math.max(HAIR, WIRE_W);
  const wireA = Math.min(1, Math.max(1, WIRE_W) / wireW);
  const radius = px(DEFAULTS.cardRadius);
  const shadow = `0 ${px(14)}px ${px(34)}px rgba(0,0,0,${DEFAULTS.shadowOpacity / 100}), inset 0 0 0 ${HAIR}px rgba(255,255,255,0.28)`;
  const keyInset = Math.round(px(7));
  const keyRadius = Math.max(0, radius - keyInset);

  const latticePath = useMemo(() => {
    const wIn = Wc - 2 * keyInset;
    const hIn = Hc - 2 * keyInset;
    const step = Math.max(4, k * 12) * Math.SQRT2;
    let d = "";
    for (let c = step / 2; c < wIn + hIn; c += step) {
      d += `M${c.toFixed(2)} 0 L${(c - hIn).toFixed(2)} ${hIn}`;
      d += `M${(wIn - c).toFixed(2)} 0 L${(wIn - c + hIn).toFixed(2)} ${hIn}`;
    }
    return d;
  }, [Wc, Hc, keyInset, k]);

  return (
    <div className="w-full">
      {/* Stage with Fixed Top Rope + 2 Side-by-Side Hanging Cards (1 on narrow mobile) */}
      <div
        ref={stageRef}
        className="relative w-full h-[540px] sm:h-[620px] overflow-hidden select-none"
      >
        {/* Fixed Horizontal Rope */}
        <svg
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          className="pointer-events-none absolute left-0 top-0 z-10"
        >
          <path
            d={cordPath}
            stroke={DEFAULTS.wireColor}
            strokeWidth={wireW}
            strokeOpacity={wireA}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={x0} cy={lineY} r={2.5} fill={DEFAULTS.wireColor} />
          <circle cx={x1} cy={lineY} r={2.5} fill={DEFAULTS.wireColor} />
        </svg>

        {/* Left / Right Arrow Buttons */}
        <button
          data-deck-ui
          type="button"
          aria-label="Previous role card"
          onClick={() => goToCard(currentIndex - 1, -1)}
          className="ct-arrow absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-lg cursor-pointer shadow-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          data-deck-ui
          type="button"
          aria-label="Next role card"
          onClick={() => goToCard(currentIndex + 1, 1)}
          className="ct-arrow absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-lg cursor-pointer shadow-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Sliding Hanging Cards: 1 goes out, 1 comes in on Next/Prev */}
        <div className="absolute inset-0">
          <AnimatePresence initial={false} custom={slideDir}>
            {slots.map(({ idx, x }) => {
              const item = CAREER_ROLES[idx];
              return (
                <HangingRoleCard
                  key={item.slug}
                  ref={(handle) => {
                    if (handle) cardHandlesRef.current[item.slug] = handle;
                    else delete cardHandlesRef.current[item.slug];
                  }}
                  role={item}
                  slotX={x}
                  beadY={ropeYAt(x)}
                  stepX={stepX}
                  k={k}
                  Wc={Wc}
                  Hc={Hc}
                  cardOffset={cardOffset}
                  wireW={wireW}
                  wireA={wireA}
                  radius={radius}
                  shadow={shadow}
                  keyInset={keyInset}
                  keyRadius={keyRadius}
                  latticePath={latticePath}
                  slideDir={slideDir}
                  phaseOffset={idx}
                  onMore={handleMore}
                  onCursorChange={setApplyCursor}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Dots + Direct "More Details" Actions */}
      <div className="flex flex-col items-center gap-4 -mt-2">
        <div className="ct-chip inline-flex items-center gap-2 rounded-full px-3.5 py-2 backdrop-blur-md">
          {CAREER_ROLES.map((item, idx) => {
            const isShown = idx === currentIndex || (twoUp && idx === (currentIndex + 1) % count);
            return (
              <button
                key={item.slug}
                type="button"
                aria-label={`Select ${item.title}`}
                onClick={() => idx !== currentIndex && goToCard(idx, idx > currentIndex ? 1 : -1)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex
                    ? "w-6 bg-[#0A84FF]"
                    : isShown
                      ? "w-3.5 bg-[#0A84FF]/60"
                      : "w-2 ct-dot"
                }`}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="ct-mute text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
            Click any card to flip for details, or
          </span>
          <button
            type="button"
            onClick={() => handleMore(primaryRole.slug)}
            className="ct-btn ct-btn-primary gap-1.5 px-5 py-2 text-xs uppercase tracking-wider"
          >
            More About {primaryRole.cardName}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          {secondaryRole && (
            <button
              type="button"
              onClick={() => handleMore(secondaryRole.slug)}
              className="ct-btn ct-btn-primary gap-1.5 px-5 py-2 text-xs uppercase tracking-wider"
            >
              More About {secondaryRole.cardName}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {applyCursor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: applyCursor.x + 14,
              top: applyCursor.y - 16,
              zIndex: 9999,
              pointerEvents: "none",
              padding: "6px 12px",
              borderRadius: 8,
              background: "#0071E3",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: "0 10px 24px -8px rgba(0, 113, 227, 0.65)",
            }}
          >
            Apply →
          </div>,
          document.body
        )}
    </div>
  );
}