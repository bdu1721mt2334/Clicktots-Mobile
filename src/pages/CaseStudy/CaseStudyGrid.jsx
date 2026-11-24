// Purpose: the 3 × 3 case-study grid on /case-study — the "Dynamic Grid Gallery" (Originkit / useLayouts, MIT),
//   ported from the Framer component into a plain React component:
//   the tile you point at takes the stage (its row and column grow, the others give way), the picture eases in
//   a touch and the case title + summary fade up. Works with hover, focus (Tab + arrow keys) and tap.
//   Every tile always shows its sector and title at the bottom; clicking opens /case-study/<slug> and the
//   picture flies to the front (caseFlight.js → CaseStudyDetail.jsx). Coming back ("All case studies"), the
//   picture flies from the detail frame home into its own tile while the other tiles fade back in.
//   Phones: a simple 1-column list.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import { CASE_STUDIES } from "./caseStudyData";
import { openCase, takeHomecoming, tileCrop, FRAME_CROP } from "./caseFlight";

const EASE = "cubic-bezier(0.25, 1, 0.5, 1)";
const SHRINK = 0.9; // the tiles that give way
const EXPAND = 1.95; // the tile on stage
const COLS = 3;

const tracks = (count, active) =>
  Array.from({ length: count }, (_, i) => (active === null ? "1fr" : i === active ? `${EXPAND}fr` : `${SHRINK}fr`)).join(" ");


const HOME_MS = 900;
const GLIDE = "cubic-bezier(0.76, 0, 0.24, 1)";

