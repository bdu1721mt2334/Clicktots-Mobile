// Purpose: Render the scroll-driven 3D work showcase and its live project video cards.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { onFrame, scrollToTarget, scrollRect } from "@/lib/scroll";

/* ------------------------------------------------------------------ *
 *  WORK IN MOTION  –  the section the Awards rocket lands on.
 *
 *  React port of vante-animation.html. A tall scroll track (TRACK_VH) holds a
 *  sticky stage; one scroll progress p (0 → 1) drives everything:
 *
 *    0.00 – 0.12  the two headline lines rise into place
 *    0.00 – 0.58  the lines run across the page in opposite directions
 *    0.14 – 0.63  a ribbon of live video work sweeps through 3D space
 *    ~0.63 – 0.86 each card leaves the ribbon and lands in its grid slot
 *    0.72 – 0.86  a hairline rule draws across the middle
 *    > 0.86       hovering a card shows its project name
 *
 *  The scroll track is intentionally shorter than the original so the same
 *  animation milestones complete with less pinned scrolling.
 *  Three.js is loaded on demand (dynamic import) so it never weighs down the
 *  first paint. Videos only get their `src` when the section is near the
 *  viewport and are paused whenever a card is off screen.
 *  No React state: every frame writes styles / uniforms directly, like the
 *  other scroll sections on this site (it shares the single onFrame loop).
 *  Reduced motion: no pin and no ribbon, the finished grid is shown.
 * ------------------------------------------------------------------ */

const TRACK_VH = 470;
/* extra pinned scroll after the grid has landed: the FAQ shutter bars rise over it (see SectionShutter) */
const TAIL_VH = 0;
/* scroll length (in screens) that drives the animation itself; the shutter wipe to the FAQ starts the moment the grid has landed */
const RANGE_VH = 400;
const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";
const WORK = [
  ["Roadster 3D", "designs/roadster-3d-car-landing.mp4"],
  ["Living Portrait", "aaaf/living-portrait-hero.mp4"],
  ["Particle Self", "aaaf/oraciteslArea.mp4"],
  ["Robot Jellyfish", "aaaf/medusa-jellyfish-hero.mp4"],
  ["Ink Reveal", "designs/ink-reveal-hover.mp4"],
  ["Space Voyage", "designs/space-voyage-video.mp4"],
  ["Helion Dispatch", "designs/helion-dispatch-landing.mp4"],
  ["Honey Bee", "designs/honey-bee-melli-landing.mp4"],
];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const out = (t) => 1 - (1 - t) ** 3;
const span = (p, a, b) => clamp((p - a) / (b - a));

/* ribbon / grid constants (unchanged from the original) */
const FOV = 35;
const CARD_W = 2.1;
const CARD_H = 1.32;
const GAP = 0.03;
const STEP = CARD_W + GAP;
const NX = 28;
const NY = 3;
const GZ = 8;
const SAMPLES = 1200;
const PH0 = -1.5;
const PH1 = Math.PI * 2 + 1.35;
const RIB_A = 0.14;
const RIB_B = 0.63;

const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAG = `uniform sampler2D map;uniform vec2 cover;uniform float aspect,ready,radius;varying vec2 vUv;
void main(){
  vec2 q=(abs(vUv-.5)-.5)*vec2(aspect,1.)+radius;
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
  float px=fwidth(d),a=1.-smoothstep(-px,px,d);
  if(a<.01)discard;
  vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;
  vec3 c=mix(vec3(.075),texture2D(map,(uv-.5)*cover+.5).rgb,ready);
  float edge=smoothstep(-.012-px,-.012,d);
  gl_FragColor=vec4(mix(c,vec3(1.),edge*.1),a);
}`;

