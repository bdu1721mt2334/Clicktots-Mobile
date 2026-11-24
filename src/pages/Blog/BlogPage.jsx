// Purpose: The Blog page (list).
//   1. Hero    – headline (sans + italic serif), a rotating "search the journal" topic line, and the latest
//                10 posts on a slowly turning 3D ring. Hover slows the ring. Then a clear "Scroll to explore".
//   2. Journal – EVERY post as an alternating row (text from one side, picture from the other, 3D tilt +
//                glow), 5 per page, with numbered pagination ‹ 1 2 3 4 › at the bottom.
//   3. CTA     – talk to our experts.
//   Clicking any post opens it HERE at /blog/<slug> (no redirect) – its cover flies into the article hero.
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowLeft, ArrowRight, Search, CalendarDays, Clock } from "lucide-react";
import { POSTS, formatDate } from "./blogData";
import { openPost } from "./blogFlight";
import "./blog.css";

const EASE = [0.22, 1, 0.36, 1];
const PER_PAGE = 5;
const TOPICS = ["SEO in 2025", "Google Ads budgets", "Local SEO", "Guerrilla marketing", "Affiliate marketing", "PPC vs SEO", "Free SEO tools"];
let rememberedPage = 1; // keeps your page when you come back from an article

/* ── rotating topic line ── */
function TopicTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TOPICS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      className="bl-search"
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: 0.55, duration: 0.9, ease: EASE } }}
      aria-hidden="true"
    >
      <span className="bl-search-ico">
        <Search size={18} strokeWidth={2.2} />
      </span>
      <span className="bl-search-words">
        {TOPICS.map((t, k) => (
          <span key={t} className={k === i ? "is-on" : k === (i - 1 + TOPICS.length) % TOPICS.length ? "is-out" : ""}>
            {t}
          </span>
        ))}
      </span>
      <span className="bl-search-caret" />
    </motion.div>
  );
}

