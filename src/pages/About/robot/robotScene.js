// Purpose: the ceramic robot behind the "About Clicktots" inside page (ported from the Nova Agent page).
//   Everything is built in code with Three.js: no images, no models, no external files.
//   It replaces the old 300-frame JPG sequence (16 MB): one canvas with the original Nova scroll movement,
//   plus gentle pointer + idle motion.
//   Performance: pixel ratio capped, ~30 fps when only idling, paused while the tab is hidden, disposed on close.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const MAX_DPR = 1.25; // sharp enough behind the veil, far cheaper than 2× on big screens
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* The ORIGINAL Nova Agent movement, unchanged: scroll is measured in screens (0 → 2).
   Screen 0 → 1: from the full figure (head tilted) the camera glides in to the face; then it holds there.
   After 1.55 screens the eyes cross-fade into the quote mark. */
const STATES = [
  { z: 11.6, y: 1.1, look: 0.55, yaw: -0.42, hy: -0.6, hp: 0.16, hr: 0.22 },
  { z: 6.9, y: 1.95, look: 1.72, yaw: -0.2, hy: -0.06, hp: 0.04, hr: 0 },
  { z: 6.9, y: 1.95, look: 1.72, yaw: -0.2, hy: -0.06, hp: 0.04, hr: 0 },
];
const QUOTE_AT = 1.55;

/**
 * @param {HTMLCanvasElement} canvas  sized by CSS to fill its parent
 * Built once and kept: it can be prepared (built + shaders compiled) while the person is still on the home
 * page, then attached/paused as About opens/closes, so the robot is there immediately.
 * @param {HTMLCanvasElement} canvas
 * @param {{ getProgress?: () => number }} opts  getProgress = screens scrolled
 * @returns {{ whenReady: Promise<void>, resume: (getProgress: () => number, onFirstFrame?: () => void) => void, pause: () => void, dispose: () => void }}
 */
