<!-- Purpose: Explain how to install, run, build, and navigate this project for future developers. -->
# Clicktots Technologies website

A React 19 single-page portfolio built with Vite. The interface combines scroll-driven scenes, project galleries, service pages, testimonials, and contact content. Preserve existing animation timing and styling landmarks when changing visuals; the shared scroll utilities and reusable components are intended to keep interaction behavior consistent.

## Setup

Requires Node.js 20.19+ (or 22.12+) and npm.

```bash
npm install
npm run dev
```

Vite serves the local development site at `http://localhost:3000`. Create a local `.env` from `.env.example` only if an integration requires environment values; never commit real credentials. Use `npm run build` to create the production bundle and `npm run preview` to serve that bundle locally.

## Start here

**`docs/PROJECT-GUIDE.md`** maps every section of the page (in scroll order) to the file that renders it and the file you edit to change its text or data. `docs/storytelling-changes.md` lists what the storytelling pass changed and what to verify before go-live.

## Project map

- `src/main.jsx` — React entry point and global style imports.
- `src/App.jsx` — top-level page composition, navigation, route selection, and section ordering.
- `src/pages/` — page-level experiences (About, Awards, Projects, Services, Testimonials, and Work in Motion).
- `src/components/` — reusable sections and UI (navigation, galleries, shutters, sliders, and scroll effects).
- `src/hooks/` — shared React hooks for reduced-motion preferences and text reveal behavior.
- `src/lib/` — shared helpers, including the Lenis scroll loop, routing, math, and class-name utilities.
- `scripts/` — maintenance scripts (`npm run build:world-map` draws `public/space/world-map.svg` for the Branches map).
- `public/` — static logos, project imagery, layered hero artwork, and the numbered frame sequence used by the About canvas.

## Scrolling and motion

`src/lib/scroll.js` owns the single page-level Lenis animation loop. Scroll-linked components subscribe through `onFrame` rather than creating competing page-level scroll loops. Work in Motion loads Three.js on demand, animates its existing milestones from a single normalized scroll progress value, and pauses video playback when cards are not visible. Its track is shorter than the original to reduce the time spent pinned; the animation's visual milestones and design are unchanged. The About inside page background is a code-built Three.js robot (`src/pages/About/robot/`), loaded on demand and driven by the About scroller; it replaced the old 300-image frame sequence.

## Performance notes

All raster images are WebP (convert new ones with `cwebp` or Pillow before adding them). The Service, Blog, Career and Case Study pages are separate lazy chunks, prefetched on first interaction or when the browser is idle. `src/hooks/useShutterStage.js` holds the shutter-bar state machine shared by the Blog, Career and Case Study overlays.

## Safe maintenance

Keep images and videos that are referenced by source data or generated URL patterns. Before deleting a component, search imports and dynamic imports across `src/`. Test source changes with `npm run build`; `npm run lint` runs the configured TypeScript check. The JSON manifests (`package.json`, `package-lock.json`, `tsconfig.json`, and `vercel.json`) intentionally contain no comments because JSON does not support comments.
