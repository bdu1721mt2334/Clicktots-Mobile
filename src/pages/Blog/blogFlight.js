// Purpose: Hand the clicked cover picture (and where it was on screen) from the blog list to the article,
// so the article can fly that same picture into its hero – the same idea as the service pages.
import { navigate } from "@/lib/router";

let flight = null;

/** open a post: remember the clicked picture, then go to /blog/<slug> */
export function openPost(post, imgEl) {
  const r = imgEl?.getBoundingClientRect?.();
  flight = r && r.width > 4 ? { src: post.cover, rect: r, t: performance.now() } : null;
  navigate(`/blog/${post.slug}`);
}

/** the picture to fly in (only if the click was just now) */
export const takeFlight = () => {
  const f = flight && performance.now() - flight.t < 1200 ? flight : null;
  flight = null;
  return f;
};
