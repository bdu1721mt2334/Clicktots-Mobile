# Project guide: where everything lives

Start here. The page is one long scroll story in **4 acts / 12 sections**. The table lists each section in scroll order, the file that renders it and **the file you edit to change its text or data**.

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # production build (run before every deploy)
npm run build:world-map  # only after changing the world-map framing or glowing countries (branchesData.js)
npm run build:astronaut  # only after replacing scripts/assets/astronaut.fbx
```

## Sections in scroll order

| # | Section (what you see) | Renders it | Edit text / data here |
|---|---|---|---|
| 00 | Navbar + "Talk to Our Experts" (hover: "Launch AI Growth Audit"); every tab label rolls up on hover (`RollLabel` in `src/components/glass/GlassTabBar.jsx`) | `src/components/Navbar/Navbar.jsx` | same file |
| **Act I** · Signal in the noise | | | |
| 01 | Hero: lunar Earthrise, "Growth starts with an Intelligent Click" | `src/pages/Earthrise/Earthrise.jsx` | `hero` object at the top of the file |
| 02 | About: robotic hand, "Human × AI", caption, "Inside our AI engine" | `src/pages/About/AboutReveal.jsx` | `CAPTION_WORDS`, `ABOUT_CTA` (top of file) |
| 03 | Key facts: "Measured impact", 3 cards, platforms strip | `src/pages/KeyFacts/KeyFacts.jsx` | `KEY_FACTS` (top of file) |
| **Act II** · The AI growth engine | | | |
| 04 | Selected Works: 5 case studies (dark slider) | `src/components/StackSlider/StackSlider.tsx` | `src/components/StackSlider/projects.ts` → `PORTFOLIO_SLIDES` |
| 05 | Services: 360° ring with light sweep → "The autonomous growth stack" sentence | `src/components/RingGallery/RingGallery.jsx` | Ring cards: `src/pages/Services/servicesData.js` → `SERVICE_CARDS`. Header text: `src/components/RingGallery/orbit/Orbit.jsx` → `HEADER`. Sentence: `SENTENCE` in `RingGallery.jsx` |
| 05b | Service inner pages (open from the ring) | `src/pages/Services/ServiceOverlay.jsx` | `src/pages/Services/servicesData.js` → `SERVICES` |
| 05c | Service-page rocket story (launch → staging → Moon → hatch opens → astronaut). Moon "air" (horizon glow, drifting dust, floating motes, touchdown dust billow): `story/moonAtmosphere.js` | `src/pages/Services/story/RocketStory.jsx` (timing) + `scene3d.js` (3D) | Shuttle look: `story/shuttleModel.js`. Astronaut: `public/models/astronaut-v2.glb` (built by `npm run build:astronaut`) |
| 06 | Clients: "Brands connected to our growth network" | `src/components/ClientShowcase/ClientShowcase.jsx` | `CLIENTS` + caption in the same file |
| **Act III** · Human impact & scale | | | |
| 07 | Real Stories: scrapbook of client notes | `src/pages/Testimonials/Testimonials.jsx` | `src/components/TestimonialBoard/testimonials.ts` → `DEFAULT_NOTES` |
| 07b | Rocket flight ("Next stop · From Chennai to 9 growth hubs") | `src/pages/Awards/RocketJourney.jsx` | same file |
| 08 | Branches map: ONE blue dot-matrix map – first framed on India + Dubai (orange signal from Chennai), then the camera pulls back to the whole world (9 hubs, countries glow blue) | `src/pages/Branches/BranchesMap.jsx` | `src/pages/Branches/branchesData.js` (hubs, pins, hops, glowing countries, world framing) |
| 09 | Awards & milestones | `src/pages/Awards/Awards.jsx` | rows: `src/components/features/hover-index-list.tsx` |
| **Act IV** · Velocity & touchdown | | | |
| 10 | Work in Motion (3D project grid) | `src/pages/WorkInMotion/WorkInMotion.jsx` | same file |
| 11 | FAQ chat | `src/components/FAQ/FAQChatAccordion.jsx` | `FAQ_ITEMS` (top of file) |
| 12 | Contact "CLICK" + footer | `src/components/ContactSpotlight/ContactSpotlight.jsx`, `src/components/Footer/Footer.jsx` | `PILLS` + copy in `Footer.jsx` |

The order of sections on the page is set in `src/App.jsx`, where each act is marked with a comment.

## Common edits

**Add or rename a branch / hub (map, section 08).** Edit `src/pages/Branches/branchesData.js`:
- India and Gulf hubs go in `INDIA_HUBS` (`lon`/`lat`; `side` = which side the city name is written on).
- The India close-up framing is `FRAME_INDIA` (no rebuild). The detailed 1:50m coastline area is `REGION` (run `npm run build:world-map` after changing it). The map geometry is its own chunk, loaded while the browser is idle.
- Global hubs go in `GLOBAL_HUBS`, using `lon`/`lat`. `pin` is the label on the world map, `pinDx`/`pinMobile` nudge it so pins never overlap, and `country` makes that country glow blue.
- To make another country glow, add its ISO numeric code to `HIGHLIGHT_COUNTRIES` and run `npm run build:world-map`.
- The order of the global signal is `GLOBAL_HOPS` (`[from, to]`). The last hop's city is where the exit ripple starts.
- If a new global hub falls outside the world map, widen `LON0/LON1/LAT0/LAT1` in that file, then run `npm run build:world-map` (regenerates the vector land, borders, graticule and country outlines).
- The heading counts hubs automatically ("Now 9 hubs on 3 continents."). Update the continent count and the narrative paragraph in `BranchesMap.jsx` if they change.

**Change a service card (section 05).** In `SERVICE_CARDS` (`servicesData.js`), the order = No. 01 … No. 10, and `category` picks which service page the card opens.

**Swap a case-study image or metric (section 04).** Edit `projects.ts`. Images live in `public/projects/`.

**Change the shuttle or astronaut (service-page rocket story).** The shuttle is built in code in `src/pages/Services/story/shuttleModel.js`, with no image files. Colours, stripes and proportions are at the top of each part. To use a different astronaut, replace `scripts/assets/astronaut.fbx` and run `npm run build:astronaut`. Suit colours per material are in `LOOK` in `scripts/build-astronaut.mjs`.

**Replace a client wordmark with a logo (section 06).** Put the logo (WebP) in `public/clients/`, then in `CLIENTS` replace `sample: {…}` with `src: "/clients/name.webp"`.

## Folder map

```
src/
  App.jsx                 page composition + section order (acts marked)
  pages/                  one folder per page-level section
    Branches/             BranchesMap.jsx (motion) + branchesData.js (content)
    Services/             servicesData.js (all service content) + inner pages
    …
  components/             reusable sections and UI
    RingGallery/          Services ring
      RingGallery.jsx     ring motion (cards, rotation, unroll into the sentence)
      orbit/              the 360° layer: light sweep, header, counter + progress arc
        Orbit.jsx           markup + per-frame update (called from RingGallery)
        orbit.css           its styles
    …
  pages/Services/story/   service-page rocket story
    RocketStory.jsx       scroll timeline (launch, staging, landing, hatch, astronaut, flag)
    scene3d.js            the three.js layer
    shuttleModel.js       the shuttle, built in code (no logos / flags), crew hatch + landing gear
  lib/scroll.js           the single scroll loop every animation subscribes to (onFrame)
