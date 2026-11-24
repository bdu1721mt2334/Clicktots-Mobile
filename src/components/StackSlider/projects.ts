// Purpose: Implement the projects components module, keeping this responsibility separate for maintainability.
export type ProjectCategory = 'Websites' | 'SEO' | 'Design' | 'Branding' | 'Marketing';

export const PROJECT_CATEGORIES: ProjectCategory[] = ['Websites', 'SEO', 'Design', 'Branding', 'Marketing'];

export interface StackSlideItem {
  id: string;
  category: ProjectCategory;
  indexLabel: string;
  word: string;
  subtitle: string;
  discipline: string;
  client: string;
  year: string;
  deliverable: string;
  outcome: string;
  description: string;
  challenge: string;
  approach: string;
  image: string;
  imageAlt: string;
  washColor: string;
  glowColor: string;
  accentColor: string;
  metrics: Array<{ label: string; value: string }>;
}

// Act II · Selected Works: real Clicktots client transformations (blueprint Section 04).
// TODO before go-live: confirm every metric with the client and swap the
// placeholder images for real project screenshots (same 5 tints are kept).
export const PORTFOLIO_SLIDES: StackSlideItem[] = [
  {
    id: 'eumaxindia',
    category: 'Websites',
    indexLabel: '01',
    word: 'Eumaxindia',
    subtitle: 'AI-Engineered B2B Web Platform & Technical SEO',
    discipline: 'Full-Stack Web & Technical SEO',
    client: 'Eumaxindia · B2B',
    year: '2026',
    deliverable: 'Full-Stack Revamp Under 30 Days',
    outcome: '+3.1x Organic Lead Velocity',
    description:
      'A complete modernisation of a B2B web platform: rebuilt on a fast, crawlable architecture with technical SEO engineered in from day one.',
    challenge:
      'An ageing site was slowing down sales enquiries and holding back organic visibility for high-value B2B search terms.',
    approach:
      'We rebuilt the platform end to end, used AI-assisted keyword and content mapping to structure every page, and shipped technical SEO (schema, speed, indexation) inside a 30-day window.',
    image: '/projects/project_solstice_lighting_1794545104567.webp',
    imageAlt:
      'Sculptural amber glass pendant light casting geometric shadows across a travertine concrete corridor at twilight',
    washColor: '#121821',
    glowColor: 'rgba(229, 169, 60, 0.18)',
    accentColor: '#E5A93C',
    metrics: [
      { label: 'Organic Lead Velocity', value: '+3.1x' },
      { label: 'Revamp Timeline', value: '< 30 Days' },
      { label: 'Scope', value: 'Web + Tech SEO' },
    ],
  },
  {
    id: 'icon-legal',
    category: 'Marketing',
    indexLabel: '02',
    word: 'Icon Legal',
    subtitle: 'Predictive Google Ads & High-Intent Search Architecture',
    discipline: 'Performance Marketing & Funnels',
    client: 'Icon Legal Services',
    year: '2026',
    deliverable: 'AI Bid Automation & Landing Funnel',
    outcome: '+68% Qualified Client Inquiries',
    description:
      'A search campaign architecture built around high-intent legal queries, paired with landing funnels designed to convert clicks into consultations.',
    challenge:
      'Broad legal keywords were burning budget on low-intent clicks instead of bringing in clients who were ready to book a consultation.',
    approach:
      'We restructured campaigns around intent, let AI-driven bidding focus spend on the queries that convert, and built dedicated landing funnels for each practice area.',
    image: '/projects/project_vespera_fragrance_1794545104538.webp',
    imageAlt:
      'Smoked amber glass botanical fragrance bottle on volcanic basalt stone beside dried cedarwood',
    washColor: '#271713',
    glowColor: 'rgba(217, 119, 87, 0.20)',
    accentColor: '#E08263',
    metrics: [
      { label: 'Qualified Inquiries', value: '+68%' },
      { label: 'Bidding', value: 'AI-Automated' },
      { label: 'Channel', value: 'Google Search' },
    ],
  },
  {
    id: 'icon-media',
    category: 'Marketing',
    indexLabel: '03',
    word: 'Icon Media',
    subtitle: 'Algorithmic Social Growth, Video SEO & Content Engine',
    discipline: 'Social, Video SEO & Content',
    client: 'Icon Media Entertainment',
    year: '2026',
    deliverable: 'Multi-Channel Audience Graph',
    outcome: '2.4x Engagement & Reach',
    description:
      'An always-on content engine for an events and entertainment brand, connecting social, video SEO and search into one audience strategy.',
    challenge:
      'Event and entertainment content was spread across channels with no shared strategy, so reach peaked around launches and then dropped away.',
    approach:
      'We mapped the audience across platforms, planned content around search and video demand, and used performance data to decide what to publish and amplify next.',
    image: '/projects/project_monolith_gallery_1794545105987.webp',
    imageAlt:
      'Minimalist brutalist concrete art gallery illuminated by a diagonal natural skylight beam',
    washColor: '#1B1C1E',
    glowColor: 'rgba(212, 212, 216, 0.12)',
    accentColor: '#E4E4E7',
    metrics: [
      { label: 'Engagement & Reach', value: '2.4x' },
      { label: 'Channels', value: 'Social + Video + Search' },
      { label: 'Model', value: 'Always-On Engine' },
    ],
  },
  {
    id: 'star-sea-food',
    category: 'SEO',
    indexLabel: '04',
    word: 'Star Sea Food',
    subtitle: 'Hyper-Local GMB Intelligence & D2C Commerce Scaling',
    discipline: 'Local SEO & Commerce UX',
    client: 'Star Sea Food',
    year: '2026',
    deliverable: 'Local Search Dominance & Conversion UX',
    outcome: 'Delivered On Schedule',
    description:
      'Local search visibility and a conversion-focused D2C experience for a seafood brand, so nearby customers find it first and order with ease.',
    challenge:
      'The brand needed to own local search in its area and turn that visibility into direct orders, on a fixed launch date.',
    approach:
      'We optimised the Google Business Profile and local landing pages, set up campaign tracking, and refined the ordering UX — delivered on the scheduled date.',
    image: '/projects/project_kinetix_acoustic_1794545105815.webp',
    imageAlt:
      'Anodized aluminum studio reference speaker and machined rotary volume dial with subtle emerald indicator',
    washColor: '#0F1F1A',
    glowColor: 'rgba(52, 211, 153, 0.16)',
    accentColor: '#34D399',
    metrics: [
      { label: 'Delivery', value: 'On Schedule' },
      { label: 'Focus', value: 'Local Search (GMB)' },
      { label: 'Model', value: 'D2C Commerce' },
    ],
  },
  {
    id: 'nilodesigners',
    category: 'Branding',
    indexLabel: '05',
    word: 'NiloDesigners',
    subtitle: 'Generative Visual Identity & Performance Storytelling',
    discipline: 'Brand Identity & Creative Automation',
    client: 'NiloDesigners',
    year: '2026',
    deliverable: 'Full-Funnel Creative Automation',
    outcome: '4.2x ROAS Across Meta & Search',
    description:
      'A visual identity and performance creative system where every ad, post and landing page tells the same brand story across the funnel.',
    challenge:
      'Brand visibility was growing slower than the business, and creative was produced one-off rather than as a system that could scale.',
    approach:
      'We defined the visual identity, then built a generative creative workflow so on-brand variations could be produced, tested and scaled across Meta and Search.',
    image: '/projects/project_meridian_editorial_1794545107577.webp',
    imageAlt:
      'Open architectural monograph book on deep navy linen table beside brass compass overlooking coastal cliffs',
    washColor: '#111A2E',
    glowColor: 'rgba(96, 165, 250, 0.18)',
    accentColor: '#60A5FA',
    metrics: [
      { label: 'ROAS', value: '4.2x' },
      { label: 'Channels', value: 'Meta + Search' },
      { label: 'Creative', value: 'Automated Variants' },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Everything shown on the /projects page ("Explore all work").
   The first 5 are the slider cards above; the rest are PLACEHOLDER projects –
   replace the text / images with your real work. `category` drives the filter
   tabs (Websites, SEO, Design, Branding, Marketing). To add a project, copy one
   `extra(...)` block below. To add a new filter, add it to ProjectCategory and
   PROJECT_CATEGORIES at the top of this file.
   ────────────────────────────────────────────────────────────────────────── */
const img = (i: number) => ({
  image: PORTFOLIO_SLIDES[i % PORTFOLIO_SLIDES.length].image,
  imageAlt: PORTFOLIO_SLIDES[i % PORTFOLIO_SLIDES.length].imageAlt,
});

const extra = (
  n: number,
  imageIndex: number,
  rest: Omit<StackSlideItem, 'indexLabel' | 'image' | 'imageAlt'>
): StackSlideItem => ({
  indexLabel: String(n).padStart(2, '0'),
  ...img(imageIndex),
  ...rest,
});

export const ALL_PROJECTS: StackSlideItem[] = [
  ...PORTFOLIO_SLIDES,
  extra(6, 0, {
    id: 'northwind',
    category: 'SEO',
    word: 'Northwind',
    subtitle: 'Organic Growth Programme for a Fintech Publisher',
    discipline: 'Technical SEO & Content Strategy',
    client: 'Northwind Capital, London',
    year: '2026',
    deliverable: 'Site Audit, Topic Clusters & Monthly Reporting',
    outcome: '+212% Organic Traffic in 9 Months',
    description: 'A search-first rebuild of a financial education blog: clean information architecture, schema markup and a topic-cluster content plan.',
    challenge: 'Thousands of thin, overlapping articles were competing against each other and stalling in the rankings.',
    approach: 'We consolidated duplicate pages, fixed crawl budget issues and rebuilt the content around a small set of authoritative pillar pages.',
    washColor: '#10201C',
    glowColor: 'rgba(45, 212, 191, 0.16)',
    accentColor: '#2DD4BF',
    metrics: [
      { label: 'Organic Traffic', value: '+212%' },
      { label: 'Page-One Keywords', value: '1,380' },
      { label: 'Core Web Vitals', value: 'All Green' },
    ],
  }),
  extra(7, 1, {
    id: 'harbor',
    category: 'SEO',
    word: 'Harbor',
    subtitle: 'Local Search Domination for a Multi-Branch Clinic',
    discipline: 'Local SEO & Reputation',
    client: 'Harbor Physio, Sydney',
    year: '2025',
    deliverable: 'Local Listings, Reviews & Landing Pages',
    outcome: '3x Booked Appointments From Search',
    description: 'Location pages, structured data and a review engine that put every branch in the local map pack.',
    challenge: 'Eight branches shared one generic page and were invisible for "near me" searches.',
    approach: 'We built a dedicated page per branch, synced listings everywhere and automated review requests after every visit.',
    washColor: '#1A1F2B',
    glowColor: 'rgba(129, 140, 248, 0.18)',
    accentColor: '#818CF8',
    metrics: [
      { label: 'Map-Pack Rankings', value: '8 / 8' },
      { label: 'Booking Growth', value: '3x' },
      { label: 'Avg. Review Score', value: '4.9' },
    ],
  }),
  extra(8, 3, {
    id: 'lumen',
    category: 'Websites',
    word: 'Lumen',
    subtitle: 'Appointment-Led Website for a Dental Group',
    discipline: 'Web Design & Development',
    client: 'Lumen Dental, Toronto',
    year: '2026',
    deliverable: 'Marketing Site & Online Booking',
    outcome: '+47% Online Bookings',
    description: 'A calm, fast, accessible website that turns first-time visitors into booked appointments in under a minute.',
    challenge: 'The old site was slow, hard to use on phones and buried the booking button.',
    approach: 'We simplified the journey to three taps, rebuilt it on a lightweight stack and wrote reassuring plain-language copy.',
    washColor: '#13212B',
    glowColor: 'rgba(56, 189, 248, 0.18)',
    accentColor: '#38BDF8',
    metrics: [
      { label: 'Online Bookings', value: '+47%' },
      { label: 'Load Time', value: '0.9s' },
      { label: 'Mobile Share', value: '71%' },
    ],
  }),
  extra(9, 2, {
    id: 'atlas',
    category: 'Marketing',
    word: 'Atlas',
    subtitle: 'Performance Campaign for an Outdoor Brand',
    discipline: 'Paid Media & Social',
    client: 'Atlas Outdoor, Denver',
    year: '2025',
    deliverable: 'Seasonal Campaign & Creative Testing',
    outcome: '5.1x Return on Ad Spend',
    description: 'A full-funnel launch campaign built on creative testing, retargeting and a tightly measured weekly optimisation loop.',
    challenge: 'Rising ad costs and a seasonal product launch with only six weeks to prove demand.',
    approach: 'We tested 40 creatives in week one, scaled the winners and retargeted every engaged visitor with product proof.',
    washColor: '#27190F',
    glowColor: 'rgba(251, 146, 60, 0.18)',
    accentColor: '#FB923C',
    metrics: [
      { label: 'Return on Ad Spend', value: '5.1x' },
      { label: 'Cost per Acquisition', value: '-38%' },
      { label: 'Launch Sell-Through', value: '92%' },
    ],
  }),
  extra(10, 1, {
    id: 'oro',
    category: 'Branding',
    word: 'Oro',
    subtitle: 'Identity & Packaging for a Specialty Roaster',
    discipline: 'Brand Identity & Packaging',
    client: 'Oro Coffee, Melbourne',
    year: '2025',
    deliverable: 'Logo System, Packaging & Brand Guidelines',
    outcome: 'Stocked in 120 Cafés in a Year',
    description: 'A warm, confident identity with a flexible mark and bag system that makes every origin instantly recognisable on the shelf.',
    challenge: 'A great product wrapped in a forgettable brand that looked like every other roaster.',
    approach: 'We built the identity around a single golden mark and a colour-coded origin system, then tested it directly on shelves.',
    washColor: '#241C0E',
    glowColor: 'rgba(250, 204, 21, 0.16)',
    accentColor: '#FACC15',
    metrics: [
      { label: 'Café Stockists', value: '120' },
      { label: 'Repeat Orders', value: '+55%' },
      { label: 'Packaging SKUs', value: '14' },
    ],
  }),
  extra(11, 3, {
    id: 'pulse',
    category: 'Design',
    word: 'Pulse',
    subtitle: 'Mobile App Interface for a Fitness Platform',
    discipline: 'Product & UI Design',
    client: 'Pulse Fitness, Austin',
    year: '2026',
    deliverable: 'Design System & Mobile App UI',
    outcome: '4.8★ Average Store Rating',
    description: 'A high-energy interface and component library that makes tracking a workout feel effortless and motivating.',
    challenge: 'Users dropped off in the first week because the old app felt cluttered and slow to log anything.',
    approach: 'We cut the core flow to two taps, built a reusable design system and tested prototypes with real members every sprint.',
    washColor: '#1B1426',
    glowColor: 'rgba(192, 132, 252, 0.18)',
    accentColor: '#C084FC',
    metrics: [
      { label: 'Store Rating', value: '4.8' },
      { label: 'Week-One Retention', value: '+33%' },
      { label: 'Components Shipped', value: '120+' },
    ],
  }),
  extra(12, 0, {
    id: 'fern',
    category: 'Websites',
    word: 'Fern',
    subtitle: 'Online Store for a Houseplant Studio',
    discipline: 'E-Commerce Design & Build',
    client: 'Fern & Fable, Portland',
    year: '2026',
    deliverable: 'Storefront, Care Guides & Subscriptions',
    outcome: '+81% Average Order Value',
    description: 'A lush, editorial storefront with plant care guides and subscription boxes that keep customers coming back.',
    challenge: 'Shoppers loved the plants but abandoned carts because shipping and care questions went unanswered.',
    approach: 'We put care guidance on every product page, simplified checkout and launched a monthly plant subscription.',
    washColor: '#13241A',
    glowColor: 'rgba(74, 222, 128, 0.16)',
    accentColor: '#4ADE80',
    metrics: [
      { label: 'Avg. Order Value', value: '+81%' },
      { label: 'Cart Abandonment', value: '-26%' },
      { label: 'Active Subscribers', value: '2,100' },
    ],
  }),
];
