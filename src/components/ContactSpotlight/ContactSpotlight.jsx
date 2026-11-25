// Purpose: Implement the ContactSpotlight components module, keeping this responsibility separate for maintainability.
import { useLayoutEffect, useRef } from "react";
import { onFrame, scrollRect } from "@/lib/scroll";
import "./ContactSpotlight.css";

/* ------------------------------------------------------------------ *
 *  CONTACT SPOTLIGHT: the "CLICK" scroll animation (from contact-spotlight-react).
 *
 *  Six copies of the word CLICK cascade into a stack, then the "I" turns, drops
 *  and becomes a "CONTACT US" button. Same animation as the original, but it runs on the
 *  site's shared scroll loop (no GSAP / ScrollTrigger / second Lenis needed) and the
 *  button opens the "Talk to Our Experts" form.
 *
 *  Background = the Key Facts light palette: white (continues the FAQ above) fading to
 *  #D2D2D2 (continues into the footer below).
 * ------------------------------------------------------------------ */

const LETTERS = {
  square: {
    viewBox: "0 0 2458 700",
    paths: [
      "M500 238L500 0L70 0A70 70 0 0 0 0 70L0 630A70 70 0 0 0 70 700L500 700L500 462L383.3 462L383.3 583.3L130.7 583.3A14 14 0 0 1 116.7 569.3L116.7 130.7A14 14 0 0 1 130.7 116.7L383.3 116.7L383.3 238Z",
      "M620.5 700H1024.7V594.3H737.2V0H620.5Z",
      "M1237.1 0H1120.5V700H1237.1Z",
      "M1796.7 238L1796.7 0L1366.7 0A70 70 0 0 0 1296.7 70L1296.7 630A70 70 0 0 0 1366.7 700L1796.7 700L1796.7 462L1680 462L1680 583.3L1427.3 583.3A14 14 0 0 1 1413.3 569.3L1413.3 130.7A14 14 0 0 1 1427.3 116.7L1680 116.7L1680 238Z",
      "M1917.2 700H2033.9V490L2122.6 386.2L2320 700H2457.7L2203.4 303L2453.3 0H2308.2L2137.4 209.5C2094.6 263.1 2062.7 307.2 2032.1 357.5L2033.9 207.7V0H1917.2Z"
    ],
  },
  round: {
    viewBox: "0 0 2609 700",
    paths: [
      "M298 709.4C451.8 709.4 554.9 600.9 572.8 467H454.8C440 549.7 377.1 597.1 299.3 597.1C193.6 597.1 117.1 511.1 117.1 350.5C117.1 191.7 193.1 102.9 299.7 102.9C377.5 102.9 440.4 150.3 454.8 233H572.4C551.8 79.9 440.8 -9.4 298 -9.4C128 -9.4 0 124 0 350.5C0 576 126.7 709.4 298 709.4Z",
      "M673.8 700H1078V594.3H790.5V0H673.8Z",
      "M1290.4 0H1173.8V700H1290.4Z",
      "M1693 709.4C1846.7 709.4 1949.9 600.9 1967.8 467H1849.8C1834.9 549.7 1772 597.1 1694.3 597.1C1588.5 597.1 1512.1 511.1 1512.1 350.5C1512.1 191.7 1588.1 102.9 1694.7 102.9C1772.5 102.9 1835.4 150.3 1849.8 233H1967.3C1946.8 79.9 1835.8 -9.4 1693 -9.4C1523 -9.4 1395 124 1395 350.5C1395 576 1521.7 709.4 1693 709.4Z",
      "M2068.8 700H2185.5V490L2274.2 386.2L2471.6 700H2609.3L2355 303L2604.9 0H2459.8L2289 209.5C2246.2 263.1 2214.3 307.2 2183.7 357.5L2185.5 207.7V0H2068.8Z"
    ],
  },
};
const I_INDEX = 2;
const HEADER_COPIES = 6; // stacked layers (the last one is the front layer)
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

