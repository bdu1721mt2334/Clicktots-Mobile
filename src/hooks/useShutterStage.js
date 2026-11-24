// Purpose: Shared shutter-bar state machine for the Blog, Career and Case Study overlays.
import { useCallback, useEffect, useRef, useState } from "react";
import { setScrollLocked } from "@/lib/scroll";

// hidden → cover → reveal → idle → closeCover → closeReveal → hidden
// stage → { which bar finishes it ("first" | "last"), next stage, content visibility to set }
const STEP = {
  cover: { bar: "first", to: "reveal", content: true },
  reveal: { bar: "last", to: "idle" },
  closeCover: { bar: "first", to: "closeReveal", content: false },
  closeReveal: { bar: "last", to: "hidden" },
};
const OPEN_STAGES = new Set(["cover", "reveal", "idle"]);
const COVER_STAGES = new Set(["cover", "closeCover"]);
const LEAVE_STAGES = new Set(["reveal", "closeReveal"]);

export function useShutterStage(open, barCount, onEscape) {
  const [stage, setStage] = useState("hidden");
  const [contentOn, setContentOn] = useState(false);
  const mounted = stage !== "hidden";

  useEffect(() => {
    if (open && stage === "hidden") setStage("cover");
    else if (!open && OPEN_STAGES.has(stage)) setStage("closeCover");
  }, [open, stage]);

  useEffect(() => {
    if (!mounted) return undefined;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [mounted]);

  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  useEffect(() => {
    if (!contentOn) return undefined;
    const onKey = (e) => e.key === "Escape" && escRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contentOn]);

  const handleBarDone = useCallback(
    (i) => {
      const s = STEP[stage];
      if (!s || i !== (s.bar === "first" ? 0 : barCount - 1)) return;
      if (s.content !== undefined) setContentOn(s.content);
      setStage(s.to);
    },
    [stage, barCount]
  );

  return { stage, contentOn, mounted, covering: COVER_STAGES.has(stage), leaving: LEAVE_STAGES.has(stage), handleBarDone };
}