public/
  (world map is vector: src/pages/Branches/worldShapes.generated.js, built by npm run build:world-map)
  models/astronaut-v2.glb generated from scripts/assets/astronaut.fbx (do not edit by hand)
scripts/
  build-world-map.mjs     crops the satellite world map + writes worldShapes.generated.js (country outlines)
  build-astronaut.mjs     converts + compresses the astronaut model (FBX → GLB, ~230 KB)
  assets/                 source files for the two scripts above
docs/
  PROJECT-GUIDE.md        this file
  storytelling-changes.md what the storytelling pass changed, and what to verify before go-live
```

## Rules that keep the motion working

- All scroll animation runs from `onFrame` in `src/lib/scroll.js`. Don't add a second scroll loop.
- Motion code writes styles straight to the DOM (no React state per frame). Keep content in the data files and motion in the components.
- Use unique class prefixes per component (`rg-` Services ring, `bm-` Branches map, `cs-` Clients, `ft-` Footer). Two components sharing a generic class like `.rg-line` will break each other.
- Every motion respects `prefers-reduced-motion`: test with it on before shipping.

## Space backgrounds on the overlay pages

`src/components/SpaceBackdrop/SpaceBackdrop.jsx` draws an animated canvas behind the Blog, Career and Projects pages
(parallax with scroll + pointer, pauses when the tab is hidden, still frame for reduced motion):

| Page | variant | Effect |
|---|---|---|
| Blog (`BlogOverlay.jsx`) | `journal` | starfield + nebula, shooting stars |
| Career (`CareerOverlay.jsx`) | `crew` | constellation network in gold; lines reach out to the cursor; light theme = navy ink |
| Projects (`AllProjects.jsx`) | `orbit` | planet rising bottom-right with orbits and satellites |

Colours per variant are in `PALETTE` at the top of the file.

## Case Study page (/case-study, /case-study/<slug>)

Opened from the "Case Study" navbar tab. Files in `src/pages/CaseStudy/`:

| File | What it does |
|---|---|
| `caseStudyData.js` | **Edit here**: the 9 case studies (title, sector, image, summary, challenge, steps, results). Sample content – replace figures with real client results. |
| `CaseStudyPage.jsx` | Intro (GSAP: rounded "Case Study" preloader → office photo → hero text) + "Selected work" heading + grid |
| `CaseStudyGrid.jsx` | 3 × 3 Dynamic Grid Gallery: hovered tile grows, title + summary fade up; click fades the rest out and opens the case |
| `CaseStudyDetail.jsx` | One case: the clicked picture flies to the front, title fades in word by word, sections fade in on scroll |
| `caseFlight.js` | Hands the clicked picture's position from the grid to the detail page |
| `CaseStudyOverlay.jsx` | Shutter-bar open/close, list ↔ detail switching, scroll restore, site text fade inside the overlay |
| `caseStudy.css` | All styles (scoped under `.cs-iron` / `.csd`) |

Hero photo: `public/case-study/hero-office.webp`. Grid pictures are Unsplash URLs in `caseStudyData.js`; swap for files in `public/case-study/`.

## Buttons, colours and performance (Nov 2026 pass)

- **Buttons**: use `ct-btn` + a variant (`ct-btn-primary` blue, `ct-btn-light`, `ct-btn-ghost` on dark, `ct-btn-ghost-ink` on light) – defined at the end of `src/index.css`. 8px corners (the Projects buttons), bold labels (Michroma has one weight, so bold is synthesised for buttons only), arrows move on hover. Only the navbar's blue "Talk to Our Experts" capsule stays fully rounded.
- **Blue**: `#0a84ff` for accents/glows, `#0071e3` behind white button labels (passes WCAG AA contrast).
- **Touch**: `hover:` also matches `:active` (`@custom-variant hover` in `index.css`), so phones get the same colour changes on tap.
- **"Talk to Our Experts" form**: `ExpertModal` in `Navbar.jsx`. Connect `sendLead()` there to your mail/CRM endpoint.
- **Performance rules**:
  - `index.html` paints the hero sky before any JavaScript (`#ct-prehero`, the page's LCP; App.jsx fades it out). Keep it 2px short of the viewport bottom – Chrome ignores full-viewport images for LCP.
  - Michroma is self-hosted (`public/fonts/`), preloaded.
  - Sections below About render right after first paint in a React transition (`restReady` in `App.jsx`).
  - Pictures / code far down the page load only when near: `useNear()` (`src/hooks/useNear.js`) for the footer moon, Milky Way/Earth backgrounds and Key Facts photos; Work in Motion fetches three.js only when ~2 screens away; inner pages warm up on first interaction.