/* ── the latest 10 posts on a slowly turning 3D ring ── */
function Ring({ posts, scrollRef, onOpen }) {
  const stageRef = useRef(null);
  const ringRef = useRef(null);
  const cardRefs = useRef([]);
  const hover = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    const ring = ringRef.current;
    if (!stage || !ring) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = posts.length;
    const step = 360 / n;
    let R = 600;
    let rot = 0;
    let speed = 0;
    let last = 0;
    let raf = 0;
    let visible = true;

    const layout = () => {
      const w = stage.clientWidth;
      const cardW = w < 700 ? 190 : 300;
      stage.style.setProperty("--card-w", `${cardW}px`);
      R = Math.max(((cardW + (w < 700 ? 26 : 44)) * n) / (2 * Math.PI), w * 0.36);
    };
    const draw = () => {
      ring.style.transform = `translateZ(${(R * 0.72).toFixed(1)}px) rotateY(${rot.toFixed(3)}deg)`;
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        let a = (((i * step + rot) % 360) + 540) % 360 - 180; // angle from the front, -180..180
        const abs = Math.abs(a);
        const o = 1 - Math.min(1, Math.max(0, (abs - 52) / 26));
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o <= 0.01 ? "hidden" : "";
        el.style.transform = `rotateY(${(i * step).toFixed(2)}deg) translateZ(${(-R).toFixed(1)}px)`;
        el.classList.toggle("is-front", abs < step / 2);
      });
    };
    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const target = hover.current ? 1.2 : 5.5; // degrees per second – slow, readable
      speed += (target - speed) * Math.min(1, dt * 3);
      rot -= speed * dt;
      draw();
      if (visible && !reduced) raf = requestAnimationFrame(tick);
    };
    layout();
    draw();
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf && !reduced) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { root: scrollRef?.current || null },
    );
    io.observe(stage);
    const onResize = () => {
      layout();
      draw();
    };
    window.addEventListener("resize", onResize);
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [posts, scrollRef]);

  return (
    <motion.div
      ref={stageRef}
      className="bl-ring-stage"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.75, duration: 1.2, ease: EASE } }}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
    >
      <div ref={ringRef} className="bl-ring">
        {posts.map((p, i) => (
          <a
            key={p.slug}
            ref={(n) => (cardRefs.current[i] = n)}
            className="bl-rcard"
            href={`/blog/${p.slug}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen(p, e.currentTarget.querySelector("img"));
            }}
            aria-label={`${p.title} – ${formatDate(p.date)}`}
          >
            <span className="bl-rcard-img">
              <img src={p.cover} alt="" loading="lazy" decoding="async" draggable={false} />
            </span>
            <span className="bl-rcard-meta">
              <b>{p.tag}</b> · {formatDate(p.date)}
            </span>
            <span className="bl-rcard-t">{p.short}</span>
          </a>
        ))}
      </div>
      <div className="bl-ring-floor" aria-hidden="true" />
    </motion.div>
  );
}

/* ── a journal row: text from one side, picture from the other ── */
function Row({ post, flip, n, onOpen }) {
  const imgRef = useRef(null);
  const dir = flip ? 1 : -1;
  const open = (e) => {
    e.preventDefault();
    onOpen(post, imgRef.current);
  };
  const txt = {
    hide: { opacity: 0, x: dir * 90, filter: "blur(10px)" },
    show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 1, ease: EASE } },
  };
  return (
    <motion.article
      className={`bl-row ${flip ? "is-flip" : ""}`}
      initial="hide"
      whileInView="show"
      viewport={{ once: false, amount: 0.3 }}
      variants={{ show: { transition: { staggerChildren: 0.09 } } }}
    >
      <div className="bl-row-text">
        <motion.p variants={txt} className="bl-row-meta">
          <span className="bl-row-n">{String(n).padStart(2, "0")}</span>
          <span className="bl-chip">{post.tag}</span>
          <span className="bl-row-date">
            <CalendarDays size={13} /> {formatDate(post.date)}
          </span>
          <span className="bl-row-date">
            <Clock size={13} /> {post.readTime} min read
          </span>
        </motion.p>
        <motion.h3 variants={txt} className="bl-row-h bl-serif">
          <a href={`/blog/${post.slug}`} onClick={open}>
            {post.title}
          </a>
        </motion.h3>
        <motion.p variants={txt} className="bl-row-p">
          {post.summary}
        </motion.p>
        <motion.a variants={txt} className="bl-btn" href={`/blog/${post.slug}`} onClick={open}>
          Read blog <ArrowUpRight size={15} />
        </motion.a>
      </div>
      <motion.a
        className="bl-row-media"
        href={`/blog/${post.slug}`}
        onClick={open}
        tabIndex={-1}
        aria-hidden="true"
        variants={{
          hide: { opacity: 0, x: -dir * 120, rotateY: -dir * 22, scale: 0.92, filter: "blur(10px)" },
          show: { opacity: 1, x: 0, rotateY: 0, scale: 1, filter: "blur(0px)", transition: { duration: 1.1, ease: EASE } },
        }}
      >
        <TiltGlow className="bl-frame">
          <img ref={imgRef} src={post.cover} alt="" loading="lazy" decoding="async" draggable={false} />
          <span className="bl-frame-bar">
            <i />
            <i />
            <i />
            <em>clicktots.com/blog/{post.slug}</em>
          </span>
        </TiltGlow>
      </motion.a>
    </motion.article>
  );
}

/* ── ‹ 1 2 3 4 › (with … when there are many pages) ── */
function pageList(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, cur - 1);
  const to = Math.min(total - 1, cur + 1);
  if (from > 2) out.push("gap-a");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < total - 1) out.push("gap-b");
  out.push(total);
  return out;
}
function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="bl-pager" aria-label="Blog pages">
      <button type="button" className="bl-pg" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page">
        <ArrowLeft size={15} />
      </button>
      {pageList(page, pages).map((n) =>
        typeof n === "string" ? (
          <span key={n} className="bl-pg-gap">
            …
          </span>
        ) : (
          <button key={n} type="button" className={`bl-pg ${n === page ? "is-on" : ""}`} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`}>
            {n}
          </button>
        ),
      )}
      <button type="button" className="bl-pg" onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Next page">
        <ArrowRight size={15} />
      </button>
    </nav>
  );
}