export default function CaseStudyGrid({ onOpen }) {
  const [active, setActive] = useState(null);
  const list = CASE_STUDIES;
  const gridRef = useRef(null);

  /* ── homecoming: the picture flies back from the detail page into its tile ── */
  const flyRef = useRef(null);
  const [home] = useState(() => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? null : takeHomecoming()));
  const homeIndex = home ? list.findIndex((c) => c.slug === home.slug) : -1;
  // "flying" → the tile waits (picture hidden) · "landed" → tile picture shown under the flyer · false → done
  const [homing, setHoming] = useState(homeIndex >= 0 ? "flying" : false);

  useEffect(() => {
    if (homeIndex < 0) return undefined; // runs once on mount; cancelled only if the grid unmounts mid-flight
    // runs after the overlay has restored the list's scroll position, so the tile is where it will be seen
    const fly = flyRef.current;
    const flyImg = fly?.querySelector("img");
    const img = gridRef.current?.children[homeIndex]?.querySelector("img");
    if (!fly || !img) {
      setHoming(false);
      return undefined;
    }
    const from = home.rect;
    const to = img.getBoundingClientRect();
    const at = (r, radius) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${radius}px` });
    const anim = fly.animate(
      [
        { ...at(from, 24), boxShadow: "0 50px 110px -50px rgba(10, 132, 255,.45)" },
        { offset: 0.5, ...at({ left: (from.left + to.left) / 2, top: (from.top + to.top) / 2 - 30, width: (from.width + to.width) / 2, height: (from.height + to.height) / 2 }, 20), boxShadow: "0 70px 120px -40px rgba(0,0,0,.9)" },
        { ...at(to, 14), boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)" },
      ],
      { duration: HOME_MS, easing: GLIDE, fill: "both" },
    );
    // the crop glides from the frame's (centred) to the tile's band, so nothing jumps on landing
    const crop = flyImg?.animate([{ objectPosition: FRAME_CROP }, { objectPosition: home.crop }], { duration: HOME_MS, easing: GLIDE, fill: "both" });
    // on landing the tile shows its own picture under the flyer, then the flyer is removed (next effect)
    anim.onfinish = () => setHoming("landed");
    return () => {
      anim.cancel();
      crop?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // landed: the tile's own picture is showing under the flyer; drop the flyer once it has painted (2 frames)
  useEffect(() => {
    if (homing !== "landed") return undefined;
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setHoming(false))));
    return () => cancelAnimationFrame(raf);
  }, [homing]);
  const rows = Math.ceil(list.length / COLS);
  const activeRow = active === null ? null : Math.floor(active / COLS);
  const activeCol = active === null ? null : active % COLS;

  const move = (e, i) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(i, e.currentTarget);
      return;
    }
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key];
    if (step === undefined) return;
    const next = i + step;
    if (next < 0 || next >= list.length) return;
    e.preventDefault();
    e.currentTarget.parentElement?.children[next]?.focus();
  };

  const [picked, setPicked] = useState(null);
  const open = (i, tile) => {
    if (picked !== null) return;
    const img = tile.querySelector("img");
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPicked(i);
    onOpen?.();
    // the other tiles and the page text fade out, then the picked picture flies to the front
    openCase(list[i], img, { delay: still ? 0 : 340 });
  };

  return (
    <div
      className={`csg${picked !== null ? " is-picked" : ""}${home ? " is-home" : ""}`}
      onMouseLeave={() => setActive(null)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setActive(null);
      }}
    >
      <div
        ref={gridRef}
        className="csg-grid"
        role="list"
        style={{ gridTemplateColumns: tracks(COLS, activeCol), gridTemplateRows: tracks(rows, activeRow) }}
      >
        {list.map((item, i) => {
          const on = active === i;
          return (
            <div
              key={item.slug}
              role="listitem"
              tabIndex={0}
              aria-label={`${item.title} – open case study`}
              className="csg-tile"
              data-on={on}
              data-picked={picked === i}
              data-homing={i === homeIndex && homing ? homing : "false"}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onPointerDown={(e) => e.pointerType !== "mouse" && !on && setActive(i)}
              onClick={(e) => open(i, e.currentTarget)}
              onKeyDown={(e) => move(e, i)}
            >
              <img
                src={item.image}
                alt={item.title}
                draggable={false}
                loading="eager"
                style={{ objectPosition: tileCrop(item.offsetY) }}
              />
              <div className="csg-shade csg-shade--rest" style={{ opacity: on ? 0 : 1 }} />
              <div className="csg-shade csg-shade--on" style={{ opacity: on ? 1 : 0 }} />

              <span className="csg-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="csg-chip">{item.sector}</span>

              <div className="csg-label">
                <p className="csg-title">{item.title}</p>
                <div className="csg-more">
                  <p className="csg-sum">{item.summary}</p>
                  <span className="csg-cta">
                    View case study <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* the picture flying home (fixed to the screen, above everything) */}
      {homing &&
        createPortal(
          <div
            ref={flyRef}
            aria-hidden="true"
            style={{ position: "fixed", zIndex: 9600, overflow: "hidden", pointerEvents: "none", background: "#121826", left: home.rect.left, top: home.rect.top, width: home.rect.width, height: home.rect.height, borderRadius: 24 }}
          >
            <img src={home.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>,
          document.body,
        )}
    </div>
  );
}

export const gridCss = `
.csg{width:100%;user-select:none}
.csg-grid{display:grid;width:100%;height:min(92svh,980px);gap:10px;transition:grid-template-columns .5s ${EASE},grid-template-rows .5s ${EASE}}
.csg-tile{position:relative;min-width:0;min-height:0;overflow:hidden;border-radius:14px;background:#121826;cursor:pointer;outline:none;contain:layout paint}
.csg-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.98) contrast(1.04);pointer-events:none;transition:transform .7s ${EASE}}
.csg-tile[data-on="true"] img{transform:scale(1.05)}
.csg-tile:focus-visible::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 2px #fff;pointer-events:none}
.csg-tile{transition:opacity .34s ease,filter .34s ease}
.csg.is-picked .csg-tile[data-picked="false"]{opacity:0;filter:blur(6px)}
.csg.is-picked .csg-label,.csg.is-picked .csg-chip,.csg.is-picked .csg-num{opacity:0;transition:opacity .25s ease}
/* homecoming: the tile waits for its picture (only the label is hidden – the picture stays underneath the
   flyer, so the hand-over is seamless), the others fade back in */
.csg-tile[data-homing="flying"] img{opacity:0}
.csg-tile[data-homing="flying"] .csg-shade,.csg-tile[data-homing="landed"] .csg-shade{opacity:0!important}
.csg-tile[data-homing="flying"] .csg-label,.csg-tile[data-homing="flying"] .csg-chip,.csg-tile[data-homing="flying"] .csg-num,
.csg-tile[data-homing="landed"] .csg-label,.csg-tile[data-homing="landed"] .csg-chip,.csg-tile[data-homing="landed"] .csg-num{opacity:0}
.csg-tile .csg-label,.csg-tile .csg-chip,.csg-tile .csg-num{transition:opacity .35s ease}
.csg.is-home .csg-tile[data-homing="false"]{animation:csg-back .7s ${EASE} both}
.csg.is-home .csg-tile:nth-child(3n+2){animation-delay:.06s}
.csg.is-home .csg-tile:nth-child(3n){animation-delay:.12s}
@keyframes csg-back{from{opacity:0;filter:blur(6px);transform:scale(.97)}to{opacity:1;filter:none;transform:none}}
.csg-shade{position:absolute;inset:0;pointer-events:none;transition:opacity .4s ${EASE}}
.csg-shade--rest{background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.08) 55%,rgba(0,0,0,.18))}
.csg-shade--on{background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.25) 50%,rgba(0,0,0,0) 75%)}
.csg-num{position:absolute;right:14px;top:12px;font-size:11px;letter-spacing:.12em;color:rgba(255,255,255,.7)}
.csg-chip{position:absolute;left:12px;top:12px;padding:5px 10px;border-radius:999px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(10,10,10,.45);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.csg-label{position:absolute;left:14px;right:14px;bottom:14px;color:#fff;pointer-events:none}
.csg-title{margin:0;font-size:clamp(11px,.95vw,14px);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;transition:font-size .4s ${EASE}}
.csg-tile[data-on="true"] .csg-title{font-size:clamp(12px,1.15vw,16px)}
.csg-more{max-height:0;opacity:0;overflow:hidden;margin-top:0;transform:translateY(8px);transition:max-height .45s ${EASE},opacity .3s ease,transform .45s ${EASE},margin-top .45s ${EASE}}
.csg-tile[data-on="true"] .csg-more{max-height:150px;opacity:1;margin-top:8px;transform:translateY(0);transition:max-height .45s ${EASE},opacity .35s ease .06s,transform .45s ${EASE},margin-top .45s ${EASE}}
.csg-sum{margin:8px 0 0;max-width:46ch;font-size:12px;line-height:1.55;color:rgba(255,255,255,.75);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.csg-cta{display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;letter-spacing:.06em;color:#8cc6ff}
@media (min-width:768px) and (max-width:1023px){
  .csg-grid{height:min(76svh,760px)}
  .csg-title{font-size:clamp(10px,1.15vw,13px)}
  .csg-chip{font-size:9px;padding:4px 8px}
}
/* phones: picture with only the sector chip (top) and a short headline (bottom) inside it */
@media (max-width:767px){
  .csg-grid{display:flex;flex-direction:column;height:auto;gap:14px}
  .csg-tile{height:auto;aspect-ratio:16/10;border-radius:14px}
  .csg-tile img{transform:none!important}
  .csg-shade--on{display:none!important}
  .csg-shade--rest{opacity:1!important;background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,.15) 55%,rgba(0,0,0,.25))}
  .csg-more,.csg-num{display:none!important}
  .csg-chip{font-size:9px;padding:4px 9px;top:10px;left:10px}
  .csg-label{left:12px;right:12px;bottom:12px}
  .csg-title,.csg-tile[data-on="true"] .csg-title{font-size:12px;line-height:1.4;-webkit-line-clamp:2}
}
@media (prefers-reduced-motion:reduce){.csg-grid,.csg-tile img,.csg-shade,.csg-more{transition:none}.csg-tile[data-on="true"] img{transform:none}}
`;