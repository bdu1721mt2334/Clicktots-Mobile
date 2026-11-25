// Purpose: Code-split below-the-fold home page sections so the hero paints with minimal initial JS and CSS.
import { useRef } from "react";
import ShutterTransition from "@/components/ShutterTransition/ShutterTransition";
import KeyFacts from "@/pages/KeyFacts/KeyFacts";
import Projects from "@/pages/Projects/Projects";
import RingGallery from "@/components/RingGallery/RingGallery";
import ClientShowcase from "@/components/ClientShowcase/ClientShowcase";
import Testimonials from "@/pages/Testimonials/Testimonials";
import RocketJourney, { FLIGHT_VH } from "@/pages/Awards/RocketJourney";
import Awards from "@/pages/Awards/Awards";
import BranchesMap from "@/pages/Branches/BranchesMap";
import ScrollCover from "@/components/ScrollCover/ScrollCover";
import WorkInMotion from "@/pages/WorkInMotion/WorkInMotion";
import SectionShutter from "@/components/SectionShutter/SectionShutter";
import FAQChatAccordion from "@/components/FAQ/FAQChatAccordion";
import ContactSpotlight from "@/components/ContactSpotlight/ContactSpotlight";
import Footer from "@/components/Footer/Footer";

export default function HomeRest({ reduced }) {
  const keyFactsRef = useRef(null);

  return (
    <>
      <ShutterTransition color="#D2D2D2" />
      <KeyFacts sectionRef={keyFactsRef} />
      <Projects keyFactsRef={keyFactsRef} />
      <RingGallery />
      <RocketJourney>
        <Testimonials base={<ClientShowcase />} flightVh={FLIGHT_VH} />
      </RocketJourney>
      <BranchesMap />
      <ScrollCover base={<Awards />}>
        <WorkInMotion />
        {!reduced && <SectionShutter color="#D2D2D2" />}
      </ScrollCover>
      <FAQChatAccordion />
      <ContactSpotlight />
      <Footer />
    </>
  );
}
