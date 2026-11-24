// Purpose: Compose the home page sections and coordinate navigation, shared scrolling, and service overlays.
import { useState, useCallback, useEffect, useRef, lazy, Suspense, startTransition } from "react";
import { Navbar } from "@/components/Navbar/Navbar";
import { Earthrise } from "@/pages/Earthrise/Earthrise";
import { AboutReveal } from "@/pages/About/AboutReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTextFade } from "@/hooks/useTextFade";
import { startScroll, scrollToTarget } from "@/lib/scroll";
import { usePathname, navigate, goHome } from "@/lib/router";
import ShutterTransition from "@/components/ShutterTransition/ShutterTransition";
import KeyFacts from "@/pages/KeyFacts/KeyFacts";
import Projects from "@/pages/Projects/Projects";
import RingGallery, { scrollToServices } from "@/components/RingGallery/RingGallery";
import ClientShowcase from "@/components/ClientShowcase/ClientShowcase";
import Testimonials from "@/pages/Testimonials/Testimonials";
import RocketJourney from "@/pages/Awards/RocketJourney";
import Awards from "@/pages/Awards/Awards";
import BranchesMap from "@/pages/Branches/BranchesMap";
import ScrollCover from "@/components/ScrollCover/ScrollCover";
import WorkInMotion from "@/pages/WorkInMotion/WorkInMotion";
import SectionShutter from "@/components/SectionShutter/SectionShutter";
import FAQChatAccordion from "@/components/FAQ/FAQChatAccordion";
import ContactSpotlight from "@/components/ContactSpotlight/ContactSpotlight";
import Footer from "@/components/Footer/Footer";
import { findServiceByPath } from "@/pages/Services/servicesData";
// Inner pages are separate chunks (the case-study one brings GSAP + ScrollTrigger, which must not run on the home page).
// They are prefetched while the browser is idle, so opening one stays instant.
const loaders = {
  service: () => import("@/pages/Services/ServiceOverlay"),
  blog: () => import("@/pages/Blog/BlogOverlay"),
  career: () => import("@/pages/Career/CareerOverlay"),
  case: () => import("@/pages/CaseStudy/CaseStudyOverlay"),
};
const ServiceOverlay = lazy(loaders.service);
const BlogOverlay = lazy(loaders.blog);
const CareerOverlay = lazy(loaders.career);
const CaseStudyOverlay = lazy(loaders.case);

// Route table: "/<base>" and "/<base>/<slug>" for every shutter-style inner page.
const ROUTES = [
  { id: "blogs", base: "blog", re: /^\/blog(?:\/([^/]+))?$/i, title: "Blog" },
  { id: "career", base: "career", re: /^\/career(?:\/([^/]+))?$/i, title: "Careers" },
  { id: "casestudy", base: "case-study", re: /^\/case-study(?:\/([^/]+))?$/i, title: "Case Study" },
];
const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const idle = typeof window !== "undefined" && window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 6000 }) : (f) => setTimeout(f, 3000);

/** Stays true once `open` has been true, so a lazy overlay remains mounted for its closing animation. */
function useEverOpen(open) {
  const [ever, setEver] = useState(open);
  if (open && !ever) setEver(true);
  return ever || open;
}

