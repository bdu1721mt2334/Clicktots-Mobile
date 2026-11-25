// Purpose: Compose the home page sections and coordinate navigation, shared scrolling, and service overlays.
import { useState, useCallback, useEffect, lazy, Suspense, startTransition } from "react";
import { Navbar } from "@/components/Navbar/Navbar";
import { Earthrise } from "@/pages/Earthrise/Earthrise";
import { AboutReveal } from "@/pages/About/AboutReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTextFade } from "@/hooks/useTextFade";
import { startScroll, scrollToTarget } from "@/lib/scroll";
import { usePathname, navigate, goHome } from "@/lib/router";
import { findServiceByPath } from "@/pages/Services/servicesData";

const SERVICES_SCROLL_AT = 0.9;
function scrollToServices() {
  const section = document.getElementById("ring-gallery");
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(1, section.offsetHeight - window.innerHeight);
  scrollToTarget(top + span * SERVICES_SCROLL_AT, 2.2);
}

const loadHomeRest = () => import("./HomeRest");
const HomeRest = lazy(loadHomeRest);

// Inner pages are separate chunks (prefetched while idle after interaction, never during initial load).
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
const idle =
  typeof window !== "undefined" && window.requestIdleCallback
    ? (f) => window.requestIdleCallback(f, { timeout: 6000 })
    : (f) => setTimeout(f, 3000);

/** Stays true once `open` has been true, so a lazy overlay remains mounted for its closing animation. */
function useEverOpen(open) {
  const [ever, setEver] = useState(open);
  if (open && !ever) setEver(true);
  return ever || open;
}

function HomePage() {
  const [activeTab, setActiveTab] = useState("home");
  const reduced = useReducedMotion();
  useTextFade(reduced);

  // Mount below-the-fold chunk on first user scroll/interaction or deep-link (keeps initial LCP & main thread ultra-fast)
  const [restReady, setRestReady] = useState(false);
  useEffect(() => {
    let done = false;
    const EVENTS = ["scroll", "wheel", "touchstart", "keydown", "pointerdown"];
    const go = (urgent) => {
      if (done) return;
      done = true;
      EVENTS.forEach((e) => window.removeEventListener(e, now));
      if (urgent) setRestReady(true);
      else startTransition(() => setRestReady(true));
    };
    const now = () => go(true);
    if (
      window.scrollY > 10 ||
      window.location.hash ||
      window.location.pathname.replace(/\/+$/, "") !== ""
    ) {
      go(true);
      return undefined;
    }
    EVENTS.forEach((e) => window.addEventListener(e, now, { passive: true }));
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, now));
    };
  }, []);

  const pathname = usePathname();
  const service = findServiceByPath(pathname);

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
  const caseMounted = useEverOpen(caseStudyOpen);

  // Warm inner-page chunks only after first user interaction
  useEffect(() => {
    const EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
    const warm = () => {
      EVENTS.forEach((e) => window.removeEventListener(e, warm));
      idle(() => Object.values(loaders).forEach((load) => load()));
    };
    EVENTS.forEach((e) => window.addEventListener(e, warm, { passive: true }));
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, warm));
    };
  }, []);

  // One rAF loop + smooth scroll for the whole page
  useEffect(() => startScroll(reduced), [reduced]);

  useEffect(() => {
    const base = "Clicktots Technologies";
    document.title = service
      ? `${service.name} · ${base}`
      : route
        ? `${route.title} · ${base}`
        : `${base} · AI-Powered Digital Marketing Agency in Chennai`;
  }, [service, route]);

  const openService = useCallback((path) => navigate(path, { replace: true }), []);

  const routeTab = service
    ? "services"
    : route
      ? route.id
      : /^\/projects/i.test(pathname)
        ? "projects"
        : /^\/about/i.test(pathname)
          ? "about"
          : null;

  const handleTabChange = useCallback((id) => {
    setActiveTab(id);
    const onHome = window.location.pathname.replace(/\/+$/, "") === "";
    const whenHome = (fn) => {
      if (onHome) return fn();
      navigate("/", { replace: true });
      const t0 = performance.now();
      const wait = () => {
        if (!document.querySelector('[role="dialog"][aria-modal="true"]') || performance.now() - t0 > 4000) fn();
        else setTimeout(wait, 120);
      };
      setTimeout(wait, 200);
    };
    if (id === "home") whenHome(() => scrollToTarget(0));
    else if (id === "about") {
      setRestReady(true);
      navigate("/about");
    } else if (id === "services") {
      setRestReady(true);
      whenHome(() => {
        if (document.getElementById("ring-gallery")) scrollToServices();
        else setTimeout(scrollToServices, 250);
      });
    } else if (id === "projects") {
      setRestReady(true);
      navigate("/projects");
    } else if (ROUTE_BY_ID[id]) navigate(`/${ROUTE_BY_ID[id].base}`);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#05070c] text-[#10291a] selection:bg-[#0a84ff] selection:text-white font-sans antialiased overflow-x-clip">
      {/* Navbar: shown immediately on first paint */}
      <Navbar
        isRevealed={true}
        logoLanded={true}
        activeTab={routeTab || activeTab}
        onTabChange={handleTabChange}
      />

      {/* Hero: Earthrise displays immediately on first paint with no intro screen */}
      <Earthrise />

      {/* About Us: rises right after the astronaut scene */}
      <AboutReveal />

      {restReady && (
        <Suspense fallback={null}>
          <HomeRest reduced={reduced} />
        </Suspense>
      )}

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