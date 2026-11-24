// Purpose: full-screen, scroll-driven robot behind the About page content (replaces the 300-frame sequence).
//   ONE robot for the whole visit: it is built and its shaders compiled ahead of time (idle time on the home
//   page, or the moment someone points at the About button), kept paused, and simply attached when About
//   opens, so it is on screen straight away. Closing About only pauses it.
import { useEffect, useRef, useState } from "react";

let modulePromise = null;
let warmPromise = null; // → { canvas, api }

/** Download the robot code (no work on the page yet). */
export function prefetchRobot() {
  if (!modulePromise) modulePromise = import("./robotScene");
  return modulePromise;
}

/** Build the robot + compile its shaders in the background. Safe to call many times. */
export function warmRobot() {
  if (!warmPromise) {
    warmPromise = prefetchRobot()
      .then(({ createRobotScene }) => {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        canvas.className = "pointer-events-none absolute inset-0 block h-full w-full";
        const api = createRobotScene(canvas);
        return api.whenReady.then(() => ({ canvas, api }));
      })
      .catch((err) => {
        warmPromise = null; // e.g. no WebGL: try again next time, the page just keeps its plain background
        throw err;
      });
  }
  return warmPromise;
}

export default function RobotBackdrop({ scrollRef }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let attached = null;
    // screens scrolled (the original Nova timing: the robot's move happens over the first screen)
    const getProgress = () => {
      const sc = scrollRef?.current;
      return sc ? sc.scrollTop / Math.max(1, sc.clientHeight) : 0;
    };
    warmRobot()
      .then((robot) => {
        if (!alive || !hostRef.current) return;
        attached = robot;
        hostRef.current.appendChild(robot.canvas);
        robot.api.resume(getProgress, () => alive && setReady(true));
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (attached) {
        attached.api.pause();
        attached.canvas.remove();
      }
    };
  }, [scrollRef]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
    />
  );
}
