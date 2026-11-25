// Purpose: Implement the HandwrittenNotes components module, keeping this responsibility separate for maintainability.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { DEFAULT_NOTES, type Note, type NoteKind } from "./testimonials";

export type { Note, NoteKind };

export interface HandwrittenNotesProps {
  notes?: Note[];
  eyebrow?: string;
  title?: string;
  stats?: [string, string][];
  className?: string;
}

type Body = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; r: number; vr: number; s: number; vs: number; drag: boolean };

const K = 380, C = 30;

export function HandwrittenNotes({
  notes = DEFAULT_NOTES,
  eyebrow = "Line & Wash · a 30-day sketching course",
  title = "Day thirty. Here’s what they left on the desk.",
  stats = [["2,140", "students since 2023"], ["86%", "finish all 30 days"], ["10 min", "a day, honestly"]],
  className,
}: HandwrittenNotesProps) {
  const desk = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const bodies = useRef(new Map<string, Body>());
  const raf = useRef(0);
  const reduced = useRef(false);
  const [order, setOrder] = useState(() => notes.map((n) => n.id));
  const [moved, setMoved] = useState(false);
  const drag = useRef<{ id: string; px: number; py: number; ox: number; oy: number; lx: number; lt: number; vx: number } | null>(null);

  const body = (id: string) => {
    let b = bodies.current.get(id);
    if (!b) { b = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: 0, vr: 0, s: 1, vs: 0, drag: false }; bodies.current.set(id, b); }
    return b;
  };
  const rest = (id: string) => notes.find((n) => n.id === id)?.rot ?? 0;

  const paint = (id: string) => {
    const el = els.current.get(id);
    const b = bodies.current.get(id);
    if (el && b) el.style.transform = `translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0) rotate(${(rest(id) + b.r).toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
  };

  const kick = () => {
    if (raf.current) return;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(1 / 30, (t - last) / 1000);
      last = t;
      let busy = false;
      bodies.current.forEach((b, id) => {
        const tr = b.drag ? Math.max(-14, Math.min(14, (drag.current?.vx ?? 0) * 0.018)) : 0;
        const ts = b.drag ? 1.045 : 1;
        if (reduced.current) { b.x = b.tx; b.y = b.ty; b.r = 0; b.s = 1; b.vx = b.vy = b.vr = b.vs = 0; paint(id); return; }
        b.vx += (-K * (b.x - b.tx) - C * b.vx) * dt; b.x += b.vx * dt;
        b.vy += (-K * (b.y - b.ty) - C * b.vy) * dt; b.y += b.vy * dt;
        b.vr += (-K * 0.6 * (b.r - tr) - C * 0.7 * b.vr) * dt; b.r += b.vr * dt;
        b.vs += (-K * (b.s - ts) - C * b.vs) * dt; b.s += b.vs * dt;
        const still = Math.abs(b.x - b.tx) < 0.1 && Math.abs(b.y - b.ty) < 0.1 && Math.abs(b.vx) + Math.abs(b.vy) < 0.5 && Math.abs(b.r - tr) < 0.05 && Math.abs(b.s - ts) < 0.0005 && Math.abs(b.vr) < 0.1;
        if (still && !b.drag) { b.x = b.tx; b.y = b.ty; b.r = 0; b.s = 1; }
        else busy = true;
        paint(id);
      });
      raf.current = busy ? requestAnimationFrame(step) : 0;
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const front = (id: string) => setOrder((o) => (o[o.length - 1] === id ? o : [...o.filter((x) => x !== id), id]));

  const clampTarget = (id: string, b: Body) => {
    const d = desk.current, el = els.current.get(id);
    if (!d || !el) return;
    const dr = d.getBoundingClientRect();
    const left = el.offsetLeft, top = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
    const m = 40;
    b.tx = Math.max(-left - w + m + 60, Math.min(dr.width - left - m - 20, b.tx));
    b.ty = Math.max(-top - 20, Math.min(dr.height - top - m, b.ty));
  };

  const onDown = (id: string) => (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || window.innerWidth <= 760) return;
    front(id);
    const b = body(id);
    b.drag = true;
    drag.current = { id, px: e.clientX, py: e.clientY, ox: b.tx, oy: b.ty, lx: e.clientX, lt: performance.now(), vx: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    kick();
  };
  const onMove = (id: string) => (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    const b = body(id);
    b.tx = d.ox + e.clientX - d.px;
    b.ty = d.oy + e.clientY - d.py;
    clampTarget(id, b);
    const now = performance.now();
    const inst = ((e.clientX - d.lx) / Math.max(1, now - d.lt)) * 1000;
    d.vx = d.vx * 0.7 + inst * 0.3;
    d.lx = e.clientX; d.lt = now;
    if (Math.abs(b.tx) + Math.abs(b.ty) > 4) setMoved(true);
    kick();
  };
  const onUp = (id: string) => () => {
    const b = bodies.current.get(id);
    if (b) b.drag = false;
    drag.current = null;
    kick();
  };
  const onKey = (id: string) => (e: KeyboardEvent<HTMLElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const b = body(id);
    if (e.key === "ArrowLeft") b.tx -= step;
    else if (e.key === "ArrowRight") b.tx += step;
    else if (e.key === "ArrowUp") b.ty -= step;
    else if (e.key === "ArrowDown") b.ty += step;
    else if (e.key === "Enter" || e.key === " ") { front(id); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    clampTarget(id, b);
    front(id);
    setMoved(true);
    kick();
  };
  const putBack = () => {
    bodies.current.forEach((b) => { b.tx = 0; b.ty = 0; });
    setOrder(notes.map((n) => n.id));
    setMoved(false);
    kick();
  };

  const renderNote = (n: Note) => {
    const z = order.indexOf(n.id) + 1;
    const long = n.text.length > 70;
    return (
      <figure
        key={n.id}
        ref={(el) => { if (el) els.current.set(n.id, el); else els.current.delete(n.id); }}
        className="fd-hwn-note"
        data-kind={n.kind}
        data-hand={!long || undefined}
        data-top={z === order.length || undefined}
        tabIndex={0}
        aria-roledescription="movable note"
        aria-label={`Note from ${n.name}, ${n.meta}: ${n.text}`}
        style={{ left: `${n.x}%`, top: n.y, width: n.w, zIndex: z, transform: `rotate(${n.rot}deg)`, ["--rot" as string]: `${n.rot}deg` }}
        onPointerDown={onDown(n.id)}
        onPointerMove={onMove(n.id)}
        onPointerUp={onUp(n.id)}
        onPointerCancel={onUp(n.id)}
        onFocus={() => front(n.id)}
        onKeyDown={onKey(n.id)}
      >
        {n.kind === "postcard" && <span className="fd-hwn-stamp" aria-hidden="true"><span>30</span><i>DAYS</i></span>}
        {n.photo && (
          <span className="fd-hwn-photo" aria-hidden="true">
            <img src={n.photo} alt="" width={84} height={96} loading="lazy" decoding="async" draggable={false} />
            <i className="fd-hwn-tape" />
          </span>
        )}
        {(n.kind === "index" || n.kind === "kraft" || n.kind === "graph") && !n.photo && <i className="fd-hwn-tape fd-hwn-tape-top" aria-hidden="true" />}
        <blockquote className="fd-hwn-text" aria-hidden="true"><p>{n.text}</p></blockquote>
        <figcaption className="fd-hwn-sig" aria-hidden="true">
          <span className="fd-hwn-name">{n.name}</span>
          <span className="fd-hwn-meta">{n.meta}</span>
        </figcaption>
      </figure>
    );
  };

  return (
    <section className={`fd-hwn${className ? " " + className : ""}`} aria-label="Student notes">
      <style>{css}</style>
      <div className="fd-hwn-head">
        <div>
          <p className="fd-hwn-eyebrow">{eyebrow}</p>
          <h2 className="fd-hwn-title">{title}</h2>
        </div>
        <dl className="fd-hwn-stats">
          {stats.map(([v, l]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
      <div className="fd-hwn-desk" ref={desk}>
        <div className="fd-hwn-ruler" aria-hidden="true" />
        <p className="fd-hwn-tip" aria-hidden="true">
          <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true"><path d="M2 4c8 0 14 2 20 8 2.4 2.4 4 5 5 8M27 20l-1-6M27 20l-6-2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          drag them around
        </p>
        {notes.filter((n) => n.kind === "postcard").map(renderNote)}
        <div className="fd-hwn-strip">
          {notes.filter((n) => n.kind !== "postcard").map(renderNote)}
        </div>
        {/* phones: the notes sit in a sideways strip – say so */}
        <p className="fd-hwn-swipe" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
          Swipe to see more reviews
          <span className="fd-hwn-swipe-arrow">→</span>
        </p>
        <button type="button" className="fd-hwn-reset" onClick={putBack} data-show={moved || undefined} aria-hidden={!moved || undefined} tabIndex={moved ? 0 : -1}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7a4.5 4.5 0 107.7-3.2M10.5 1.5v2.5H8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Put them back
        </button>
      </div>
    </section>
  );
}

const SERIF = `"Michroma", "Eurostile", "Arial Black", sans-serif`;
const SANS = `"Michroma", "Eurostile", "Arial Black", sans-serif`;
const MONO = `"Michroma", "Eurostile", "Arial Black", sans-serif`;
const HAND = `"Michroma", "Eurostile", "Arial Black", sans-serif`;

const css = `
.fd-hwn,.fd-hwn *,.fd-hwn *::before,.fd-hwn *::after{box-sizing:border-box}
.fd-hwn{--fd-ease-out:cubic-bezier(.22,1,.36,1);--fd-spring:cubic-bezier(.34,1.56,.64,1);--fd-dur-1:120ms;--fd-dur-2:240ms;--fd-dur-3:420ms;
  --fd-hwn-mat:#1E3B30;--fd-hwn-grid:rgba(214,232,214,.09);--fd-hwn-grid2:rgba(214,232,214,.18);--fd-hwn-cream:#EFE8D6;--fd-hwn-mut:#9DB5A6;--fd-hwn-ink:#2A2620;--fd-hwn-marker:#F2C14E;
  display:block;max-width:none;margin:0 auto;padding:72px 32px 80px;background:#15291F;color:var(--fd-hwn-cream);
  font:400 15px/1.5 ${SANS};letter-spacing:0;-webkit-font-smoothing:antialiased}
.fd-hwn-head{display:flex;align-items:flex-end;justify-content:space-between;gap:40px;margin:0 0 32px;padding:0}
.fd-hwn-eyebrow{margin:0 0 14px;padding:0;font:500 12px/1.2 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:var(--fd-hwn-marker)}
.fd-hwn-title{margin:0;padding:0;max-width:18ch;font:400 clamp(2.25rem,4.6vw,3.75rem)/1.02 ${SERIF};letter-spacing:-.03em;color:var(--fd-hwn-cream);text-wrap:balance}
.fd-hwn-stats{display:flex;gap:32px;margin:0;padding:0 0 6px}
.fd-hwn-stats div{display:flex;flex-direction:column-reverse;gap:6px;margin:0;padding:0 0 0 16px;border-left:1px solid rgba(239,232,214,.2)}
.fd-hwn-stats dt{margin:0;padding:0;font:400 12px/1.3 ${SANS};color:var(--fd-hwn-mut)}
.fd-hwn-stats dd{margin:0;padding:0;font:400 1.75rem/1 ${SERIF};letter-spacing:-.02em;color:var(--fd-hwn-cream)}
.fd-hwn-desk{position:relative;height:780px;margin:0;padding:0;border-radius:18px;overflow:hidden;touch-action:pan-y;
  background-color:var(--fd-hwn-mat);
  background-image:linear-gradient(var(--fd-hwn-grid2) 1px,transparent 1px),linear-gradient(90deg,var(--fd-hwn-grid2) 1px,transparent 1px),linear-gradient(var(--fd-hwn-grid) 1px,transparent 1px),linear-gradient(90deg,var(--fd-hwn-grid) 1px,transparent 1px);
  background-size:120px 120px,120px 120px,24px 24px,24px 24px;background-position:-1px -1px;box-shadow:inset 0 0 0 1px rgba(214,232,214,.12),inset 0 0 120px rgba(0,0,0,.25)}
.fd-hwn-ruler{position:absolute;left:0;right:0;bottom:0;height:22px;pointer-events:none;
  background-image:linear-gradient(90deg,rgba(214,232,214,.55) 1px,transparent 1px),linear-gradient(90deg,rgba(214,232,214,.3) 1px,transparent 1px);background-size:120px 22px,24px 10px;background-repeat:repeat-x;background-position:-1px 0,-1px 12px}
.fd-hwn-tip{position:absolute;right:28px;bottom:36px;display:flex;align-items:flex-end;gap:6px;margin:0;padding:0;transform:rotate(-4deg);font:400 0.8rem/1.2 ${HAND};color:var(--fd-hwn-marker);opacity:.9;pointer-events:none}
.fd-hwn-tip svg{display:block;transform:scaleX(-1)}
.fd-hwn-note{position:absolute;display:block;margin:0;padding:22px 22px 18px;border-radius:2px;color:var(--fd-hwn-ink);background:#FBFAF6;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;outline:none;will-change:transform;
  box-shadow:0 1px 1px rgba(0,0,0,.18),0 10px 24px -8px rgba(0,0,0,.45);transition:box-shadow var(--fd-dur-2) var(--fd-ease-out)}
.fd-hwn-note:active{cursor:grabbing;box-shadow:0 2px 2px rgba(0,0,0,.15),0 28px 50px -12px rgba(0,0,0,.55)}
.fd-hwn-note:focus-visible{box-shadow:0 0 0 2px var(--fd-hwn-mat),0 0 0 4px rgba(242,193,78,.75),0 10px 24px -8px rgba(0,0,0,.45)}
.fd-hwn-note[data-kind="index"]{background-color:#FBFAF6;background-image:linear-gradient(transparent 39px,rgba(209,74,64,.55) 39px,rgba(209,74,64,.55) 40px,transparent 40px),repeating-linear-gradient(transparent 0 23px,rgba(80,120,170,.28) 23px 24px);background-position:0 0,0 40px;padding-top:12px}
.fd-hwn-note[data-kind="index"] .fd-hwn-text{margin-top:36px}
.fd-hwn-note[data-kind="sticky"]{background:#F6DF74;border-radius:1px 1px 18px 1px/1px 1px 6px 1px;padding:24px 22px 20px}
.fd-hwn-note[data-kind="pink"]{background:#F3B7A9;border-radius:1px 1px 1px 16px/1px 1px 1px 6px;padding:20px 20px 18px}
.fd-hwn-note[data-kind="kraft"]{background:#C9A57A;color:#2B2116;background-image:radial-gradient(rgba(90,60,30,.12) 1px,transparent 1.5px);background-size:7px 7px}
.fd-hwn-note[data-kind="graph"]{background-color:#F7F7F1;background-image:linear-gradient(rgba(60,140,140,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(60,140,140,.2) 1px,transparent 1px);background-size:14px 14px;
  -webkit-mask:radial-gradient(5px at 50% 0,transparent 98%,#000) 0 0/14px 100% repeat-x;mask:radial-gradient(5px at 50% 0,transparent 98%,#000) 0 0/14px 100% repeat-x;padding-top:26px}
.fd-hwn-note[data-kind="postcard"]{background:#F2EBDC;padding:22px 26px 20px;background-image:linear-gradient(90deg,transparent calc(62% - 1px),rgba(42,38,32,.22) calc(62% - 1px),rgba(42,38,32,.22) 62%,transparent 62%)}
.fd-hwn-note[data-kind="postcard"] .fd-hwn-text{width:58%}
.fd-hwn-note[data-kind="postcard"] .fd-hwn-sig{width:58%}
.fd-hwn-note[data-kind="postcard"] .fd-hwn-photo{position:absolute;right:22px;top:auto;bottom:20px;transform:rotate(3deg)}
.fd-hwn-stamp{position:absolute;right:20px;top:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:52px;height:60px;border:2px dashed rgba(192,72,52,.75);color:#B6452F;transform:rotate(4deg)}
.fd-hwn-stamp span{display:block;font:700 1.05rem/1 ${SERIF}}
.fd-hwn-stamp i{display:block;font:600 9px/1 ${MONO};font-style:normal;letter-spacing:.14em}
.fd-hwn-photo{position:relative;float:right;display:block;width:76px;margin:-4px -4px 8px 12px;padding:5px 5px 14px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transform:rotate(4deg)}
.fd-hwn-photo img{display:block;width:66px;height:72px;object-fit:cover;object-position:50% 25%;pointer-events:none}
.fd-hwn-tape{position:absolute;left:50%;top:-10px;display:block;width:56px;height:18px;margin-left:-28px;background:rgba(240,236,214,.62);box-shadow:0 1px 1px rgba(0,0,0,.08);transform:rotate(-6deg)}
.fd-hwn-photo .fd-hwn-tape{top:-9px;width:44px;margin-left:-22px;transform:rotate(8deg)}
.fd-hwn-text{margin:0;padding:0}
.fd-hwn-text p{margin:0;padding:0;font:400 0.86rem/1.6 ${SERIF};letter-spacing:0;color:inherit;text-wrap:pretty}
.fd-hwn-note[data-kind="index"] .fd-hwn-text p{line-height:24px}
.fd-hwn-note[data-hand] .fd-hwn-text p{font:400 0.9rem/1.55 ${HAND};letter-spacing:0}
.fd-hwn-sig{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;clear:both;margin:14px 0 0;padding:0}
.fd-hwn-name{font:400 0.95rem/1.2 ${HAND};color:#1F3F8F}
.fd-hwn-note[data-kind="kraft"] .fd-hwn-name,.fd-hwn-note[data-kind="sticky"] .fd-hwn-name,.fd-hwn-note[data-kind="pink"] .fd-hwn-name{color:#2B2116}
.fd-hwn-meta{font:500 10px/1.3 ${MONO};letter-spacing:.08em;text-transform:uppercase;color:rgba(42,38,32,.6)}
.fd-hwn-reset{appearance:none;-webkit-appearance:none;position:absolute;left:24px;bottom:36px;z-index:100;display:inline-flex;align-items:center;gap:8px;height:36px;margin:0;padding:0 14px;border:0;border-radius:8px;background:var(--fd-hwn-cream);color:#15291F;cursor:pointer;font-synthesis-weight:auto;
  font:700 13px/1 ${SANS};opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity var(--fd-dur-2),transform var(--fd-dur-3) var(--fd-spring)}
.fd-hwn-reset svg{display:block}
.fd-hwn-reset[data-show]{opacity:1;transform:none;pointer-events:auto}
.fd-hwn-reset:active{transform:scale(.96)}
.fd-hwn-reset:focus-visible{outline:2px solid rgba(242,193,78,.75);outline-offset:2px}
.fd-hwn-strip{display:contents}
@media (max-width:1100px) and (min-width:761px){.fd-hwn{padding:52px 24px 52px}.fd-hwn-desk{height:730px}}
@media (max-width:760px){
  .fd-hwn{padding:48px 16px 56px}
  .fd-hwn-head{flex-direction:column;align-items:flex-start;gap:24px;margin-bottom:24px}
  .fd-hwn-stats{gap:16px;flex-wrap:wrap}
  .fd-hwn-stats dd{font-size:1.375rem}
  .fd-hwn-desk{height:auto;display:flex;flex-direction:column;gap:18px;padding:24px 0 44px;overflow:hidden}
  .fd-hwn-note[data-kind="postcard"]{position:relative;left:auto!important;top:auto!important;order:-1;width:calc(100% - 32px)!important;margin:0 16px;padding:18px 20px;transform:rotate(-1.5deg)!important;touch-action:pan-y}
  .fd-hwn-note[data-kind="postcard"] .fd-hwn-text,
  .fd-hwn-note[data-kind="postcard"] .fd-hwn-sig{width:68%}
  .fd-hwn-strip{display:flex;align-items:stretch;gap:14px;width:100%;padding:14px 20px 18px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .fd-hwn-strip::-webkit-scrollbar{display:none}
  .fd-hwn-strip .fd-hwn-note{position:relative;left:auto!important;top:auto!important;flex:0 0 78%;width:78%!important;max-width:310px;scroll-snap-align:center;touch-action:pan-x pan-y;cursor:default}
  .fd-hwn-tip,.fd-hwn-reset{display:none!important}
  .fd-hwn-swipe{display:flex!important;align-items:center;justify-content:center;gap:8px;margin:-4px 0 0;font:700 11px/1 ${SANS};font-synthesis-weight:auto;letter-spacing:.04em;color:var(--fd-hwn-cream);opacity:.85}
  .fd-hwn-swipe svg{color:#5eb0ff;animation:fd-hwn-swipe 1.8s ease-in-out infinite}
  .fd-hwn-swipe-arrow{color:#5eb0ff;animation:fd-hwn-swipe 1.8s ease-in-out infinite}
  .fd-hwn-strip .fd-hwn-note{flex-basis:82%!important;width:82%!important}
}
.fd-hwn-swipe{display:none}
@keyframes fd-hwn-swipe{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
@media (prefers-reduced-motion:reduce){.fd-hwn *{transition-duration:1ms!important}}
@media (prefers-contrast:more){.fd-hwn-note{box-shadow:0 0 0 1px #000}}
`;