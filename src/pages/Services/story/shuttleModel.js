// Purpose: High-detail 3D Space Shuttle stack built in Three.js for the service-page rocket story —
// orbiter, external tank, and two solid rocket boosters, matching realistic 3D proportions and surface
// detailing WITHOUT any American flag, NASA logo, or "United States"/"Atlantis" lettering.
// Includes deployable landing gear, hinged crew hatches with warm cabin light, and animated 3D boarding steps.
//
// Model space (same convention the story's staging code expects):
//   +Y = nose (up the stack) · the tank sits on the Y axis · the orbiter is on the +X side of the tank
//   (its belly faces the tank, its payload bay faces +X) · the boosters are at ±Z beside the tank.

/* real dimensions (m) → model units: the external tank is 46.9 m long → 11.2 units */
const U = 11.2 / 46.9;

/* ---------- procedural surface textures (no flags, no logos, no lettering) ---------- */
function canvasTexture(THREE, w, h, draw, repeatU = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(repeatU, 1);
  t.anisotropy = 4;
  return t;
}

/** external tank foam: rich burnt-orange/copper with fine speckle, horizontal ring seams, and panel grid */
const tankTexture = (THREE) =>
  canvasTexture(THREE, 512, 1024, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, w, 0);
    base.addColorStop(0, "#9c4d24");
    base.addColorStop(0.25, "#be6432");
    base.addColorStop(0.5, "#cc703b");
    base.addColorStop(0.75, "#b85c2d");
    base.addColorStop(1, "#9c4d24");
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);

    // fine spray-on foam texture
    for (let i = 0; i < 18000; i++) {
      const v = Math.random();
      g.fillStyle = v > 0.5 ? "rgba(255,205,155,0.065)" : "rgba(75,30,10,0.08)";
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }

    // horizontal structural ring seams
    g.strokeStyle = "rgba(65,24,8,0.42)";
    g.lineWidth = 2.5;
    [0.12, 0.22, 0.34, 0.46, 0.58, 0.68, 0.78, 0.88].forEach((f) => {
      g.beginPath();
      g.moveTo(0, h * f);
      g.lineTo(w, h * f);
      g.stroke();
    });

    // subtle vertical panel seams
    g.strokeStyle = "rgba(70,28,10,0.22)";
    g.lineWidth = 1.5;
    for (let x = 0; x < w; x += w / 8) {
      g.beginPath();
      g.moveTo(x, h * 0.12);
      g.lineTo(x, h * 0.88);
      g.stroke();
    }
  });

/** intertank: ribbed gold-amber panel band with crisp grid */
const intertankTexture = (THREE) =>
  canvasTexture(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = "#d99247";
    g.fillRect(0, 0, w, h);
    // vertical stringers
    for (let x = 0; x < w; x += 10) {
      g.fillStyle = (x / 10) % 2 === 0 ? "rgba(255,220,160,0.22)" : "rgba(110,55,15,0.28)";
      g.fillRect(x, 0, 4, h);
    }
    // horizontal frame rings
    g.strokeStyle = "rgba(105,52,14,0.6)";
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 20) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  });

