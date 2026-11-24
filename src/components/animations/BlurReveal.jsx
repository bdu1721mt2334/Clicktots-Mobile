// Purpose: Implement the BlurReveal components module, keeping this responsibility separate for maintainability.
import { Fragment, useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function BlurReveal({
  text,
  as: Tag = "span",
  by = "word",
  stagger,
  delay = 0,
  duration = 0.9,
  blur = 10,
  y = 14,
  once = true,
  className,
}) {
  const ref = useRef(null);
  const reduceMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { once, margin: "0px 0px -12% 0px" });
  const shown = reduceMotion || inView;
  const step = stagger ?? (by === "char" ? 0.035 : 0.05);
  const wordCount = String(text).split(/\s+/).length;
  // dozens of blurred words repainting at once is the costly part: long copy fades + slides only
  const safeBlur = wordCount > 14 ? 0 : Math.min(blur, 8);

  let unitIndex = 0;
  const renderUnit = (content, key) => {
    const i = unitIndex++;
    const d = delay + i * step;
    return (
      <span
        key={key}
        aria-hidden="true"
        style={{
          display: "inline-block",
          opacity: shown ? 1 : 0,
          filter: shown || !safeBlur ? "none" : `blur(${safeBlur}px)`,
          transform: shown ? "none" : `translate3d(0,${y}px,0)`,
          transition: reduceMotion
            ? "none"
            : `opacity ${duration}s ${EASE} ${d}s, transform ${duration}s ${EASE} ${d}s${
                safeBlur ? `, filter ${duration}s ${EASE} ${d}s` : ""
              }`,
        }}
      >
        {content}
      </span>
    );
  };

  const lines = String(text).split("\n");

  return (
    <Tag ref={ref} className={cn(className)}>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, li) => {
        const words = line.split(" ").filter(Boolean);
        return (
          <Fragment key={li}>
            {li > 0 && <br />}
            {words.map((word, wi) => (
              <Fragment key={wi}>
                {by === "char" ? (
                  <span
                    aria-hidden="true"
                    style={{ display: "inline-block", whiteSpace: "nowrap" }}
                  >
                    {[...word].map((ch, ci) => renderUnit(ch, ci))}
                  </span>
                ) : (
                  renderUnit(word, wi)
                )}
                {wi < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </Tag>
  );
}
