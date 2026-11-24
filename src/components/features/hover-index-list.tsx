// Purpose: Implement the hover-index-list components module, keeping this responsibility separate for maintainability.
/**
 * HoverIndexList, an editorial, numbered index. Hovering a row brings up a
 * photograph that trails the cursor on a spring (tilting with its velocity)
 * while the row slides and the others step back. Every row also opens in place
 * with a short brief and highlights; on touch screens the photo appears inline.
 *
 * Used on this site for "Awards & Milestones" (5 rows, one per photograph).
 *
 * Props: eyebrow, title, intro, items ({ id, title, tag, meta, body,
 * highlights[], src, alt, pos? }).
 * CSS vars: --fd-hil-paper, --fd-hil-ink, --fd-hil-red.
 *
 * Browser support: all evergreen browsers; expand uses grid-template-rows
 * interpolation (Chrome 107+, Safari 16+, Firefox 66+).
 * Motion: a single rAF spring (stiffness 380, damping 30) moves the floating
 * photo with transform only, and stops when it settles.
 * Accessibility: each row is a button with aria-expanded controlling its
 * panel; the floating photo is decorative (aria-hidden) because the same image
 * with alt text sits inside the panel. Keyboard focus shows the photo pinned to
 * the focused row.
 * Reduced motion: the photo appears in place without trailing or tilt.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface HilItem {
  id: string;
  title: string;
  tag: string;
  /** short label on the right of the row (e.g. "Season 2", "Press feature") */
  meta: string;
  body: string;
  highlights: string[];
  src: string;
  alt: string;
  /** CSS object-position for the photo crop, e.g. "50% 30%" */
  pos?: string;
}

export interface HoverIndexListProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  intro?: ReactNode;
  items?: HilItem[];
  className?: string;
}

/* Five rows, one per photograph (files live in public/awards/).
   Edit titles, text and highlights here. */
export const DEFAULT_ITEMS: HilItem[] = [
  {
    id: "wow",
    title: "Women of Wonder",
    tag: "Award of Achievement",
    meta: "Season 2",
    body: "Honoured with the Award of Achievement at Women of Wonder, Season 2, an evening celebrating womenhood. Priya Sambath was presented the WOW Performer of Business & Profession title in the advertising agency category. The recognition belongs to the people behind the work, and it sets the bar for how we use AI: human judgement first, technology as the multiplier.",
    highlights: ["WOW Award · Season 2", "Award of Achievement", "Business & Profession · Advertising Agency"],
    src: "/awards/wow-award.webp",
    alt: "Priya Sambath receiving the Women of Wonder Season 2 Award of Achievement on stage",
    pos: "50% 55%",
  },
  {
    id: "entrepreneur",
    title: "Woman Entrepreneur",
    tag: "Digital marketing & advertising",
    meta: "Press feature",
    body: "Named Outstanding Woman Entrepreneur in Digital Marketing & Advertising, in a feature on the powerhouses driving Tamil Nadu. Accepted by Priya Sambath, Founder & Director of Clicktots Technologies. It reflects the leadership that steers our AI-first approach, putting new tools to work only where they earn results for clients.",
    highlights: ["Outstanding Woman Entrepreneur", "Digital Marketing & Advertising", "Founder & Director, Clicktots Technologies"],
    src: "/awards/woman-entrepreneur.webp",
    alt: "Priya Sambath holding an excellence trophy and framed certificate between two presenters",
    pos: "50% 30%",
  },
  {
    id: "honour",
    title: "Women’s Honour",
    tag: "Stage felicitation",
    meta: "Honour",
    body: "A felicitation on stage with a trophy, a framed certificate and a sash, at an event celebrating women achievers. Proof that the work being done at Clicktots is being noticed. Every honour like this reminds the team that the craft behind the algorithm is what clients remember.",
    highlights: ["Trophy & framed certificate", "Celebrating women achievers", "Felicitated on stage"],
    src: "/awards/womens-honour.webp",
    alt: "Priya Sambath on stage in a black saree with a sash, receiving a trophy and certificate",
    pos: "50% 35%",
  },
  {
    id: "certificate",
    title: "Certificate",
    tag: "Learning & leadership",
    meta: "In person",
    body: "A certificate received in person, a small moment in a long habit of learning that keeps the studio sharp. The best brands we build for are built by people who never stop studying. That habit is why the studio adopted AI workflows early, and why we keep testing them before they reach a client.",
    highlights: ["Certificate presented in person", "Always learning, always shipping"],
    src: "/awards/certificate.webp",
    alt: "Priya Sambath in a blue dress receiving a certificate from a presenter in an office hall",
    pos: "50% 30%",
  },
  {
    id: "summit",
    title: "NAS Summit",
    tag: "Global creators’ gathering",
    meta: "Mumbai",
    body: "Invited to the NAS Summit in Mumbai, a gathering of top global creators. Three days of trading notes with the people shaping how brands show up online, and a notebook of ideas brought back home. Many of those ideas, from AI-assisted content to new creator formats, now run inside our client campaigns.",
    highlights: ["NAS Summit · Mumbai", "Gathering of top global creators", "Ideas brought back to every client"],
    src: "/awards/nas-summit.webp",
    alt: "Priya Sambath standing in front of the Welcome to NAS Summit Mumbai banner",
    pos: "50% 45%",
  },
];

