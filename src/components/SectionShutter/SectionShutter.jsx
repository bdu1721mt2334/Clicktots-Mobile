// Purpose: Implement the SectionShutter components module, keeping this responsibility separate for maintainability.
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/* ------------------------------------------------------------------ *
 *  SectionShutter: the same shutter-bar wipe that carries About → Key Facts,
 *  reusable for any other section change (here: Work in Motion → FAQ).
 *
 *  Place it right AFTER the section it covers. It overlays the last
 *  (100 + SCROLL_VH) vh of the section above it (negative margin), and the
 *  bars rise from the bottom one after another until the screen is one solid
 *  `color`. The next section must start with that same colour.
 * ------------------------------------------------------------------ */

const BAR_COUNT = 5;
const STAGGER = 0.12;
const SCROLL_VH = 25;
const TIMELINE_LENGTH = 1 + (BAR_COUNT - 1) * STAGGER;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const power2InOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function ShutterBar({ progress, index, color }) {
  const scaleY = useTransform(progress, (v) => {
    const start = (BAR_COUNT - 1 - index) * STAGGER;
    return power2InOut(clamp01(v * TIMELINE_LENGTH - start));
  });
  return (
    <motion.div
      style={{
        flex: 1,
        width: "100%",
        backgroundColor: color,
        scaleY,
        transformOrigin: "bottom",
        willChange: "transform",
      }}
    />
  );
}

export default function SectionShutter({ color = "#D2D2D2" }) {
  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });
  const stageOpacity = useTransform(scrollYProgress, (v) => (v > 0 ? 1 : 0));
  const solidO = useTransform(scrollYProgress, [0.96, 1], [0, 1]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="relative z-20 w-full pointer-events-none"
      style={{ height: `${100 + SCROLL_VH}vh`, marginTop: `-${100 + SCROLL_VH}vh` }}
    >
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ opacity: stageOpacity, background: "transparent" }}
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ zIndex: 30 }}>
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <ShutterBar key={i} index={i} progress={scrollYProgress} color={color} />
          ))}
        </div>
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ zIndex: 31, backgroundColor: color, opacity: solidO }}
        />
      </motion.div>
    </div>
  );
}
