// Purpose: Implement the Projects pages module with lazy-loaded overlays.
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { StackSlider } from "@/components/StackSlider/StackSlider";
import { PORTFOLIO_SLIDES } from "@/components/StackSlider/projects";
import { usePathname, navigate, goHome } from "@/lib/router";
import "@/components/StackSlider/StackSlider.css";

const CaseStudyModal = lazy(() =>
  import("@/components/StackSlider/CaseStudyModal").then((m) => ({ default: m.CaseStudyModal }))
);
const AllProjects = lazy(() => import("@/pages/Projects/AllProjects"));

const TAIL_VH = 130;

export default function Projects({ keyFactsRef }) {
  const sectionRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const pathname = usePathname();
  const allOpen = /^\/projects?$/i.test(pathname);
  const [allEver, setAllEver] = useState(allOpen);
  if (allOpen && !allEver) setAllEver(true);

  const openAll = useCallback(() => navigate("/projects"), []);
  const closeAll = useCallback(() => goHome(), []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="stack-slider-scope relative z-30 text-[#F4F3EF] antialiased"
    >
      <StackSlider
        items={PORTFOLIO_SLIDES}
        keyFactsRef={keyFactsRef}
        onSelectSlide={(slide) => setSelected(slide)}
        onExploreAll={openAll}
        tailVh={TAIL_VH}
      />

      {selected && (
        <Suspense fallback={null}>
          <CaseStudyModal
            item={selected}
            items={PORTFOLIO_SLIDES}
            onClose={() => setSelected(null)}
            onSelect={(item) => setSelected(item)}
          />
        </Suspense>
      )}

      {allEver && (
        <Suspense fallback={null}>
          <AllProjects open={allOpen} onClose={closeAll} />
        </Suspense>
      )}
    </section>
  );
}
