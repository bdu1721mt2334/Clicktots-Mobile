# Storytelling pass: "From lunar dust to autonomous growth"

The TL's A-to-Z blueprint, applied to the existing site (no rebuild). For where each section's text lives, see `PROJECT-GUIDE.md`.

## What changed, by section

| Act | Section | Change |
|---|---|---|
| I | 01 Hero | "Growth starts with an Intelligent Click", AI subhead, "Scroll to clear the market noise", HUD adds "Signal lock · 99.4%" and ROI horizon elev (→ 12.5°) |
| I | 02 About | "Human × AI" split with Seam 1 "Vision needs an engine", new caption, CTA "Inside our AI engine" |
| I | 03 Key facts | "Measured impact", AI card labels and cycling words, "Ecosystems our AI optimizes" |
| II | 04 Selected Works | 5 real client case studies (same 5 tints); titles wrap between words |
| II | 05 Services | 360° AI orbit (below); 10 capability cards No. 01–10; "The autonomous growth stack" sentence |
| II | 06 Clients | "Brands connected to our growth network" + caption; real clients replace sample brands |
| III | 07 Real Stories | client notes + 30-day postcard; Seam 3 "Next stop · From Chennai to 9 growth hubs →" |
| III | 08 Branches | two-chapter map (below); live lat/long HUD |
| III | 09 Awards | new intro; each story adds how it shaped the AI-first culture |
| IV | 10 Work in Motion | new caption, footer line and bottom bar |
| IV | 11 FAQ | 5 AI-focused questions |
| IV | 12 Footer | "Every market breakthrough starts with a click.", new copy, pills incl. "· 2026" |
| — | Nav | hover state "Launch AI Growth Audit" |
| — | Meta | page title + description |

## Services · 360° ring

- **Normal ring size.** The header and counter share one column on the left (the ring rises highest on the right), so the cards never cover text.
- **360° light sweep:** a beam of light circles the ring like a scanner every 7 s, with a scan line at its head, and each card lights up as it passes.
- **Header:** "360° AI-powered services / One orbit. Ten AI-driven capabilities." plus the Seam 2 line. Each line rises out of its own mask as the ring forms and lifts away as the camera enters.
- **Counter:** a 0°→360° progress arc, a rolling number and the card name, e.g. "07 / 10 · Google & Meta PPC · 216° of 360°".
- **Unroll:** every card lights its pillar colour to match the [01]–[05] sentence underlines.
- Code: `src/components/RingGallery/orbit/`.

## Branches · India → the world

1. **India network:** Chennai → Hyderabad → Bangalore → Mumbai → Dubai → Delhi on the real India photo.
2. **Going global:** the camera pulls back from the India photo onto a real satellite world map (NASA Blue Marble), locked on Chennai. **India and the UAE glow blue**, and the heading turns to "Now 9 hubs on 3 continents.".
3. The network grows outward in white-blue arcs, each country glowing as it comes online: Chennai → Singapore, Dubai → UK, UK → USA. Glass label pins on stems (no flags), with pulse rings.
4. The exit ripple opens from the USA into Awards. The hub list runs 01–09, and the HUD shows "Hubs online 09 / 09".

## Service pages · rocket story

- **New shuttle**, built in code with real-shuttle proportions and no logos or flags: white orbiter with black heat tiles, orange external tank, striped boosters. The boosters and tank separate in flight as before.
- **On the Moon:** landing gear drops on final approach, the orbiter touches down, the **crew hatch swings open** with a warm cabin light, and the **new astronaut** steps out.
- **Astronaut:** your model (`Astronaut_v1`), converted and compressed from 1.4 MB FBX to a 230 KB GLB. The badge colours were changed to Clicktots blue so no flag colours remain. It has no rig, so its motion is coded: it rises at the hatch, bounds forward in low-gravity hops, sways when idle and greets at the end.

## Before go-live (must do)

1. **Testimonials**: swap each note for the client's verbatim review and get their OK to show name + company.
2. **Case-study metrics** (+3.1x, +68%, 2.4x, 4.2x ROAS): confirm with each client or remove.
3. **Case-study images**: replace the stock photos in `public/projects/` with real project screenshots.
4. **Client logos**: add PNGs for the 5 text wordmarks (see PROJECT-GUIDE → Common edits).
5. **Global hubs**: confirm the Singapore / UK / USA presence (markers sit on London and New York).
