// Purpose: Implement the servicesData pages module, keeping this responsibility separate for maintainability.
/* ─────────────────────────────────────────────────────────────────────────────
   SERVICES – the content of every /service page lives here. Edit the text freely.

   • path   : the URL of the page (the first one is /Webdevelopment). Matching is
              case-insensitive, so /webdevelopment works too.
   • category must match a ProjectCategory in components/StackSlider/projects.ts –
              it is used to show the related work at the bottom of the page.
   ───────────────────────────────────────────────────────────────────────────── */

export const SERVICES_DATA = [
  {
    slug: "webdevelopment",
    path: "/Webdevelopment",
    aliases: ["/web-development", "/websites"],
    category: "Websites",
    n: "01",
    name: "Web Development",
    color: "#E5A93C",
    tagline: "Websites that load fast, look sharp and turn visitors into enquiries.",
    intro:
      "We design, build and launch websites around one goal: more of the right people taking the next step. Every build is planned with the business first, designed for real users, engineered for speed and handed over ready to grow.",
    flow: [
      {
        title: "Discovery & goals",
        text: "We start with a call and a short questionnaire: your business, your customers, your competitors and what a 'win' looks like – enquiries, sales, bookings or sign-ups.",
        gives: "Project brief, goals and success metrics",
        time: "Days 1–3",
      },
      {
        title: "Strategy & sitemap",
        text: "We map the pages, the user journeys and the content each page needs, so every click leads somewhere on purpose. Keywords are planned in from day one, not bolted on later.",
        gives: "Sitemap, page wireframes and content plan",
        time: "Week 1",
      },
      {
        title: "UI / UX design",
        text: "Wireframes become a full visual design in your brand: layout, typography, colour, motion and mobile views. You review it, we refine it, and nothing gets built until you approve.",
        gives: "Approved desktop + mobile designs",
        time: "Weeks 1–2",
      },
      {
        title: "Development",
        text: "Clean, modern code with a CMS you can actually use. We build responsive pages, forms, animations, integrations (CRM, payments, booking, WhatsApp) and the admin area for your team.",
        gives: "A working site on a private staging link",
        time: "Weeks 2–5",
      },
      {
        title: "Testing & optimisation",
        text: "Real-device testing, speed tuning, accessibility checks, SEO basics (meta, schema, sitemap, redirects) and security hardening – so launch day has no surprises.",
        gives: "QA report, speed + SEO checklist",
        time: "Week 5–6",
      },
      {
        title: "Launch & growth",
        text: "We take the site live, connect analytics and tracking, train your team and stay on for support. From there we can grow it with SEO, ads and content.",
        gives: "Live site, analytics, training and support",
        time: "Launch + ongoing",
      },
    ],
    deliverables: [
      "Custom responsive website (mobile, tablet, desktop)",
      "CMS or e-commerce setup you can manage yourself",
      "Page-speed and Core Web Vitals tuning",
      "On-page SEO foundations and tracking",
      "Forms, CRM, payment and WhatsApp integrations",
      "Hosting, security and launch support",
    ],
    tools: ["React", "Next.js", "WordPress", "Shopify", "Node.js", "Tailwind", "GA4", "Figma"],
    faqs: [
      {
        q: "How long does a website take?",
        a: "A typical business website takes roughly 4–8 weeks from kickoff to launch. Larger builds with custom features or e-commerce take longer – we give you a clear timeline after discovery.",
      },
      {
        q: "Can I update the site myself?",
        a: "Yes. We build on a CMS so your team can edit text, images, blogs and products without touching code, and we train you before launch.",
      },
      {
        q: "Will the site rank on Google?",
        a: "We build SEO in from the start – structure, speed, metadata and schema. For long-term rankings our SEO service picks up from there.",
      },
      {
        q: "Do you offer support after launch?",
        a: "Yes. We offer maintenance and support plans covering updates, backups, security and improvements.",
      },
    ],
  },
  {
    slug: "seo",
    path: "/SEO",
    aliases: ["/seo-services"],
    category: "SEO",
    n: "02",
    name: "SEO",
    color: "#2DD4BF",
    tagline: "Be the answer when your customers search – and stay there.",
    intro:
      "Our SEO work is a repeatable system: fix the technical foundation, publish content people actually search for, earn authority, and report on the numbers that matter – enquiries and revenue, not just rankings.",
    flow: [
      {
        title: "SEO audit",
        text: "A full health check of your site: crawlability, indexing, speed, mobile, structure, duplicate content and backlinks – plus what your competitors do better.",
        gives: "Audit report with a prioritised fix list",
        time: "Week 1",
      },
      {
        title: "Keyword & intent research",
        text: "We find the searches your customers really make, group them by intent (learn, compare, buy) and match each to a page – existing or new.",
        gives: "Keyword map tied to pages and goals",
        time: "Weeks 1–2",
      },
      {
        title: "Technical & on-page fixes",
        text: "We fix what holds you back: titles and meta, headings, internal links, schema, speed, redirects and index issues – so search engines understand every page.",
        gives: "Implemented fixes, change log",
        time: "Weeks 2–4",
      },
      {
        title: "Content & authority",
        text: "New service pages, blogs and guides written for people first and search second, supported by ethical link building and local listings.",
        gives: "Monthly content calendar and published pages",
        time: "Monthly",
      },
      {
        title: "Track & report",
        text: "Rankings, traffic, leads and conversions in one clear dashboard, with a plain-language summary of what moved and why.",
        gives: "Monthly report and review call",
        time: "Monthly",
      },
      {
        title: "Refine & scale",
        text: "We double down on what works, update what's slipping and expand into new keywords, locations and services.",
        gives: "Quarterly roadmap",
        time: "Quarterly",
      },
    ],
    deliverables: [
      "Technical SEO audit and fixes",
      "Keyword research and page mapping",
      "On-page optimisation and schema markup",
      "Content strategy, blogs and service pages",
      "Local SEO and Google Business Profile",
      "Monthly reporting dashboard",
    ],
    tools: ["Search Console", "GA4", "Ahrefs", "Semrush", "Screaming Frog", "Looker Studio"],
    faqs: [
      {
        q: "How soon will I see results?",
        a: "Technical fixes can show movement within weeks, but meaningful ranking and traffic growth usually builds over 3–6 months. We report progress every month.",
      },
      {
        q: "Do you guarantee a #1 ranking?",
        a: "No honest agency can. We commit to a clear process, transparent reporting and targets based on enquiries and revenue.",
      },
      {
        q: "Do I need a new website for SEO?",
        a: "Not usually. We start with an audit and only recommend changes to the site when the data says they will pay off.",
      },
    ],
  },
  {
    slug: "design",
    path: "/Design",
    aliases: ["/webdesign", "/web-design"],
    category: "Design",
    n: "03",
    name: "Design",
    color: "#60A5FA",
    tagline: "Interfaces and visuals people remember – and know how to use.",
    intro:
      "From websites and apps to social and sales material, we design with a clear purpose: make it easy to understand, pleasant to use and unmistakably yours. Research and testing guide the choices, craft finishes them.",
    flow: [
      {
        title: "Brief & research",
        text: "We learn your audience, your goals and what already works in your market, and collect references so we agree on the direction before drawing anything.",
        gives: "Design brief and moodboard",
        time: "Days 1–3",
      },
      {
        title: "Concepts & wireframes",
        text: "Low-fidelity layouts for the key screens so we can test structure and flow quickly, before polish gets in the way.",
        gives: "Wireframes and user flows",
        time: "Week 1",
      },
      {
        title: "Visual design",
        text: "Colour, typography, imagery, iconography and motion come together into high-fidelity screens, with desktop and mobile versions designed side by side.",
        gives: "High-fidelity designs",
        time: "Weeks 1–3",
      },
      {
        title: "Prototype & feedback",
        text: "A clickable prototype lets you and your users try it before it's built. We gather feedback and iterate in clear rounds.",
        gives: "Interactive prototype, revision rounds",
        time: "Weeks 3–4",
      },
      {
        title: "Design system & handoff",
        text: "Reusable components, styles and spacing rules, organised in Figma and annotated for developers, so the build matches the design exactly.",
        gives: "Design system and developer-ready files",
        time: "Week 4",
      },
      {
        title: "Review & refine",
        text: "We check the finished build against the design and polish details – spacing, states, animation – until it's right.",
        gives: "Design QA and final tweaks",
        time: "Ongoing",
      },
    ],
    deliverables: [
      "UI / UX design for websites and apps",
      "Landing pages built to convert",
      "Social media and ad creatives",
      "Brochures, decks and sales collateral",
      "Design system and component library",
      "Motion and interaction design",
    ],
    tools: ["Figma", "Illustrator", "Photoshop", "After Effects", "Framer", "Lottie"],
    faqs: [
      {
        q: "How many revisions are included?",
        a: "Each stage includes clear, structured revision rounds so feedback stays focused. We agree the number up front in your proposal.",
      },
      {
        q: "Will I own the design files?",
        a: "Yes. On final payment you receive the source files and full usage rights for what we created for you.",
      },
      {
        q: "Can you redesign an existing site or app?",
        a: "Absolutely. We review what's working, keep what your users already like and improve the rest.",
      },
    ],
  },
  {
    slug: "branding",
    path: "/Branding",
    aliases: ["/brand"],
    category: "Branding",
    n: "04",
    name: "Branding",
    color: "#E08263",
    tagline: "A brand with a voice – one people trust and remember.",
    intro:
      "Branding is more than a logo. We define who you are, who you're for and how you sound, then turn it into a complete identity that works the same everywhere – from your website to your packaging.",
    flow: [
      {
        title: "Brand discovery",
        text: "Workshops and interviews on your vision, values, audience and competitors. We find the gap only you can fill.",
        gives: "Discovery summary and competitor map",
        time: "Week 1",
      },
      {
        title: "Strategy & positioning",
        text: "We define your purpose, positioning, personality and the message that sets you apart, in a short document your whole team can use.",
        gives: "Brand strategy and messaging platform",
        time: "Weeks 1–2",
      },
      {
        title: "Name, voice & story",
        text: "Naming and taglines where needed, plus your tone of voice and brand story, so the way you speak is as consistent as the way you look.",
        gives: "Tone of voice guide, tagline options",
        time: "Weeks 2–3",
      },
      {
        title: "Visual identity",
        text: "Logo routes, colour, typography, imagery style and graphic elements. We present a few directions, then refine the chosen one in detail.",
        gives: "Logo suite, palette, typography, patterns",
        time: "Weeks 3–5",
      },
      {
        title: "Brand guidelines",
        text: "One clear rulebook covering logo use, colours, type, layouts and examples, so every future designer or agency stays on brand.",
        gives: "Brand guidelines document",
        time: "Week 5–6",
      },
      {
        title: "Rollout",
        text: "We apply the identity to your website, social profiles, stationery, packaging and presentations, and help you launch it with confidence.",
        gives: "Branded templates and launch assets",
        time: "Week 6+",
      },
    ],
    deliverables: [
      "Brand strategy and positioning",
      "Logo and visual identity system",
      "Tone of voice and messaging",
      "Brand guidelines document",
      "Stationery, social and presentation templates",
      "Packaging and signage artwork",
    ],
    tools: ["Illustrator", "Figma", "InDesign", "Photoshop", "Notion"],
    faqs: [
      {
        q: "Do you do logo-only projects?",
        a: "Yes, but we recommend at least a short strategy phase so the logo has a clear idea behind it.",
      },
      {
        q: "Can you refresh an existing brand?",
        a: "Yes. We keep the equity you've built and modernise what's holding it back.",
      },
      {
        q: "What file formats do I receive?",
        a: "Every format you need – vector, print and web – organised in a tidy brand pack.",
      },
    ],
  },
  {
    slug: "marketing",
    path: "/Marketing",
    aliases: ["/digital-marketing"],
    category: "Marketing",
    n: "05",
    name: "Marketing",
    color: "#FB923C",
    tagline: "Campaigns that reach the right people and grow with every cycle.",
    intro:
      "Social media, content and performance ads working together as one plan. We set the targets, launch fast, measure honestly and put your budget where it earns the most.",
    flow: [
      {
        title: "Goals & audience",
        text: "We agree the target – leads, sales, app installs – then define your ideal customers and where they spend their time online.",
        gives: "Marketing brief, personas, KPIs",
        time: "Week 1",
      },
      {
        title: "Channel strategy",
        text: "We pick the right mix of social, search ads, email and content for your goals and budget, and set a month-by-month plan.",
        gives: "Channel plan and budget split",
        time: "Week 1–2",
      },
      {
        title: "Creative & content",
        text: "Posts, reels, ad creatives, landing pages and copy, all built around one message and approved by you before anything goes live.",
        gives: "Content calendar and campaign assets",
        time: "Weeks 2–3",
      },
      {
        title: "Launch & manage",
        text: "Campaigns go live with tracking in place. We manage daily – bids, audiences, placements and community replies.",
        gives: "Live campaigns with full tracking",
        time: "Week 3 onward",
      },
      {
        title: "Measure & optimise",
        text: "We test creatives, audiences and offers, cut what's not working and push budget to what is, guided by cost per lead and return on spend.",
        gives: "Weekly optimisation notes",
        time: "Weekly",
      },
      {
        title: "Report & scale",
        text: "A clear monthly report with results, learnings and the next steps, then we scale the winners into new audiences and channels.",
        gives: "Monthly report and growth plan",
        time: "Monthly",
      },
    ],
    deliverables: [
      "Social media management and content",
      "Performance ads (Google, Meta, LinkedIn)",
      "Landing pages and funnels",
      "Email and WhatsApp campaigns",
      "Conversion tracking and analytics",
      "Monthly performance reporting",
    ],
    tools: ["Meta Ads", "Google Ads", "GA4", "Mailchimp", "Canva", "Looker Studio"],
    faqs: [
      {
        q: "What budget do I need for ads?",
        a: "It depends on your market and goal. We recommend a testing budget first, then scale once we see what works. Ad spend is separate from our fee.",
      },
      {
        q: "Do you create the content too?",
        a: "Yes – design, video, copy and scheduling are all included, with your approval on every piece.",
      },
      {
        q: "How do I know it's working?",
        a: "You get a live dashboard and a monthly review of the numbers that matter: leads, cost per lead and revenue.",
      },
    ],
  },
];