/** solid rocket booster casing: brushed silver-white with black rings, yellow-olive bands, 3 checker bands & aft red/yellow stripes */
const boosterTexture = (THREE) =>
  canvasTexture(THREE, 128, 1024, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#d8dcdf");
    grad.addColorStop(0.28, "#f3f5f6");
    grad.addColorStop(0.55, "#ffffff");
    grad.addColorStop(0.82, "#e4e7ea");
    grad.addColorStop(1, "#cfd4d8");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // subtle segment seams
    g.strokeStyle = "rgba(90,96,104,0.28)";
    g.lineWidth = 1.5;
    for (let f = 0.14; f < 0.86; f += 0.12) {
      const y = h * (1 - f);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }

    const ring = (f, px, color) => {
      g.fillStyle = color;
      g.fillRect(0, h * (1 - f) - px / 2, w, px);
    };
    const checker = (f, rows = 2, cellH = 7) => {
      const y0 = h * (1 - f) - (rows * cellH) / 2;
      const cols = 8;
      const cw = w / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          g.fillStyle = (r + c) % 2 === 0 ? "#1b1d20" : "#f7f8f9";
          g.fillRect(c * cw, y0 + r * cellH, cw, cellH);
        }
      }
    };

    // nose cone frustum bands (f = 0 at nozzle end, 1 at nose tip)
    ring(0.88, 6, "#c8b92e");
    ring(0.81, 10, "#232629");
    ring(0.76, 6, "#c8b92e");

    // main stack rings & 3 checkerboard bands
    ring(0.7, 9, "#1c1e21");
    ring(0.65, 6, "#c8b92e");
    checker(0.58, 2, 7);

    ring(0.51, 9, "#1c1e21");
    ring(0.46, 6, "#c8b92e");
    checker(0.39, 2, 7);

    ring(0.32, 9, "#1c1e21");
    ring(0.27, 6, "#c8b92e");
    checker(0.21, 2, 7);

    // aft skirt warning stripes + red band
    ring(0.14, 7, "#1c1e21");
    ring(0.128, 5, "#d8c434");
    ring(0.116, 5, "#1c1e21");
    ring(0.104, 5, "#d8c434");
    ring(0.09, 7, "#c9382b");
  }, 4);

/** orbiter wing leading-edge RCC thermal tiles (dark charcoal with fine diagonal/parallel striations) */
const leadingEdgeTexture = (THREE) =>
  canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#2b2e33";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(180,185,192,0.35)";
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 8) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(12,14,17,0.6)";
    g.lineWidth = 1.5;
    for (let x = 0; x < w; x += 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });

/** orbiter belly heat-shield tiles (charcoal-black with subtle tile grid) */
const tileTexture = (THREE) =>
  canvasTexture(THREE, 256, 512, (g, w, h) => {
    g.fillStyle = "#191b1f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(58,62,70,0.45)";
    g.lineWidth = 1;
    for (let y = 0; y < h; y += 10) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    for (let x = 0; x < w; x += 14) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  }, 2);

/** orbiter upper fuselage subtle panel seams (clean white, NO flags or text) */
const orbiterHullTexture = (THREE) =>
  canvasTexture(THREE, 256, 512, (g, w, h) => {
    g.fillStyle = "#f4f4f1";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(155,160,168,0.38)";
    g.lineWidth = 1.4;
    [0.16, 0.3, 0.45, 0.6, 0.74, 0.86].forEach((f) => {
      g.beginPath();
      g.moveTo(0, h * f);
      g.lineTo(w, h * f);
      g.stroke();
    });
    for (let x = 0; x < w; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });

/* ---------- geometry helpers ---------- */
/** a lathe (revolved profile) whose texture v runs by HEIGHT (bottom 0 → top 1), so painted rings land
    at the right place however the profile points are spaced */
const lathe = (THREE, pts, seg = 48, phiStart = 0, phiLength = Math.PI * 2) => {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)),
    seg,
    phiStart,
    phiLength
  );
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  for (let i = 0; i < uv.count; i++) uv.setY(i, (pos.getY(i) - y0) / (y1 - y0 || 1));
  uv.needsUpdate = true;
  return g;
};