function HomePage() {
  // No preloader: the page opens straight away, the navbar and hero ease in softly.
  const [revealed, setRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const reduced = useReducedMotion();
  useTextFade(reduced); // text fades in as it scrolls into view, site-wide
  const keyFactsRef = useRef(null);

  /* Everything below the hero + About is rendered right after the first paint, in a time-sliced transition
     (React yields to the browser every few ms), or at once on the first scroll / key press. Rendering all
     twelve sections in one go at load was a single long main-thread task (PageSpeed "Total Blocking Time"). */
  const [restReady, setRestReady] = useState(false);
  useEffect(() => {
    let done = false;
    const EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"];
    const go = (urgent) => {
      if (done) return;
      done = true;
      EVENTS.forEach((e) => window.removeEventListener(e, now));
      if (urgent) setRestReady(true);
      else startTransition(() => setRestReady(true));
    };
    const now = () => go(true);
    EVENTS.forEach((e) => window.addEventListener(e, now, { passive: true }));
    // after the hero's first frame has painted
    const raf = requestAnimationFrame(() => setTimeout(() => go(false), 0));
    // a deep link / reload that lands below the hero needs the sections at once
    if (window.location.hash) go(true);
    return () => {
      cancelAnimationFrame(raf);
      EVENTS.forEach((e) => window.removeEventListener(e, now));
    };
  }, []);
  // /Webdevelopment, /SEO, … → the matching service page (shutter animation)
  const pathname = usePathname();
  const service = findServiceByPath(pathname);

  // Blog / Career / Case Study: "/<base>" and "/<base>/<slug>", all opened with the same shutter bars
  const route = ROUTES.find((r) => r.re.test(pathname)) || null;
  const routeSlug = route ? pathname.match(route.re)[1] || null : null;
  const blogOpen = route?.id === "blogs";
  const careerOpen = route?.id === "career";
  const caseStudyOpen = route?.id === "casestudy";
  const closeOverlay = useCallback(() => {
    setActiveTab("home");
    navigate("/", { replace: true });
  }, []);
  const serviceMounted = useEverOpen(!!service);
  const blogMounted = useEverOpen(blogOpen);
  const careerMounted = useEverOpen(careerOpen);
  // once opened it stays mounted, so its closing animation can play
  const caseMounted = useEverOpen(caseStudyOpen);

  // warm the inner-page chunks: on the first sign of interaction, or once the home page has settled
  useEffect(() => {
    const EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
    const warm = () => {
      clearTimeout(t);
      EVENTS.forEach((e) => window.removeEventListener(e, warm));
      idle(() => Object.values(loaders).forEach((load) => load()));
    };
    const t = setTimeout(warm, 15000); // interaction usually comes first; this is only a late fallback
    EVENTS.forEach((e) => window.addEventListener(e, warm, { passive: true }));
    return () => {
      clearTimeout(t);
      EVENTS.forEach((e) => window.removeEventListener(e, warm));
    };
  }, []);

  // One rAF loop + smooth scroll that drives the Earthrise hero
  useEffect(() => startScroll(reduced), [reduced]);

  // let the first frame paint, then bring the navbar in
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(t);
  }, []);

  // the static first frame from index.html (#ct-prehero) fades away once the real hero has faded in over it
  // (or at once if the visitor starts scrolling / opens an inner page first)
  useEffect(() => {
    const pre = document.getElementById("ct-prehero");
    if (!pre) return undefined;
    let done = false;
    const out = () => {
      if (done) return;
      done = true;
      pre.classList.add("is-out");
      setTimeout(() => pre.remove(), 800);
      window.removeEventListener("wheel", out);
      window.removeEventListener("touchmove", out);
    };
    const onHome = window.location.pathname.replace(/\/+$/, "") === "";
    const t = setTimeout(out, onHome ? 1600 : 0);
    window.addEventListener("wheel", out, { passive: true });
    window.addEventListener("touchmove", out, { passive: true });
    return () => {
      clearTimeout(t);
      out();
    };
  }, []);

  // Service pages set their own tab title
  useEffect(() => {
    const base = "Clicktots Technologies";
    document.title = service
      ? `${service.name} · ${base}`
      : route
        ? `${route.title} · ${base}`
        : `${base} · AI-Powered Digital Marketing Agency in Chennai`;
  }, [service, route]);

  // switching between service pages replaces the history entry, so "close" always returns to the home page
  const openService = useCallback((path) => navigate(path, { replace: true }), []);

  // the tab that matches the open inner page (so the lens sits on "Blogs" while reading the blog, etc.)
  const routeTab = service
    ? "services"
    : route
      ? route.id
      : /^\/projects/i.test(pathname)
        ? "projects"
        : /^\/about/i.test(pathname)
          ? "about"
          : null;

  // Navbar tabs: Home / Services scroll to their sections, the rest open their pages.
  // From an inner page, Home / Services first close it, then scroll once the page is unlocked again.
  const handleTabChange = useCallback((id) => {
    setActiveTab(id);
    const onHome = window.location.pathname.replace(/\/+$/, "") === "";
    const whenHome = (fn) => {
      if (onHome) return fn();
      navigate("/", { replace: true });
      const t0 = performance.now();
      const wait = () => {
        // the overlay keeps the page scroll-locked until its closing shutter has finished
        if (!document.querySelector('[role="dialog"][aria-modal="true"]') || performance.now() - t0 > 4000) fn();
        else setTimeout(wait, 120);
      };
      setTimeout(wait, 200);
    };
    if (id === "home") whenHome(() => scrollToTarget(0));
    else if (id === "about") navigate("/about");
    else if (id === "services") whenHome(() => scrollToServices());
    else if (id === "projects") navigate("/projects");
    else if (ROUTE_BY_ID[id]) navigate(`/${ROUTE_BY_ID[id].base}`);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#e7ebe8] text-[#10291a] selection:bg-[#0a84ff] selection:text-white font-sans antialiased overflow-x-clip">
      {/* Navbar */}
      <Navbar
        isRevealed={revealed}
        logoLanded={revealed}
        activeTab={routeTab || activeTab}
        onTabChange={handleTabChange}
      />

      {/* ── ACT I · SIGNAL IN THE NOISE (dust = market noise → AI hand → proof) ── */}
      {/* Hero: Selene Earthrise (moon / astronaut scroll animation) – fades in on load */}
      <div className="ct-hero-in">
        <Earthrise />
      </div>

      {/* About Us: rises from the bottom right after the astronaut scene */}
      <AboutReveal />

      {restReady && (
      <>
      {/* Shutter bars wipe About → Key Facts (bar colour = Key Facts' top colour) */}
      <ShutterTransition color="#D2D2D2" />

      {/* Key Facts (blur text reveal, flip-up cards, rolling counters) */}
      <KeyFacts sectionRef={keyFactsRef} />

      {/* ── ACT II · THE AI GROWTH ENGINE (case studies → 10-part orbit → neural client mesh) ── */}
      {/* Projects: pinned section, vertical scroll slides the cards sideways */}
      <Projects keyFactsRef={keyFactsRef} />

      {/* Ring gallery + "Our Services": click a service word to open its page */}
      <RingGallery />

      {/* Client showcase + Testimonials (Scroll Over): the client section stays pinned and dims
          into the background while the white testimonial section rises over it.
          Balls rain in; hover lights the real logo; grab & throw them. */}
      {/* Rocket journey: at the end of the testimonials a 3D rocket lifts off from the
          bottom-right corner, the testimonials fly away to the top-left, and the
          rocket lands on the Moon = the Awards & Milestones section below. */}
      <RocketJourney>
        <Testimonials base={<ClientShowcase />} />
      </RocketJourney>

      {/* ── ACT III · HUMAN IMPACT & SCALE (scrapbook → rocket → 6 hubs → awards) — scrapbook + rocket above ── */}
      {/* Our Branches: the rocket lands on Earth, the India map shows Chennai and a signal runs to
          Hyderabad, Bangalore, Mumbai and Delhi; a ripple from Delhi then flows into Awards below. */}
      <BranchesMap />

      {/* Awards & Milestones: numbered hover-index list, 5 rows with photos */}
      {/* Awards stays put at its end while the dark Work in Motion panel slides up over it
          (rounded top, soft shadow) and the Awards behind it recede: the same scroll-over
          idea as Client Showcase → Testimonials. Work in Motion: a ribbon of live video work
          sweeps through 3D space, then lands in a grid. */}
      <ScrollCover base={<Awards />}>
        <WorkInMotion />
        {/* Shutter bars (the same wipe as About → Key Facts) rise over the landed grid, in the FAQ's colour */}
        {!reduced && <SectionShutter color="#D2D2D2" />}
      </ScrollCover>

      {/* ── ACT IV · VELOCITY & TOUCHDOWN (motion grid above → AI chat → CLICK echo → lunar return) ── */}
      {/* FAQ: chat-style accordion on the Key Facts background (#D2D2D2 → white) */}
      <FAQChatAccordion />

      {/* "CLICK" scroll animation: the I turns into the Contact Us button (opens the expert form) */}
      <ContactSpotlight />

      {/* Footer: revealed from underneath right after the button forms; Milky Way + moon scene,
          giant "Clicktots" that lights up on hover */}
      <Footer />
      </>
      )}

      {/* Inner pages, each its own chunk (service pages grow out of the clicked word / card; the rest use shutter bars) */}
      {serviceMounted && (
        <Suspense fallback={null}>
          <ServiceOverlay service={service} onClose={goHome} onNavigate={openService} />
        </Suspense>
      )}
      {blogMounted && (
        <Suspense fallback={null}>
          <BlogOverlay open={blogOpen} slug={routeSlug} onClose={closeOverlay} />
        </Suspense>
      )}
      {careerMounted && (
        <Suspense fallback={null}>
          <CareerOverlay open={careerOpen} slug={routeSlug} onClose={closeOverlay} />
        </Suspense>
      )}
      {caseMounted && (
        <Suspense fallback={null}>
          <CaseStudyOverlay open={caseStudyOpen} slug={routeSlug} onClose={closeOverlay} />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return <HomePage />;
}