/* ── Cards of the 3D ring in the "Our Services" section ──
   Services only – nothing here comes from the Projects data. `category` picks the service
   (and its page); `image` is a file in public/cycle/ (swap any of them for your own). */
const cycle = (f) => `/cycle/${f}`;
// Act II · "360° AI orbit": ten capabilities that orbit the brand (shown as No. 01 – No. 10,
// in this order) before the ring unrolls into the 5 core pillars below.
export const SERVICE_CARDS = [
  { category: "Marketing", title: "Predictive Analytics", image: cycle("performance-ads.webp") },
  { category: "Marketing", title: "Algorithmic Social", image: cycle("social-media.webp") },
  { category: "Websites", title: "Full-Stack Web Dev", image: cycle("webdesign.webp") },
  { category: "SEO", title: "Technical & AI SEO", image: cycle("seo.webp") },
  { category: "Design", title: "Generative Content", image: cycle("content.webp") },
  { category: "Branding", title: "Growth Strategy", image: cycle("branding.webp") },
  { category: "Marketing", title: "Google & Meta PPC", image: cycle("performance-ads.webp") },
  { category: "Websites", title: "E-Commerce Scaling", image: cycle("webdesign.webp") },
  { category: "Design", title: "Video & Motion Ads", image: cycle("content.webp") },
  { category: "Websites", title: "CRO & AI Chat Funnels", image: cycle("webdesign.webp") },
];

const clean = (p) => p.replace(/\/+$/, "").toLowerCase();

/** The service whose page lives at this pathname (or null). */
export function findServiceByPath(pathname) {
  const p = clean(pathname || "");
  return (
    SERVICES_DATA.find((s) => clean(s.path) === p || s.aliases.some((a) => clean(a) === p)) || null
  );
}

export const serviceByCategory = (category) => SERVICES_DATA.find((s) => s.category === category) || null;
