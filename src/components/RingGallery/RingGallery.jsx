// Purpose: Implement the RingGallery components module, keeping this responsibility separate for maintainability.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { onFrame, scrollToTarget, scrollRect } from "@/lib/scroll";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { navigate } from "@/lib/router";
import { SERVICE_CARDS, serviceByCategory } from "@/pages/Services/servicesData";
import "./RingGallery.css";
import { useOrbitRefs, OrbitScene, OrbitHud, orbitHeaderBottom, updateOrbit } from "./orbit/Orbit";

/* RingGallery = the "ring of cards" animation from index.html, ported to React and driven
   by page scroll (no wheel hijacking). The section pins to the screen and one long scroll
   plays the whole story from beginning to end:

     1. ring      cards fly in and assemble into a small tilted ring on the light
                  background, the ring opens up into the big close-up ring and keeps
                  rotating with your scroll
     2. services  the page turns white, the ring slides down into a frame under it, and the
                  Clicktots services sentence rises in word by word on top
     3. hover     touch a service word: it fills with its colour, that service's related
                  project preview follows the cursor, and ring cards of other services dim

   Everything is written straight to the DOM from the shared Lenis rAF loop
   (lib/scroll.js → onFrame) – nothing goes through React state while scrolling.
   Cards come from SERVICE_CARDS (pages/Services/servicesData.js) – services only, never Projects.
   Tune with PIN_VH (total scroll length), the PHASE numbers, RADIUS_GROW and CARD_GROW. */

const COUNT = 10; // slots on the ring (cycled from SERVICE_CARDS)
const PIN_VH = 700; // how long the section stays pinned (scroll distance) – longer = slower story
const SPIN_DEG = 540; // ring rotation across the whole pinned scroll
const STEP_DEG = 360 / COUNT; // one card slot
const DWELL = 0.5; // share of each card's scroll step during which the ring rests with that card in the centre
const FOCUS_LIFT = 520; // how far (px, toward the viewer) the centre card is lifted out of the ring
const FOCUS_DIM = 0.6; // how much the other cards are veiled while a card is in focus
const RADIUS_GROW = 950; // ring radius = 460 + this when fully open (smaller = cards closer together)
const CARD_BASE = 0.86; // card scale while the small ring is forming (bigger = cards start closer / larger)
const CARD_GROW = 2.11; // card scale = CARD_BASE + this when fully open (bigger = larger cards)

/* Where each phase sits in the pinned scroll (0 = pin starts, 1 = pin ends) */
const PHASE = {
  formEnd: 0.24, // cards fly in and assemble into the ring (0 → this; the first 40% already plays while the section scrolls in)
  openStart: 0.2, // ring opens up …
  openEnd: 0.48, // … until here
  coverStart: 0.6, // page turns white and the ring slides down under the text …
  coverEnd: 0.76, // … done here
  textAt: 0.72, // sentence starts rising in as the page turns white – no empty white pause
};
const SERVICES_SCROLL_AT = 0.9; // where (0–1 of the pinned scroll) the navbar "Services" tab lands – sentence fully risen
const TEXT_BG = "#ffffff"; // background of the services part
const TEXT_INK = "#0a0e11"; // sentence colour

/* The sentence above the ring. Words with a `cat` are the hover targets: touching one
   dims the rest, fills the word with the service colour, shows that service's project
   preview next to the cursor and dims every ring card from other services. */
const SERVICES = {
  Websites: { color: "#E5A93C", n: "01" },
  SEO: { color: "#2DD4BF", n: "02" },
  Design: { color: "#60A5FA", n: "03" },
  Branding: { color: "#E08263", n: "04" },
  Marketing: { color: "#FB923C", n: "05" },
};
// Section 05 eyebrow over the [01]–[05] sentence. (Seam 2 — "the system behind the results" —
// is carried by the orbit title, the first thing seen as the panel slides over the case studies.)
const EYEBROW = "The autonomous growth stack";
const SENTENCE = [
  "Clicktots", "engineers", { cat: "Websites", text: "AI-ready websites" }, "that", "convert,",
  { cat: "SEO", text: "predictive SEO" }, "that", "dominates", "search,",
  { cat: "Design", text: "generative design" }, "people", "remember,",
  { cat: "Branding", text: "brand systems" }, "with", "an", "unmistakable", "voice,", "and",
  { cat: "Marketing", text: "autonomous performance marketing" }, "that", "compounds", "ROI.",
];
const FIRST_OFFSET = 0; // card shown first; slots run backwards so scrolling brings No. 01 → No. 10 into focus in order
const CARD_H = 160;

