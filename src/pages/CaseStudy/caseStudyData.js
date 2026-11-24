// Purpose: every case study on the Case Study page (/case-study) and its detail page (/case-study/<slug>).
//   Edit text, numbers and pictures here. Order = order in the 3 × 3 grid.
//
//   SAMPLE CONTENT: the stories are written around the sectors Clicktots works in, and the figures are
//   placeholders. Replace them with real client results (and get the client's OK) before going live.
//   Pictures are the Dynamic Grid Gallery's default Unsplash photos; swap `image` for your own
//   (/public/case-study/<file>.webp). `offsetY` picks the band of the crop that shows in the grid
//   (-250 = bottom edge, 0 = centre, 250 = top edge).

const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const CASE_STUDIES = [
  {
    slug: "multi-branch-clinic-local-seo",
    title: "Filling appointment books for a multi-branch eye clinic",
    short: "Clinic local SEO",
    sector: "Healthcare",
    services: ["Local SEO", "Google Business Profile", "Web performance"],
    year: "2025",
    duration: "6 months",
    image: U("1611485153211-4237eab495bb"),
    offsetY: 62,
    summary:
      "Three branches, one city, and patients who could not find the right one. We rebuilt local search from the map pack up.",
    challenge:
      "Each branch competed with the others in search, profiles had mixed opening hours and categories, and the booking page took over five seconds to load on mobile.",
    approach: [
      { title: "Fix the foundations", text: "One clean Google Business Profile per branch: categories, services, photos and hours aligned with the website." },
      { title: "Branch landing pages", text: "A fast, schema-marked page per location with doctors, treatments and directions, linked from each profile." },
      { title: "Review engine", text: "An after-visit WhatsApp flow that asks happy patients for a review and routes complaints to the front desk." },
    ],
    results: [
      { value: "+182%", label: "calls from Google Maps" },
      { value: "2.1s", label: "mobile load (was 5.4s)" },
      { value: "4.8★", label: "average across branches" },
    ],
  },
  {
    slug: "coaching-institute-lead-engine",
    title: "A year-round lead engine for a civil-services coaching institute",
    short: "Coaching admissions",
    sector: "Education",
    services: ["Performance ads", "Landing pages", "CRM automation"],
    year: "2025",
    duration: "Ongoing",
    image: U("1669475576662-af6f022dad1a"),
    offsetY: 147,
    summary: "Admissions used to spike twice a year and stall in between. We built a funnel that keeps seats filling every month.",
    challenge:
      "Ads ran only around exam notifications, leads arrived on spreadsheets, and counsellors called back days later, by which time students had joined elsewhere.",
    approach: [
      { title: "Always-on content", text: "Free answer-writing tips and current-affairs reels that bring aspirants in long before admissions open." },
      { title: "One-page funnels", text: "Batch-specific landing pages with scholarship tests as the first step instead of a cold 'enquire now'." },
      { title: "Instant follow-up", text: "Leads land in a CRM and get a WhatsApp reply within a minute, with a counsellor call booked automatically." },
    ],
    results: [
      { value: "-41%", label: "cost per admission" },
      { value: "< 1 min", label: "first response time" },
      { value: "3.2×", label: "off-season enquiries" },
    ],
  },
  {
    slug: "headless-woocommerce-gifting",
    title: "Going headless: a faster storefront for a corporate gifting brand",
    short: "Headless WooCommerce",
    sector: "E-commerce",
    services: ["React storefront", "Headless WooCommerce", "Technical SEO"],
    year: "2026",
    duration: "4 months",
    image: U("1603906019541-c0c955b8d83e"),
    offsetY: 30,
    summary: "A heavy theme was costing sales. We kept WooCommerce for operations and put a React storefront in front of it.",
    challenge:
      "Product pages scored under 30 on PageSpeed, bulk-order quotes were handled by email, and category pages were not indexed properly.",
    approach: [
      { title: "Keep what works", text: "WooCommerce stays the back office: products, stock, orders and payments, exposed through the REST API." },
      { title: "React in front", text: "A server-rendered React storefront with clean slugs, product schema and image optimisation built in." },
      { title: "Bulk quote flow", text: "A self-serve quote builder for corporate buyers with logo upload and tiered pricing." },
    ],
    results: [
      { value: "94", label: "mobile PageSpeed (was 27)" },
      { value: "+63%", label: "organic sessions" },
      { value: "+2.4×", label: "bulk quote requests" },
    ],
  },
  {
    slug: "food-brand-meta-ads",
    title: "Turning scroll-stoppers into sales for a packaged food brand",
    short: "Food brand ads",
    sector: "FMCG",
    services: ["Meta ads", "Content studio", "Reporting"],
    year: "2025",
    duration: "8 months",
    image: U("1620638306111-521756a2522f"),
    offsetY: -23,
    summary: "Great products, flat ads. A weekly creative sprint and honest reporting turned the account around.",
    challenge: "The same three creatives ran for months, the online store had no tracking, and nobody knew which ads drove orders.",
    approach: [
      { title: "Measure first", text: "Pixel and Conversions API set up on the store so every order maps back to a campaign." },
      { title: "Creative sprints", text: "Eight new short videos and statics every week, shot in-house around recipes and festivals." },
      { title: "One-page report", text: "A plain-language weekly report: spend, orders, cost per order and what we test next." },
    ],
    results: [
      { value: "3.8×", label: "return on ad spend" },
      { value: "-35%", label: "cost per order" },
      { value: "32", label: "creatives tested a month" },
    ],
  },
  {
    slug: "surgeon-personal-brand-website",
    title: "A compliant, credible website for a consultant surgeon",
    short: "Surgeon website",
    sector: "Healthcare",
    services: ["Web design", "Compliance review", "SEO"],
    year: "2025",
    duration: "10 weeks",
    image: U("1675693382932-5c649c6f278b", 880),
    offsetY: 52,
    summary: "Patients research for weeks before choosing a surgeon. We built a site that answers their questions honestly.",
    challenge: "The old site made claims advertising rules do not allow, had no treatment detail, and sent every enquiry to a generic inbox.",
    approach: [
      { title: "Rules first", text: "Every page reviewed against advertising guidance: no guarantees, clear risks, balanced before-and-after language." },
      { title: "Answer the questions", text: "Treatment pages written with the surgeon: who it suits, recovery, costs and FAQs." },
      { title: "Smart enquiries", text: "A short enquiry form that routes by treatment and sends the patient a helpful guide straight away." },
    ],
    results: [
      { value: "+120%", label: "qualified enquiries" },
      { value: "0", label: "compliance flags" },
      { value: "Top 3", label: "for key treatment searches" },
    ],
  },
  {
    slug: "retail-brand-social-relaunch",
    title: "Relaunching a heritage retail brand on social",
    short: "Retail relaunch",
    sector: "Retail",
    services: ["Branding", "Social media", "Influencer"],
    year: "2024",
    duration: "5 months",
    image: U("1545682113-be24ae6223d7"),
    offsetY: 250,
    summary: "Loved by parents, unknown to their children. We gave a heritage brand a voice the next generation follows.",
    challenge: "The feed was all product photos and offers, engagement was falling, and younger buyers saw the brand as old-fashioned.",
    approach: [
      { title: "Refresh, not replace", text: "A modern visual system that keeps the heritage logo and colours but adds motion and type." },
      { title: "Stories over offers", text: "Weekly series on the craft behind the products, featuring the people who make them." },
      { title: "Creator collabs", text: "Twelve local creators styling the range their way, with trackable store codes." },
    ],
    results: [
      { value: "+5.6×", label: "engagement rate" },
      { value: "48k", label: "new followers" },
      { value: "+27%", label: "store visits from codes" },
    ],
  },
  {
    slug: "ai-chatbot-patient-support",
    title: "An AI assistant that answers patients after hours",
    short: "AI patient assistant",
    sector: "Healthcare",
    services: ["AI chatbot", "Integrations", "UX"],
    year: "2026",
    duration: "8 weeks",
    image: U("1760082008239-5196c63de746"),
    offsetY: 0,
    summary: "Most questions came in after the front desk closed. A careful AI assistant now answers them and books the follow-up.",
    challenge: "Calls and messages piled up overnight, simple questions blocked the phone line, and leads went cold by morning.",
    approach: [
      { title: "Safe scope", text: "The assistant answers only from approved content and hands anything clinical to a human." },
      { title: "Where patients are", text: "On the website and WhatsApp, in English and Tamil." },
      { title: "Book, don't just chat", text: "It checks open slots and books a callback straight into the clinic calendar." },
    ],
    results: [
      { value: "68%", label: "questions answered instantly" },
      { value: "+31%", label: "after-hours bookings" },
      { value: "-40%", label: "repeat calls to the desk" },
    ],
  },
  {
    slug: "b2b-manufacturer-seo",
    title: "Winning export enquiries for a B2B manufacturer",
    short: "B2B export SEO",
    sector: "Manufacturing",
    services: ["Technical SEO", "Content", "LinkedIn"],
    year: "2024",
    duration: "9 months",
    image: U("1596999380413-92d171935be8"),
    offsetY: 0,
    summary: "Buyers abroad search in specifications. We rebuilt the catalogue so the right buyers find the right product.",
    challenge: "One long PDF catalogue, no product pages, and a website that ranked only for the company name.",
    approach: [
      { title: "A page per product", text: "Spec-rich product pages with downloadable datasheets and clean, searchable URLs." },
      { title: "Buyer guides", text: "Long-form guides answering the questions procurement teams ask before shortlisting." },
      { title: "LinkedIn presence", text: "A steady founder-led posting rhythm aimed at buyers in the UK, UAE and Singapore." },
    ],
    results: [
      { value: "+340%", label: "non-brand organic traffic" },
      { value: "21", label: "export enquiries a month" },
      { value: "14", label: "countries reached" },
    ],
  },
  {
    slug: "mobile-app-launch-gifting",
    title: "Launching a gifting app from zero to first thousand orders",
    short: "App launch",
    sector: "E-commerce",
    services: ["Flutter app", "App store optimisation", "Launch ads"],
    year: "2026",
    duration: "5 months",
    image: U("1764944625879-edd1d96d44c6"),
    offsetY: 0,
    summary: "The website sold well; the app had to sell better. We built it, launched it and grew it in one plan.",
    challenge: "No app, repeat customers re-entering details every time, and festive peaks overwhelming the website checkout.",
    approach: [
      { title: "One codebase", text: "A Flutter app for Android and iOS sharing the existing WooCommerce catalogue and orders." },
      { title: "Repeat-friendly", text: "Saved addresses, reminders for birthdays and anniversaries, and one-tap reorder." },
      { title: "Launch plan", text: "Store listings optimised for search, plus app-install ads timed to the festive season." },
    ],
    results: [
      { value: "1,000+", label: "orders in launch quarter" },
      { value: "4.7★", label: "store rating" },
      { value: "38%", label: "orders from repeat users" },
    ],
  },
];

export const findCaseStudy = (slug) => CASE_STUDIES.find((c) => c.slug.toLowerCase() === String(slug || "").toLowerCase()) || null;
