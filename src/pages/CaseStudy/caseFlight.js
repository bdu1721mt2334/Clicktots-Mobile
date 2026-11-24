// Purpose: the shared-picture animation between the case-study grid and a case-study page.
//   Forward:  grid tile → openCase() remembers the tile's picture + place → the detail page flies it into its frame.
//   Back:     detail frame → closeCase() remembers the frame's place → the grid flies it back into its own tile.
//   Each hand-over is only used if it happened just now (so a page opened from a link simply fades in).
import { navigate } from "@/lib/router";

const FRESH_MS = 1500;

/** the band of the picture a grid tile shows (offsetY: -250 bottom edge, 0 centre, 250 top edge).
 *  The flying picture animates from / to this crop, so it never jumps when it lands. */
export const tileCrop = (offsetY) => `50% ${50 - (Math.max(-250, Math.min(250, Number(offsetY) || 0)) / 250) * 50}%`;
export const FRAME_CROP = "50% 50%"; // the detail page's frame shows the centred crop
let flight = null; // grid → detail
let homecoming = null; // detail → grid

/** open a case study: measure the clicked picture right away, go to /case-study/<slug> after `delay` ms
 *  (the grid uses the delay to fade its other tiles and text out first) */
export function openCase(item, imgEl, { replace = false, delay = 0 } = {}) {
  const r = imgEl?.getBoundingClientRect?.();
  const go = () => {
    flight = r && r.width > 4 ? { src: item.image, rect: r, crop: tileCrop(item.offsetY), t: performance.now() } : null;
    navigate(`/case-study/${item.slug}`, { replace });
  };
  if (delay > 0) setTimeout(go, delay);
  else go();
}

/** the picture to fly in on the detail page */
export const takeFlight = () => {
  const f = flight && performance.now() - flight.t < FRESH_MS ? flight : null;
  flight = null;
  return f;
};

/** back to the grid: remember where the detail frame is, so the picture can fly home to its tile */
export function closeCase(item, frameEl) {
  const r = frameEl?.getBoundingClientRect?.();
  // only when the frame is (at least partly) on screen – otherwise the grid just fades back in
  homecoming = r && r.width > 4 && r.bottom > 0 && r.top < window.innerHeight ? { slug: item.slug, src: item.image, rect: r, crop: tileCrop(item.offsetY), t: performance.now() } : null;
  navigate("/case-study", { replace: true });
}

/** the picture flying home to the grid */
export const takeHomecoming = () => {
  const h = homecoming && performance.now() - homecoming.t < FRESH_MS ? homecoming : null;
  homecoming = null;
  return h;
};