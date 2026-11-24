// Purpose: Implement the testimonials components module, keeping this responsibility separate for maintainability.
/* Testimonial notes shown on the board. Edit the text / names here.
   Photos (if any) go in public/img/people/. */
export type NoteKind = "index" | "sticky" | "pink" | "kraft" | "graph" | "postcard";
export interface Note { id: string; kind: NoteKind; text: string; name: string; meta: string; photo?: string; x: number; y: number; rot: number; w: number }

const P = "/img/people/";

// Act III · human proof on the studio cutting mat (blueprint Section 07).
// TODO before go-live: replace each quote with the client's verbatim review text
// (GoodFirms / TechBehemoths / Google) and get their OK to show name + company.
// Stock portrait photos were removed on purpose: never pair a real client's name
// with a stand-in face. Add `photo: P + "file.webp"` only with the client's own photo.
export const DEFAULT_NOTES: Note[] = [
  {
    id: "rathish", kind: "index", x: 1.5, y: 36, rot: -3, w: 300, name: "Rathish K", meta: "Owner · Star Sea Food",
    text: "Working with Clicktots was seamless. Their AI-driven local SEO and campaign tracking delivered our entire project right on the scheduled date."
  },
  {
    id: "vikram", kind: "sticky", x: 27.5, y: 4, rot: 4, w: 232, name: "Vikram Khanna", meta: "Marketing Manager · Icon Media",
    text: "Their SEO, content and social strategies were a game-changer for our event and entertainment presence."
  },
  {
    id: "mohammed", kind: "kraft", x: 48, y: 58, rot: -2, w: 300, name: "Mohammed Adik", meta: "CEO · NiloDesigners",
    text: "A remarkable mix of creative craft, AI digital know-how and professionalism. They scaled our brand visibility faster than any agency we’ve tried."
  },
  {
    id: "darsha", kind: "graph", x: 74, y: 16, rot: 3, w: 290, name: "Darsha Diwan", meta: "Marketing Head · Travel",
    text: "Clicktots boosted our travel site’s search visibility and high-intent leads through smart, predictive SEO. Noticeable results within weeks."
  },
  {
    id: "ramisha", kind: "pink", x: 3, y: 430, rot: 5, w: 270, name: "Ramisha Mol", meta: "Icon Legal Services",
    text: "Their targeted Google Ads architecture transformed our client pipeline — qualified consultations instead of wasted clicks."
  },
  {
    id: "thirty-days", kind: "postcard", x: 28, y: 410, rot: -3.5, w: 400, name: "30 days", meta: "Founder’s guarantee",
    text: "Day 1: full AI audit & funnel architecture. Day 30: live campaigns, transparent ROI telemetry and compounding organic traffic."
  },
  {
    id: "eumax", kind: "index", x: 67, y: 450, rot: 2, w: 320, name: "Eumaxindia Team", meta: "B2B Web & SEO",
    text: "Full website modernisation and technical SEO shipped in 30 days. Proactive, detail-oriented and genuinely results-driven."
  },
];
