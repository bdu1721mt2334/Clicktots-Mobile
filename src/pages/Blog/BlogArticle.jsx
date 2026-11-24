// Purpose: One blog post, full screen, at /blog/<slug>.
//   - The cover you clicked in the list FLIES into the article hero (same glide as the service pages:
//     left/top/width/height so the photo never stretches), while the title reveals word by word.
//   - Below: the article – a sticky "On this page" index (desktop), sections that fade up as you scroll,
//     key takeaways, then the previous / next posts (their covers fly too).
//   - Reading-progress bar at the top. "All articles" (or Esc) goes back to the list.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock, Check } from "lucide-react";
import { navigate } from "@/lib/router";
import { POSTS, formatDate } from "./blogData";
import { openPost, takeFlight } from "./blogFlight";
import "./blog.css";

const EASE = [0.22, 1, 0.36, 1];
const GLIDE = "cubic-bezier(0.65, 0, 0.18, 1)";
const FLY_MS = 1150;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function BlogArticle({ post, scrollRef }) {
  const idx = POSTS.findIndex((p) => p.slug === post.slug);
  const prev = POSTS[idx + 1] || null; // older
  const next = POSTS[idx - 1] || null; // newer

  /* ── the cover flies in from where it was clicked ── */
  const coverRef = useRef(null);
  const flyRef = useRef(null);
  const [flight] = useState(() => (reducedMotion() ? null : takeFlight()));
  const [landed, setLanded] = useState(!flight);
  const [flyerOn, setFlyerOn] = useState(!!flight);

  useLayoutEffect(() => {
    if (!flight) return undefined;
    const fly = flyRef.current;
    const box = coverRef.current;
    if (!fly || !box) return undefined;
    // start the page at the top BEFORE measuring: the list was scrolled down, so measuring first put the
    // cover frame far above the screen and the picture flew up instead of landing on it
    const sc = scrollRef?.current;
    if (sc) {
      sc.__lenis?.scrollTo(0, { immediate: true, force: true });
      sc.scrollTop = 0;
    }
    const from = flight.rect;
    const to = box.getBoundingClientRect();
    const at = (r, radius) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${radius}px` });
    const anim = fly.animate(
      [
        { ...at(from, 12), boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)" },
        { ...at(to, 26), boxShadow: "0 60px 120px -50px rgba(10,132,255,.6)" },
      ],
      { duration: FLY_MS, easing: GLIDE, fill: "both" },
    );
    anim.onfinish = () => {
      setLanded(true);
      requestAnimationFrame(() => setFlyerOn(false));
    };
    return () => anim.cancel();
  }, [flight, scrollRef]);

  /* ── reading progress + which section is on screen ── */
  const progRef = useRef(null);
  const bodyRef = useRef(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const sc = scrollRef?.current;
    if (!sc) return undefined;
    const onScroll = () => {
      const max = sc.scrollHeight - sc.clientHeight;
      if (progRef.current) progRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, sc.scrollTop / max) : 0})`;
      const secs = bodyRef.current?.querySelectorAll("[data-sec]") || [];
      let a = 0;
      secs.forEach((el, i) => {
        if (el.getBoundingClientRect().top < sc.clientHeight * 0.45) a = i;
      });
      setActive(a);
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => sc.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  const jump = (i) => {
    const sc = scrollRef?.current;
    const el = bodyRef.current?.querySelectorAll("[data-sec]")[i];
    if (!sc || !el) return;
    const y = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 100;
    if (sc.__lenis) sc.__lenis.scrollTo(y, { duration: 1 });
    else sc.scrollTo({ top: y, behavior: "smooth" });
  };

  const back = () => navigate("/blog", { replace: true });
  const words = post.title.split(" ");
  const delayBase = flight ? 0.35 : 0.1;

  return (
    <article className="ba">
      <div className="ba-prog" aria-hidden="true">
        <i ref={progRef} />
      </div>

      {/* top bar */}
      <div className="ba-top">
        <button type="button" className="bl-btn" onClick={back}>
          <ArrowLeft size={15} /> All articles
        </button>
        <span className="ba-crumb">
          Journal <i>/</i> {post.tag}
        </span>
      </div>

      {/* hero */}
      <header className="ba-hero">
        <motion.p className="bl-row-meta ba-meta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: delayBase, duration: 0.7, ease: EASE } }}>
          <span className="bl-chip">{post.tag}</span>
          <span className="bl-row-date">
            <CalendarDays size={13} /> {formatDate(post.date)}
          </span>
          <span className="bl-row-date">
            <Clock size={13} /> {post.readTime} min read
          </span>
        </motion.p>
        <h1 className="ba-title bl-serif">
          {words.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              className="ba-word"
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: delayBase + 0.1 + i * 0.04, duration: 0.8, ease: EASE } }}
            >
              {w}
            </motion.span>
          ))}
        </h1>
        <motion.p className="ba-lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: delayBase + 0.35, duration: 0.8, ease: EASE } }}>
          {post.summary}
        </motion.p>

        <div ref={coverRef} className="ba-cover" style={{ opacity: landed ? 1 : 0 }}>
          <img src={post.cover} alt={post.title} decoding="async" />
        </div>
      </header>

      {/* body */}
      <div className="ba-body" ref={bodyRef}>
        <aside className="ba-toc" aria-label="On this page">
          <p className="ba-toc-t">On this page</p>
          <ol>
            {post.body.map((s, i) => (
              <li key={s.h}>
                <button type="button" className={i === active ? "is-on" : ""} onClick={() => jump(i)}>
                  <span>{String(i + 1).padStart(2, "0")}</span> {s.h}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="ba-main">
          {post.body.map((s, i) => (
            <motion.section
              key={s.h}
              data-sec
              className="ba-sec"
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <h2 className="ba-h2">
                <span>{String(i + 1).padStart(2, "0")}</span> {s.h}
              </h2>
              {s.p.map((t) => (
                <p key={t.slice(0, 24)}>{t}</p>
              ))}
            </motion.section>
          ))}

          {post.takeaways?.length > 0 && (
            <motion.section
              className="ba-take"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <p className="ba-take-t">Key takeaways</p>
              <ul>
                {post.takeaways.map((t) => (
                  <li key={t}>
                    <span className="ba-tick">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </motion.section>
          )}

          <div className="ba-end">
            <button type="button" className="bl-btn is-solid" onClick={() => window.dispatchEvent(new Event("clicktots:talk"))}>
              Talk to our experts <ArrowUpRight size={15} />
            </button>
            <a className="ba-orig" href={post.url} target="_blank" rel="noopener noreferrer">
              Originally published on our blog <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* previous / next */}
      {(prev || next) && (
        <nav className="ba-more" aria-label="More articles">
          {[
            { p: prev, k: "Previous article" },
            { p: next, k: "Next article" },
          ].map(({ p, k }) =>
            p ? (
              <a
                key={k}
                className="ba-more-card"
                href={`/blog/${p.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  openPost(p, e.currentTarget.querySelector("img"));
                }}
              >
                <span className="ba-more-img">
                  <img src={p.cover} alt="" loading="lazy" />
                </span>
                <span className="ba-more-txt">
                  <span className="ba-more-k">{k}</span>
                  <span className="ba-more-h bl-serif">{p.title}</span>
                </span>
              </a>
            ) : (
              <span key={k} />
            ),
          )}
        </nav>
      )}

      {/* the flying cover (above everything, fixed to the screen) */}
      {flyerOn &&
        createPortal(
          <div ref={flyRef} aria-hidden="true" style={{ position: "fixed", zIndex: 9600, overflow: "hidden", pointerEvents: "none" }}>
            <img src={flight.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>,
          document.body,
        )}
    </article>
  );
}
