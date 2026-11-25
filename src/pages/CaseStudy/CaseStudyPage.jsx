// Purpose: Case Study page (/case-study) – intro ported from the IronStride HTML / CSS / JS source, then the grid.
//   Intro (GSAP, same timings as the source):
//     1. preloader: "Case Study" letters roll inside the rounded window, the white bar fills with a stutter
//        ease, the window zooms out and the office photo settles from 1.2× to 1×
//     2. hero: the eyebrow drops in, the logo + scroll button fade in from blur, "Case Study" slides in letter
//        by letter, then the lede
//   Below: "Selected work" heading + the 3 × 3 Dynamic Grid Gallery (CaseStudyGrid.jsx). Clicking a tile fades
//   the page text out, then the picture flies to the front on /case-study/<slug> (CaseStudyDetail.jsx).
//   skipIntro: coming back from a case study, the hero is shown finished (no second preloader).
//   All GSAP work runs inside gsap.context(root), so it is reverted when the page closes.
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown } from "lucide-react";
import CaseStudyGrid, { gridCss } from "./CaseStudyGrid";
import { CASE_STUDIES } from "./caseStudyData";
import "./caseStudy.css";

/* registered when the page first opens (not when the site loads): ScrollTrigger adds its own scroll
   listener + per-frame loop to the whole site as soon as it is registered */
let gsapReady = false;
function setupGsap() {
  if (gsapReady) return;
  gsapReady = true;
  gsap.registerPlugin(CustomEase, SplitText, ScrollTrigger);
  CustomEase.create(
    "stutterEase",
    "M0,0 C0,0 0.052,0.1 0.152,0.1 0.242,0.1 0.299,0.349 0.399,0.349 0.586,0.349 0.569,0.596 0.67,0.624 0.842,0.671 0.95,0.95 1,1"
  );
}

const HERO_IMG = "/case-study/hero-office.webp";

