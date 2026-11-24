// Purpose: Implement the router lib module, keeping this responsibility separate for maintainability.
import { useSyncExternalStore } from "react";

/* Tiny history-based router (no extra dependency). The site is one page; overlay
   pages such as /projects and /Webdevelopment are opened by URL, so the browser's
   back button, refresh and shared links all work. */

const EVENT = "clicktots:navigate";

// where the last click came from (a DOMRect) – the service page grows out of it, like the About button
let origin = null;
export const getOrigin = () => origin;

// the picture that was clicked (a ring card's image) and where it was on screen, so the service page
// can fly that same picture into its hero. Reset on every navigation; only fresh clicks count.
let originImage = null;
export const getOriginImage = () =>
  originImage && performance.now() - originImage.t < 900 ? originImage : null;

export const getPath = () => window.location.pathname.replace(/\/+$/, "") || "/";

/** Go to a path (pushes a history entry – or replaces it with { replace: true } – and tells every subscriber). */
export function navigate(path, { replace = false, rect = null, image = null, imageRect = null, imageTitle = "" } = {}) {
  if (getPath().toLowerCase() === path.toLowerCase()) return;
  if (rect) origin = rect;
  originImage = image ? { src: image, rect: imageRect, title: imageTitle, t: performance.now() } : null;
  const state = { ctNav: true };
  if (replace) window.history.replaceState(state, "", path);
  else window.history.pushState(state, "", path);
  window.dispatchEvent(new Event(EVENT));
}

/** Leave an overlay page: back when we pushed it ourselves, otherwise straight to "/". */
export function goHome() {
  if (window.history.state?.ctNav) {
    window.history.back(); // popstate → subscribers update
  } else {
    window.history.replaceState({}, "", "/");
    window.dispatchEvent(new Event(EVENT));
  }
}

function subscribe(cb) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Current pathname, re-rendering on navigation / back / forward. */
export function usePathname() {
  return useSyncExternalStore(subscribe, getPath, () => "/");
}