/* ---- atmosphere data (same numbers as the HTML: left %, top %, size px, duration s, delay s) ---- */
const BACK_PETALS = [[4,14,9,29,0],[14,4,7,34,-12],[24,26,8,31,-21],[36,10,6,37,-5],[46,30,9,27,-16],[56,6,7,33,-27],[66,20,8,30,-9],[76,2,6,36,-24],[86,24,9,28,-3],[94,12,7,35,-18],[30,44,6,39,-31],[60,40,7,32,-13]];
const FRONT_PETALS = [[10,50,14,23,-6],[40,62,12,26,-19],[70,56,16,21,-11],[88,46,13,24,-2],[52,70,11,28,-23]];
const MOTES = [[8,62,10,14,-2],[18,40,6,18,-9],[27,70,14,16,-5],[36,52,8,20,-13],[44,30,5,17,-3],[53,66,12,15,-11],[61,44,7,19,-7],[69,74,16,14,-1],[77,36,6,21,-15],[85,58,11,16,-8],[92,46,7,18,-4],[13,82,9,22,-17],[48,84,13,17,-6],[72,22,5,23,-19]];
const BACK_COLORS = (i) => (i % 2 === 0 ? "#FFFFFF" : "#D6EEF3");
const FRONT_COLORS = ["#D6EEF3", "#FFFFFF", "#FFFFFF", "#D6EEF3", "#D6EEF3"];

