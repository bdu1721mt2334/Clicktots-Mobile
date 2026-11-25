// Purpose: Implement the Testimonials pages module, keeping this responsibility separate for maintainability.
import ScrollOverHero from "@/components/ScrollOverHero/ScrollOverHero";
import { HandwrittenNotes } from "@/components/TestimonialBoard/HandwrittenNotes";

/**
 * Testimonials – directly under the Client Showcase ("Our Valuable Clients").
 * `base` is the Client Showcase: it stays pinned and dims into the background
 * while this white section rises over it (Scroll Over animation).
 */
export default function Testimonials({ base, flightVh = 0 }) {
  return (
    <ScrollOverHero id="c-testimonials" base={base} flightVh={flightVh}>
      {/* the board keeps its own design; only the section behind it is white. Same width as the navbar
          content (max-w-7xl), so its edges line up with the logo on the left and the blue button on the right */}
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem]">
        <HandwrittenNotes
          eyebrow="CLICKTOTS TECHNOLOGIES"
          title="Real Stories. Real Experiences."
          stats={[
            ["100+", "Happy Clients"],
            ["15+", "Years of Experience"],
            ["360°", "Digital Solutions"],
          ]}
        />
      </div>
    </ScrollOverHero>
  );
}