export default function ContactSpotlight({
  labelText = "Contact Us",
  squareC = true, // squared "C" (block edges), false = round "C"
  onContact, // default: opens the "Talk to Our Experts" form
}) {
  const letters = squareC ? LETTERS.square : LETTERS.round;
  const rootRef = useRef(null);
  const frontSvgRef = useRef(null);
  const iGroupRef = useRef(null);
  const iPathRef = useRef(null);
  const rectRef = useRef(null);
  const labelRef = useRef(null);
  const contactRef = useRef(onContact);
  contactRef.current = onContact;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const section = root.querySelector(".spotlight");
    const headers = Array.from(root.querySelectorAll(".spotlight-header"));
    const svg = frontSvgRef.current;
    const group = iGroupRef.current;
    const iPath = iPathRef.current;
    const rect = rectRef.current;
    const label = labelRef.current;

    /* ---------- geometry of the "I" ---------- */
    const b = iPath.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const stemWidth = b.width;
    const finalThickness = b.height / 4.3; // button is ~4.3 : 1
    rect.setAttribute("x", cx - stemWidth / 2);
    rect.setAttribute("y", b.y);
    rect.setAttribute("width", stemWidth);
    rect.setAttribute("height", b.height);
    label.setAttribute("x", cx);
    label.setAttribute("y", cy);
    label.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
    label.textContent = "";

    /* ---------- label scramble (replaces GSAP ScrambleText) ---------- */
    const TEXT = labelText.toUpperCase();
    let amt = 0; // 0 = hidden, 1 = fully revealed
    let dir = 0; // +1 reveal, -1 hide
    let last = 0;
    let scrambleRaf = 0;
    const renderLabel = () => {
      if (amt <= 0) {
        label.textContent = "";
        return;
      }
      const k = Math.floor(amt * TEXT.length);
      let s = "";
      for (let i = 0; i < TEXT.length; i++) {
        s += i < k || TEXT[i] === " " ? TEXT[i] : CHARS[(Math.random() * CHARS.length) | 0];
      }
      label.textContent = s;
    };
    const stepScramble = (t) => {
      const dt = last ? t - last : 16;
      last = t;
      amt = clamp(amt + (dir * dt) / 750);
      renderLabel();
      if ((dir > 0 && amt < 1) || (dir < 0 && amt > 0)) scrambleRaf = requestAnimationFrame(stepScramble);
      else {
        dir = 0;
        last = 0;
      }
    };
    const setReveal = (on) => {
      dir = on ? 1 : -1;
      last = 0;
      cancelAnimationFrame(scrambleRaf);
      scrambleRaf = requestAnimationFrame(stepScramble);
    };

    /* ---------- responsive values ---------- */
    const viewBoxWidth = svg.viewBox.baseVal.width;
    let slideDistance = 0;
    let targetScale = 1;
    let shiftStep = 0;
    const measure = () => {
      const w = window.innerWidth;
      const isPhone = w < 768;
      const isTablet = w >= 768 && w < 1024;
      const cs = getComputedStyle(headers[0]);
      const svgW = headers[0].clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const pxPerUnit = svgW / viewBoxWidth;
      const pad = parseFloat(cs.paddingTop) || 24;
      const headerHeight = headers[0].offsetHeight; // layout size: not affected by the scale
      const frontScale = 1 - (headers.length - 1) * 0.075;
      shiftStep = isPhone
        ? 22
        : isTablet
          ? 18
          : Math.max(0, w * 0.0244 - 0.075 * headerHeight);
      const frontShift = shiftStep * (headers.length - 1);
      const targetButtonPx = isPhone
        ? Math.min(w * 0.42, 180)
        : isTablet
          ? Math.min(w * 0.27, 232)
          : Math.max(150, w * 0.115);
      targetScale = targetButtonPx / (b.height * pxPerUnit * frontScale);
      const btnHeightPx = targetButtonPx / 4.3;
      const frontBottomPx = headerHeight + frontShift;
      const minCenterPx = frontBottomPx + btnHeightPx * 0.65 + 14;
      const maxCenterPx = section.clientHeight - btnHeightPx * 0.65 - 16;
      const idealCenterPx = section.clientHeight * (isPhone ? 0.82 : isTablet ? 0.84 : 0.74);
      const targetCenterPx =
        minCenterPx <= maxCenterPx
          ? clamp(idealCenterPx, minCenterPx, maxCenterPx)
          : Math.min(maxCenterPx, (minCenterPx + maxCenterPx) * 0.5);
      const startCenterPx = pad + cy * pxPerUnit;
      const needed = headerHeight - (headerHeight + frontShift - targetCenterPx) / frontScale;
      slideDistance = (needed - startCenterPx) / pxPerUnit;
    };
    measure();

    /* ---------- the scroll animation ---------- */
    let lastP = -1;
    let revealed = false;
    const update = () => {
      const r = scrollRect(section);
      // starts when the section's top reaches 70 % of the screen, ends when its bottom does
      const sp = clamp((window.innerHeight * 0.7 - r.top) / r.height);
      if (sp === lastP) return;
      lastP = sp;

      // 0 -> 0.5 : the layers cascade
      const cp = Math.min(sp / 0.5, 1);
      headers.forEach((h, i) => {
        const s = lerp(1, 1 - i * 0.075, cp);
        const y = i * shiftStep * cp;
        h.style.transform = `translate3d(0,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})`;
      });

      // 0.5 -> 1 : the "I" rotates, drops and becomes the button
      const p = clamp((sp - 0.5) / 0.5);
      const rot = lerp(0, 90, p);
      const y = lerp(0, slideDistance, p);
      const sc = lerp(1, targetScale, p);
      group.setAttribute(
        "transform",
        `translate(0 ${y}) translate(${cx} ${cy}) rotate(${rot}) scale(${sc}) translate(${-cx} ${-cy})`
      );
      const t = lerp(stemWidth, finalThickness, p);
      rect.setAttribute("width", t);
      rect.setAttribute("x", cx - t / 2);
      // the corners soften as it becomes a button (same curve as the other buttons on the site)
      const rr = (finalThickness * 0.17 * p).toFixed(2);
      rect.setAttribute("rx", rr);
      rect.setAttribute("ry", rr);

      // the label scrambles in at 75 %
      if (sp > 0.75 && !revealed) {
        revealed = true;
        group.classList.add("is-ready");
        group.setAttribute("tabindex", "0");
        setReveal(true);
      } else if (sp < 0.75 && revealed) {
        revealed = false;
        group.classList.remove("is-ready");
        group.setAttribute("tabindex", "-1");
        setReveal(false);
      }
    };

    const openContact = () => {
      if (!revealed) return;
      if (contactRef.current) contactRef.current();
      else window.dispatchEvent(new Event("clicktots:talk"));
    };
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openContact();
      }
    };
    group.addEventListener("click", openContact);
    group.addEventListener("keydown", onKey);

    const onResize = () => {
      measure();
      lastP = -1;
      update();
    };
    window.addEventListener("resize", onResize);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(section);

    update();
    const off = onFrame(update);

    return () => {
      off();
      ro?.disconnect();
      cancelAnimationFrame(scrambleRaf);
      window.removeEventListener("resize", onResize);
      group.removeEventListener("click", openContact);
      group.removeEventListener("keydown", onKey);
    };
  }, [labelText, squareC]);

  return (
    <div ref={rootRef} id="contact" data-text-fade="off" className="contact-spotlight">
      <section className="spotlight" aria-label="Contact us">
        {Array.from({ length: HEADER_COPIES }, (_, h) => {
          const isFront = h === HEADER_COPIES - 1;
          return (
            <div className="spotlight-header" key={h} aria-hidden={!isFront}>
              <svg
                ref={isFront ? frontSvgRef : null}
                xmlns="http://www.w3.org/2000/svg"
                viewBox={letters.viewBox}
                preserveAspectRatio="xMidYMid meet"
                role={isFront ? "img" : undefined}
                aria-label={isFront ? "Click" : undefined}
              >
                {letters.paths.map((d, i) =>
                  isFront && i === I_INDEX ? null : <path key={i} d={d} />
                )}
                {isFront && (
                  <g
                    ref={iGroupRef}
                    className="i-button"
                    role="link"
                    aria-label={labelText}
                    tabIndex={-1}
                  >
                    <path ref={iPathRef} d={letters.paths[I_INDEX]} />
                    <rect ref={rectRef} />
                    <text ref={labelRef} className="i-link-text" />
                  </g>
                )}
              </svg>
            </div>
          );
        })}
      </section>
    </div>
  );
}