export function WorkInMotion() {
  const reduced = useReducedMotion();
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const l1 = useRef(null);
  const l2 = useRef(null);
  const cap = useRef(null);
  const glow = useRef(null);
  const cross = useRef(null);
  const rule = useRef(null);
  const nameRef = useRef(null);
  const bgA = useRef(null);
  const bgB = useRef(null);
  const bgLines = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!track || !stage || !canvas) return;

    let disposed = false;
    let cleanup = () => { };

    /* three.js (~170 KB gz) + the WebGL renderer are only fetched and built once this section is about two
       screens away – not during page load (it is near the end of the page; this kept PageSpeed's
       blocking time and bytes high) */
    let io = null;
    const whenNear = new Promise((resolve) => {
      if (typeof IntersectionObserver === "undefined") return resolve();
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            resolve();
          }
        },
        { rootMargin: "200% 0px 200% 0px" }
      );
      io.observe(track);
    });

    whenNear.then(() => (disposed ? null : import("three"))).then((THREE) => {
      if (disposed || !THREE) return;

      /* ---------- renderer ---------- */
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

      /* ---------- ribbon path ---------- */
      let path;
      let PATH_L = 1;
      const pathP = [];
      const pathT = [];
     const buildPath = () => {
        const isMobile = asp < 0.9;
        const halfW = isMobile ? 0.34 : 0.561;
        const depthFar = isMobile ? 13.5 : 16.4;
        const pts = [];
        for (let i = 0; i <= 160; i++) {
          const t = i / 160;
          const ph = mix(PH0, PH1, t);
          const cs = Math.cos(ph);
          const u = 2 * t - 1;
          const depth = cs > 0 ? 7.6 + depthFar * cs ** 0.9 : 7.6 + 2.2 * cs;
          const edge = isMobile
            ? 1.05 + 0.45 * span(0.14 - t, 0, 0.14) + 0.65 * span(t, 0.84, 1)
            : 0.84 + 0.5 * span(0.14 - t, 0, 0.14) + 0.8 * span(t, 0.84, 1);
          pts.push(
            new THREE.Vector3(
              edge * Math.sin(ph) * depth * halfW,
              0.5 * Math.sign(u) * Math.abs(u) ** 1.4 * depth * (isMobile ? 0.72 : 0.63),
              -depth
            )
          );
        }
        path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
        path.arcLengthDivisions = 1500;
        PATH_L = path.getLength();
        pathP.length = pathT.length = 0;
        for (let i = 0; i <= SAMPLES; i++) {
          const u = i / SAMPLES;
          pathP.push(path.getPointAt(u));
          pathT.push(path.getTangentAt(u));
        }
      };
      const at = (s, op, ot) => {
        const f = clamp(s / PATH_L) * SAMPLES;
        const i = Math.min(SAMPLES - 1, Math.floor(f));
        const k = f - i;
        op.lerpVectors(pathP[i], pathP[i + 1], k);
        ot.lerpVectors(pathT[i], pathT[i + 1], k).normalize();
      };

      /* ---------- cards (one video plane each) ---------- */
      let loaded = false;
      const loadVideos = () => {
        if (loaded) return;
        loaded = true;
        cards.forEach((c) => {
          c.v.src = R2 + c.src;
          c.v.load();
        });
      };
      const cards = WORK.map(([title, src], i) => {
        const v = document.createElement("video");
        Object.assign(v, { crossOrigin: "anonymous", muted: true, loop: true, playsInline: true, preload: "auto" });
        v.setAttribute("playsinline", "");
        const tex = new THREE.VideoTexture(v);
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
        const mat = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          side: THREE.DoubleSide,
          uniforms: {
            map: { value: tex },
            cover: { value: new THREE.Vector2(1, 1) },
            aspect: { value: CARD_W / CARD_H },
            ready: { value: 0 },
            radius: { value: 0.018 },
          },
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        const c = { i, title, src, v, tex, geo, mat, mesh, rect: null };
        v.addEventListener("loadeddata", () => {
          const va = v.videoWidth / v.videoHeight;
          const ca = CARD_W / CARD_H;
          mat.uniforms.cover.value.set(va > ca ? ca / va : 1, va > ca ? 1 : va / ca);
          mat.uniforms.ready.value = 1;
          if (reduced) v.currentTime = 0.1; // still frame, no autoplay
        });
        return c;
      });

      /* ---------- layout ---------- */
      let W = 1;
      let H = 1;
      let asp = 1;
      let cols = 3;
      let rows = 2;
      let tanH = 0.3153;
      let wasMobile = null;
      const resize = () => {
        W = stage.clientWidth || window.innerWidth;
        H = stage.clientHeight || window.innerHeight;
        asp = W / H;
        const isMobile = asp < 0.9;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        camera.aspect = asp;
        const halfW = isMobile ? 0.3 : 0.561;
        camera.fov = asp < 16 / 9 ? (Math.atan(halfW / asp) * 360) / Math.PI : FOV;
        camera.updateProjectionMatrix();
        tanH = Math.tan((camera.fov * Math.PI) / 360);
        cols = isMobile ? 2 : 3;
        rows = isMobile ? 3 : 2;
        if (wasMobile !== null && wasMobile !== isMobile) buildPath();
        wasMobile = isMobile;
      };
      const grid = (i) => {
        const vh = 2 * GZ * tanH;
        const vw = vh * asp;
        const gw = vw * (cols === 3 ? 0.74 : 0.9);
        const gap = gw * (cols === 3 ? 0.017 : 0.032);
        const cw = (gw - gap * (cols - 1)) / cols;
        const ch = cw / (CARD_W / CARD_H);
        const rowGap = cols === 3 ? gap * 1.6 : gap * 1.15;
        const gh = ch * rows + rowGap * (rows - 1);
        const c = i % cols;
        const r = Math.floor(i / cols);
        return { x: -gw / 2 + cw / 2 + c * (cw + gap), y: gh / 2 - ch / 2 - r * (ch + rowGap), w: cw, h: ch, vw, vh, c, r };
      };

      /* ---------- pose ---------- */
      const op = new THREE.Vector3();
      const ot = new THREE.Vector3();
      const up = new THREE.Vector3();
      const Y = new THREE.Vector3(0, 1, 0);
      const vp = new THREE.Vector3();
      const poseRibbon = (c, head, cw, ch, step) => {
        const pos = c.geo.attributes.position;
        const centre = head - c.i * step;
        for (let iy = 0; iy <= NY; iy++)
          for (let ix = 0; ix <= NX; ix++) {
            const k = iy * (NX + 1) + ix;
            const lu = ix / NX - 0.5;
            const lv = 0.5 - iy / NY;
            at(centre + lu * cw, op, ot);
            // keep the sheet upright, leaning a little into the turn
            up.copy(Y).addScaledVector(ot, -Y.dot(ot)).normalize();
            vp.copy(op).addScaledVector(up, lv * ch);
            pos.setXYZ(k, vp.x, vp.y, vp.z);
          }
        pos.needsUpdate = true;
      };
      const poseGrid = (c, q) => {
        const g = grid(c.i);
        const pos = c.geo.attributes.position;
        const isMob = cols === 2;
        const dx = isMob ? (g.c === 0 ? -1 : 1) : (g.c - (cols - 1) / 2) * 1.2;
        const dy = isMob ? 1 - g.r : g.r < rows / 2 ? 1 : -1;
        const ox = dx * g.vw * (isMob ? 0.78 : 0.62) * (1 - q);
        const oy = dy * g.vh * (isMob ? 0.16 : g.c === 1 ? 0.95 : 0.34) * (1 - q);
        const oz = isMob ? (1 - q) * 1.1 : 0;
        const tilt = (1 - q) * (isMob ? (g.c === 0 ? 0.1 : -0.1) : 0.22 * (g.c - 1 || 0.5) * dy);
        const cs = Math.cos(tilt);
        const sn = Math.sin(tilt);
        for (let iy = 0; iy <= NY; iy++)
          for (let ix = 0; ix <= NX; ix++) {
            const k = iy * (NX + 1) + ix;
            const x = (ix / NX - 0.5) * g.w;
            const y = (0.5 - iy / NY) * g.h;
            pos.setXYZ(
              k,
              g.x + ox + x * cs - y * sn,
              g.y + oy + x * sn + y * cs,
              -GZ + oz - (1 - q) * (isMob ? 0.2 : 0.6) * Math.sin((ix / NX) * Math.PI)
            );
          }
        pos.needsUpdate = true;
        c.rect = g;
      };

      /* ---------- render one frame for progress pp ---------- */
      const render = (pp) => {
        // headline runs right across the page in opposite directions
        const rise = 1 - out(span(pp, 0, 0.05));
        const run = mix(-50, 76, span(pp, 0, 0.58));
        if (l1.current) l1.current.style.transform = `translate3d(${run}vw,${rise * 34}vh,0)`;
        if (l2.current) l2.current.style.transform = `translate3d(${-run}vw,${rise * 34}vh,0)`;
        if (cap.current) {
          cap.current.style.opacity = 1 - span(pp, 0.52, 0.57);
          cap.current.style.transform = `translate(-50%,calc(-50% + ${rise * 34}vh))`;
        }
        const intro = 1 - span(pp, 0, 0.05);
        if (glow.current) glow.current.style.opacity = intro;
        if (cross.current) cross.current.style.opacity = intro;
        // background drifts with the scroll (parallax) on top of its own endless animation
        if (bgA.current) bgA.current.style.transform = `translate3d(${(-pp * 18).toFixed(2)}vw,${(pp * 10).toFixed(2)}vh,0)`;
        if (bgB.current) bgB.current.style.transform = `translate3d(${(pp * 22).toFixed(2)}vw,${(-pp * 14).toFixed(2)}vh,0)`;
        if (bgLines.current) bgLines.current.style.transform = `translate3d(${(-pp * 4).toFixed(2)}vw,0,0)`;
        if (rule.current) rule.current.style.transform = `scaleX(${ease(span(pp, 0.72, 0.86))})`;

        // ribbon, then the grid
        const mul = asp < 0.9 ? 1.25 : 1;
        const cw = CARD_W * mul;
        const ch = CARD_H * mul;
        const step = (CARD_W + GAP) * mul;
        const pr = span(pp, RIB_A, RIB_B);
        const head = mix(0, PATH_L + cards.length * step, pr);
        for (const c of cards) {
          const s = head - c.i * step;
          const end = PATH_L - cw;
          if (s < end) {
            c.mesh.visible = s > cw;
            c.rect = null;
            if (c.mesh.visible) poseRibbon(c, head, cw, ch, step);
          } else if (c.i < cols * rows) {
            // each card flies to its slot the moment it leaves the rail
            const st = mix(RIB_A, RIB_B, (end + c.i * step) / (PATH_L + cards.length * step));
            const q = out(span(pp, st, st + 0.13));
            c.mesh.visible = q > 0.001;
            if (c.mesh.visible) poseGrid(c, q);
          } else {
            c.mesh.visible = false;
            c.rect = null;
          }
        }
        renderer.render(scene, camera);
      };

      /* ---------- hover: project name next to the cursor ---------- */
      const nameEl = nameRef.current;
      let p = reduced ? 1 : 0;
      const onMove = (e) => {
        if (!nameEl) return;
        const r = stage.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        let hit = null;
        if (p > 0.86) {
          const nx = mx / W - 0.5;
          const ny = 0.5 - my / H;
          for (const c of cards) {
            const g = c.rect;
            if (!g) continue;
            const x = nx * g.vw;
            const y = ny * g.vh;
            if (Math.abs(x - g.x) < g.w / 2 && Math.abs(y - g.y) < g.h / 2) hit = c;
          }
        }
        nameEl.style.opacity = hit ? 1 : 0;
        if (hit) {
          nameEl.textContent = hit.title;
          nameEl.style.transform = `translate(${mx + 14}px,${my + 16}px)`;
        }
      };
      const onLeave = () => {
        if (nameEl) nameEl.style.opacity = 0;
      };
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerleave", onLeave);

      /* ---------- loop (shared site rAF) ---------- */
      resize();
      buildPath();
      window.addEventListener("resize", resize);
      let lastRender = -1;
      const off = onFrame(() => {
        const rect = scrollRect(track);
        const vh = window.innerHeight;
        // far away: nothing to draw, and no video should run
        if (rect.top > vh * 2.5 || rect.bottom < -vh) {
          for (const c of cards) if (!c.v.paused) c.v.pause();
          return;
        }
        loadVideos();
        const range = Math.max(1, reduced ? rect.height - vh : (RANGE_VH / 100) * vh);
        const target = reduced ? 1 : clamp(-rect.top / range);
        // The shared Lenis loop already smooths wheel input; avoid stacking a
        // second per-frame easing layer here, which made this pinned section feel sluggish.
        p = target;
        const visibleNow = rect.top < vh && rect.bottom > 0;
        for (const c of cards) {
          if (!reduced && visibleNow && c.mesh.visible && c.v.paused) c.v.play().catch(() => { });
          else if ((!visibleNow || !c.mesh.visible) && !c.v.paused) c.v.pause();
        }
        if (!visibleNow && p === lastRender) return;
        lastRender = p;
        render(p);
      });

      cleanup = () => {
        off();
        window.removeEventListener("resize", resize);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        for (const c of cards) {
          c.v.pause();
          c.v.removeAttribute("src");
          c.v.load();
          c.tex.dispose();
          c.geo.dispose();
          c.mat.dispose();
        }
        renderer.dispose();
      };
    });

    return () => {
      io?.disconnect();
      disposed = true;
      cleanup();
    };
  }, [reduced]);

  return (
    <section id="c-work" aria-label="Our work in motion" className="wm-root">
      <style>{css}</style>
      <div ref={trackRef} className="wm-track" style={{ height: reduced ? "100svh" : `${TRACK_VH + TAIL_VH}vh` }}>
        <div ref={stageRef} className="wm-stage">
          {/* animated background: drifting light, film-strip lines with moving light streaks */}
          <div className="wm-bg" aria-hidden="true">
            <div ref={bgA} className="wm-orb-wrap wm-a"><i className="wm-orb wm-orb-a" /></div>
            <div ref={bgB} className="wm-orb-wrap wm-b"><i className="wm-orb wm-orb-b" /></div>
            <div ref={bgLines} className="wm-lines">
              {Array.from({ length: 13 }, (_, i) => (
                <b key={i} style={{ "--d": `${7 + ((i * 37) % 9)}s`, "--delay": `${-((i * 53) % 11)}s` }} />
              ))}
            </div>
            <div className="wm-vignette" />
          </div>
          <div role="heading" aria-level={2} aria-label="Our work in motion">
            <div ref={l1} className="wm-hl" id="wm-l1" aria-hidden="true">
              <span>OUR WORK</span>
            </div>
            <div ref={l2} className="wm-hl" id="wm-l2" aria-hidden="true">
              <span>IN MOTION</span>
            </div>
          </div>
          <div ref={cap} className="wm-cap">Static brands blend in. AI-engineered interfaces &amp; campaigns move markets.</div>
          <div ref={glow} className="wm-glow" />
          <div ref={cross} className="wm-cross"><i>+</i></div>
          <div ref={rule} className="wm-rule" />
          <canvas ref={canvasRef} className="wm-gl" />
          <footer className="wm-bot">
            <span aria-hidden="true" />
            <div className="wm-mid">AI WEBSITES<s>/</s>GENERATIVE DESIGN<s>/</s>BRAND SYSTEMS<s>/</s>PERFORMANCE MARKETING</div>
            <button
              type="button"
              className="wm-r"
              onClick={() => scrollToTarget(document.getElementById("c-stack-slider"))}
            >
              VIEW ALL WORK
            </button>
          </footer>
          <div ref={nameRef} className="wm-name" />
        </div>
      </div>
    </section>
  );
}