export default function CaseStudyPage({ scrollRef, skipIntro = false, leaving = false, onOpenCase }) {
  const root = useRef(null);

  useLayoutEffect(() => {
    setupGsap();
    const el = root.current;
    if (!el) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;

    const ctx = gsap.context(() => {
      /* reduced motion, or back from a case study: show the finished hero */
      if (reduced || skipIntro) {
        gsap.set("[data-text-anim]", { visibility: "visible" });
        gsap.set(".preloader-progress-bar, .preloader-mask", { autoAlpha: 0, display: "none" });
        gsap.set(".hero-img img", { scale: 1 });
        return;
      }

      const textAnimations = {
        logoAnimation: (target) => {
          const split = SplitText.create(target, { type: "chars", smartWrap: true, mask: "chars" });
          split.chars.forEach((charEl) => {
            const text = charEl.innerText;
            charEl.innerHTML = "";
            const ogDiv = document.createElement("div");
            ogDiv.className = "og-char";
            ogDiv.innerText = text;
            const dupDiv = document.createElement("div");
            dupDiv.className = "duplicate-char";
            dupDiv.innerText = text;
            charEl.appendChild(ogDiv);
            charEl.appendChild(dupDiv);
          });
          gsap.from(split.chars, { yPercent: -100, ease: "power2.inOut", stagger: { each: 0.02, from: "random" }, duration: 0.5, repeat: 1, repeatDelay: 0.75 });
        },
        headerAnimation: (target) => {
          const split = SplitText.create(target, { type: "chars", smartWrap: true, mask: "chars", charsClass: "header-char" });
          gsap.from(split.chars, { xPercent: -100, ease: "power2.inOut", stagger: { each: 0.02, from: "random" }, duration: 0.5 });
        },
        bodyAnimation: (target) => {
          SplitText.create(target, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                opacity: 0,
                yPercent: -100,
                duration: 0.9,
                stagger: 0.1,
                ease: "power3.inOut",
                scrollTrigger: { trigger: target, start: "top 90%", scroller: scrollRef?.current || undefined },
              }),
          });
        },
      };

      // waits for the web font so SplitText measures the real glyphs
      const animateText = (selector) => {
        document.fonts.ready.then(() => {
          if (cancelled) return;
          const target = el.querySelector(selector);
          if (!target) return;
          ctx.add(() => {
            gsap.set(target, { visibility: "visible" });
            const fn = textAnimations[target.dataset.textAnim];
            if (fn) fn(target);
          });
        });
      };

      const preloaderAnimation = () =>
        gsap
          .timeline()
          .call(animateText, [".logo-text"])
          .to(".preloader-bg", { scaleX: 1, ease: "stutterEase", duration: 2.8 })
          .to(".preloader-mask", { scale: 18, duration: 0.9, ease: "expoScale(0.5,7,power1.in)" })
          .to(".preloader-bg, .preloader-logo, .preloader-progress-bar", { opacity: 0, duration: 0.85, ease: "power2.inOut" }, "<")
          .to(".hero-img img", { scale: 1, duration: 2.85, ease: "expoScale(0.5,7,power1.out)" }, "<")
          // out of the way of clicks AND out of the layout: the mask is scaled 18× here, and even hidden it would
          // stretch the scroll area many screens below the grid (the page "kept scrolling" after the last case)
          .set(".preloader-mask, .preloader-progress-bar", { autoAlpha: 0, display: "none" });

      const heroAnimation = () =>
        gsap
          .timeline()
          .call(animateText, [".hero-eyebrow"])
          .fromTo(".divider", { scaleY: 0, transformOrigin: "top" }, { scaleY: 1, duration: 0.5, ease: "back.inOut" }, "+=.5")
          .fromTo(
            "[data-fade-in]",
            {
              filter: "blur(30px)",
              opacity: 0,
              yPercent: (i, node) => (node.getAttribute("data-fade-in") === "down" ? -100 : 0),
              xPercent: (i, node) => (node.getAttribute("data-fade-in") === "left" ? 100 : 0),
            },
            { yPercent: 0, xPercent: 0, filter: "blur(0px)", opacity: 1, duration: 1.25, ease: "power4.inOut", stagger: 0.08 },
            "<-.25"
          )
          .call(animateText, ["h1"], "<.55")
          .call(animateText, [".hero-lede"], "-=.75");

      gsap.timeline().add(preloaderAnimation()).add(heroAnimation(), "-=2.4");
    }, el);

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, [scrollRef, skipIntro]);

  const toWork = () => {
    const sc = scrollRef?.current;
    const target = root.current?.querySelector("#cs-work");
    if (!sc || !target) return;
    const y = sc.scrollTop + target.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    if (sc.__lenis) sc.__lenis.scrollTo(y, { duration: 1.2 });
    else sc.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div ref={root} className={`cs-iron${leaving ? " is-leaving" : ""}`}>
      <style>{gridCss}</style>
      {/* one calm background for the whole page (hero and work flow into each other – no seam) */}
      <div className="cs-bg" aria-hidden="true" />
      <div className="cs-container">
        <header className="header" aria-hidden="true" />

        <div className="preloader-progress-bar" data-text-fade="off">
          <div className="preloader-bg" />
          <div className="preloader-logo">
            <p className="logo-text" data-text-anim="logoAnimation">
              Case Study
            </p>
          </div>
        </div>
        <div className="preloader-mask" />

        <section className="hero-section" data-text-fade="off">
          <div className="wrapper">
            {/* the photo sits in a rounded frame (same width as a case-study page), the copy on top of it */}
            <div className="hero-frame">
              <div className="hero-img">
                <img src={HERO_IMG} alt="Two Clicktots strategists reviewing campaign results on a laptop" />
              </div>
              <div className="hero-content">
                <div className="content-main">
                  <p className="hero-eyebrow" data-text-anim="bodyAnimation">
                    Client stories · From brief to measurable growth
                  </p>
                  <div className="divider" />
                  <h1 data-text-anim="headerAnimation" aria-label="Case Study">
                    Case
                    <br />
                    Study
                  </h1>
                  <p className="hero-lede" data-text-anim="bodyAnimation">
                    Behind every result is a working session like this one: real data on the table, a clear goal and a
                    team that owns the outcome.
                  </p>
                </div>

                {/* just a small scroll button – keeps the people in the photo clear */}
                <button type="button" className="hero-scroll" data-fade-in="left" onClick={toWork}>
                  <span>Explore the work</span>
                  <span className="btn-icon">
                    <ArrowDown size={14} color="#fff" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* the work */}
        <section id="cs-work" className="cs-work">
          <div className="wrapper">
            <div className="cs-work-head">
              <p className="cs-work-k">Selected work · {CASE_STUDIES.length} stories</p>
              <h2 className="cs-work-h">Problems we solved, and what changed after.</h2>
              <p className="cs-work-p">Point at a story to bring it forward. Open it for the full brief, the plan and the results.</p>
            </div>
            <div data-text-fade="off">
              <CaseStudyGrid onOpen={onOpenCase} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}