// Purpose: The 3D layer of the rocket story (lazy-loaded, three.js). One transparent WebGL canvas that draws:
//   - the high-detail space shuttle (./shuttleModel.js — no US flags or logos): left booster, right booster,
//     external tank, orbiter; parts separate in flight, landing gear & crew hatch + 3D boarding steps animate on the Moon,
//   - procedural asteroids (the "business problems" the shuttle steers around),
//   - 3D rocket landing retro-plume + billowing lunar touchdown dust spray,
//   - 3D ambient moon air / exosphere particles drifting in space light,
//   - the astronaut (/models/astronaut-v2.glb): steps out of the open door, walks down the animated steps,
//     hops across the Moon in low gravity, and waves at the camera.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildShuttle, setHatch, setGear, setSteps } from "./shuttleModel.js";

const CAM_Z = 20;
const FOV = 30;
const D2R = Math.PI / 180;
const ROCK_POOL = 18;

/* ── soft radial sprite texture for moon air & landing dust particles ── */
function makeDustSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(235,242,255,0.65)");
  grad.addColorStop(0.7, "rgba(195,210,235,0.18)");
  grad.addColorStop(1, "rgba(180,200,230,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ── small deterministic noise for the asteroid surfaces ── */
function hash(x, y, z, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}
function fbm(x, y, z, seed) {
  let a = 0.5;
  let f = 1;
  let t = 0;
  for (let o = 0; o < 4; o++) {
    t += a * noise3(x * f, y * f, z * f, seed + o * 7);
    a *= 0.5;
    f *= 2.1;
  }
  return t;
}

function makeRockGeometry(seed) {
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 4));
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3();
  const sx = 0.8 + hash(seed, 1, 2, 3) * 0.5;
  const sy = 0.7 + hash(seed, 4, 5, 6) * 0.4;
  const sz = 0.8 + hash(seed, 7, 8, 9) * 0.4;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = fbm(p.x * 1.5 + seed, p.y * 1.5, p.z * 1.5, seed) * 0.8 + fbm(p.x * 5, p.y * 5, p.z * 5, seed + 9) * 0.2;
    let crater = 0;
    for (let k = 0; k < 6; k++) {
      const cx = hash(seed, k, 1, 1) * 2 - 1;
      const cy = hash(seed, k, 2, 1) * 2 - 1;
      const cz = hash(seed, k, 3, 1) * 2 - 1;
      const rad = 0.18 + hash(seed, k, 4, 1) * 0.3;
      const d = p.distanceTo(new THREE.Vector3(cx, cy, cz).normalize());
      if (d < rad) {
        const q = d / rad;
        crater -= (1 - q * q) * rad * 0.35;
      } else if (d < rad * 1.25) crater += (1 - (d - rad) / (rad * 0.25)) * rad * 0.06;
    }
    const r = 0.78 + n * 0.5 + crater;
    p.multiplyScalar(r);
    p.set(p.x * sx, p.y * sy, p.z * sz);
    pos.setXYZ(i, p.x, p.y, p.z);
    const shade = Math.max(0.16, 0.34 + n * 0.36 + crater * 1.1);
    colors[i * 3] = shade * 0.92;
    colors[i * 3 + 1] = shade * 0.86;
    colors[i * 3 + 2] = shade * 0.8;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createScene3D(canvas, { color = "#2dd4bf" } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const buildEnv = () => {
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  };

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  camera.position.set(0, 0, CAM_Z);

  const sun = new THREE.DirectionalLight(0xfff3e0, 3.4);
  sun.position.set(-9, 11, 10);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(new THREE.Color(color), 1.15);
  rim.position.set(9, -2, -6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1c1814, 0.38));

  const size = { w: 1, h: 1 };
  const tanHalf = Math.tan((FOV / 2) * D2R);
  const k = (z = 0) => (2 * (CAM_Z - z) * tanHalf) / size.h;
  const toWorld = (x, y, z = 0, out = new THREE.Vector3()) => {
    const kk = k(z);
    return out.set((x - size.w / 2) * kk, -(y - size.h / 2) * kk, z);
  };

  /* ═══ shuttle ═══ */
  const rocketRoot = new THREE.Group();
  const rocketTilt = new THREE.Group();
  const rocketRoll = new THREE.Group();
  const rocketModel = new THREE.Group();
  rocketRoot.add(rocketTilt);
  rocketTilt.add(rocketRoll);
  rocketRoll.add(rocketModel);
  rocketRoot.visible = false;
  scene.add(rocketRoot);
  const parts = { left: null, right: null, tank: null, orbiter: null };
  let hatches = [];
  let gear = [];
  let steps = [];
  const partBase = new Map();
  const partCentre = new Map();
  let stackH = 15.28;
  let orbiterLen = 12.2;

  /* ═══ 3D retro-thrust landing plume (glows beneath orbiter during final lunar descent) ═══ */
  const retroGroup = new THREE.Group();
  retroGroup.visible = false;
  scene.add(retroGroup);
  const retroMat = new THREE.MeshBasicMaterial({
    color: 0xffcf88,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const retroCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const retroCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 2.2, 20, 1, true), retroMat);
  retroCone.position.y = -1.1;
  const retroCore = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.3, 16), retroCoreMat);
  retroCore.position.y = -0.65;
  retroGroup.add(retroCone, retroCore);

  /* ═══ 3D lunar touchdown dust spray + ambient moon air quality particles ═══ */
  const dustSprite = makeDustSprite();

  // 1. Touchdown dust burst (140 particles erupting radially from landing spot)
  const BURST_N = 140;
  const burstPos = new Float32Array(BURST_N * 3);
  const burstSeeds = Array.from({ length: BURST_N }, (_, i) => ({
    angle: hash(i, 1, 2, 5) * Math.PI * 2,
    speed: 0.55 + hash(i, 3, 4, 5) * 1.45,
    lift: 0.12 + hash(i, 5, 6, 5) * 0.55,
    phase: hash(i, 7, 8, 5),
  }));
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
  const burstMat = new THREE.PointsMaterial({
    map: dustSprite,
    color: 0xd8e0ec,
    size: 0.52,
    transparent: true,
    opacity: 0,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  const burstPoints = new THREE.Points(burstGeo, burstMat);
  burstPoints.visible = false;
  scene.add(burstPoints);

  // 2. Ambient Moon air / exosphere motes (200 particles drifting across the Moon scene)
  const AIR_N = 200;
  const airPos = new Float32Array(AIR_N * 3);
  const airSeeds = Array.from({ length: AIR_N }, (_, i) => ({
    nx: hash(i, 1, 3, 9) * 2 - 1, // -1..1 across viewport width
    ny: hash(i, 2, 4, 9), // 0..1 above/around moon surface
    z: -2 + hash(i, 5, 6, 9) * 7,
    vx: (hash(i, 7, 8, 9) - 0.35) * 0.35,
    vy: (hash(i, 9, 1, 9) - 0.5) * 0.14,
    phase: hash(i, 2, 5, 9) * Math.PI * 2,
  }));
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute("position", new THREE.BufferAttribute(airPos, 3));
  const airMat = new THREE.PointsMaterial({
    map: dustSprite,
    color: 0xcce4ff,
    size: 0.22,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const airPoints = new THREE.Points(airGeo, airMat);
  airPoints.visible = false;
  scene.add(airPoints);

  /* ═══ asteroids ═══ */
  const grain = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const img = g.createImageData(128, 128);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const v = fbm(x / 11, y / 11, 0.5, 3) * 0.7 + hash(x, y, 1, 2) * 0.3;
        const o = (y * 128 + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(v * 255);
        img.data[o + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  })();
  const rockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    color: 0x8f8780,
    roughness: 1,
    metalness: 0,
    bumpMap: grain,
    bumpScale: 2.2,
    roughnessMap: grain,
  });
  const ROCK_SHAPES = 6;
  const standIn = new THREE.IcosahedronGeometry(1, 2);
  const rockGeos = [];
  const rocks = Array.from({ length: ROCK_POOL }, () => {
    const m = new THREE.Mesh(standIn, rockMat);
    m.visible = false;
    scene.add(m);
    return m;
  });
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const buildRocks = async () => {
    for (let k = 0; k < ROCK_SHAPES; k++) {
      if (disposed) return;
      await nextFrame();
      rockGeos[k] = makeRockGeometry(k * 3.7 + 1);
      rocks.forEach((m, i) => i % ROCK_SHAPES === k && (m.geometry = rockGeos[k]));
      dirty = true;
    }
  };

  /* ═══ astronaut ═══ */
  const astroRoot = new THREE.Group();
  astroRoot.visible = false;
  scene.add(astroRoot);
  let astroModel = null;
  let astroH = 1.8;
  const astroBody = new THREE.Group();
  astroRoot.add(astroBody);

  const state = { rocket: null, rocks: [], astro: null, landing: null, moonAir: null };
  let active = false;
  let raf = 0;
  let last = 0;
  let disposed = false;
  let dirty = true;
  let clock = 0;

  /* ── loading ── */
  const loadShuttle = async () => {
    const built = buildShuttle(THREE);
    const obj = built.root;
    hatches = built.hatches;
    gear = built.gear;
    steps = built.steps;
    Object.assign(parts, built.parts);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    stackH = box.max.y - box.min.y;
    Object.values(parts).forEach((g) => g.children.forEach((ch) => ch.position.sub(c)));
    [parts.left, parts.right].forEach((g) => {
      g.children.forEach((ch) => (ch.position.z += g.position.z));
      g.position.z = 0;
    });
    Object.values(parts).forEach((g) => {
      partBase.set(g, { p: g.position.clone(), r: g.rotation.clone() });
      partCentre.set(g, new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()));
    });
    const ob = new THREE.Box3().setFromObject(parts.orbiter);
    orbiterLen = ob.max.y - ob.min.y;
    obj.rotation.y = -Math.PI / 2;
    rocketModel.add(obj);
  };

  const loadAstronaut = async () => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync("/models/astronaut-v2.glb");
    astroModel = gltf.scene;
    astroModel.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        if (o.material) o.material.envMapIntensity = 0.85;
      }
    });
    const b = new THREE.Box3().setFromObject(astroModel);
    astroH = b.max.y - b.min.y || 1.8;
    astroModel.position.y -= b.min.y;
    astroBody.add(astroModel);
  };

  /* procedural astronaut motion: step-by-step stair descent, low-gravity moonwalk hops, idle & wave */
  const astroMotion = (a, t) => {
    const H = astroH;
    let y = 0;
    let pitch = 0;
    let roll = 0;
    let yaw = 0;
    if (a.action === "step_down" && a.scrub != null) {
      // 5 distinct stair-step cadences as the astronaut walks down the 3D steps
      const stepWave = Math.abs(Math.sin(a.scrub * Math.PI * 5));
      y = stepWave * H * 0.08;
      pitch = 0.14;
      roll = Math.sin(a.scrub * Math.PI * 5) * 0.07;
    } else if (a.action === "moon_walk" && a.scrub != null) {
      const hop = Math.abs(Math.sin(a.scrub * Math.PI * 1.15));
      y = hop * H * 0.16;
      pitch = 0.12 + (1 - hop) * 0.05;
      roll = Math.sin(a.scrub * Math.PI * 1.15) * 0.05;
    } else if (a.action === "wave") {
      y = Math.abs(Math.sin(t * 2.6)) * H * 0.035;
      roll = Math.sin(t * 2.6) * 0.09;
      yaw = Math.sin(t * 1.3) * 0.12;
    } else if (a.action === "rise") {
      y = Math.sin(t * 1.8) * H * 0.012;
      roll = Math.sin(t * 1.1) * 0.03;
    } else {
      y = Math.sin(t * 1.6) * H * 0.008;
      roll = Math.sin(t * 0.9) * 0.025;
    }
    astroBody.position.y = y;
    astroBody.rotation.set(pitch, yaw, roll);
  };

  const idle = (ms) => new Promise((r) => (window.requestIdleCallback ? window.requestIdleCallback(() => r(), { timeout: ms }) : setTimeout(r, 200)));
  const ready = loadShuttle()
    .then(nextFrame)
    .then(() => !disposed && buildEnv())
    .then(nextFrame)
    .then(() => (renderer.compileAsync && !disposed ? renderer.compileAsync(scene, camera).catch(() => {}) : null));
  ready.then(() => idle(1500)).then(buildRocks).catch(() => {});
  const astroReady = ready.then(() => idle(3000)).then(loadAstronaut).catch(() => null);

  /* ── per-frame application of the latest state ── */
  const vTmp = new THREE.Vector3();
  const doorW = new THREE.Vector3();
  const stepBotW = new THREE.Vector3();
  const stepFoot = { x: 0, y: 0, ok: false };

  const setOpacity = (obj, o) => {
    obj.traverse((child) => {
      if (!child.isMesh) return;
      const m = child.material;
      const want = o < 0.999;
      if (m.transparent !== want) {
        m.transparent = want;
        m.depthWrite = !want;
        m.needsUpdate = true;
      }
      m.opacity = o;
    });
  };

  const applyPart = (mesh, sep, kind) => {
    if (!mesh) return;
    const base = partBase.get(mesh);
    const c = partCentre.get(mesh);
    const p = Math.max(0, sep);
    if (p <= 0) {
      mesh.visible = true;
      mesh.position.copy(base.p);
      mesh.rotation.copy(base.r);
      setOpacity(mesh, 1);
      return;
    }
    mesh.visible = p < 1;
    const e1 = 1 - Math.pow(1 - Math.min(1, p * 3), 3);
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (kind === "left" || kind === "right") {
      const sgn = kind === "left" ? 1 : -1;
      dz = sgn * (e1 * 2.6 + p * 3.5);
      dy = -p * p * 24;
      dx = -p * 0.8;
      mesh.rotation.set(-sgn * (e1 * 0.35 + p * 1.6), 0, 0);
    } else {
      dx = -(e1 * 1.2 + p * 3);
      dy = -p * p * 26;
      mesh.rotation.set(0, 0, p * 0.9);
    }
    vTmp.copy(c).applyEuler(mesh.rotation);
    mesh.position.set(c.x - vTmp.x + dx, c.y - vTmp.y + dy, c.z - vTmp.z + dz);
    setOpacity(mesh, 1 - Math.max(0, (p - 0.6) / 0.4));
  };

  const apply = () => {
    const r = state.rocket;
    if (r && parts.orbiter) {
      rocketRoot.visible = r.visible !== false;
      toWorld(r.x, r.y, 0, rocketRoot.position);
      rocketRoot.rotation.set(0, 0, -(r.heading + 90) * D2R);
      const s = (r.height * k(0)) / stackH;
      rocketRoot.scale.setScalar(s);
      rocketRoll.rotation.set(0, r.roll + (r.yaw || 0), 0);
      rocketTilt.rotation.set(r.tilt || 0, 0, 0);
      applyPart(parts.left, r.boosters, "left");
      applyPart(parts.right, r.boosters, "right");
      applyPart(parts.tank, r.tank, "tank");
      setHatch(hatches, r.door || 0);
      setGear(gear, r.gear || 0);
      setSteps(steps, r.steps || 0);

      // an orbiter glides in unpowered: no braking plume (the old white cone is gone)
      const lt = 0;
      if (lt > 0.02) {
        retroGroup.visible = true;
        retroGroup.position.copy(rocketRoot.position);
        retroGroup.position.y -= r.height * k(0) * 0.14;
        const flicker = 0.9 + Math.sin(clock * 45) * 0.12;
        retroGroup.scale.set(s * 2.4 * lt * flicker, s * 2.8 * lt * flicker, s * 2.4 * lt);
        retroMat.opacity = Math.min(0.85, lt * 0.9);
        retroCoreMat.opacity = Math.min(0.95, lt);
      } else {
        retroGroup.visible = false;
      }
    } else {
      rocketRoot.visible = false;
      retroGroup.visible = false;
    }

    // 3D touchdown dust spray
    const ld = state.landing;
    if (ld && ld.burst > 0.005 && ld.burst < 1) {
      burstPoints.visible = true;
      const origin = toWorld(ld.x, ld.y, 1.2, vTmp);
      const spread = ld.scale * k(1.2) * 0.85;
      const b = ld.burst;
      const posArr = burstGeo.attributes.position.array;
      for (let i = 0; i < BURST_N; i++) {
        const sd = burstSeeds[i];
        const rad = b * sd.speed * spread;
        const arc = Math.sin(Math.min(1, b * 1.15) * Math.PI) * sd.lift * spread * 0.55;
        posArr[i * 3] = origin.x + Math.cos(sd.angle) * rad * 1.45;
        posArr[i * 3 + 1] = origin.y + arc + Math.sin(clock * 2 + sd.phase * 6) * 0.06;
        posArr[i * 3 + 2] = origin.z + Math.sin(sd.angle) * rad * 0.45;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstMat.opacity = Math.sin(b * Math.PI) * 0.22; // the 2D billow (moonAtmosphere.js) carries most of the dust
      burstMat.size = 0.42 + b * 0.65;
    } else {
      burstPoints.visible = false;
    }

    // 3D ambient Moon air quality / exosphere particles
    const ma = state.moonAir;
    if (ma && ma.opacity > 0.01) {
      airPoints.visible = true;
      const halfW = (size.w / 2) * k(0);
      const topW = toWorld(size.w / 2, ma.groundY, 0, vTmp).y;
      const posArr = airGeo.attributes.position.array;
      for (let i = 0; i < AIR_N; i++) {
        const sd = airSeeds[i];
        const driftX = ((sd.nx + clock * sd.vx * 0.04 + 2) % 2) - 1;
        const driftY = sd.ny * 3.8 - 1.2 + Math.sin(clock * 0.7 + sd.phase) * 0.18;
        posArr[i * 3] = driftX * halfW * 1.1;
        posArr[i * 3 + 1] = topW + driftY;
        posArr[i * 3 + 2] = sd.z;
      }
      airGeo.attributes.position.needsUpdate = true;
      airMat.opacity = ma.opacity * 0.12; // faint: the 2D moon air (moonAtmosphere.js) carries the effect
    } else {
      airPoints.visible = false;
    }

    rocks.forEach((m, i) => {
      const d = state.rocks[i];
      if (!d) {
        m.visible = false;
        return;
      }
      m.visible = true;
      toWorld(d.x, d.y, d.z || 0, m.position);
      m.scale.setScalar(((d.size / 2) * k(d.z || 0)) / 1.0);
      m.rotation.set(d.rx, d.ry, d.rz || 0);
    });

    if (r && parts.orbiter && hatches[0]?.userData?.glow && steps[0]?.userData?.footAnchor) {
      rocketRoot.updateMatrixWorld(true);
      hatches[0].userData.glow.getWorldPosition(doorW);
      steps[0].userData.footAnchor.getWorldPosition(stepBotW);
      // screen position of where the stair descent ends, so the moonwalk starts from exactly there
      // (otherwise the astronaut jumps back up next to the hatch and seems to climb down twice)
      const endY = stepBotW.y;
      vTmp.set(stepBotW.x, endY, stepBotW.z + 0.25).project(camera);
      stepFoot.x = ((vTmp.x + 1) / 2) * size.w;
      stepFoot.y = ((1 - vTmp.y) / 2) * size.h;
      stepFoot.ok = true;
    }

    const a = state.astro;
    if (a && astroModel) {
      astroRoot.visible = a.visible !== false;
      if (a.action === "step_down" && a.scrub != null && hatches[0]?.userData?.glow && steps[0]?.userData?.footAnchor) {
        const te = a.scrub < 0.5 ? 4 * a.scrub * a.scrub * a.scrub : 1 - Math.pow(-2 * a.scrub + 2, 3) / 2;
        astroRoot.position.set(
          doorW.x + (stepBotW.x - doorW.x) * te,
          (doorW.y - 0.12) + (stepBotW.y - (doorW.y - 0.12)) * te,
          (doorW.z + 0.1) + ((stepBotW.z + 0.25) - (doorW.z + 0.1)) * te,
        );
        astroRoot.scale.setScalar((a.height * k(astroRoot.position.z)) / astroH);
      } else {
        toWorld(a.x, a.y, a.z || 0, astroRoot.position);
        astroRoot.scale.setScalar((a.height * k(a.z || 0)) / astroH);
      }
      astroRoot.rotation.set(0, a.yaw || 0, 0);
      astroMotion(a, clock);
    } else astroRoot.visible = false;
  };

  const frame = (now) => {
    raf = 0;
    if (disposed || !active) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    const moonVisible = !!(state.moonAir && state.moonAir.opacity > 0.01);
    const animating = moonVisible || !!(astroModel && astroRoot.visible && state.astro && state.astro.scrub == null);
    clock += dt;
    if (dirty || animating) {
      apply();
      renderer.render(scene, camera);
      dirty = false;
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    ready,
    astroReady,
    toWorld,
    /** screen point where the stair descent ends ({ x, y, ok }) */
    get stepFoot() {
      return stepFoot;
    },
    get orbiterRatio() {
      return orbiterLen / stackH;
    },
    setSize(w, h) {
      size.w = w;
      size.h = h;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    },
    setState(next) {
      Object.assign(state, next);
      dirty = true;
    },
    setActive(on) {
      if (on === active) return;
      active = on;
      last = 0;
      dirty = true;
      if (on && !raf) raf = requestAnimationFrame(frame);
      if (!on) {
        renderer.clear();
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      rockGeos.forEach((g) => g?.dispose());
      standIn.dispose();
      rockMat.dispose();
      grain.dispose();
      dustSprite.dispose();
      burstGeo.dispose();
      burstMat.dispose();
      airGeo.dispose();
      airMat.dispose();
      retroCone.geometry.dispose();
      retroCore.geometry.dispose();
      retroMat.dispose();
      retroCoreMat.dispose();
      pmrem.dispose();
      renderer.dispose();
      void vTmp;
    },
  };
}