export function HoverIndexList({
  eyebrow = "Recognition",
  title = <>Awards &amp;<br />milestones</>,
  intro = "Five moments from the road so far. Hover a row to see the photograph, or open it for the story behind it.",
  items = DEFAULT_ITEMS,
  className,
}: HoverIndexListProps) {
  const [hot, setHot] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const float = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const state = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const raf = useRef(0);
  const fine = useRef(false);
  const reduced = useRef(false);
  const uid = useId();

  useEffect(() => {
    fine.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const apply = () => {
    const s = state.current, el = float.current;
    if (!el) return;
    const tilt = Math.max(-12, Math.min(12, s.vx * 0.012));
    el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${tilt}deg)`;
  };
  const run = () => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000); last = t;
      const s = state.current, g = target.current;
      const ax = -380 * (s.x - g.x) - 30 * s.vx, ay = -380 * (s.y - g.y) - 30 * s.vy;
      s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      apply();
      if (Math.abs(s.x - g.x) + Math.abs(s.y - g.y) < 0.3 && Math.abs(s.vx) + Math.abs(s.vy) < 2) { s.vx = s.vy = 0; s.x = g.x; s.y = g.y; apply(); raf.current = 0; return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const moveTo = (x: number, y: number, snap: boolean) => {
    target.current = { x, y };
    if (snap || reduced.current) { state.current = { x, y, vx: 0, vy: 0 }; apply(); return; }
    run();
  };
  const rel = (cx: number, cy: number) => {
    const r = root.current!.getBoundingClientRect();
    return [cx - r.left, cy - r.top] as const;
  };

  return (
    <section
      ref={root}
      className={`fd-hil${className ? " " + className : ""}`}
      aria-labelledby={`${uid}-h`}
      data-hot={hot !== null ? "" : undefined}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !fine.current) return;
        const [x, y] = rel(e.clientX, e.clientY);
        moveTo(x, y, hot === null);
      }}
    >
      <style>{css}</style>
      <div className="fd-hil-head">
        <p className="fd-hil-eyebrow"><span>{eyebrow}</span><span>({String(items.length).padStart(2, "0")})</span></p>
        <h2 id={`${uid}-h`} className="fd-hil-title">{title}</h2>
        <p className="fd-hil-intro">{intro}</p>
      </div>
      <ol className="fd-hil-list" onPointerLeave={() => setHot(null)}>
        {items.map((it, i) => {
          const isOpen = open === it.id;
          return (
            <li key={it.id} className="fd-hil-item" data-hot={hot === i ? "" : undefined} data-open={isOpen ? "" : undefined}>
              <button
                type="button"
                className="fd-hil-row"
                aria-expanded={isOpen}
                aria-controls={`${uid}-p-${i}`}
                onPointerEnter={(e) => { if (e.pointerType === "mouse" && fine.current) setHot(i); }}
                onFocus={(e) => {
                  if (!fine.current || !e.currentTarget.matches(":focus-visible")) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  const [x, y] = rel(r.right - 220, r.top + r.height / 2);
                  moveTo(x, y, hot === null);
                  setHot(i);
                }}
                onBlur={() => setHot(null)}
                onClick={() => setOpen(isOpen ? null : it.id)}
              >
                <span className="fd-hil-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="fd-hil-t">{it.title}</span>
                <span className="fd-hil-tag">{it.tag}</span>
                <span className="fd-hil-c">{it.meta}</span>
                <span className="fd-hil-x" aria-hidden="true"><i /><i /></span>
              </button>
              <div className="fd-hil-panel" id={`${uid}-p-${i}`} role="region" aria-label={it.title}>
                <div className="fd-hil-panel-in">
                  <img className="fd-hil-pimg" src={it.src} alt={it.alt} width={900} height={1125} loading="lazy" style={{ objectPosition: it.pos }} />
                  <p className="fd-hil-body">{it.body}</p>
                  <ul className="fd-hil-proj">
                    {it.highlights.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="fd-hil-float" ref={float} aria-hidden="true">
        <div className="fd-hil-frame">
          {items.map((it, i) => (
            <img key={it.id} src={it.src} alt="" width={900} height={1125} loading="lazy" data-on={hot === i ? "" : undefined} style={{ objectPosition: it.pos }} />
          ))}
          <span className="fd-hil-cap">{hot !== null ? `${String(hot + 1).padStart(2, "0")} / ${items[hot].highlights[0]}` : ""}</span>
        </div>
      </div>
    </section>
  );
}

const css = `
:where(.fd-hil,.fd-hil *){box-sizing:border-box;margin:0;padding:0;font:inherit;letter-spacing:inherit;color:inherit;text-decoration:none;list-style:none;border:0;background:none}
:where(.fd-hil,.fd-hil *)::before,:where(.fd-hil,.fd-hil *)::after{box-sizing:border-box}
:where(.fd-hil img){display:block}
:where(.fd-hil button){appearance:none;-webkit-appearance:none;outline:0;border-radius:0;cursor:pointer;text-align:left}
.fd-hil{
  --fd-ease-out:cubic-bezier(.22,1,.36,1);--fd-ease-in-out:cubic-bezier(.65,0,.35,1);--fd-spring:cubic-bezier(.34,1.56,.64,1);
  --fd-dur-1:120ms;--fd-dur-2:240ms;--fd-dur-3:420ms;--fd-dur-4:700ms;
  --fd-hil-paper:#E9E6DF;--fd-hil-ink:#121110;--fd-hil-mut:#6E6A62;--fd-hil-line:rgba(18,17,16,.22);--fd-hil-red:#C8321C;
  --fd-hil-serif:"Michroma", "Eurostile", "Arial Black", sans-serif;
  --fd-hil-sans:"Michroma", "Eurostile", "Arial Black", sans-serif;
  --fd-hil-mono:"Michroma", "Eurostile", "Arial Black", sans-serif;
  position:relative;display:block;width:100%;overflow:hidden;background:var(--fd-hil-paper);color:var(--fd-hil-ink);
  padding:clamp(56px,8vw,120px) clamp(16px,4vw,56px);font:400 15px/1.5 var(--fd-hil-sans);-webkit-font-smoothing:antialiased}
.fd-hil-head{max-width:1328px;margin:0 auto clamp(40px,6vw,80px);display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px;align-items:end}
.fd-hil-eyebrow{grid-column:1 / span 2;align-self:start;display:flex;justify-content:space-between;font:500 12px/16px var(--fd-hil-mono);letter-spacing:.04em;text-transform:uppercase;padding-top:14px;border-top:1px solid var(--fd-hil-ink)}
.fd-hil-title{grid-column:3 / span 6;font:400 clamp(3rem,8vw,7.5rem)/.88 var(--fd-hil-serif);letter-spacing:-.045em}
.fd-hil-intro{grid-column:10 / span 3;font:400 15px/1.55 var(--fd-hil-sans);color:var(--fd-hil-mut)}
.fd-hil-list{max-width:1328px;margin:0 auto;border-top:1px solid var(--fd-hil-ink)}
.fd-hil-item{border-bottom:1px solid var(--fd-hil-line);transition:opacity var(--fd-dur-3) var(--fd-ease-out)}
.fd-hil[data-hot] .fd-hil-item:not([data-hot]):not([data-open]){opacity:.32}
.fd-hil-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,6fr) minmax(0,2.4fr) minmax(0,1.4fr) 28px;gap:24px;align-items:center;width:100%;padding:22px 0 20px;color:var(--fd-hil-ink);cursor:pointer}
.fd-hil-row:focus-visible{outline:2px solid rgba(200,50,28,.7);outline-offset:2px}
.fd-hil-n{font:500 13px/1 var(--fd-hil-mono);color:var(--fd-hil-mut);transition:color var(--fd-dur-2)}
.fd-hil-t{font:400 clamp(2rem,4.6vw,4.25rem)/1 var(--fd-hil-serif);letter-spacing:-.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:transform var(--fd-dur-3) var(--fd-ease-out),color var(--fd-dur-2)}
.fd-hil-tag{font:400 14px/1.35 var(--fd-hil-sans);color:var(--fd-hil-mut)}
.fd-hil-c{font:500 12px/1.2 var(--fd-hil-mono);text-align:right;text-transform:uppercase;letter-spacing:.04em}
.fd-hil-x{position:relative;width:16px;height:16px;justify-self:end}
.fd-hil-x i{position:absolute;left:0;top:7.5px;width:16px;height:1px;background:currentColor;transition:transform var(--fd-dur-3) var(--fd-ease-in-out)}
.fd-hil-x i:last-child{transform:rotate(90deg)}
.fd-hil-item[data-open] .fd-hil-x i:last-child{transform:rotate(0)}
.fd-hil-item[data-hot] .fd-hil-t,.fd-hil-item[data-open] .fd-hil-t{transform:translateX(28px)}
.fd-hil-item[data-hot] .fd-hil-t{font-style:italic}
.fd-hil-item[data-hot] .fd-hil-n,.fd-hil-item[data-open] .fd-hil-n{color:var(--fd-hil-red)}
.fd-hil-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--fd-dur-3) var(--fd-ease-in-out)}
.fd-hil-item[data-open] .fd-hil-panel{grid-template-rows:1fr}
.fd-hil-panel-in{min-height:0;overflow:hidden;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,6fr) minmax(0,3.8fr) 28px;gap:24px}
.fd-hil-pimg{display:none}
.fd-hil-body{grid-column:2;max-width:52ch;padding:0 0 28px 28px;font:400 17px/1.5 var(--fd-hil-sans);color:var(--fd-hil-ink)}
.fd-hil-proj{grid-column:3;padding-bottom:28px}
.fd-hil-proj li{font:400 13px/1.4 var(--fd-hil-mono);padding:6px 0;border-top:1px solid var(--fd-hil-line);color:var(--fd-hil-mut)}
.fd-hil-float{position:absolute;left:0;top:0;width:0;height:0;z-index:3;pointer-events:none;will-change:transform}
.fd-hil-frame{position:absolute;left:24px;top:-150px;width:240px;height:300px;transform:scale(.6);opacity:0;transition:transform var(--fd-dur-3) var(--fd-ease-out),opacity var(--fd-dur-2) var(--fd-ease-out);background:#cfcac0;box-shadow:0 30px 60px -30px rgba(18,17,16,.5)}
.fd-hil[data-hot] .fd-hil-frame{transform:none;opacity:1}
.fd-hil-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;clip-path:inset(100% 0 0 0);transition:clip-path var(--fd-dur-3) var(--fd-ease-in-out)}
.fd-hil-frame img[data-on]{clip-path:inset(0 0 0 0);z-index:1}
.fd-hil-cap{position:absolute;left:0;top:100%;margin-top:8px;z-index:2;font:500 11px/14px var(--fd-hil-mono);letter-spacing:.02em;white-space:nowrap;color:var(--fd-hil-ink)}
@media (hover:none),(pointer:coarse),(max-width:760px){
  .fd-hil-float{display:none}
  .fd-hil-pimg{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;margin-bottom:16px}
}
@media (max-width:1000px){
  .fd-hil-head{grid-template-columns:1fr;gap:20px}
  .fd-hil-eyebrow,.fd-hil-title,.fd-hil-intro{grid-column:1}
  .fd-hil-eyebrow{max-width:200px}
  .fd-hil-intro{max-width:46ch}
  .fd-hil-row{grid-template-columns:44px minmax(0,1fr) auto 20px;gap:12px}
  .fd-hil-tag{display:none}
  .fd-hil-panel-in{grid-template-columns:44px minmax(0,1fr) 20px;gap:12px}
  .fd-hil-body,.fd-hil-proj{grid-column:2;padding-left:0}
  .fd-hil-body{padding-bottom:16px;font-size:16px}
  .fd-hil-item[data-hot] .fd-hil-t,.fd-hil-item[data-open] .fd-hil-t{transform:translateX(12px)}
}
@media (max-width:760px){
  .fd-hil-panel-in{display:block;padding:0 0 4px}
  .fd-hil-pimg{margin-top:4px}
  .fd-hil-proj{padding-bottom:24px}
  .fd-hil-t{font-size:2rem;white-space:normal}
  .fd-hil-row{padding:18px 0}
}
@media (prefers-reduced-motion:reduce){
  .fd-hil *{transition-duration:1ms!important}
}
`;
