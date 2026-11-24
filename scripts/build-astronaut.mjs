// Purpose: convert the astronaut model (scripts/assets/astronaut.fbx, a static mesh with no rig) into
// public/models/astronaut-v2.glb for the service-page rocket story: PBR materials tuned per part,
// duplicate meshes removed, origin at the feet, height = 1.8 units. Run: npm run build:astronaut
import { readFileSync, writeFileSync } from "node:fs";

// three's loaders/exporter expect a few browser globals
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ style: {} }), createElement: () => ({ style: {}, getContext: () => null }) };
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend && this.onloadend();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;
      this.onloadend && this.onloadend();
    });
  }
};

const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
THREE.TextureLoader.prototype.load = () => new THREE.Texture();

const src = readFileSync(new URL("./assets/astronaut.fbx", import.meta.url));
const fbx = new FBXLoader().parse(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength), "");

/* material look per part (by the FBX material name prefix "01 |", "02 |" …).
   The badge / insignia colours are neutralised so the suit carries no country flag. */
const LOOK = {
  "01": { color: "#ece8dc", roughness: 0.85, metalness: 0 }, // suit fabric
  "02": { color: "#f2efe6", roughness: 0.45, metalness: 0 }, // shell
  "03": { color: "#e8581c", roughness: 0.5, metalness: 0 }, // safety orange
  "04": { color: "#1a1b1e", roughness: 0.75, metalness: 0 }, // rubber
  "05": { color: "#202226", roughness: 0.8, metalness: 0 }, // harness
  "06": { color: "#9aa6ad", roughness: 0.32, metalness: 0.85 }, // brushed silver
  "07": { color: "#d9a441", roughness: 0.12, metalness: 1 }, // gold visor
  "08": { color: "#0d1a2a", roughness: 0.15, metalness: 0.4 }, // displays
  "09": { color: "#0a84ff", roughness: 0.5, metalness: 0 }, // badge → Clicktots blue
  "10": { color: "#f2efe6", roughness: 0.6, metalness: 0 }, // insignia white
  "11": { color: "#0a84ff", roughness: 0.5, metalness: 0 }, // insignia red → blue (no flag colours)
  "12": { color: "#dff3ff", roughness: 0.2, metalness: 0, emissive: "#9fd8ff", emissiveIntensity: 0.9 }, // helmet lamps
  "13": { color: "#2a2f33", roughness: 0.4, metalness: 0.8 }, // gunmetal
  "14": { color: "#0b0b0c", roughness: 0.9, metalness: 0 }, // recesses
};
const cache = new Map();
const toStandard = (m) => {
  const key = (m.name || "").slice(0, 2);
  if (cache.has(key)) return cache.get(key);
  const l = LOOK[key] || { color: `#${m.color.getHexString()}`, roughness: 0.6, metalness: 0 };
  const out = new THREE.MeshStandardMaterial({ ...l, name: m.name });
  cache.set(key, out);
  return out;
};

/* keep one copy of duplicated meshes (same vertex count + bounds) */
const seen = new Set();
const keep = [];
fbx.traverse((o) => {
  if (!o.isMesh) return;
  o.updateWorldMatrix(true, false);
  const b = new THREE.Box3().setFromObject(o);
  const sig = `${o.geometry.attributes.position.count}|${b.min.toArray().map((v) => v.toFixed(2))}|${b.max.toArray().map((v) => v.toFixed(2))}`;
  if (seen.has(sig)) return;
  seen.add(sig);
  keep.push(o);
});

/* the FBX loader splits the model into thousands of material groups: regroup all triangles by material,
   so the final model is one mesh per material (14 draw calls instead of ~7,000) */
const byMat = new Map(); // material key → { mat, pos: [], nor: [] }
keep.forEach((o) => {
  const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
  const pos = g.attributes.position.array;
  const nor = g.attributes.normal ? g.attributes.normal.array : null;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const groups = g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
  groups.forEach(({ start, count, materialIndex }) => {
    const m = mats[materialIndex] || mats[0];
    const key = (m.name || "").slice(0, 2);
    if (!byMat.has(key)) byMat.set(key, { mat: toStandard(m), pos: [], nor: [] });
    const bucket = byMat.get(key);
    for (let i = start * 3; i < (start + count) * 3; i++) {
      bucket.pos.push(pos[i]);
      if (nor) bucket.nor.push(nor[i]);
    }
  });
});
const root = new THREE.Group();
root.name = "astronaut";
for (const [key, b] of byMat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  if (b.nor.length === b.pos.length) g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
  const mesh = new THREE.Mesh(g, b.mat);
  mesh.name = `part-${key}`;
  root.add(mesh);
}

/* origin at the feet (centre of the footprint), height 1.8 */
const box = new THREE.Box3().setFromObject(root);
const s = 1.8 / (box.max.y - box.min.y);
const c = box.getCenter(new THREE.Vector3());
root.children.forEach((m) => {
  m.geometry.translate(-c.x, -box.min.y, -c.z);
  m.geometry.scale(s, s, s);
  if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
});

const raw = await new GLTFExporter().parseAsync(root, { binary: true });

/* compress: weld duplicate vertices, quantize, meshopt (the page already ships the meshopt decoder) */
const { WebIO } = await import("@gltf-transform/core");
const { ALL_EXTENSIONS, EXTMeshoptCompression } = await import("@gltf-transform/extensions");
const { weld, dedup, prune, quantize, meshopt, simplify } = await import("@gltf-transform/functions");
const { MeshoptEncoder, MeshoptSimplifier } = await import("meshoptimizer");
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.readBinary(new Uint8Array(raw));
await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.6, error: 0.0008 }), // ~40% fewer triangles, invisible at this size
  prune(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: "high" })
);
doc.createExtension(EXTMeshoptCompression).setRequired(true);
const out = await io.writeBinary(doc);
writeFileSync(new URL("../public/models/astronaut-v2.glb", import.meta.url), Buffer.from(out));
console.log(`astronaut-v2.glb: ${keep.length} mesh(es), ${(raw.byteLength / 1024).toFixed(0)} KB → ${(out.byteLength / 1024).toFixed(0)} KB`);
