// Purpose: The rocket story of every service page. One entry per service slug; `steps` lines up with that
// service's `flow` in servicesData.js (same order, same count). The flow keeps the title, text, time
// and "You get"; this file adds the story layer the rocket tells at each stop.
import {
  Target,
  Network,
  PenTool,
  CodeXml,
  Gauge,
  Rocket,
  Activity,
  Search,
  Wrench,
  FileText,
  ChartLine,
  TrendingUp,
  Users,
  LayoutTemplate,
  Palette,
  MousePointerClick,
  Layers,
  Sparkles,
  Compass,
  Crosshair,
  MessageCircle,
  Shapes,
  BookOpen,
  Megaphone,
  Share2,
  Clapperboard,
  SlidersHorizontal,
  ChartColumn,
  Smartphone,
  Play,
  Type,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Per step:
     short   : 2–5 words – the label on the step rail and under the picture
     icon    : a lucide-react icon
     mission : the name of this stop on the rocket's journey
     story   : one or two sentences, told like a mission log
     ai      : how AI speeds this step up (people still make the calls)
     image   : the explainer picture for this step.
               Placeholders live in public/services/<slug>/step-<n>.webp –
               overwrite those files with your own pictures (same names), or change the path here.
   ───────────────────────────────────────────────────────────────────────────── */

const img = (slug, n) => `/services/${slug}/step-${n}.webp`;

export const STORY = {
  webdevelopment: {
    eyebrow: "Mission briefing · Web Development",
    title: "From first call to live website",
    steps: [
      {
        short: "Know your goals",
        icon: Target,
        mission: "Mission briefing",
        story: "Every flight starts with a destination. We sit down with you and agree exactly where this website needs to take your business.",
        ai: "AI summarises your competitors' sites and customer reviews, so the first call starts with facts, not guesses.",
        image: img("webdevelopment", 1),
      },
      {
        short: "Plan every page",
        icon: Network,
        mission: "Flight plan",
        story: "Now we chart the route: which pages exist, what each one says, and the path a visitor takes from 'just looking' to 'contact us'.",
        ai: "AI groups real search queries into page topics, so the sitemap matches what people actually look for.",
        image: img("webdevelopment", 2),
      },
      {
        short: "Design in your brand",
        icon: PenTool,
        mission: "Building the cabin",
        story: "The plan gets a face – your colours, your tone, designed for a thumb on a phone first and the big screen after.",
        ai: "AI drafts layout and copy variations quickly; our designers pick, refine and keep everything on brand.",
        image: img("webdevelopment", 3),
      },
      {
        short: "Build it fast & clean",
        icon: CodeXml,
        mission: "Engines on",
        story: "Designs turn into clean, fast code and a CMS your team can run without calling us for every comma.",
        ai: "AI-assisted code review catches bugs and accessibility issues early, before they ever reach staging.",
        image: img("webdevelopment", 4),
      },
      {
        short: "Test, speed up, secure",
        icon: Gauge,
        mission: "Systems check",
        story: "Real phones, real browsers, slow networks. We press every button so your visitors never find the broken one.",
        ai: "Automated tests and AI log checks flag slow pages and errors across dozens of devices.",
        image: img("webdevelopment", 5),
      },
      {
        short: "Go live & grow",
        icon: Rocket,
        mission: "Lift-off",
        story: "Countdown done. The site goes live, tracking switches on, your team gets the keys – and we stay in orbit for support.",
        ai: "AI-powered analytics alerts show what visitors do from day one, so growth decisions are data-led.",
        image: img("webdevelopment", 6),
      },
    ],
  },
  seo: {
    eyebrow: "Mission briefing · SEO",
    title: "From invisible to the top of Google",
    steps: [
      {
        short: "Health-check the site",
        icon: Activity,
        mission: "Pre-flight scan",
        story: "Before we climb, we inspect everything that could keep you grounded – crawl errors, slow pages, duplicate content and weak links.",
        ai: "AI crawls every URL and ranks issues by impact, so the fix list starts with what moves rankings.",
        image: img("seo", 1),
      },
      {
        short: "Find real searches",
        icon: Search,
        mission: "Reading the stars",
        story: "We map the exact words your customers type, sorted by intent – learning, comparing or ready to buy.",
        ai: "AI clusters thousands of search terms by intent in minutes; we choose the ones that bring revenue.",
        image: img("seo", 2),
      },
      {
        short: "Fix what blocks Google",
        icon: Wrench,
        mission: "Clearing the runway",
        story: "Titles, schema, speed, redirects, internal links – we remove everything that stops Google understanding your pages.",
        ai: "AI drafts meta titles and schema at scale; every line is reviewed by our SEO team before it goes live.",
        image: img("seo", 3),
      },
      {
        short: "Publish & earn links",
        icon: FileText,
        mission: "Gaining altitude",
        story: "Helpful pages and guides that answer real questions, backed by genuine links and local listings that build trust.",
        ai: "AI spots content gaps against your competitors; our writers create pages people actually want to read.",
        image: img("seo", 4),
      },
      {
        short: "Track every number",
        icon: ChartLine,
        mission: "Mission control",
        story: "Rankings, traffic and enquiries on one dashboard – with a plain-language note on what moved and why.",
        ai: "AI flags unusual drops or spikes the moment they happen, so we react in days, not months.",
        image: img("seo", 5),
      },
      {
        short: "Scale what works",
        icon: TrendingUp,
        mission: "New orbit",
        story: "What works gets more fuel. We expand into new keywords, locations and services while protecting what you've won.",
        ai: "AI forecasting shows which pages are closest to page one, so effort goes where it pays fastest.",
        image: img("seo", 6),
      },
    ],
  },
  design: {
    eyebrow: "Mission briefing · Design",
    title: "From blank artboard to finished screens",
    steps: [
      {
        short: "Understand your users",
        icon: Users,
        mission: "Scouting the planet",
        story: "We study the people who will use your product and what already works in your market, before drawing a single line.",
        ai: "AI summarises user feedback and reviews into clear themes, so research takes days, not weeks.",
        image: img("design", 1),
      },
      {
        short: "Sketch the layout",
        icon: LayoutTemplate,
        mission: "Drawing the blueprint",
        story: "Simple grey boxes first – so we can test the flow and structure quickly, before colour gets in the way.",
        ai: "AI suggests layout patterns from proven UX research; we test them and keep only what fits your users.",
        image: img("design", 2),
      },
      {
        short: "Add colour & type",
        icon: Palette,
        mission: "Adding the colours",
        story: "Typography, colour, imagery and motion come together into screens that feel unmistakably yours.",
        ai: "AI explores palettes and image concepts fast; our designers craft the final look by hand.",
        image: img("design", 3),
      },
      {
        short: "Click through a prototype",
        icon: MousePointerClick,
        mission: "Test flight",
        story: "A clickable prototype lets you and real users try it out before a single line of code is written.",
        ai: "AI-assisted usability analysis highlights where testers hesitate or get lost.",
        image: img("design", 4),
      },
      {
        short: "Hand over a system",
        icon: Layers,
        mission: "Packing the toolkit",
        story: "Every component, colour and spacing rule organised in Figma, so developers build it exactly as designed.",
        ai: "AI checks the files for inconsistent styles and missing states before handoff.",
        image: img("design", 5),
      },
      {
        short: "Polish & improve",
        icon: Sparkles,
        mission: "Final polish",
        story: "We compare the live build with the design detail by detail and fix the small things users notice.",
        ai: "Visual comparison tools flag spacing and colour differences between design and build automatically.",
        image: img("design", 6),
      },
    ],
  },
  branding: {
    eyebrow: "Mission briefing · Branding",
    title: "From a feeling to a brand people remember",
    steps: [
      {
        short: "Find your story",
        icon: Compass,
        mission: "Finding the north star",
        story: "Workshops and interviews uncover your vision, your values and the gap in the market only you can fill.",
        ai: "AI analyses competitor messaging and reviews to show where your market all sounds the same.",
        image: img("branding", 1),
      },
      {
        short: "Own your place",
        icon: Crosshair,
        mission: "Setting coordinates",
        story: "We define your purpose, positioning and personality in one short document your whole team can use.",
        ai: "AI tests positioning lines against your audience's own words, so the message lands in their language.",
        image: img("branding", 2),
      },
      {
        short: "Find your voice",
        icon: MessageCircle,
        mission: "Finding the voice",
        story: "Naming, taglines and a tone of voice, so the way you speak is as consistent as the way you look.",
        ai: "AI generates hundreds of name and tagline ideas; we shortlist, check availability and refine.",
        image: img("branding", 3),
      },
      {
        short: "Logo, colour & type",
        icon: Shapes,
        mission: "Designing the emblem",
        story: "Logo, colour, typography and graphic elements – a few strong routes, then one refined in detail.",
        ai: "AI helps explore mood boards and mock-ups quickly; every logo is designed and drawn by our team.",
        image: img("branding", 4),
      },
      {
        short: "Write the rules",
        icon: BookOpen,
        mission: "Writing the flight manual",
        story: "One clear rulebook so every future designer, printer or agency keeps your brand on course.",
        ai: "AI helps turn the rulebook into short checklists for each team – marketing, sales and print.",
        image: img("branding", 5),
      },
      {
        short: "Show up everywhere",
        icon: Megaphone,
        mission: "Planting the flag",
        story: "Your new identity lands everywhere at once – website, social, stationery, packaging and signage.",
        ai: "AI resizes and adapts templates for every platform, so the launch looks consistent everywhere.",
        image: img("branding", 6),
      },
    ],
  },
  marketing: {
    eyebrow: "Mission briefing · Marketing",
    title: "From the right audience to real sales",
    steps: [
      {
        short: "Pick who & why",
        icon: Target,
        mission: "Locking the target",
        story: "We agree what success means – leads, sales or installs – and define exactly who we are trying to reach.",
        ai: "AI builds audience personas from your customer data and market signals.",
        image: img("marketing", 1),
      },
      {
        short: "Choose the channels",
        icon: Share2,
        mission: "Plotting the route",
        story: "The right mix of social, search, email and content for your budget, planned month by month.",
        ai: "AI models budget splits across channels to forecast cost per lead before a rupee is spent.",
        image: img("marketing", 2),
      },
      {
        short: "Make scroll-stopping ads",
        icon: Clapperboard,
        mission: "Loading the payload",
        story: "Posts, reels, ads and landing pages built around one message – and approved by you before launch.",
        ai: "AI produces quick creative variations to test; our team writes and designs the winners.",
        image: img("marketing", 3),
      },
      {
        short: "Launch & manage",
        icon: Rocket,
        mission: "Ignition",
        story: "Campaigns go live with tracking in place, and we manage bids, audiences and replies every day.",
        ai: "Platform AI bidding is tuned and watched by our team, so automation never runs unchecked.",
        image: img("marketing", 4),
      },
      {
        short: "Cut waste, boost winners",
        icon: SlidersHorizontal,
        mission: "Course correction",
        story: "We test, cut what isn't working and push budget to what is, guided by cost per lead and return.",
        ai: "AI spots tired ads and rising costs early and alerts us to refresh or move budget.",
        image: img("marketing", 5),
      },
      {
        short: "Report & scale up",
        icon: ChartColumn,
        mission: "Expanding the orbit",
        story: "A clear monthly report, then we scale the winners into new audiences and channels.",
        ai: "AI-written insight summaries explain the numbers in plain language for your team.",
        image: img("marketing", 6),
      },
    ],
  },
};


/* ─────────────────────────────────────────────────────────────────────────────
   stages: what the shuttle drops at each stage separation (boosters after step 2, tank after step 4)
           and WHY – the business reason shown next to the separating parts.
   TEAM layer – how the Clicktots team builds each step (shown with the laptop), the floating
   hologram icons around the laptop, and the "mission accomplished" result after the Moon landing.
     team : roles working on this step (shown as small avatars under the laptop)
     how  : 3 short lines – what the team actually does on the laptop in this step
     avoid: the business problem this step prevents – shown on the asteroid the shuttle steers around
            on the way to this step (step 1 has none: it's the launch)
   ───────────────────────────────────────────────────────────────────────────── */
export const TEAM = {
  webdevelopment: {
    holo: [CodeXml, Smartphone, Gauge],
    stages: [
      { title: "Planning boosters released", text: "Goals and sitemap are signed off – no more guesswork weighing down the build." },
      { title: "Build tank released", text: "Design and code are done. From here we test, launch and grow – lighter and faster." },
    ],
    finale: {
      title: "Your website is live",
      text: "Fast, on brand and ready to turn visitors into enquiries – with tracking switched on and our team in orbit for support.",
    },
    steps: [
      { team: ["Project manager", "Strategist"], how: ["Kick-off call to capture goals, audience and budget", "Competitor sites reviewed side by side", "Success metrics written into a shared brief"] },
      { avoid: "Pages with no plan", team: ["UX strategist", "SEO specialist"], how: ["Page tree mapped in a visual sitemap", "Keywords assigned to every page before design", "Journeys sketched from landing page to enquiry"] },
      { avoid: "Off-brand, generic design", team: ["UI/UX designer"], how: ["Wireframes turned into full designs in Figma", "Mobile and desktop screens designed together", "You review a clickable link and comment"] },
      { avoid: "Slow, buggy code", team: ["Front-end developer", "Back-end developer"], how: ["Pages coded as clean, reusable components", "CMS, forms and integrations wired up", "Every change pushed to a private staging link"] },
      { avoid: "Broken on mobile", team: ["QA engineer", "Developer"], how: ["Tested on real phones, tablets and browsers", "Speed tuned until Core Web Vitals pass", "Security, backups and SEO basics checked off"] },
      { avoid: "Launch-day crashes", team: ["DevOps engineer", "Project manager"], how: ["Domain, hosting and SSL switched with no downtime", "Analytics and conversion tracking go live", "Your team trained to edit the site"] },
    ],
  },
  seo: {
    holo: [Play, Rocket, ChartColumn],
    stages: [
      { title: "Research boosters released", text: "Audit and keyword map are done – we drop the guesswork and fly on data." },
      { title: "Heavy-lift tank released", text: "Fixes and content are in place. Now it's tracking, reporting and scaling up." },
    ],
    finale: {
      title: "You're found on Google",
      text: "Visibility built on a solid technical base, helpful content and honest reporting – plus a plan to keep climbing.",
    },
    steps: [
      { team: ["SEO analyst"], how: ["Full site crawl run and every error logged", "Speed, mobile and indexing checked in Search Console", "Competitors' rankings and backlinks benchmarked"] },
      { avoid: "Guessing keywords", team: ["SEO analyst", "Content strategist"], how: ["Search terms pulled from keyword tools", "Terms grouped by intent: learn, compare, buy", "Each keyword group mapped to a page"] },
      { avoid: "Crawl & speed errors", team: ["Technical SEO", "Developer"], how: ["Titles, meta and headings rewritten page by page", "Schema, redirects and internal links fixed", "Speed issues solved and every change logged"] },
      { avoid: "Thin, unhelpful content", team: ["Content writer", "Outreach specialist"], how: ["Service pages and blogs written from the keyword map", "Google Business Profile and listings updated", "Genuine links earned from relevant sites"] },
      { avoid: "No idea what's working", team: ["SEO analyst"], how: ["Rankings, traffic and leads in one dashboard", "Monthly changes explained in plain language", "Review call to agree the next priorities"] },
      { avoid: "Traffic that plateaus", team: ["SEO lead", "Content strategist"], how: ["Pages close to page one get extra attention", "New locations and services added to the plan", "Quarterly roadmap updated with the numbers"] },
    ],
  },
  design: {
    holo: [Palette, PenTool, Layers],
    stages: [
      { title: "Research boosters released", text: "Users understood and flows mapped – no more drawing in the dark." },
      { title: "Iteration tank released", text: "Prototype tested and approved – the design is locked for a clean handoff." },
    ],
    finale: {
      title: "Designs people remember",
      text: "A tested, polished interface and a design system your developers can build from – screen for screen.",
    },
    steps: [
      { team: ["UX researcher", "Designer"], how: ["Users and stakeholders interviewed", "Competitor products reviewed and noted", "Moodboard agreed before any drawing"] },
      { avoid: "Confusing user flows", team: ["UX designer"], how: ["Key screens drawn as grey-box wireframes", "User flows mapped from entry to goal", "Structure tested before visual polish"] },
      { avoid: "A look nobody remembers", team: ["UI designer"], how: ["Colour, type and imagery applied in Figma", "Desktop and mobile designed side by side", "Icons and micro-animations added"] },
      { avoid: "Untested ideas", team: ["UI designer", "UX researcher"], how: ["Screens linked into a clickable prototype", "Real users try it while we watch", "Feedback turned into focused revisions"] },
      { avoid: "Messy developer handoff", team: ["Design system designer"], how: ["Components, colours and spacing organised in Figma", "Every state annotated for developers", "Developer-ready files handed over"] },
      { avoid: "Build that drifts from design", team: ["Designer", "Developer"], how: ["Live build compared with the designs", "Spacing, states and animation polished", "Final tweaks signed off together"] },
    ],
  },
  branding: {
    holo: [Shapes, Type, Sparkles],
    stages: [
      { title: "Discovery boosters released", text: "Story and positioning are agreed – every design choice now has a reason." },
      { title: "Creation tank released", text: "Name, voice and identity are done. Next: the rulebook and the rollout." },
    ],
    finale: {
      title: "A brand that stands out",
      text: "A clear story, a confident voice and an identity that looks the same everywhere you show up.",
    },
    steps: [
      { team: ["Brand strategist"], how: ["Workshop with founders and key staff", "Customers and competitors researched", "Market gap summarised on one page"] },
      { avoid: "Me-too positioning", team: ["Brand strategist", "Copywriter"], how: ["Purpose, positioning and personality defined", "Key messages drafted for each audience", "One-page brand platform shared with your team"] },
      { avoid: "An inconsistent voice", team: ["Copywriter", "Naming specialist"], how: ["Name and tagline options shortlisted", "Domain and trademark availability checked", "Tone of voice guide written with examples"] },
      { avoid: "A forgettable logo", team: ["Brand designer"], how: ["Logo routes sketched and presented", "Chosen route refined with colour and type", "Logo tested at every size, light and dark"] },
      { avoid: "Off-brand usage", team: ["Brand designer", "Copywriter"], how: ["Logo, colour and type rules documented", "Do's and don'ts shown with real examples", "Guidelines delivered as a shareable PDF"] },
      { avoid: "A patchy launch", team: ["Designer", "Project manager"], how: ["Website, social and stationery updated", "Packaging and signage artwork prepared", "Launch assets ready for announcement day"] },
    ],
  },
  marketing: {
    holo: [Megaphone, Target, ChartColumn],
    stages: [
      { title: "Planning boosters released", text: "Audience and channels are fixed – budget only goes where it should." },
      { title: "Launch tank released", text: "Campaigns are live and tracked. The rest is optimising and scaling winners." },
    ],
    finale: {
      title: "Campaigns that pay back",
      text: "Live campaigns, honest numbers and a growth plan that puts every rupee where it earns the most.",
    },
    steps: [
      { team: ["Marketing strategist"], how: ["Business goal turned into a clear KPI", "Ideal customers described as personas", "Where they spend time online researched"] },
      { avoid: "The wrong channels", team: ["Marketing strategist", "Media buyer"], how: ["Channels picked for goal and budget", "Budget split month by month", "Campaign calendar shared with you"] },
      { avoid: "Ads people scroll past", team: ["Designer", "Copywriter", "Video editor"], how: ["Ads, reels and posts built around one message", "Landing pages created for each campaign", "Everything approved by you before launch"] },
      { avoid: "Untracked ad spend", team: ["Media buyer", "Community manager"], how: ["Pixels and conversion tracking checked", "Campaigns launched on each platform", "Comments and messages answered daily"] },
      { avoid: "Wasted budget", team: ["Media buyer", "Analyst"], how: ["Creatives and audiences A/B tested", "Weak ads paused, winners get more budget", "Weekly notes on what changed and why"] },
      { avoid: "Reports nobody reads", team: ["Analyst", "Marketing strategist"], how: ["Monthly report on leads, cost and revenue", "Learnings turned into next month's plan", "Winning campaigns scaled to new audiences"] },
    ],
  },
};

/** the story of a service, with the team layer merged into every step */
export const storyFor = (service) => {
  if (!service) return null;
  const base = STORY[service.slug];
  if (!base) return null;
  const team = TEAM[service.slug] || {};
  return {
    ...base,
    holo: team.holo || [],
    finale: team.finale || { title: "Mission accomplished", text: service.tagline },
    stages: team.stages || [],
    steps: base.steps.map((st, i) => ({ ...st, ...(team.steps?.[i] || {}) })),
  };
};