/** an extruded planform: shape in its own (a, b) plane, extruded `depth` along the third axis */
function slab(THREE, pts, depth, bevel = 0.02) {
  const s = new THREE.Shape();
  pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * Build the shuttle.
 * Returns { root, parts: { left, right, tank, orbiter }, hatches, gear, steps }.
 */
export function buildShuttle(THREE) {
  const root = new THREE.Group();
  root.name = "shuttle";
  const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.6, ...o });

  /* ═══ external tank ═══ */
  const tank = new THREE.Group();
  tank.name = "tank";
  {
    const R = (8.4 / 2) * U; // 1.0
    const y0 = -5.6;
    const yCyl0 = -5.25;
    const yCyl1 = 2.9;
    const yTip = 5.6;
    const pts = [[0, y0], [R * 0.55, y0 + 0.06], [R * 0.86, y0 + 0.17], [R, yCyl0]];
    pts.push([R, yCyl1]);
    // ogive nose
    for (let i = 1; i <= 16; i++) {
      const t = i / 14;
      const clamped = Math.min(1, t);
      pts.push([R * Math.cos((clamped * Math.PI) / 2) ** 0.85, yCyl1 + (yTip - yCyl1) * Math.sin((clamped * Math.PI) / 2)]);
    }
    const foam = std({ map: tankTexture(THREE), roughness: 0.72, metalness: 0.02 });
    tank.add(new THREE.Mesh(lathe(THREE, pts, 56), foam));

    // intertank band (ribbed, slightly proud)
    const inter = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.015, R * 1.015, 1.02, 56, 1, true),
      std({ map: intertankTexture(THREE), roughness: 0.6, metalness: 0.08 })
    );
    inter.material.map.repeat.set(5, 1);
    inter.position.y = 1.75;
    tank.add(inter);

    // 3D vertical feedline pipe + attachment collars (matching reference screenshot)
    const pipeMat = std({ color: "#dfa256", roughness: 0.48, metalness: 0.15 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 7.6, 14), pipeMat);
    pipe.position.set(0, -1.2, R * 1.01);
    tank.add(pipe);
    [-4.3, -3.9, -3.5, 0.7].forEach((cy) => {
      const collar = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), pipeMat);
      collar.position.set(0, cy, R * 1.01);
      tank.add(collar);
    });
    const bandRing = new THREE.Mesh(new THREE.TorusGeometry(R * 1.008, 0.03, 10, 48), pipeMat);
    bandRing.rotation.x = Math.PI / 2;
    bandRing.position.y = -3.65;
    tank.add(bandRing);

    // metallic nose cap + spike
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 14), std({ color: "#aeb4ba", roughness: 0.3, metalness: 0.85 }));
    spike.position.y = yTip + 0.18;
    tank.add(spike);
  }

  /* ═══ solid rocket boosters (±Z) ═══ */
  const boosterTex = boosterTexture(THREE);
  const makeBooster = (sgn) => {
    const g = new THREE.Group();
    g.name = sgn > 0 ? "booster-left" : "booster-right";
    const r = (3.71 / 2) * U; // 0.44
    const pts = [
      [r * 0.98, -6.28], // flared nozzle exit
      [r * 0.56, -5.94],
      [r * 1.28, -5.85], // aft skirt
      [r * 1.02, -5.35],
      [r, -5.2],
      [r, 3.35], // forward segment
      [r * 0.94, 3.6],
      [r * 0.62, 4.15], // nose cone
      [r * 0.25, 4.5],
      [0, 4.65],
    ];
    const body = std({ map: boosterTex, roughness: 0.34, metalness: 0.35 });
    const mesh = new THREE.Mesh(lathe(THREE, pts, 44), body);
    g.add(mesh);

    // silver metallic nose tip cone
    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.28, 0.52, 24),
      std({ color: "#b6bcc2", roughness: 0.28, metalness: 0.78 })
    );
    noseTip.position.y = 4.44;
    g.add(noseTip);

    // nozzle interior (dark) + metallic nozzle collar
    const noz = new THREE.Mesh(
      lathe(THREE, [[r * 0.94, -6.27], [r * 0.5, -5.95], [0, -5.9]], 28),
      std({ color: "#222428", roughness: 0.55, metalness: 0.65, side: THREE.DoubleSide })
    );
    g.add(noz);

    const zOff = sgn * ((8.4 / 2) * U + r + 0.07);
    // attachment struts toward tank
    [2.6, -4.4].forEach((sy) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 10), std({ color: "#9aa0a6", roughness: 0.35, metalness: 0.75 }));
      strut.rotation.x = Math.PI / 2;
      strut.position.set(0, sy, -sgn * (r + 0.08));
      g.add(strut);
    });

    g.position.z = zOff;
    return g;
  };
  const left = makeBooster(1);
  const right = makeBooster(-1);

  /* ═══ orbiter ═══ */
  const orbiter = new THREE.Group();
  orbiter.name = "orbiter";
  const hatches = [];
  const steps = [];
  {
    const fr = (5.2 / 2) * U * 1.15; // fuselage radius ≈ 0.71
    const ox = (8.4 / 2) * U + 0.06 + fr;
    const white = std({ map: orbiterHullTexture(THREE), roughness: 0.42, metalness: 0.06 });
    const pureWhite = std({ color: "#f4f4f1", roughness: 0.44, metalness: 0.05 });
    const tiles = std({ map: tileTexture(THREE), roughness: 0.8, metalness: 0.04 });
    const leadTiles = std({ map: leadingEdgeTexture(THREE), roughness: 0.7, metalness: 0.08 });
    const darkTrim = std({ color: "#1d1f24", roughness: 0.78, metalness: 0.06 });
    const metal = std({ color: "#9da4ac", roughness: 0.26, metalness: 0.88 });
    const glass = std({ color: "#090d12", roughness: 0.06, metalness: 0.72 });

    const yTail = -5.35;
    const yNose = 3.25;
    const yNoseStart = 1.55;
    const prof = [[fr * 0.92, yTail], [fr, yTail + 0.25], [fr, yNoseStart]];
    for (let i = 1; i <= 18; i++) {
      const t = i / 18;
      prof.push([fr * Math.sqrt(1 - t * t) ** 0.9, yNoseStart + (yNose - yNoseStart) * t]);
    }
    const fus = new THREE.Mesh(lathe(THREE, prof, 52), white);
    fus.scale.set(1, 1, 1.06);
    fus.position.x = ox;
    orbiter.add(fus);

    // black heat tiles on belly + nose cap
    const belly = new THREE.Mesh(
      lathe(THREE, prof.map(([r, y]) => [r * 1.007, y]), 52, Math.PI, Math.PI),
      tiles
    );
    belly.scale.copy(fus.scale);
    belly.position.x = ox;
    orbiter.add(belly);
    const cap = new THREE.Mesh(lathe(THREE, prof.slice(-7).map(([r, y]) => [r * 1.012, y]), 36), darkTrim);
    cap.scale.copy(fus.scale);
    cap.position.x = ox;
    orbiter.add(cap);

    // 2 small round RCS thruster ports on the nose (matching reference screenshots)
    [-1, 1].forEach((s) => {
      const rcs = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 16), darkTrim);
      rcs.rotation.z = Math.PI / 2;
      rcs.position.set(ox + fr * 0.72, 2.26, s * fr * 0.14);
      orbiter.add(rcs);
    });

    // cockpit windows (6 angled dark-glass panes)
    for (let i = -2; i <= 2; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.13), glass);
      const a = (i * 15 * Math.PI) / 180;
      w.position.set(ox + Math.cos(a) * fr * 0.83, 2.48 - Math.abs(i) * 0.04, Math.sin(a) * fr * 0.9);
      w.rotation.y = -a;
      orbiter.add(w);
    }

    // 5 small square black side windows along both sides of the fuselage (matching reference screenshots)
    [1, -1].forEach((s) => {
      [1.75, 1.15, 0.5, -0.25, -1.0].forEach((wy) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.04), glass);
        win.position.set(ox + fr * 0.12, wy, s * fr * 1.055);
        orbiter.add(win);
      });
    });

    // payload bay door seams + centerline hinge
    [-1, 1].forEach((s) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 5.1, 0.02), std({ color: "#b5b8bc", roughness: 0.6 }));
      seam.position.set(ox + fr * 0.94, -1.35, s * fr * 0.34);
      orbiter.add(seam);
    });
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 5.1, 0.02), std({ color: "#c4c7ca", roughness: 0.6 }));
    hinge.position.set(ox + fr * 1.0, -1.35, 0);
    orbiter.add(hinge);

    // double-delta wings: white top, dark underside, ribbed leading edge, black elevons
    const wingPts = [
      [0.4, 1.0],
      [1.05, -1.15],
      [3.15, -4.55],
      [3.15, -5.05],
      [0.4, -5.32],
    ];
    const both = [...wingPts, ...wingPts.slice().reverse().map(([a, b]) => [-a, b])];
    const wingTop = new THREE.Mesh(slab(THREE, both, 0.095, 0.025), pureWhite);
    wingTop.rotation.y = Math.PI / 2;
    wingTop.position.x = ox - fr * 0.55;
    orbiter.add(wingTop);

    const wingBelly = new THREE.Mesh(slab(THREE, both, 0.045, 0.012), tiles);
    wingBelly.rotation.y = Math.PI / 2;
    wingBelly.position.x = ox - fr * 0.55 - 0.072;
    orbiter.add(wingBelly);

    // ribbed leading-edge thermal tiles + black trailing elevon trim
    const edge = new THREE.Mesh(
      slab(THREE, [[0.4, 1.0], [1.05, -1.15], [3.15, -4.55], [3.08, -4.35], [0.98, -0.92], [0.38, 0.88]], 0.11, 0.02),
      leadTiles
    );
    const elevon = new THREE.Mesh(
      slab(THREE, [[0.5, -5.28], [3.1, -5.04], [3.1, -4.78], [0.5, -5.02]], 0.105, 0.01),
      darkTrim
    );
    [1, -1].forEach((s) => {
      const e = edge.clone();
      e.rotation.y = Math.PI / 2;
      e.scale.x = s;
      e.position.x = ox - fr * 0.55 + 0.006;
      orbiter.add(e);

      const el = elevon.clone();
      el.rotation.y = Math.PI / 2;
      el.scale.x = s;
      el.position.x = ox - fr * 0.55 + 0.008;
      orbiter.add(el);
    });

    // vertical tail fin + dark rudder/leading edge
    const finX = ox + fr * 0.92;
    const fin = new THREE.Mesh(
      slab(THREE, [[0, -5.15], [1.55, -5.7], [1.55, -5.05], [0, -3.05]], 0.1, 0.02),
      pureWhite
    );
    fin.position.x = finX;
    orbiter.add(fin);
    const rudder = new THREE.Mesh(slab(THREE, [[0.15, -5.2], [1.5, -5.68], [1.5, -5.45], [0.15, -4.96]], 0.108, 0.01), darkTrim);
    rudder.position.x = finX;
    orbiter.add(rudder);
    const finLead = new THREE.Mesh(slab(THREE, [[0, -3.05], [1.55, -5.05], [1.46, -5.1], [0, -3.22]], 0.108, 0.01), darkTrim);
    finLead.position.x = finX;
    orbiter.add(finLead);

    // OMS pods either side of the fin
    [-1, 1].forEach((s) => {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.32, 8, 18), pureWhite);
      pod.position.set(ox + fr * 0.72, -4.65, s * fr * 0.5);
      pod.scale.set(1, 1, 0.85);
      orbiter.add(pod);
      const podCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.18, 16), darkTrim);
      podCap.position.set(ox + fr * 0.72, -5.36, s * fr * 0.5);
      orbiter.add(podCap);
      const omsNoz = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.22, 18, 1, true), metal);
      omsNoz.position.set(ox + fr * 0.72, -5.56, s * fr * 0.5);
      orbiter.add(omsNoz);
    });

    // 3 detailed ribbed main engines (SSME)
    const engPts = [[0.185, -6.08], [0.165, -5.92], [0.13, -5.75], [0.08, -5.42]];
    const engMat = std({ color: "#8e969e", roughness: 0.24, metalness: 0.92, side: THREE.DoubleSide });
    [
      [fr * 0.42, 0],
      [-fr * 0.18, fr * 0.38],
      [-fr * 0.18, -fr * 0.38],
    ].forEach(([dx, dz]) => {
      const e = new THREE.Mesh(lathe(THREE, engPts, 28), engMat);
      e.position.set(ox + dx, 0, dz);
      orbiter.add(e);
      [-5.65, -5.82, -5.98].forEach((ry, idx) => {
        const rr = 0.11 + idx * 0.03;
        const band = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.01, 8, 24), darkTrim);
        band.rotation.x = Math.PI / 2;
        band.position.set(ox + dx, ry, dz);
        orbiter.add(band);
      });
    });

    // body flap
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, fr * 1.62), darkTrim);
    flap.position.set(ox - fr * 0.6, -5.46, 0);
    orbiter.add(flap);

    /* crew hatch + deployable boarding stairs on both sides.
       Hatch: a recessed, lit cabin opening with a thick frame; the round door hinges up on its top edge.
       Stairs: a real staircase seen in profile – a small egress platform, then 7 treads running down
       (towards the tail) to the Moon, with stringers, handrail and posts. */
    const hatchY = yNose - (yNose - yTail) * 0.26; // ≈ 1.01
    const hr = 0.34;
    const frameMat = std({ color: "#2a2d33", roughness: 0.6, metalness: 0.4 });
    const cabinMat = new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false });
    [1, -1].forEach((s) => {
      const z = s * fr * 1.06 * 0.985;
      // dark recess + warm lit cabin behind the door
      const recess = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.02, hr * 1.02, 0.05, 36), frameMat);
      recess.rotation.x = Math.PI / 2;
      recess.position.set(ox, hatchY, z - s * 0.005);
      orbiter.add(recess);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(hr * 0.94, 32), cabinMat);
      glow.position.set(ox, hatchY, z + s * 0.024);
      glow.rotation.y = s > 0 ? 0 : Math.PI;
      glow.visible = false;
      orbiter.add(glow);
      // raised frame ring + 8 latch bolts
      const frame = new THREE.Mesh(new THREE.TorusGeometry(hr * 1.04, 0.026, 12, 40), metal);
      frame.position.set(ox, hatchY, z + s * 0.02);
      orbiter.add(frame);
      for (let i = 0; i < 8; i++) {
        const a2 = (i / 8) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), darkTrim);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(ox + Math.cos(a2) * hr * 1.13, hatchY + Math.sin(a2) * hr * 1.13, z + s * 0.012);
        orbiter.add(bolt);
      }

      // hinged round hatch door (top hinge)
      const pivot = new THREE.Group();
      pivot.position.set(ox + hr, hatchY, z + s * 0.03);
      const door = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, 0.05, 36), pureWhite);
      door.rotation.x = Math.PI / 2;
      door.position.x = -hr;
      const doorRim = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.96, 0.016, 8, 36), metal);
      doorRim.position.set(-hr, 0, s * 0.028);
      const doorWindow = new THREE.Mesh(new THREE.CylinderGeometry(hr * 0.3, hr * 0.3, 0.06, 24), glass);
      doorWindow.rotation.x = Math.PI / 2;
      doorWindow.position.set(-hr * 0.7, 0, 0);
      const doorRing = new THREE.Mesh(new THREE.TorusGeometry(hr * 0.3, 0.012, 8, 24), metal);
      doorRing.position.set(-hr * 0.7, 0, s * 0.032);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.024), metal);
      handle.position.set(-hr * 1.28, 0, s * 0.036);
      door.add(new THREE.Object3D());
      pivot.add(door, doorRim, doorWindow, doorRing, handle);
      pivot.userData = { side: s, glow };
      orbiter.add(pivot);
      hatches.push(pivot);

      /* ── staircase ── (stepGroup origin = hatch sill; local +Z = outwards, -X = down, -Y = towards the tail) */
      const stepGroup = new THREE.Group();
      stepGroup.position.set(ox - hr * 0.9, hatchY, z + s * 0.02);
      stepGroup.visible = false;
      const stepMetal = std({ color: "#d6dade", roughness: 0.32, metalness: 0.8 });
      const treadMat = std({ color: "#3a3f47", roughness: 0.55, metalness: 0.5 });
      const railMat = std({ color: "#ffb347", roughness: 0.4, metalness: 0.3 }); // safety-orange rails read clearly

      // ground height below the hatch sill (gear leg length + belly radius) and the stair run
      const DROP = fr * 0.98 + 0.77 - hr * 0.9;
      const RUN = DROP * 0.82;
      const N = 7;

      // egress platform at the sill
      const platPivot = new THREE.Group();
      const plat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.4), stepMetal);
      plat.position.set(0, 0, s * 0.2);
      platPivot.add(plat);
      [-0.22, 0.22].forEach((py) => {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.4), railMat);
        edge.position.set(0.02, py, s * 0.2);
        platPivot.add(edge);
      });
      stepGroup.add(platPivot);

      // the stair assembly hangs from the platform's outer edge; it is built along (-X down, -Y tail)
      const stairPivot = new THREE.Group();
      stairPivot.position.set(0, -0.23, s * 0.38);
      const L = Math.hypot(DROP, RUN);
      const slope = Math.atan2(RUN, DROP); // tilt of the stair line away from straight down
      const stringers = [];
      const dirAng = Math.atan2(-RUN, -DROP); // stair line direction in the X/Y plane (box length axis = local X)
      const nx = RUN / L; // outward-up normal of the stair line (up = +X)
      const ny = -DROP / L;
      [-0.17, 0.17].forEach((zz) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.025), stepMetal);
        rail.position.set(-DROP / 2, -RUN / 2, s * zz);
        rail.rotation.z = dirAng;
        stairPivot.add(rail);
        stringers.push(rail);
        // handrail 0.3 above the stair line + posts every third of the run
        const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, L, 8), railMat);
        hand.position.set(-DROP / 2 + nx * 0.3, -RUN / 2 + ny * 0.3, s * zz);
        hand.rotation.z = Math.atan2(DROP, -RUN);
        stairPivot.add(hand);
        for (let i = 0; i <= 3; i++) {
          const f = i / 3;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), railMat);
          post.position.set(-DROP * f + nx * 0.15, -RUN * f + ny * 0.15, s * zz);
          post.rotation.z = Math.atan2(-RUN, -DROP);
          stairPivot.add(post);
        }
      });
      // treads: flat steps, evenly spaced, each with a light edge strip
      const treads = [];
      for (let k = 0; k < N; k++) {
        const f = (k + 0.5) / N;
        const tread = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.4), treadMat);
        tread.position.set(-DROP * f, -RUN * f, 0);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.025, 0.4), stepMetal);
        lip.position.set(0.004, -0.1, 0);
        tread.add(lip);
        stairPivot.add(tread);
        treads.push(tread);
      }
      const footAnchor = new THREE.Object3D();
      footAnchor.position.set(-DROP, -RUN, 0);
      stairPivot.add(footAnchor);
      stepGroup.add(stairPivot);
      stepGroup.userData = { side: s, platPivot, stairPivot, treads, footAnchor, DROP, RUN };
      orbiter.add(stepGroup);
      steps.push(stepGroup);
    });
  }

  /* landing gear (nose + two mains), folded away until the descent: oleo strut, scissor link, drag brace, twin tyres */
  const gear = [];
  {
    const fr = (5.2 / 2) * U * 1.15;
    const ox = (8.4 / 2) * U + 0.06 + fr;
    const strutMat = std({ color: "#c9ccd0", roughness: 0.3, metalness: 0.8 });
    const oleoMat = std({ color: "#8d949b", roughness: 0.25, metalness: 0.9 });
    const tyreMat = std({ color: "#17181b", roughness: 0.92, metalness: 0 });
    const hubMat = std({ color: "#b9bec4", roughness: 0.3, metalness: 0.85 });
    const doorMat = std({ color: "#2a2d33", roughness: 0.6, metalness: 0.2 });
    [
      { y: 2.0, z: 0, main: false },
      { y: -3.2, z: 0.95, main: true },
      { y: -3.2, z: -0.95, main: true },
    ].forEach(({ y, z, main }) => {
      const leg = new THREE.Group();
      leg.position.set(ox - fr * 0.98, y, z * fr);
      const len = main ? 0.62 : 0.5;
      const tr = main ? 0.2 : 0.15;
      // upper (thick, dark) + lower (thin, bright) oleo strut
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len * 0.55, 14), oleoMat);
      upper.rotation.z = Math.PI / 2;
      upper.position.x = -len * 0.275;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len * 0.6, 12), strutMat);
      lower.rotation.z = Math.PI / 2;
      lower.position.x = -len * 0.72;
      leg.add(upper, lower);
      // scissor link + drag brace
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len * 0.75, 8), strutMat);
      brace.rotation.z = Math.PI / 2 - 0.45;
      brace.position.set(-len * 0.4, 0, main ? 0.0 : 0);
      leg.add(brace);
      // axle + twin tyres with hubs
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, main ? 0.4 : 0.34, 10), strutMat);
      axle.rotation.x = Math.PI / 2;
      axle.position.x = -len;
      leg.add(axle);
      [-1, 1].forEach((k) => {
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, 0.12, 28), tyreMat);
        tyre.rotation.x = Math.PI / 2;
        tyre.position.set(-len, 0, k * 0.1);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.55, tr * 0.55, 0.125, 18), hubMat);
        hub.rotation.x = Math.PI / 2;
        hub.position.copy(tyre.position);
        leg.add(tyre, hub);
      });
      // gear bay door, hanging open beside the leg
      const gdoor = new THREE.Mesh(new THREE.BoxGeometry(0.03, main ? 0.7 : 0.55, 0.2), doorMat);
      gdoor.position.set(-0.04, 0, k0(z) * 0.28);
      leg.add(gdoor);
      leg.scale.setScalar(0.001);
      leg.visible = false;
      orbiter.add(leg);
      gear.push(leg);
    });
    function k0(z) {
      return z === 0 ? 1 : Math.sign(z);
    }
  }

  root.add(left, right, tank, orbiter);
  return { root, parts: { left, right, tank, orbiter }, hatches, gear, steps };
}

