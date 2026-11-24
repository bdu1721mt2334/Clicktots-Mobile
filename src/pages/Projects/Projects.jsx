// Purpose: Implement the Projects pages module, keeping this responsibility separate for maintainability.
import { useCallback, useRef, useState } from "react";
import { StackSlider } from "@/components/StackSlider/StackSlider";
import { CaseStudyModal } from "@/components/StackSlider/CaseStudyModal";
import { PORTFOLIO_SLIDES } from "@/components/StackSlider/projects";
import AllProjects from "@/pages/Projects/AllProjects";
import { usePathname, navigate, goHome } from "@/lib/router";
import "@/components/StackSlider/StackSlider.css";

const TAIL_VH = 130;

export default function Projects({ keyFactsRef }) {
  const sectionRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const pathname = usePathname();
  const allOpen = /^\/projects?$/i.test(pathname);

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

      <CaseStudyModal
        item={selected}
        items={PORTFOLIO_SLIDES}
        onClose={() => setSelected(null)}
        onSelect={(item) => setSelected(item)}
      />

      <AllProjects open={allOpen} onClose={closeAll} />
    </section>
  );
}