/* ── 3D tilt + pointer-following glow ── */
function TiltGlow({ className = "", children }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    el.classList.add("is-tilt");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("is-tilt");
  };
  return (
    <span ref={ref} className={`bl-tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>
      {children}
      <span className="bl-glow" aria-hidden="true" />
    </span>
  );
}

export default function BlogPage({ scrollRef, onBeforeOpen }) {
  const pages = Math.ceil(POSTS.length / PER_PAGE);
  const [page, setPage] = useState(() => Math.min(rememberedPage, pages));
  const listRef = useRef(null);
  const shown = POSTS.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const onOpen = useCallback(
    (post, imgEl) => {
      onBeforeOpen?.();
      openPost(post, imgEl);
    },
    [onBeforeOpen],
  );

  const goPage = (n) => {
    const next = Math.min(pages, Math.max(1, n));
    if (next === page) return;
    rememberedPage = next;
    setPage(next);
    const sc = scrollRef?.current;
    const el = listRef.current;
    if (!sc || !el) return;
    const y = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 40;
    if (sc.__lenis) sc.__lenis.scrollTo(y, { duration: 1.1 });
    else sc.scrollTo({ top: y, behavior: "smooth" });
  };

  const fadeHead = {
    initial: { opacity: 0, y: 40, filter: "blur(10px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: false, amount: 0.6 },
    transition: { duration: 0.9, ease: EASE },
  };

  return (
    <div className="bl">
      <section className="bl-hero" aria-labelledby="bl-title">
        <div className="bl-hero-glow" aria-hidden="true" />
        <motion.p className="bl-pill" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.7, ease: EASE } }}>
          Clicktots Journal
        </motion.p>
        <h1 id="bl-title" className="bl-h1">
          <motion.span className="bl-h1-a" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: 0.2, duration: 1, ease: EASE } }}>
            Fresh ideas for growth.
          </motion.span>
          <motion.span className="bl-h1-b bl-serif" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: 0.38, duration: 1, ease: EASE } }}>
            Straight from our team.
          </motion.span>
        </h1>
        <TopicTicker />
        <Ring posts={POSTS.slice(0, 10)} scrollRef={scrollRef} onOpen={onOpen} />
        <motion.div className="bl-cue" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.8 } }} aria-hidden="true">
          <span className="bl-cue-mouse">
            <i />
          </span>
          Scroll to explore
        </motion.div>
      </section>

      <section ref={listRef} className="bl-sec" aria-labelledby="bl-all">
        <motion.p className="bl-pill" {...fadeHead}>
          All articles · {POSTS.length}
        </motion.p>
        <motion.h2 id="bl-all" className="bl-h2 bl-serif" {...fadeHead}>
          Fresh reads. Zero fluff.
        </motion.h2>
        <div className="bl-rows" key={page}>
          {shown.map((p, i) => (
            <Row key={p.slug} post={p} flip={i % 2 === 1} n={(page - 1) * PER_PAGE + i + 1} onOpen={onOpen} />
          ))}
        </div>
        <Pagination page={page} pages={pages} onPage={goPage} />
        <p className="bl-pg-info">
          Page {page} of {pages} · showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, POSTS.length)} of {POSTS.length}
        </p>
      </section>

      <section className="bl-cta">
        <motion.h2 className="bl-h2" {...fadeHead}>
          Want ideas like these <span className="bl-serif">working for your brand?</span>
        </motion.h2>
        <motion.div className="bl-cta-row" {...fadeHead}>
          <button type="button" className="bl-btn is-solid" onClick={() => window.dispatchEvent(new Event("clicktots:talk"))}>
            Talk to our experts <ArrowUpRight size={15} />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