/** Navbar → Services: smooth-scrolls to the spot where the "Our Services" sentence is fully shown. */
export function scrollToServices() {
  const section = document.getElementById("ring-gallery");
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(1, section.offsetHeight - window.innerHeight);
  scrollToTarget(top + span * SERVICES_SCROLL_AT, 2.6);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mod = (n, m) => ((n % m) + m) % m;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const power2InOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const pad = (n) => String(n).padStart(2, "0");
const spring = (value, target, velocity, stiffness, damping, dt) => {
  const a = (target - value) * stiffness - velocity * damping;
  velocity += a * dt;
  value += velocity * dt;
  return [value, velocity];
};

function Petals({ data, colorFor, className, depth }) {
  return (
    <div className={`rg-petal-layer rg-atmosphere rg-parallax ${className || ""}`} data-depth={depth} aria-hidden="true">
      {data.map((d, i) => (
        <span
          key={i}
          className={`rg-petal${i % 3 === 0 ? " rg-mirrored" : ""}`}
          style={{
            "--left": `${d[0]}%`,
            "--top": `${d[1]}%`,
            "--pw": `${d[2]}px`,
            "--duration": `${d[3]}s`,
            "--delay": `${d[4]}s`,
            "--petal-color": colorFor(i),
          }}
        />
      ))}
    </div>
  );
}

export default function RingGallery() {
  const reduced = useReducedMotion();

  // Cards are built from the SERVICES data (each card opens its own service page).
  const CARDS = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const c = SERVICE_CARDS[i % SERVICE_CARDS.length];
        const svc = serviceByCategory(c.category);
        return {
          // tag (always visible) = the capability "No. 01 PREDICTIVE ANALYTICS";
          // hover caption = the service page the card opens
          title: svc.name,
          n: i + 1,
          category: c.category,
          label: c.title.toUpperCase(),
          image: c.image,
          color: svc.color,
          on: "#0A0E11",
          path: svc.path,
          video: c.video, // optional
        };
      }),
    []
  );

  const cardAt = useCallback((slot) => CARDS[mod(FIRST_OFFSET - slot, COUNT)], [CARDS]);

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  // 360° orbit layer
  // the 360° orbit layer (dial, rails, packets, header, counter) — see ./orbit/Orbit.jsx
  const orbit = useOrbitRefs();
  const frameRef = useRef(null);
  const wallRef = useRef(null);
  const centreRef = useRef(null);
  const cardRefs = useRef([]);
  const tiltRefs = useRef([]);
  const hoverRef = useRef(false);
  const lastDragRef = useRef(0);
  const previewRef = useRef(null);
  const pageRef = useRef(null);
  const textRef = useRef(null);
  const activeRef = useRef(null);
  const [active, setActive] = useState(null); // hovered service word

  // one preview per service: its first ring image + its one-line description
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
  }, []);

  const st = useRef({
    last: 0,
    rot: 0,
    rotVel: 0,
    drift: 0,
    dragRot: 0,
    dragging: false,
    dragStart: null,
    spinEase: 1,
    tilts: Array.from({ length: COUNT }, () => ({ rx: 0, ry: 0, rz: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0 })),
    par: { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 },
    pointer: { x: 0, y: 0 },
    pv: { x: 0, y: 0, vx: 0, vy: 0, left: false, below: false, fresh: true },
    offscreen: true,
  });

  /* ---------- hover tilt (per card) ---------- */
  const tiltCard = useCallback((slot, ev) => {
    const el = cardRefs.current[slot];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5;
    const y = (ev.clientY - r.top) / r.height - 0.5;
    const t = st.current.tilts[slot];
    t.tx = -20 * y;
    t.ty = 24 * x;
    t.tz = 45;
  }, []);

  const resetTilt = useCallback((slot) => {
    const t = st.current.tilts[slot];
    t.tx = 0;
    t.ty = 0;
    t.tz = 0;
  }, []);

  const onCardEnter = (slot) => {
    hoverRef.current = true;
    const v = cardRefs.current[slot]?.querySelector("video");
    const card = cardAt(slot);
    if (v && card.video && !reduced) {
      if (!v.src) v.src = card.video;
      v.play().then(() => v.classList.add("rg-playing")).catch(() => {});
    }
  };

  const onCardLeave = (slot) => {
    hoverRef.current = false;
    const v = cardRefs.current[slot]?.querySelector("video");
    if (v) {
      v.classList.remove("rg-playing");
      v.pause();
    }
    resetTilt(slot);
  };

  // a ring card opens ITS service page (grows out of the card, like the About button)
  const onCardClick = (ev, slot) => {
    ev.preventDefault();
    if (performance.now() - lastDragRef.current < 50) return;
    const card = cardAt(slot);
    // the card's picture flies into the service page's hero
    const img = ev.currentTarget.querySelector(".rg-card-face img");
    navigate(card.path, {
      rect: ev.currentTarget.getBoundingClientRect(),
      image: card.image,
      imageRect: img ? img.getBoundingClientRect() : null,
      imageTitle: card.title,
    });
  };

  /* ---------- drag the ring sideways ---------- */
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
    s.dragRot = s.dragStart.base + 0.2 * dx;
  };
  const endDrag = () => {
    const s = st.current;
    if (s.dragging && s.dragStart?.moved) lastDragRef.current = performance.now();
    s.dragRot = Math.round(s.dragRot / STEP_DEG) * STEP_DEG; // after a drag the ring settles on a card
    s.dragging = false;
    s.dragStart = null;
    wallRef.current?.classList.remove("rg-dragging");
  };

  /* ---------- the scroll-driven render loop ---------- */
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

    const onPointer = (ev) => {
      s.pointer.x = ev.clientX;
      s.pointer.y = ev.clientY;
      if (ev.pointerType === "mouse" && finePointer && !reduced) {
        s.par.tx = (ev.clientX / window.innerWidth) * 2 - 1;
        s.par.ty = (ev.clientY / window.innerHeight) * 2 - 1;
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

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
      const ww = window.innerWidth;
      const hh = window.innerHeight;

      // nothing to draw while the section is far off-screen
      if (rect.bottom < -300 || rect.top > hh + 300) {
        if (!s.offscreen) {
          s.offscreen = true;
          pauseAllVideos();
        }
        s.last = 0;
        return;
      }
      s.offscreen = false;

      const dt = s.last ? Math.min(3, (time - s.last) / 16.67) : 1;
      s.last = time;

      /* ---- scroll → animation phases ---- */
      const span = Math.max(1, rect.height - hh);
      const q = clamp01(-rect.top / span); // 0 → 1 across the whole pinned scroll

      // `pre` = how far the section has scrolled up into view (0 = just entering, 1 = pinned).
      // The slide-over and the first part of the card flight happen DURING this natural scroll-in,
      // so there is no blank pinned stretch between Projects and Services.
      const pre = clamp01(1 - rect.top / hh);
      const formation = reduced
        ? 1
        : clamp01(0.5 * clamp01((pre - 0.15) / 0.85) + 0.5 * clamp01(q / PHASE.formEnd));
      const expansion = reduced
        ? 1
        : power2InOut(clamp01((q - PHASE.openStart) / (PHASE.openEnd - PHASE.openStart)));
      const cover = clamp01((q - PHASE.coverStart) / (PHASE.coverEnd - PHASE.coverStart));
      const entered = expansion > 0.9;
      const interactive = expansion >= 1 && cover < 1;

      /* ---- Projects → Services: this panel slides up OVER the pinned Projects slider ---- */
      const rad = reduced ? 0 : 40 * (1 - pre);
      stage.style.borderRadius = `${rad}px ${rad}px 0 0`;
      stage.style.boxShadow = pre < 1 && !reduced ? `0 -30px 80px rgba(0,0,0,${(0.55 * (1 - pre)).toFixed(3)})` : "none";

      /* ---- rotation: scroll position (card by card once open) + manual drag ---- */
      // Once the ring is open it moves card by card: each card rests in the centre for a part of the
      // scroll (DWELL), then the ring turns to the next one. While it opens, the motion blends in smoothly.
      const rawSpin = q * SPIN_DEG;
      const stepK = Math.floor(rawSpin / STEP_DEG);
      const stepF = rawSpin / STEP_DEG - stepK;
      const snapped = (stepK + power2InOut(clamp01((stepF - DWELL) / (1 - DWELL)))) * STEP_DEG;
      const spinScroll = reduced ? rawSpin : rawSpin + (snapped - rawSpin) * expansion;
      const rotTarget = spinScroll + s.dragRot;
      if (reduced) {
        s.rot = rotTarget;
        s.rotVel = 0;
      } else {
        [s.rot, s.rotVel] = spring(s.rot, rotTarget, s.rotVel, 150, 27, dt / 60);
      }
      const easeTarget = hoverRef.current ? 0.2 : 1;
      s.spinEase += (easeTarget - s.spinEase) * Math.min(1, 0.08 * dt);

      stage.classList.toggle("rg-revealed", expansion > 0.55 || reduced);
      stage.classList.toggle("rg-entered", q > PHASE.textAt || reduced);

      /* ---- page turns white, frame slides down under the services text ---- */
      const ce = power2InOut(cover);
      if (pageRef.current) pageRef.current.style.opacity = String(ce);
      const base = ww <= 820 ? 10 : 16;
      const textH = textRef.current ? textRef.current.offsetHeight : base;
      frame.style.top = `${base + (Math.max(base, textH) - base) * ce}px`;

      /* ---- ring geometry (same maths as the HTML) ---- */
      const fr = scrollRect(frame); // frame-start rect: at most one frame behind the top written above
      const wallScale = ww <= 820 ? 0.8 : hh <= 760 ? 0.9 : 1.1;
      const fit = Math.min(1.3, (ww - 32) / 1340, (0.82 * hh) / 800) / wallScale; // normal ring size
      // outside view: the ring keeps its size and only moves down as far as needed for its back row
      // to clear the orbit header (top extent of the tilted ring ≈ 25% of the screen at full size)
      const headerBottom = fr.top + orbitHeaderBottom(orbit) + 18;
      const ringTop = 0.25 * hh * Math.min(1.2, Math.max(0.5, (fit * wallScale) / 0.92));
      const ringCentreY = Math.min(0.58 * hh, Math.max(0.44 * hh, headerBottom + ringTop));
      // phones / tablets: the open ring ends smaller, so the focused card fits the screen with room around it
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
      const introOff = ringCentreY - (fr.top + fr.height / 2);

      wall.style.setProperty("--perspective", `${pers * A}px`);
      wall.style.setProperty("--origin-y", `${introOff * (1 - expansion)}px`);
      centre.style.setProperty("--intro-offset", `${introOff * (1 - expansion) + anchor * A}px`);
      centre.style.setProperty("--intro-x", `${160 * Math.sin((roll * Math.PI) / 180) * A}px`);
      centre.style.setProperty("--intro-tilt", `${tilt}deg`);
      centre.style.setProperty("--intro-roll", `${roll}deg`);
      centre.style.setProperty("--intro-scale", `${(fit + (1 - fit) * expansion) * mul}`);
      centre.style.setProperty("--intro-sz", `${A}`);

      /* ---- cards ---- */
      let focusSlot = 0;
      let focusAbs = 999;
      let frontSlot = 0;
      let frontAbs = 999;
      for (let slot = 0; slot < COUNT; slot++) {
        const el = cardRefs.current[slot];
        if (!el) continue;

        const angle = mod((360 * slot) / COUNT + s.rot + 180, 360) - 180;
        if (Math.abs(angle) < focusAbs) {
          focusAbs = Math.abs(angle);
          focusSlot = slot;
        }
        if (180 - Math.abs(angle) < frontAbs) {
          frontAbs = 180 - Math.abs(angle);
          frontSlot = slot;
        }
        const n = mod(angle + 180, 360);
        const a = n / 360;
        const i = clamp01((formation - 0.7 * a) / 0.3);
        const f = 1 - Math.pow(1 - i, 3);
        const yaw = -180 + n * f;
        const c = radius - (1 - f) * a * 24;
        const x = -Math.sin((yaw * Math.PI) / 180) * c;
        const z = -Math.cos((yaw * Math.PI) / 180) * c;
        const appear = Math.min(1, 2.5 * i);
        const hidden =
          z * Math.cos((tilt * Math.PI) / 180) >= pers - 70 || (entered && Math.abs(angle) > 96);

        const focus = activeRef.current;
        const dim = focus && card0Cat(slot) !== focus ? "1" : "0";
        if (el.dataset.dim !== dim) {
          el.dataset.dim = dim;
          el.classList.toggle("rg-dim", dim === "1");
        }

        /* focus: the card in the centre (angle 0) is lifted toward the viewer and shown in full,
           the others are veiled; when the ring turns the attention passes to the next card */
        const fa = Math.abs(angle) / (STEP_DEG * 0.9);
        const fw = fa >= 1 ? 0 : 1 - fa * fa * (3 - 2 * fa); // smoothstep: 1 in the centre → 0 one slot away
        const focusAmt = reduced ? 0 : expansion * expansion;
        const lift = FOCUS_LIFT * fw * focusAmt;
        const focusScale = 1 + 0.1 * fw * focusAmt;
        const veil = (FOCUS_DIM * (1 - fw) * focusAmt).toFixed(2);
        if (el.dataset.veil !== veil) {
          el.dataset.veil = veil;
          el.style.setProperty("--rg-fdim", veil);
        }

        el.dataset.visible = String(appear);
        el.style.opacity = hidden ? "0" : String(appear);
        el.style.pointerEvents = hidden ? "none" : "auto";
        const flip = z > (radius * radius) / pers ? " rotateY(180deg)" : "";
        el.style.transform = `translate3d(${x}px,0,${z + lift}px) rotateY(${yaw}deg) scale(${
          (CARD_BASE + CARD_GROW * expansion * expansion) * focusScale
        })${flip}`;

        // hover tilt spring
        const ti = s.tilts[slot];
        if (reduced) {
          ti.rx = ti.tx;
          ti.ry = ti.ty;
          ti.rz = ti.tz;
        } else {
          [ti.rx, ti.vx] = spring(ti.rx, ti.tx, ti.vx, 180, 24, dt / 60);
          [ti.ry, ti.vy] = spring(ti.ry, ti.ty, ti.vy, 180, 24, dt / 60);
          [ti.rz, ti.vz] = spring(ti.rz, ti.tz, ti.vz, 180, 24, dt / 60);
        }
        const wrap = tiltRefs.current[slot];
        if (wrap) wrap.style.transform = `translateZ(${ti.rz}px) rotateX(${ti.rx}deg) rotateY(${ti.ry}deg)`;

        // optional video on the cards at the front of the ring
        const card = cardAt(slot);
        if (card.video) {
          const vid = el.querySelector("video");
          const shouldPlay =
            formation > 0.5 && Math.abs(angle) <= 78 && !hidden && !document.hidden && !reduced;
          if (vid) {
            if (shouldPlay) {
              if (!vid.src) vid.src = card.video;
              if (vid.paused) vid.play().then(() => vid.classList.add("rg-playing")).catch(() => {});
            } else if (!vid.paused) {
              vid.pause();
              vid.classList.remove("rg-playing");
            }
          }
        }
      }

      /* ---- 360° orbit layer: light sweep, header + counter (./orbit/Orbit.jsx) ---- */
      updateOrbit(orbit, {
        stage,
        rot: s.rot,
        time,
        reduced,
        formation,
        expansion,
        cover,
        radius,
        pers,
        tilt,
        cardScale: CARD_BASE + CARD_GROW * expansion * expansion,
        focusSlot,
        frontSlot,
        cardAt,
        count: COUNT,
        cards: cardRefs.current,
      });

      /* ---- service preview follows the cursor ---- */
      const pvEl = previewRef.current;
      if (pvEl && activeRef.current) {
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
        if (pvEl.firstElementChild) pvEl.firstElementChild.style.transformOrigin = `${pv.left ? "100%" : "0%"} ${pv.below ? "0%" : "100%"}`;
        if (pv.fresh || reduced) {
          pv.x = left;
          pv.y = top;
          pv.vx = 0;
          pv.vy = 0;
          pv.fresh = false;
        } else {
          [pv.x, pv.vx] = spring(pv.x, left, pv.vx, 260, 28, dt / 60);
          [pv.y, pv.vy] = spring(pv.y, top, pv.vy, 260, 28, dt / 60);
        }
        pvEl.style.transform = `translate3d(${pv.x}px,${pv.y}px,0)`;
      }

      /* ---- mouse parallax on the scene layers ---- */
      if (finePointer && !reduced) {
        const p = s.par;
        [p.x, p.vx] = spring(p.x, p.tx, p.vx, 40, 18, dt / 60);
        [p.y, p.vy] = spring(p.y, p.ty, p.vy, 40, 18, dt / 60);
        for (const el of parallaxEls) {
          const d = +el.dataset.depth;
          el.style.setProperty("--px", `${-p.x * d}px`);
          el.style.setProperty("--py", `${-p.y * d * 0.5}px`);
        }
      }
    });

    return () => {
      unsub();
      window.removeEventListener("pointermove", onPointer);
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
          <div className="rg-scene rg-parallax" data-depth="10" aria-hidden="true">
            <div className="rg-scene-grain" />
          </div>

          <Petals data={BACK_PETALS} colorFor={BACK_COLORS} depth="22" />

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
                {/* 360° light sweep: track, beam, scan line (same 3D space as the cards) */}
                <OrbitScene refs={orbit} />
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
                          <img src={card.image} alt="" draggable={false} loading="lazy" />
                          {card.video && <video muted loop playsInline preload="none" poster={card.image} />}
                          {/* No solid label box any more – the picture stays fully visible.
                              Top-left: a small glass tag says which service this is.
                              Bottom: the title rises in as plain text over a soft shade on hover,
                              underlined in the service colour; a round arrow pops in top-right. */}
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

          <div className="rg-mist rg-atmosphere rg-parallax" data-depth="34" aria-hidden="true" />

          {/* 360° orbit header (top-left) + live card counter (top-right) */}
          <OrbitHud refs={orbit} count={COUNT} />
          <Petals data={FRONT_PETALS} colorFor={(i) => FRONT_COLORS[i]} depth="48" />
          <div className="rg-motes rg-atmosphere rg-parallax" data-depth="40" aria-hidden="true">
            {MOTES.map((d, i) => (
              <span
                key={i}
                className="rg-mote"
                style={{
                  "--left": `${d[0]}%`,
                  "--top": `${d[1]}%`,
                  "--size": `${d[2]}px`,
                  "--duration": `${d[3]}s`,
                  "--delay": `${d[4]}s`,
                }}
              />
            ))}
          </div>
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
                      // the hover preview's picture (if it is showing) flies into the service page's hero
                      const media = previewRef.current?.querySelector(".rg-preview-media img");
                      const mr = media && active === w.cat ? media.getBoundingClientRect() : null;
                      const pvw = PREVIEWS[w.cat];
                      setFocus(null); // close the hover preview, then open the service page
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

      {/* project preview that follows the cursor while a service word is hovered */}
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
