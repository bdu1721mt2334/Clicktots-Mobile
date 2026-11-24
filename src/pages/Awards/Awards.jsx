// Purpose: Implement the Awards pages module, keeping this responsibility separate for maintainability.
import { HoverIndexList } from "@/components/features/hover-index-list";

/**
 * Awards & Milestones – "the Moon". The rocket journey (RocketJourney.jsx)
 * lands here: the landing circle is the same paper colour as this section, so
 * the hand-over is seamless. Edit the five rows in
 * src/components/features/hover-index-list.tsx (DEFAULT_ITEMS).
 */
export default function Awards() {
  return (
    <div id="c-awards" style={{ background: "#E9E6DF" }}>
      <HoverIndexList
        eyebrow="Recognition"
        title={<>Awards &amp;<br />milestones</>}
        intro="Five defining moments from the road so far, from entrepreneurship stages to global creator summits in Mumbai. Hover a row to see the moment, or open it for the story of how human leadership drives our AI innovation."
      />
    </div>
  );
}