const css = `
.wm-root{--wm-bg:#0a0a0b;--wm-ink:#f4f1ea;--wm-mid:#8d8b86;--wm-line:rgba(244,241,234,.14);position:relative;width:100%;background:var(--wm-bg);color:var(--wm-ink);overflow-x:clip}
.wm-track{position:relative}
.wm-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;background:var(--wm-bg)}
.wm-hl{position:absolute;left:0;right:0;font-weight:400;font-size:clamp(30px,4.6vw,92px);line-height:1;letter-spacing:-.05em;white-space:nowrap;text-align:center;will-change:transform}
#wm-l1{top:calc(50% - .98em)}
#wm-l2{top:calc(50% + .03em)}
#wm-l1 span,#wm-l2 span{display:inline-block}
#wm-l1 span{margin-right:15vw}
#wm-l2 span{margin-left:15vw}
.wm-cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:21em;text-align:center;font-size:clamp(7px,.56vw,10px);line-height:1.6;letter-spacing:.04em;text-transform:uppercase;color:var(--wm-ink)}
.wm-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.wm-orb-wrap{position:absolute;will-change:transform}
.wm-a{left:-12vw;top:-18vh;width:60vw;height:60vw}
.wm-b{right:-14vw;bottom:-24vh;width:58vw;height:58vw}
.wm-orb{display:block;width:100%;height:100%;border-radius:50%;filter:blur(40px)}
.wm-orb-a{background:radial-gradient(circle,rgba(198,243,92,.2) 0,rgba(198,243,92,.06) 42%,transparent 70%);animation:wm-float-a 18s ease-in-out infinite alternate}
.wm-orb-b{background:radial-gradient(circle,rgba(244,241,234,.16) 0,rgba(120,150,255,.07) 45%,transparent 70%);animation:wm-float-b 22s ease-in-out infinite alternate}
.wm-lines{position:absolute;inset:0 -6vw;display:grid;grid-template-columns:repeat(13,1fr);will-change:transform}
.wm-lines b{position:relative;display:block;border-left:1px solid rgba(244,241,234,.06);overflow:hidden}
.wm-lines b:after{content:"";position:absolute;left:-1px;top:-30%;width:1px;height:30%;background:linear-gradient(rgba(244,241,234,0),rgba(244,241,234,.55),rgba(198,243,92,.35),rgba(244,241,234,0));animation:wm-streak var(--d) linear var(--delay) infinite}
.wm-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(10,10,11,.85) 100%)}
@keyframes wm-float-a{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(10vw,8vh,0) scale(1.2)}}
@keyframes wm-float-b{from{transform:translate3d(0,0,0) scale(1.1)}to{transform:translate3d(-9vw,-10vh,0) scale(.9)}}
@keyframes wm-streak{from{transform:translateY(0)}to{transform:translateY(480%)}}
@media (prefers-reduced-motion:reduce){.wm-orb,.wm-lines b:after{animation:none!important}}
.wm-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.wm-glow{position:absolute;left:0;right:0;top:0;height:42%;background:linear-gradient(rgba(244,241,234,.1),rgba(244,241,234,0));pointer-events:none}
.wm-cross{position:absolute;left:32px;right:32px;top:37.5%;height:1px;background:var(--wm-line);pointer-events:none}
.wm-cross i{position:absolute;left:50%;top:-.62em;margin-left:-.3em;font-style:normal;font-size:12px;color:var(--wm-mid);background:var(--wm-bg);padding:0 .3em;line-height:1.2}
.wm-rule{position:absolute;left:3.5vw;right:3.5vw;top:50%;height:1px;background:var(--wm-line);transform-origin:left;transform:scaleX(0);pointer-events:none}
.wm-bot{position:absolute;left:32px;right:32px;bottom:26px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;font-size:10px;line-height:1.6;pointer-events:none}
.wm-bot p{max-width:26em;color:var(--wm-ink)}
.wm-mid{font-size:9.5px;letter-spacing:.08em;white-space:nowrap}
.wm-mid s{text-decoration:none;color:var(--wm-mid);margin:0 .9em}
.wm-r{justify-self:end;display:flex;gap:12px;align-items:center;font-size:9.5px;font-weight:700;letter-spacing:.08em;color:var(--wm-ink);background:none;border:0;padding:0;cursor:pointer;pointer-events:auto}
.wm-r:after{content:"";width:22px;height:1px;background:var(--wm-ink);transition:width .25s}
.wm-r:hover:after{width:36px}
.wm-name{position:absolute;left:0;top:0;padding:7px 12px;background:var(--wm-ink);color:var(--wm-bg);border-radius:99px;font-size:10px;letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .16s;white-space:nowrap;z-index:2}
@media (max-width:1100px){.wm-mid{display:none}.wm-bot{grid-template-columns:1fr auto}}
@media (max-width:760px){
  .wm-hl{font-size:clamp(30px,9.5vw,52px)!important}
  #wm-l1{top:calc(50% - 2.05em)}
  .wm-cap{top:50%;width:min(82vw,24em);font-size:10.5px;line-height:1.45}
  #wm-l2{top:calc(50% + 1.25em)}
  #wm-l1 span{margin-right:6vw}
  #wm-l2 span{margin-left:6vw}
  .wm-bot{left:18px;right:18px;bottom:18px;grid-template-columns:1fr auto;gap:12px}
  .wm-mid{display:none}
  .wm-bot p{max-width:20em;font-size:9px}
}
`;

export default WorkInMotion;
