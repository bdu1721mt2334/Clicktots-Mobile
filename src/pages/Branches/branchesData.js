// Purpose: every hub on the "Our Branches" map, and the framing of the world map. Edit hubs here.
//
// The map tells the story in two chapters, both on the same blue dot-matrix map:
//   1. India network: the map is framed on India + Dubai (FRAME_INDIA); an orange signal runs from Chennai
//      to each INDIA_HUBS city in order.
//   2. Going global: the camera pulls back into a world map and the network grows outward,
//      one hop at a time (GLOBAL_HOPS), each new hub reached from the nearest existing one.
//
// Used by BranchesMap.jsx and by scripts/build-world-map.mjs (which crops the satellite world map and
// draws the country outlines), so keep this file plain JavaScript with no imports.

/* Chapter 1 — lon / lat place the city on the map and drive the coordinate HUD.
   `side` = which side of the marker its name is written on in the India close-up. */
export const INDIA_HUBS = [
  { id: "chennai", name: "Chennai", note: "Head office", lon: 80.27, lat: 13.08, side: "right", country: "india", pin: "India", pinDx: 16 },
  { id: "hyderabad", name: "Hyderabad", note: "Growth hub", lon: 78.48, lat: 17.38, side: "right" },
  { id: "bangalore", name: "Bangalore", note: "Growth hub", lon: 77.59, lat: 12.97, side: "left" },
  { id: "mumbai", name: "Mumbai", note: "Growth hub", lon: 72.88, lat: 19.08, side: "left" },
  { id: "dubai", name: "Dubai", note: "Growth hub", lon: 55.27, lat: 25.2, side: "left", country: "uae", pin: "UAE", pinDx: -30 },
  { id: "delhi", name: "Delhi", note: "Growth hub", lon: 77.21, lat: 28.61, side: "right" },
];

/* Chapter 2 — lon / lat of the marker (the country's main business city: London, New York).
   `name` = the hub list on the left; `pin` = the label pin on the world map; `country` = the country
   that glows blue on the world map once the hub is online (outline from HIGHLIGHT_COUNTRIES);
   `pinDx` nudges the label pin sideways (px) so neighbouring pins never overlap; `pinMobile` overrides it
   on phones ({ dx, below: true } puts the pin under its marker). */
export const GLOBAL_HUBS = [
  { id: "singapore", name: "Singapore", note: "Global hub", lon: 103.82, lat: 1.35, country: "singapore", pin: "Singapore", pinDx: -36, pinMobile: { dx: -40, below: true } },
  { id: "uk", name: "United Kingdom", note: "Global hub", lon: -0.13, lat: 51.51, country: "uk", pin: "UK", pinDx: 6 },
  { id: "usa", name: "United States", note: "Global hub", lon: -74.0, lat: 40.71, country: "usa", pin: "USA", pinDx: 0 },
];

/* the global signal: [from, to] hub ids, in story order. The LAST hop's city is where the exit ripple starts. */
export const GLOBAL_HOPS = [
  ["chennai", "singapore"],
  ["dubai", "uk"],
  ["uk", "usa"],
];

/* countries that glow blue on the world map: key → ISO 3166 numeric code (Natural Earth id) */
export const HIGHLIGHT_COUNTRIES = { india: "356", uae: "784", singapore: "702", uk: "826", usa: "840" };

export const ALL_HUBS = [...INDIA_HUBS, ...GLOBAL_HUBS];
export const HUB_BY_ID = Object.fromEntries(ALL_HUBS.map((h) => [h.id, h]));

/* World map framing (equirectangular). The map is WORLD.w units wide; 1° = WORLD.k units.
   The WHOLE world: every longitude (-180 … 180) and from the Arctic (84°N, all of Greenland) down to 58°S
   (Cape Horn), so no continent is cut off at the top, bottom or sides. Antarctica is left out.
   After changing these, run: npm run build:world-map */
const LON0 = -180;
const LON1 = 180;
const LAT0 = 84; // top
const LAT1 = -58; // bottom
const W = 1000;
const K = W / (LON1 - LON0);
export const WORLD = { lon0: LON0, lat0: LAT0, k: K, w: W, h: Math.round((LAT0 - LAT1) * K) };

/* The part of the world that is actually SHOWN (the generated geometry above stays whole-world).
   Only the band that holds the hubs: western USA → just past Singapore / the Philippines, top of Canada →
   just below the equator. The narrower the window, the more the map is zoomed in its box.
   Changing these needs no rebuild: BranchesMap crops the SVG viewBox to this window and scales it up. */
const VIEW_LON0 = -113;
const VIEW_LON1 = 121;
const VIEW_LAT0 = 75; // top
const VIEW_LAT1 = -16; // bottom
export const VIEW = {
  x: (VIEW_LON0 - LON0) * K,
  y: (LAT0 - VIEW_LAT0) * K,
  w: (VIEW_LON1 - VIEW_LON0) * K,
  h: (VIEW_LAT0 - VIEW_LAT1) * K,
};

/* Chapter 1 framing: the India + Dubai window the camera holds while the India signal runs (no rebuild needed) */
export const FRAME_INDIA = { lon0: 53, lon1: 92.5, lat0: 33, lat1: 6.5 };
/* phones: single static close-up of India + Dubai filling the area below the city list with zero label clipping */
export const FRAME_INDIA_PHONE = { lon0: 51.5, lon1: 89.5, lat0: 32.5, lat1: 7.0 };

/* the area that gets the detailed (1:50m) coastline for the close-up. Must cover FRAME_INDIA with room to spare.
   After changing it, run: npm run build:world-map */
export const REGION = { lon0: 20, lon1: 122, lat0: 64, lat1: -16 }; // generous: phones see far more north/south

/** lon / lat → world-map units */
export function worldXY(lon, lat) {
  return [(lon - WORLD.lon0) * WORLD.k, (WORLD.lat0 - lat) * WORLD.k];
}