export function createRobotScene(canvas, { getProgress } = {}) {
  const W = () => Math.max(1, canvas.clientWidth || window.innerWidth);
  const H = () => Math.max(1, canvas.clientHeight || window.innerHeight);

  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,MAX_DPR));renderer.setSize(W(),H(),false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(30,W()/H(),.1,100);camera.position.set(0,1.1,11.6);scene.add(camera);
  const hemi=new THREE.HemisphereLight(0xfff6ee,0xd9d2c8,.7);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xfff3e6,1.7);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.radius=6;key.shadow.bias=-.0005;key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;scene.add(key);
  const rim=new THREE.DirectionalLight(0xfff0e6,1.2);rim.position.set(4,2,-4);scene.add(rim);
  const fill=new THREE.PointLight(0xff9a6a,2.2,6);fill.position.set(-3.2,1.2,.6);scene.add(fill);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.9;pmrem.dispose();
  const mats={
  shell:new THREE.MeshPhysicalMaterial({color:0xeeebe6,roughness:.38,clearcoat:.45,clearcoatRoughness:.3}),
  light:new THREE.MeshPhysicalMaterial({color:0xf8f6f2,roughness:.34,clearcoat:.45,clearcoatRoughness:.3}),
  joint:new THREE.MeshStandardMaterial({color:0x1b1b1f,roughness:.55,metalness:.3}),
  deep:new THREE.MeshStandardMaterial({color:0x0f0f12,roughness:.3,metalness:.15}),
  pedestal:new THREE.MeshStandardMaterial({color:0x2a2928,roughness:.9}),
  glow:new THREE.MeshStandardMaterial({color:0x1b1b1f,roughness:.55,metalness:.3,emissive:0xff8a3d,emissiveIntensity:.35})
  };
  function rounded(parent,w,h,d,r,mat,pos=[0,0,0],segments=5){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,segments,r),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
  function ball(parent,r,mat,pos){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
  function cylinder(parent,r1,r2,h,mat,pos,rot=[0,0,0],radial=24){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,radial),mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  function torus(parent,r,t,mat,pos,rot=[0,0,0],arc=Math.PI*2){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,32,arc),mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;parent.add(m);return m}

  // 512px face canvas with glowing eye ellipses and quote mode.
  const faceCanvas=document.createElement('canvas');faceCanvas.width=512;faceCanvas.height=512;const faceCtx=faceCanvas.getContext('2d');
  let faceMode='eyes',faceAlpha=1,faceTarget=1,blinkScale=1,blinkAt=performance.now()+2500+Math.random()*3000,blinkStart=0;
  function drawFace(){faceCtx.clearRect(0,0,512,512);faceCtx.fillStyle='#070708';faceCtx.fillRect(0,0,512,512);faceCtx.save();faceCtx.shadowColor='#fff';faceCtx.shadowBlur=18;faceCtx.fillStyle=`rgba(255,255,255,${faceAlpha})`;if(faceMode==='eyes'){faceCtx.beginPath();faceCtx.ellipse(196,262,30,38*blinkScale,0,0,Math.PI*2);faceCtx.ellipse(316,252,30,38*blinkScale,0,0,Math.PI*2);faceCtx.fill()}else{faceCtx.font='bold 560px Arial Black, Arial, sans-serif';faceCtx.textAlign='center';faceCtx.textBaseline='middle';faceCtx.fillText('“',256,275)}faceCtx.restore();faceTexture.needsUpdate=true}
  const faceTexture=new THREE.CanvasTexture(faceCanvas);faceTexture.colorSpace=THREE.SRGBColorSpace;drawFace();
  const faceMat=new THREE.MeshPhysicalMaterial({color:0xffffff,map:faceTexture,emissive:0xffffff,emissiveMap:faceTexture,emissiveIntensity:1.6,roughness:.12,metalness:.05,clearcoat:1,clearcoatRoughness:.08});
  // Code-drawn conic brand ring texture.
  const ringCanvas=document.createElement('canvas');ringCanvas.width=512;ringCanvas.height=512;const ringCtx=ringCanvas.getContext('2d');ringCtx.translate(256,256);const grad=ringCtx.createConicGradient(-Math.PI*.62,0,0);[['#ff3d8b',0],['#ff5a5f',.2],['#ff8a3d',.4],['#ffb347',.56],['#ff8a3d',.72],['#ff5a5f',.86],['#ff3d8b',1]].forEach(([c,p])=>grad.addColorStop(p,c));ringCtx.fillStyle=grad;ringCtx.fillRect(-256,-256,512,512);
  const ringTex=new THREE.CanvasTexture(ringCanvas);ringTex.colorSpace=THREE.SRGBColorSpace;
  const ringMat=new THREE.MeshPhysicalMaterial({map:ringTex,emissiveMap:ringTex,emissive:0xffffff,emissiveIntensity:.22,roughness:.5,clearcoat:.35});

  const robot=new THREE.Group();scene.add(robot);const bodyRoot=new THREE.Group();robot.add(bodyRoot);
  // Torso, shoulders, chest details, pelvis.
  const torso=rounded(bodyRoot,1.22,1.12,.92,.24,mats.shell,[0,.02,0]);
  rounded(bodyRoot,1.08,.15,.79,.07,mats.light,[0,.63,.03]);
  const ledColors=[0xff8a3d,0xff5a5f,0xff3d8b];ledColors.forEach((color,i)=>{const ledMat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.15,roughness:.3});const m=rounded(bodyRoot,.12,.07,.045,.025,ledMat,[(i-1)*.2,.39,.49],3);m.castShadow=false});
  for(const x of [-.27,.27]){rounded(bodyRoot,.09,.27,.055,.035,mats.deep,[x,-.12,.478],3);torus(bodyRoot,.075,.018,mats.joint,[x,-.005,.475],[0,0,0],Math.PI)}
  rounded(bodyRoot,.82,.28,.7,.11,mats.joint,[0,-.71,0]);
  // Arms articulated as shoulder/elbow/forearm groups.
  const armParts=[];
  for(const side of [-1,1]){const shoulder=ball(bodyRoot,.2,mats.joint,[side*.73,.31,0]);const upper=new THREE.Group();upper.position.set(side*.73,.31,0);upper.rotation.z=side*.16;bodyRoot.add(upper);rounded(upper,.3,.57,.38,.13,mats.shell,[side*.06,-.34,0]);ball(upper,.15,mats.joint,[side*.12,-.66,0]);const fore=new THREE.Group();fore.position.set(side*.12,-.66,0);fore.rotation.z=-.35;upper.add(fore);rounded(fore,.27,.52,.34,.12,mats.shell,[side*.04,-.32,.01]);rounded(fore,.32,.24,.32,.1,mats.light,[side*.04,-.67,.05]);ball(fore,.07,mats.light,[side*.19,-.65,.16]);armParts.push({upper,fore,side,shoulder})}
  // Hip joints, legs, ankles, feet.
  for(const side of [-1,1]){ball(bodyRoot,.17,mats.joint,[side*.32,-.89,0]);rounded(bodyRoot,.36,.72,.43,.14,mats.shell,[side*.32,-1.34,0]);cylinder(bodyRoot,.115,.14,.15,mats.joint,[side*.32,-1.77,0]);rounded(bodyRoot,.44,.23,.67,.1,mats.light,[side*.32,-1.92,.12]);}
  // Head with pivot at y .78 above its root.
  const head=new THREE.Group();head.position.set(0,.78,0);bodyRoot.add(head);
  rounded(head,1.28,1.14,.9,.18,mats.joint,[0,0,-.28]);
  rounded(head,1.5,1.42,1.3,.2,mats.shell,[0,0,0]);
  // Circuit bars scattered across the back and top surfaces of the dark rear housing.
  for(let i=0;i<26;i++){const x=(Math.random()-.5)*1.04,y=(Math.random()-.5)*.88,z=-.751;const w=.07+Math.random()*.14;const bar=rounded(head,w,.025,.025,.008,mats.deep,[x,y,z],2);bar.rotation.z=(Math.random()-.5)*.45}
  for(let i=0;i<8;i++){const x=(Math.random()-.5)*1.05,z=-.65+Math.random()*.5;rounded(head,.025,.025,.13+Math.random()*.12,.008,mats.deep,[x,.716,z],2)}
  // Rounded rectangular ring cut-out, extruded with a hole.
  function roundedRectPath(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s}
  const ringShape=roundedRectPath(1.5,1.44,.3);const hole=roundedRectPath(1.08,1.02,.2);ringShape.holes.push(new THREE.Path(hole.getPoints(12).reverse().map(p=>new THREE.Vector2(p.x,p.y))));
  const ringGeo=new THREE.ExtrudeGeometry(ringShape,{depth:.1,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.03,bevelThickness:.03,curveSegments:10});const ring=new THREE.Mesh(ringGeo,ringMat);ring.position.set(0,0,.6);ring.castShadow=true;head.add(ring);
  // Inner pale bezel and glossy screen.
  const bezelShape=roundedRectPath(1.08,1.02,.2);const bezelHole=roundedRectPath(.91,.85,.15);bezelShape.holes.push(new THREE.Path(bezelHole.getPoints(10).reverse().map(p=>new THREE.Vector2(p.x,p.y))));const bezel=new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape,{depth:.045,bevelEnabled:true,bevelSegments:2,bevelSize:.012,bevelThickness:.012,curveSegments:8}),mats.light);bezel.position.set(0,0,.627);head.add(bezel);
  rounded(head,.91,.85,.05,.02,faceMat,[0,0,.66],7);
  // Cylindrical ears with pale caps; curved dark right-side cable.
  for(const side of [-1,1]){cylinder(head,.22,.22,.2,mats.joint,[side*.79,0,0],[0,0,Math.PI/2]);cylinder(head,.16,.16,.035,mats.light,[side*.91,0,0],[0,0,Math.PI/2]);ball(head,.045,mats.deep,[side*.95,0,.04])}
  torus(head,.22,.035,mats.joint,[.88,-.3,-.08],[Math.PI/2,0,0],Math.PI*1.2);
  // Pedestal beneath the feet and soft receiving floor.
  rounded(robot,1.7,1.6,1.7,.08,mats.pedestal,[0,-2.22,0],2);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.03;floor.receiveShadow=true;scene.add(floor);


  /* ── motion: scroll (smoothed) + pointer + idle breathing ── */
  let progressFn = getProgress || (() => 0);
  let smoothedP = 0;
  let frame = 0;
  let mouseX = 0, mouseY = 0, pointerX = 0, pointerY = 0;
  let raf = 0, running = false, active = false, compiled = false, lastW = 0, lastH = 0;
  let firstFrameCb = null;

  const onPointer = (e) => {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  };

  const fit = () => {
    const w = W(), h = H();
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const loopOn = () => {
    running = active && compiled && !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(drawLoop);
  };
  const onVisibility = () => loopOn();
  document.addEventListener("visibilitychange", onVisibility);

  function drawLoop(now) {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(drawLoop);
    fit();
    const target = clamp(progressFn() || 0, 0, 2);
    const moving = Math.abs(target - smoothedP) > 0.002 || Math.abs(pointerX - mouseX) + Math.abs(pointerY - mouseY) > 0.004;
    smoothedP += (target - smoothedP) * 0.08;
    mouseX += (pointerX - mouseX) * 0.06;
    mouseY += (pointerY - mouseY) * 0.06;
    // only the slow idle breathing is left → draw every other frame (≈30 fps), saves half the GPU work
    frame++;
    if (!moving && blinkStart === 0 && faceAlpha >= faceTarget && frame % 2 && !firstFrameCb) return;

    const seg = smoothedP < 1 ? 0 : 1;
    const a = STATES[seg], b = STATES[seg + 1];
    const t = easeCubic(clamp(smoothedP < 1 ? smoothedP : smoothedP - 1, 0, 1));
    let z = lerp(a.z, b.z, t);
    const camY = lerp(a.y, b.y, t);
    const lookY = lerp(a.look, b.look, t);
    if (W() <= 900) z *= 1.25;
    camera.position.set(mouseX * 0.25, camY - mouseY * 0.1, z);
    camera.lookAt(0, lookY, 0);

    const seconds = now / 1000;
    bodyRoot.position.y = 0.62 + Math.sin(seconds * 1.4) * 0.02;
    bodyRoot.rotation.y = lerp(a.yaw, b.yaw, t) + mouseX * 0.12;
    head.rotation.y = lerp(a.hy, b.hy, t) + mouseX * 0.45 + Math.sin(seconds * 0.9) * 0.008;
    head.rotation.x = lerp(a.hp, b.hp, t) + mouseY * 0.18 + Math.sin(seconds * 0.9) * 0.02;
    head.rotation.z = lerp(a.hr, b.hr, t) + Math.sin(seconds * 0.7) * 0.02;
    const narrow = W() <= 767;
    armParts.forEach(({ upper, fore, side }) => {
      upper.rotation.x = Math.sin(seconds * 1.4 + side) * 0.05;
      fore.rotation.x = Math.sin(seconds * 1.4 + side) * 0.06;
      // phones: the left forearm normally swings out over the copy; bring that hand in beside the body
      if (side < 0) {
        const foreZ = narrow ? 0.22 : -0.35;
        const upperZ = narrow ? -0.04 : -0.16;
        fore.rotation.z += (foreZ - fore.rotation.z) * 0.15;
        upper.rotation.z += (upperZ - upper.rotation.z) * 0.15;
      }
    });

    const quoteMode = smoothedP > QUOTE_AT;
    if ((quoteMode && faceMode !== "quote") || (!quoteMode && faceMode !== "eyes")) {
      faceMode = quoteMode ? "quote" : "eyes";
      faceAlpha = 0;
      faceTarget = 1;
    }
    if (faceAlpha < faceTarget) {
      faceAlpha = Math.min(faceTarget, faceAlpha + 0.05);
      drawFace();
    }
    if (faceMode === "eyes") {
      if (now > blinkAt && blinkStart === 0) blinkStart = now;
      if (blinkStart) {
        const q = (now - blinkStart) / 180;
        if (q < 0.5) blinkScale = 1 - 0.9 * (q * 2);
        else if (q < 1) blinkScale = 0.1 + 0.9 * ((q - 0.5) * 2);
        else {
          blinkScale = 1;
          blinkStart = 0;
          blinkAt = now + 2500 + Math.random() * 3000;
        }
        drawFace();
      }
    }
    renderer.render(scene, camera);
    if (firstFrameCb) {
      const cb = firstFrameCb;
      firstFrameCb = null;
      cb();
    }
  }

  /* Shaders compile in the background (parallel where the GPU supports it), then one warm-up render
     builds the shadow-map programs too – all before the robot is ever shown. */
  let disposed = false;
  const compile = typeof renderer.compileAsync === "function" ? renderer.compileAsync(scene, camera) : Promise.resolve();
  const whenReady = compile
    .catch(() => {})
    .then(() => {
      if (disposed) return;
      fit();
      renderer.render(scene, camera);
      compiled = true;
      loopOn();
    });

  return {
    whenReady,
    /** start drawing (About is open); the camera jumps straight to the current scroll position */
    resume(fn, onFirstFrame) {
      progressFn = fn || progressFn;
      smoothedP = clamp(progressFn() || 0, 0, 2);
      lastW = lastH = 0; // re-fit to the canvas' new place in the page
      firstFrameCb = onFirstFrame || null;
      if (!active) window.addEventListener("pointermove", onPointer, { passive: true });
      active = true;
      loopOn();
    },
    /** stop drawing (About closed); everything stays built for next time */
    pause() {
      active = false;
      firstFrameCb = null;
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    },
    dispose() {
      disposed = true;
      active = false;
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((mat) => {
          Object.values(mat).forEach((v) => v && v.isTexture && v.dispose());
          mat.dispose();
        });
      });
      env.texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