/** lower the landing gear: t = 0 stowed … 1 down */
export function setGear(gear, t) {
  const a = Math.max(0, Math.min(1, t));
  gear.forEach((leg) => {
    leg.visible = a > 0.01;
    leg.scale.setScalar(Math.max(0.001, a));
  });
}

/** open the crew hatches: t = 0 closed … 1 fully open (swings outward about top hinge) */
export function setHatch(hatches, t) {
  hatches.forEach((p) => {
    const a = Math.max(0, Math.min(1, t));
    p.rotation.y = p.userData.side * a * 1.95; // ~112°
    if (p.userData.glow) p.userData.glow.visible = a > 0.02;
  });
}

/** deploy the boarding stairs: t = 0 stowed … 1 fully unfolded down to the Moon.
 *  The platform folds out from the hull first, then the staircase swings down and extends. */
export function setSteps(steps, t) {
  const a = Math.max(0, Math.min(1, t));
  steps.forEach((sg) => {
    sg.visible = a > 0.01;
    if (!sg.visible) return;
    const { side, platPivot, stairPivot, treads } = sg.userData;
    const platT = Math.min(1, a / 0.3);
    const stairT = Math.max(0, Math.min(1, (a - 0.2) / 0.8));
    // platform folds out from the hull (hinged along the sill)
    platPivot.rotation.x = side * (1 - platT) * (Math.PI / 2);
    platPivot.scale.setScalar(0.25 + 0.75 * platT);
    // staircase swings down from the platform's outer edge and telescopes out to the ground
    stairPivot.visible = stairT > 0.01;
    stairPivot.rotation.z = (1 - stairT) * 1.1;
    stairPivot.scale.set(0.1 + 0.9 * stairT, 0.1 + 0.9 * stairT, 1);
    treads.forEach((tr, i) => {
      tr.visible = stairT > (i + 1) / (treads.length + 2);
    });
  });
}
