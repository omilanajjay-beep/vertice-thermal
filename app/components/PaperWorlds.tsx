'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

type Point = { p: number; pos: [number, number, number]; look: [number, number, number] };
type FlightPoint = { p: number; pos: [number, number, number] };
type SceneHandles = { renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; scene: THREE.Scene; composer: EffectComposer; finish: ShaderPass };

const cameraTrack: Point[] = [
  { p: 0, pos: [0, 5.8, 8.8], look: [0, 0.8, -4] },
  { p: 0.1, pos: [0, 4.3, 5.4], look: [0, 1.1, -8] },
  { p: 0.23, pos: [0, 3.5, -10], look: [0, 2.3, -20] },
  { p: 0.36, pos: [0, 3.1, -30], look: [0, 2.7, -41] },
  { p: 0.5, pos: [0, 3.1, -50], look: [0, 2.8, -61] },
  { p: 0.63, pos: [0, 3.2, -72], look: [0, 2.8, -84] },
  { p: 0.71, pos: [0, 3.4, -89], look: [0, 3.1, -101] },
  { p: 0.77, pos: [0, 3.8, -104], look: [0, 4.2, -116] },
  { p: 0.84, pos: [0, 4.4, -122], look: [0, 5.1, -135] },
  { p: 0.93, pos: [0, 4.6, -143], look: [0, 4.2, -156] },
  { p: 1, pos: [0, 5.4, -165], look: [0, 5.3, -178] },
];
const planeTrack: FlightPoint[] = [
  { p: 0, pos: [0, 0.28, 0] },
  { p: 0.1, pos: [0, 0.75, -5] },
  { p: 0.23, pos: [0.15, 2.15, -18] },
  { p: 0.36, pos: [-0.4, 2.8, -38] },
  { p: 0.5, pos: [0.35, 3.05, -59] },
  { p: 0.63, pos: [-0.35, 3.05, -80] },
  { p: 0.71, pos: [0, 3.28, -94] },
  { p: 0.77, pos: [0.2, 3.75, -109] },
  { p: 0.84, pos: [-0.25, 4.1, -127] },
  { p: 0.93, pos: [0.35, 4.25, -150] },
  { p: 1, pos: [0, 5.1, -173] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };

function sampleTrack<T extends Point | FlightPoint>(progress: number, track: T[], field: 'pos' | 'look') {
  let index = 0;
  while (index < track.length - 2 && progress > track[index + 1].p) index += 1;
  const a = track[index];
  const b = track[index + 1];
  const t = smooth((progress - a.p) / Math.max(0.0001, b.p - a.p));
  const from = field === 'look' ? (a as Point).look : a.pos;
  const to = field === 'look' ? (b as Point).look : b.pos;
  return new THREE.Vector3(
    THREE.MathUtils.lerp(from[0], to[0], t),
    THREE.MathUtils.lerp(from[1], to[1], t),
    THREE.MathUtils.lerp(from[2], to[2], t),
  );
}

function makePaintTexture(base: string, palette: string[], seed: number, mode: 'paper' | 'wood' | 'bark' | 'wash' | 'water' = 'wash') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext('2d');
  if (!context) return null;
  let state = seed >>> 0;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const wash = context.createRadialGradient(250, 180, 30, 380, 360, 740);
  wash.addColorStop(0, 'rgba(255,255,255,.18)');
  wash.addColorStop(1, 'rgba(28,35,32,.11)');
  context.fillStyle = wash;
  context.fillRect(0, 0, 768, 768);
  const marks = mode === 'paper' ? 2500 : mode === 'wood' ? 1800 : mode === 'bark' ? 2600 : 1450;
  for (let i = 0; i < marks; i += 1) {
    const color = palette[Math.floor(random() * palette.length)];
    const alpha = (mode === 'paper' ? 0.025 : 0.035) + random() * 0.11;
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.fillStyle = color;
    if (mode === 'wood' || mode === 'bark' || mode === 'water') {
      const x = random() * 768;
      const y = random() * 768;
      context.lineWidth = 0.5 + random() * (mode === 'bark' ? 4 : 2.2);
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + (random() - 0.5) * 25, y + 20, x + (random() - 0.5) * 24, y + 60, x + (random() - 0.5) * 12, y + 90 + random() * 180);
      context.stroke();
    } else {
      const x = random() * 768;
      const y = random() * 768;
      context.beginPath();
      context.ellipse(x, y, 2 + random() * 20, 1 + random() * 7, random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
  if (mode === 'paper') {
    context.globalAlpha = 0.15;
    context.strokeStyle = '#a88962';
    for (let i = 0; i < 85; i += 1) {
      const x = random() * 768; const y = random() * 768;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + 3 + random() * 25, y + (random() - 0.5) * 4); context.stroke();
    }
    context.globalAlpha = 1;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function addBox(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, rotationZ = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.z = rotationZ;
  parent.add(mesh);
  return mesh;
}

function addCloud(parent: THREE.Object3D, x: number, y: number, z: number, scale: number, material: THREE.Material, seed: number) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  let state = seed;
  const random = () => { state = (state * 1103515245 + 12345) >>> 0; return state / 4294967296; };
  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material);
    puff.position.set((random() - 0.5) * 2.3, (random() - 0.5) * 0.72, (random() - 0.5) * 0.42);
    puff.scale.set(scale * (0.53 + random() * 0.65), scale * (0.43 + random() * 0.42), scale * (0.45 + random() * 0.43));
    group.add(puff);
  }
  parent.add(group);
  return group;
}

function makeTriangle(points: number[], material: THREE.Material, parent: THREE.Object3D) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function createPaperPlane(paper: THREE.Material, fold: THREE.Material) {
  const group = new THREE.Group();
  group.name = 'folded paper plane';
  // Two broad folded wings meet at a raised central crease and taper into the dart's nose.
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.025, 0.04, 0.04);
    const s = side;
    makeTriangle([
      0, 0.1, -1.72, s * 1.19, -0.03, -0.2, s * 0.69, 0.01, 0.98,
      0, 0.1, -1.72, s * 0.69, 0.01, 0.98, 0, 0.13, 1.14,
    ], paper, wing);
    makeTriangle([
      0, 0.1, -1.72, s * 0.66, 0.04, -0.62, s * 1.19, -0.03, -0.2,
    ], fold, wing);
    group.add(wing);
    (group.userData.wings ??= []).push({ wing, side });
  }
  makeTriangle([0, 0.11, -1.72, 0, 0.28, -1.38, 0, 0.13, 1.14], fold, group);
  makeTriangle([-0.35, 0.03, 0.66, 0, 0.18, 1.34, 0.35, 0.03, 0.66], paper, group);
  const crease = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.29, -1.35), new THREE.Vector3(0, 0.145, 1.12),
  ]), new THREE.LineBasicMaterial({ color: '#a88661', transparent: true, opacity: 0.62 }));
  group.add(crease);
  group.scale.setScalar(0.86);
  return group;
}

function createScene(mount: HTMLDivElement, lowQuality: boolean): SceneHandles {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c8e5e1');
  scene.fog = new THREE.Fog('#c8e5e1', 20, 65);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? 1.05 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.appendChild(renderer.domElement);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!lowQuality) composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.16, 0.7, 0.91));
  composer.addPass(new OutputPass());
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, mood: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float mood; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
        float lum=dot(c,vec3(.299,.587,.114));
        c=mix(vec3(lum),c,.87); c=mix(c,c*vec3(1.045,1.015,.965),.5);
        vec2 uv=vUv-.5; float vig=1.-dot(uv*vec2(.83,1.),uv*vec2(.83,1.))*.32;
        float grain=(hash(gl_FragCoord.xy+floor(time*12.))-.5)*.027;
        c=c*vig+grain; gl_FragColor=vec4(c,1.); }`,
  });
  composer.addPass(finish);

  const skyLight = new THREE.HemisphereLight('#f8f3df', '#35564b', 2.1);
  scene.add(skyLight);
  const sun = new THREE.DirectionalLight('#ffe4b6', 2.3);
  sun.position.set(-7, 12, 8);
  scene.add(sun);
  const forestFill = new THREE.DirectionalLight('#8fbbb1', 0.7);
  forestFill.position.set(6, 6, -25);
  scene.add(forestFill);
  const glimmer = new THREE.PointLight('#fff1cf', 2.1, 24, 1.7);
  glimmer.position.set(-3, 5, -61);
  scene.add(glimmer);

  const paperTexture = makePaintTexture('#f0e4ca', ['#fff4dc', '#d9c6a4', '#b8a27e'], 28409, 'paper');
  const woodTexture = makePaintTexture('#a46d44', ['#d4a578', '#724c36', '#573c31', '#efc08c'], 62105, 'wood');
  const barkTexture = makePaintTexture('#34483a', ['#718163', '#243c35', '#a08b68', '#1d332e'], 102401, 'bark');
  const leafTexture = makePaintTexture('#78975e', ['#a8b77c', '#566f50', '#dfc58b', '#718d61'], 9128, 'wash');
  const waterTexture = makePaintTexture('#a9d8d4', ['#f4fff2', '#b6e4df', '#73b3b4'], 55073, 'water');
  const cliffTexture = makePaintTexture('#c2c5b9', ['#edf0da', '#7f9c97', '#b1b698', '#748b88'], 38001, 'bark');
  const shingleTexture = makePaintTexture('#bf825e', ['#e3ba8b', '#9e654c', '#daa37a', '#f0c697'], 39219, 'wood');
  const paperMat = new THREE.MeshStandardMaterial({ color: '#fff5df', map: paperTexture, roughness: 0.94, side: THREE.DoubleSide, emissive: '#ead9b8', emissiveIntensity: 0.23 });
  const paperFold = new THREE.MeshStandardMaterial({ color: '#d5c2a0', map: paperTexture, roughness: 0.95, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#bb895e', map: woodTexture, roughness: 0.94 });
  const barkMat = new THREE.MeshStandardMaterial({ color: '#766b52', map: barkTexture, roughness: 1 });
  const leafMats = ['#436f54', '#64835c', '#8c9a65', '#b09e68', '#345c50'].map((color) => new THREE.MeshStandardMaterial({ color, map: leafTexture, roughness: 1 }));
  const stoneMats = ['#514f4b', '#66615a', '#797066'].map((color) => new THREE.MeshStandardMaterial({ color, map: barkTexture, roughness: 0.98 }));
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fffdf1', map: paperTexture, emissive: '#f5ead3', emissiveIntensity: 0.16, roughness: 1, transparent: true, opacity: 0.92 });

  // A single sun-warmed table transitions into a painted meadow under the same flight path.
  const table = new THREE.Mesh(new THREE.BoxGeometry(13, 0.48, 10), woodMat);
  table.position.set(0, -0.24, 0.6);
  scene.add(table);
  const tableEdge = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.16, 0.24), new THREE.MeshStandardMaterial({ color: '#604333', roughness: 1 }));
  tableEdge.position.set(0, -0.24, -4.4);
  scene.add(tableEdge);
  for (let i = 0; i < 13; i += 1) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 9.9), new THREE.MeshStandardMaterial({ color: '#7d573e', transparent: true, opacity: 0.34 }));
    seam.position.set(-6 + i, 0.004, 0.6);
    scene.add(seam);
  }
  // Paper stack and pencil anchor the first tableau beside the resting plane.
  for (let i = 0; i < 4; i += 1) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.7 - i * 0.045, 0.045, 3.2 - i * 0.06), i % 2 ? paperFold : paperMat);
    sheet.position.set(2.5 + i * 0.01, 0.025 + i * 0.047, 1.3 - i * 0.035);
    sheet.rotation.y = 0.055 * (i - 1);
    scene.add(sheet);
  }
  const pencilMat = new THREE.MeshStandardMaterial({ color: '#d88650', roughness: 0.73 });
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 2.8, 8), pencilMat);
  pencil.rotation.z = Math.PI / 2;
  pencil.position.set(2.8, 0.16, -1.25);
  scene.add(pencil);
  const pencilTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.19, 8), new THREE.MeshStandardMaterial({ color: '#493a31', roughness: 1 }));
  pencilTip.rotation.z = -Math.PI / 2;
  pencilTip.position.set(4.27, 0.16, -1.25);
  scene.add(pencilTip);
  const plane = createPaperPlane(paperMat, paperFold);
  plane.position.set(0, 0.16, 0);
  scene.add(plane);

  // Meadow ground, a pale footpath, daisies and the little cottage.
  const meadowMat = new THREE.MeshStandardMaterial({ color: '#8da36e', map: leafTexture, roughness: 1, side: THREE.DoubleSide });
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(55, 61, 12, 20), meadowMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -0.92, -22.4);
  scene.add(meadow);
  const pathMat = new THREE.MeshStandardMaterial({ color: '#d7c8a8', roughness: 1, side: THREE.DoubleSide });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 47), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, -0.89, -29.5);
  scene.add(path);
  const cottage = new THREE.Group();
  cottage.position.set(4.1, -0.1, -13.8);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#ead9b5', map: paperTexture, roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#edc29b', map: shingleTexture, roughness: 1, side: THREE.DoubleSide });
  addBox(cottage, [2.8, 2.1, 2.5], [0, 1.04, 0], wallMat);
  makeTriangle([-1.55, 2.04, 1.31, 1.55, 2.04, 1.31, 0, 3.28, 1.31], roofMat, cottage);
  makeTriangle([-1.55, 2.04, -1.31, 0, 3.28, -1.31, 1.55, 2.04, -1.31], roofMat, cottage);
  const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(1.77, 0.14, 2.8), roofMat);
  roofLeft.position.set(-0.68, 2.66, 0); roofLeft.rotation.z = 0.68; cottage.add(roofLeft);
  const roofRight = new THREE.Mesh(new THREE.BoxGeometry(1.77, 0.14, 2.8), roofMat);
  roofRight.position.set(0.68, 2.66, 0); roofRight.rotation.z = -0.68; cottage.add(roofRight);
  const doorMat = new THREE.MeshStandardMaterial({ color: '#6b5945', roughness: 1 });
  addBox(cottage, [0.58, 1.15, 0.07], [0, 0.58, 1.29], doorMat);
  const windowMat = new THREE.MeshStandardMaterial({ color: '#9ec4bf', emissive: '#537c7b', emissiveIntensity: 0.22, roughness: 0.55 });
  for (const x of [-0.9, 0.9]) {
    addBox(cottage, [0.48, 0.47, 0.075], [x, 1.2, 1.3], windowMat);
    addBox(cottage, [0.055, 0.52, 0.1], [x, 1.2, 1.35], doorMat);
    addBox(cottage, [0.52, 0.045, 0.1], [x, 1.2, 1.36], doorMat);
  }
  addBox(cottage, [0.43, 1.0, 0.5], [0.9, 2.65, -0.55], roofMat);
  scene.add(cottage);
  const smokePuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24 + i * 0.04, 12, 10), new THREE.MeshBasicMaterial({ color: '#f5eee1', transparent: true, opacity: 0.34 - i * 0.04 }));
    puff.position.set(5.05 + Math.sin(i) * 0.18, 3.25 + i * 0.5, -14.1 - i * 0.06);
    puff.scale.set(1, 0.82, 0.68);
    scene.add(puff); smokePuffs.push(puff);
  }

  // Soft hills and wildflowers are created from a small reusable set of meshes.
  const hillMat = new THREE.MeshStandardMaterial({ color: '#72866a', map: leafTexture, roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i += 1) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), hillMat);
    hill.scale.set(8 + i * 1.3, 1.05 + (i % 2) * 0.4, 3.8);
    hill.position.set((i % 2 ? -1 : 1) * (14 + (i % 3)), -0.8, -28 - i * 3.7);
    scene.add(hill);
  }
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: '#718659', roughness: 1 });
  const flowerMats = ['#fff4df', '#e9ab78', '#f6d789'].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  let randomState = 73421;
  const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  const instance = new THREE.Object3D();
  const stemInstances = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.022, 1, 5), flowerStemMat, 88);
  const centerInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 8, 6), new THREE.MeshStandardMaterial({ color: '#aa784e', roughness: 1 }), 88);
  const petalInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#fff4df', roughness: 1 }), 88 * 5);
  let petalIndex = 0;
  for (let i = 0; i < 88; i += 1) {
    const x = (random() - 0.5) * 17;
    const z = -22 - random() * 19;
    const height = 0.26 + random() * 0.57;
    instance.position.set(x, -0.35 + height / 2, z); instance.rotation.set(0, 0, 0); instance.scale.set(1, height, 1); instance.updateMatrix(); stemInstances.setMatrixAt(i, instance.matrix);
    instance.position.set(x, -0.35 + height, z); instance.scale.setScalar(1); instance.updateMatrix(); centerInstances.setMatrixAt(i, instance.matrix);
    const bloomColor = flowerMats[Math.floor(random() * flowerMats.length)].color;
    for (let k = 0; k < 5; k += 1) {
      const angle = k * Math.PI * 2 / 5;
      instance.position.set(x + Math.cos(angle) * 0.105, -0.35 + height, z + Math.sin(angle) * 0.105);
      instance.scale.set(0.0735, 0.0266, 0.0434); instance.rotation.set((random() - 0.5) * 0.08, angle, 0); instance.updateMatrix();
      petalInstances.setMatrixAt(petalIndex, instance.matrix); petalInstances.setColorAt(petalIndex, bloomColor); petalIndex += 1;
    }
  }
  stemInstances.instanceMatrix.needsUpdate = true; centerInstances.instanceMatrix.needsUpdate = true; petalInstances.instanceMatrix.needsUpdate = true;
  scene.add(stemInstances, centerInstances, petalInstances);

  // Forest floor and a narrow opening. Tree crowns are loose painted clusters, not flat cutouts.
  const forestFloor = new THREE.Mesh(new THREE.PlaneGeometry(17, 63, 12, 18), new THREE.MeshStandardMaterial({ color: '#30483d', map: barkTexture, roughness: 1, side: THREE.DoubleSide }));
  forestFloor.rotation.x = -Math.PI / 2; forestFloor.position.set(0, -0.62, -68.5); scene.add(forestFloor);
  const forestPath = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 63), new THREE.MeshStandardMaterial({ color: '#857a5c', roughness: 1, side: THREE.DoubleSide }));
  forestPath.rotation.x = -Math.PI / 2; forestPath.position.set(0, -0.56, -68.5); scene.add(forestPath);
  const trunkGeometry = new THREE.CylinderGeometry(0.17, 0.45, 8.5, 8);
  const crownGeometry = new THREE.SphereGeometry(1, 14, 12);
  const forestWinds: THREE.Group[] = [];
  for (let row = 0; row < 15; row += 1) {
    const z = -31 - row * 4.25;
    const gap = row < 3 || row > 13 ? 5.6 : 4.5;
    for (const side of [-1, 1]) {
      const tree = new THREE.Group();
      tree.position.set(side * (gap + random() * 0.7), -0.15, z + (random() - 0.5) * 1.2);
      const trunk = new THREE.Mesh(trunkGeometry, barkMat); trunk.position.y = 3.9; trunk.rotation.z = side * (0.02 + random() * 0.07); tree.add(trunk);
      for (let n = 0; n < 5; n += 1) {
        const crown = new THREE.Mesh(crownGeometry, leafMats[Math.floor(random() * leafMats.length)]);
        crown.position.set((random() - 0.5) * 3.4, 6.2 + random() * 3.1, (random() - 0.5) * 2.5);
        crown.scale.set(1.6 + random() * 1.6, 1.25 + random() * 1.7, 1.25 + random() * 1.6);
        tree.add(crown);
      }
      scene.add(tree); forestWinds.push(tree);
    }
  }
  // Fern fronds: narrow curved strokes and layered leaves near the path.
  const fernMats = ['#507455', '#7d9863', '#a2a36d'].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }));
  const fernLinePositions: number[] = [];
  const fernInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), fernMats[0], 22 * 7 * 5);
  let fernLeafIndex = 0;
  for (let i = 0; i < 22; i += 1) {
    const x = (random() < 0.5 ? -1 : 1) * (1.8 + random() * 4.5);
    const z = -40 - random() * 48;
    for (let f = 0; f < 7; f += 1) {
      const angle = (f / 7) * Math.PI * 2;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(angle) * 0.65, 0.95 + random() * 0.25, Math.sin(angle) * 0.45), new THREE.Vector3(Math.cos(angle) * 1.15, 0.35, Math.sin(angle) * 0.78));
      const stemPoints = curve.getPoints(8);
      for (let pointIndex = 0; pointIndex < stemPoints.length - 1; pointIndex += 1) {
        const a = stemPoints[pointIndex]; const b = stemPoints[pointIndex + 1];
        fernLinePositions.push(x + a.x, -0.48 + a.y, z + a.z, x + b.x, -0.48 + b.y, z + b.z);
      }
      for (let leaf = 1; leaf <= 5; leaf += 1) {
        const t = leaf / 6; const point = curve.getPoint(t);
        instance.position.set(x + point.x + (leaf % 2 ? 1 : -1) * 0.15, -0.45 + point.y, z + point.z);
        instance.scale.set(0.15, 0.033, 0.057); instance.rotation.set(0, angle, 0); instance.updateMatrix();
        fernInstances.setMatrixAt(fernLeafIndex, instance.matrix); fernInstances.setColorAt(fernLeafIndex, fernMats[(f + leaf) % fernMats.length].color); fernLeafIndex += 1;
      }
    }
  }
  const fernLineGeometry = new THREE.BufferGeometry();
  fernLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fernLinePositions, 3));
  scene.add(new THREE.LineSegments(fernLineGeometry, new THREE.LineBasicMaterial({ color: '#536d4d', transparent: true, opacity: 0.8 })), fernInstances);
  fernInstances.instanceMatrix.needsUpdate = true;
  const mushroomStem = new THREE.MeshStandardMaterial({ color: '#e5d5bc', roughness: 1 });
  const mushroomCap = new THREE.MeshStandardMaterial({ color: '#c77655', roughness: 0.92 });
  const mushroomStemInstances = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.08, 1, 8), mushroomStem, 28);
  const mushroomCapInstances = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mushroomCap, 28);
  for (let i = 0; i < 28; i += 1) {
    const x = (random() < 0.5 ? -1 : 1) * (2 + random() * 5);
    const z = -39 - random() * 49;
    const h = 0.18 + random() * 0.3;
    instance.position.set(x, -0.46 + h / 2, z); instance.rotation.set(0, 0, 0); instance.scale.set(1, h, 1); instance.updateMatrix(); mushroomStemInstances.setMatrixAt(i, instance.matrix);
    const radius = 0.2 + random() * 0.11; instance.position.set(x, -0.46 + h, z); instance.rotation.set(0, 0, 0); instance.scale.set(radius, radius * 0.55, radius); instance.updateMatrix(); mushroomCapInstances.setMatrixAt(i, instance.matrix);
  }
  mushroomStemInstances.instanceMatrix.needsUpdate = true; mushroomCapInstances.instanceMatrix.needsUpdate = true;
  scene.add(mushroomStemInstances, mushroomCapInstances);

  // A faceted stone arch frames the reveal; the camera and steering contract while passing through.
  const archZ = -98.8;
  const archCenterY = 3.05;
  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.15, 1.8), stoneMats[side === -1 ? 0 : 1]);
    pier.position.set(side * 3.05, 1.42, archZ); scene.add(pier);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.46, 2.2), stoneMats[2]); foot.position.set(side * 3.05, 0.16, archZ); scene.add(foot);
  }
  const archRadius = 3.02;
  for (let i = 0; i <= 12; i += 1) {
    const angle = Math.PI * (i / 12);
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.88, 1.95), stoneMats[i % stoneMats.length]);
    block.position.set(Math.cos(angle) * archRadius, archCenterY + Math.sin(angle) * archRadius, archZ);
    block.rotation.z = angle + Math.PI / 2;
    scene.add(block);
  }
  const archShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 5.7), new THREE.MeshBasicMaterial({ color: '#182323', transparent: true, opacity: 0.47, side: THREE.DoubleSide }));
  archShadow.position.set(0, 2.85, archZ - 0.28); scene.add(archShadow);

  // Painted sky cliffs, tall columns, waterfall ribbons, cloud-sea and distant mountain silhouettes.
  const cliffMats = ['#819d95', '#a1afa0', '#c9b68d', '#76989c'].map((color) => new THREE.MeshStandardMaterial({ color, map: cliffTexture, emissive: '#486c69', emissiveIntensity: 0.11, roughness: 1 }));
  for (let i = 0; i < 13; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -118 - Math.floor(i / 2) * 4.8 + (random() - 0.5) * 2;
    const height = 10 + random() * 9;
    const radius = 1.6 + random() * 1.35;
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius, height, 7, 1), cliffMats[Math.floor(random() * cliffMats.length)]);
    cliff.position.set(side * (6.3 + random() * 2.5), height / 2 - 0.15, z);
    cliff.rotation.z = (random() - 0.5) * 0.12; scene.add(cliff);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.6, 0.8, 7), cliffMats[Math.floor(random() * cliffMats.length)]);
    cap.position.set(cliff.position.x, height - 0.1, z); cap.rotation.y = 0.2; scene.add(cap);
  }
  const beamCanvas = document.createElement('canvas'); beamCanvas.width = 64; beamCanvas.height = 256;
  const beamContext = beamCanvas.getContext('2d')!;
  const crossFade = beamContext.createLinearGradient(0, 0, 64, 0);
  crossFade.addColorStop(0, 'black'); crossFade.addColorStop(0.45, 'white'); crossFade.addColorStop(0.55, 'white'); crossFade.addColorStop(1, 'black');
  beamContext.fillStyle = crossFade; beamContext.fillRect(0, 0, 64, 256);
  const endFade = beamContext.createLinearGradient(0, 0, 0, 256);
  endFade.addColorStop(0, 'rgba(0,0,0,1)'); endFade.addColorStop(0.3, 'rgba(0,0,0,0)'); endFade.addColorStop(0.8, 'rgba(0,0,0,0)'); endFade.addColorStop(1, 'rgba(0,0,0,1)');
  beamContext.fillStyle = endFade; beamContext.fillRect(0, 0, 64, 256);
  const beamTexture = new THREE.CanvasTexture(beamCanvas);
  const waterfallMats: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 3; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color: i === 1 ? '#eff8e8' : '#b5e3dc', map: waterTexture, alphaMap: beamTexture, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
    waterfallMats.push(mat);
    const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + i * 0.35, 9.4), mat);
    waterfall.position.set((i % 2 ? -1 : 1) * 6.5, 4.25, -127 - i * 8); scene.add(waterfall);
  }
  const cloudSea: THREE.Group[] = [];
  for (let i = 0; i < 34; i += 1) {
    const cloud = addCloud(scene, (random() - 0.5) * 27, -1.15 + random() * 1.6, -117 - random() * 55, 1.1 + random() * 2.4, cloudMat, 500 + i * 11);
    cloudSea.push(cloud);
  }
  const mountainMat = new THREE.MeshStandardMaterial({ color: '#a1bbb5', map: cliffTexture, roughness: 1, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i += 1) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(7 + random() * 7, 15 + random() * 12, 5), mountainMat);
    mountain.position.set((i - 3) * 8.7, 5.5, -177 - random() * 8);
    mountain.rotation.y = random() * 1.1; scene.add(mountain);
  }
  // Fine white bird silhouettes high above the valley.
  const birds: THREE.Group[] = [];
  for (let i = 0; i < 9; i += 1) {
    const bird = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: '#485858', transparent: true, opacity: 0.72 });
    const left = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.32, 0.12, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.34, 0.13, 0)]), lineMat);
    bird.add(left); bird.position.set((random() - 0.5) * 18, 6 + random() * 7, -124 - random() * 40); bird.scale.setScalar(0.5 + random() * 1.1); scene.add(bird); birds.push(bird);
  }
  // The last passage is a soft, luminous cloud bank rather than a hard cut.
  const finalClouds: THREE.Group[] = [];
  for (let i = 0; i < 11; i += 1) {
    finalClouds.push(addCloud(scene, (i - 5) * 2.65, 4 + random() * 7, -176 + (random() - 0.5) * 4, 2 + random() * 2.7, cloudMat, 800 + i * 91));
  }
  const highClouds = [
    addCloud(scene, -9, 14, 1, 3.4, cloudMat, 988), addCloud(scene, 7, 16, -8, 4.0, cloudMat, 1001),
    addCloud(scene, 14, 12, 3, 2.6, cloudMat, 1109), addCloud(scene, -16, 12, -10, 3.2, cloudMat, 1219),
  ];

  // Floating pollen motes drift through the forest and catch the painted shafts of light.
  const moteCount = 105;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i += 1) {
    motePositions[i * 3] = (random() - 0.5) * 10;
    motePositions[i * 3 + 1] = random() * 7;
    motePositions[i * 3 + 2] = -35 - random() * 58;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: '#f6e8a8', size: 0.07, transparent: true, opacity: 0.85, sizeAttenuation: true }));
  scene.add(motes);
  // Gentle shafts are translucent tapered planes angled into the forest floor.
  const shaftMat = new THREE.MeshBasicMaterial({ color: '#f7eac1', alphaMap: beamTexture, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 6; i += 1) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 11), shaftMat);
    shaft.position.set(-4.8 + i * 1.8, 5.4, -59 - i * 3.5); shaft.rotation.y = -0.17 + i * 0.05; shaft.rotation.x = 0.16; shaft.rotation.z = -0.32; scene.add(shaft);
  }

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, bounds.width); const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });
  // References used by the animation loop are deliberately attached to scene.userData for disposal-free updates.
  scene.userData.paperJourney = { plane, smokePuffs, forestWinds, waterfallMats, cloudSea, birds, finalClouds, highClouds, motes, skyLight, sun, glimmer, shaftMat };
  scene.userData.cleanupResize = () => window.removeEventListener('resize', resize);
  return { renderer, camera, scene, composer, finish };
}

function chapterFor(progress: number) {
  if (progress < 0.13) return 'A quiet beginning';
  if (progress < 0.37) return 'The Meadow';
  if (progress < 0.74) return 'The Enchanted Forest';
  if (progress < 0.97) return 'The Sky Cliffs';
  return 'A cloud-soft ending';
}

export default function PaperWorlds() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState('A quiet beginning');
  const [failed, setFailed] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const controlsRef = useRef({ pointerX: 0, pointerY: 0, targetX: 0, targetY: 0, mode: 'scroll', frozen: 0, demoStart: 0, introStart: 0, isUiVisible: true });

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const mount = mountRef.current;
    const controls = controlsRef.current;
    const params = new URLSearchParams(window.location.search);
    const low = params.get('q') === 'low';
    const hiddenUI = params.get('ui') === '0';
    const pParam = params.get('p');
    const tParam = params.get('t');
    setLowQuality(low); setUiVisible(!hiddenUI); controls.isUiVisible = !hiddenUI;
    const parsedP = pParam !== null ? Number(pParam) : NaN;
    const parsedT = tParam !== null ? Number(tParam) : NaN;
    if (pParam !== null || tParam !== null) {
      controls.mode = 'freeze';
      controls.frozen = Number.isFinite(parsedP) ? clamp(parsedP, 0, 1) : Number.isFinite(parsedT) ? clamp(parsedT / 13.6, 0, 1) : 0.5;
    } else if (params.get('demo') === '1') {
      controls.mode = 'demo'; controls.demoStart = performance.now();
    }
    controls.introStart = performance.now();

    let handles: SceneHandles;
    try {
      handles = createScene(mount, low);
    } catch (error) {
      console.error('Paper Worlds could not initialize WebGL.', error);
      setFailed(true);
      return undefined;
    }
    const { renderer, camera, scene, composer, finish } = handles;
    const objects = scene.userData.paperJourney as {
      plane: THREE.Group; smokePuffs: THREE.Mesh[]; forestWinds: THREE.Group[]; waterfallMats: THREE.MeshBasicMaterial[];
      cloudSea: THREE.Group[]; birds: THREE.Group[]; finalClouds: THREE.Group[]; highClouds: THREE.Group[];
      motes: THREE.Points; skyLight: THREE.HemisphereLight; sun: THREE.DirectionalLight; glimmer: THREE.PointLight; shaftMat: THREE.MeshBasicMaterial;
    };
    const mouse = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      controls.targetX = clamp((event.clientX / Math.max(window.innerWidth, 1) * 2) - 1, -1, 1);
      controls.targetY = clamp(1 - (event.clientY / Math.max(window.innerHeight, 1) * 2), -1, 1);
    };
    const onPointerOut = () => { controls.targetX = 0; controls.targetY = 0; };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut, { passive: true });
    let raf = 0;
    let disposed = false;
    let lastChapter = '';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const camPosition = new THREE.Vector3(); const lookPosition = new THREE.Vector3();
    const scenePosition = new THREE.Vector3(); const introPosition = new THREE.Vector3(); const introLook = new THREE.Vector3();
    const planePosition = new THREE.Vector3();
    const palette = [new THREE.Color('#b9d9d4'), new THREE.Color('#305650'), new THREE.Color('#a7d7d4')];
    const fogNear = [15, 8, 14]; const fogFar = [70, 41, 78];
    const white = new THREE.Color('#fffdf8');
    const scrollProgress = () => {
      if (controls.mode === 'freeze') return controls.frozen;
      if (controls.mode === 'demo') return clamp((performance.now() - controls.demoStart) / 13600, 0, 1);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return clamp(window.scrollY / maxScroll, 0, 1);
    };
    const render = (now: number) => {
      if (disposed) return;
      const p = scrollProgress();
      const time = controls.mode === 'freeze' ? controls.frozen * 13.6 : now * 0.001;
      const chapterLabel = chapterFor(p);
      if (chapterLabel !== lastChapter) { lastChapter = chapterLabel; setChapter(chapterLabel); }
      if (controls.mode !== 'freeze' && !reducedMotion) {
        controls.pointerX += (controls.targetX - controls.pointerX) * 0.055;
        controls.pointerY += (controls.targetY - controls.pointerY) * 0.055;
      } else { controls.pointerX = 0; controls.pointerY = 0; }
      mouse.set(controls.pointerX, controls.pointerY);
      const width = smooth((p - 0.39) / 0.06);
      const treeNarrow = smooth((p - 0.33) / 0.035) * (1 - smooth((p - 0.71) / 0.04));
      const archNarrow = Math.max(0, 1 - Math.abs(p - 0.71) / 0.04);
      const gapNarrow = Math.max(...[0.36, 0.5, 0.63, 0.71].map((passage) => smooth(1 - Math.abs(p - passage) / 0.024)));
      const bound = THREE.MathUtils.lerp(2.65, 3.25, width) * (1 - 0.72 * Math.max(treeNarrow, archNarrow)) * (1 - gapNarrow);
      const camTrack = sampleTrack(p, cameraTrack, 'pos');
      camTrack.y += smooth(p / 0.17) * 1.9;
      const targetTrack = sampleTrack(p, cameraTrack, 'look');
      const introBlend = controls.mode === 'freeze' ? 1 : smooth((now - controls.introStart) / 3000);
      if (introBlend < 1) {
        introPosition.set(0, 17, 20).lerp(new THREE.Vector3(0, 5.8, 8.8), introBlend);
        introLook.set(0, 13.6, -2).lerp(new THREE.Vector3(0, 0.8, -4), introBlend);
        camPosition.copy(introPosition).lerp(camTrack, smooth(p / 0.075));
        lookPosition.copy(introLook).lerp(targetTrack, smooth(p / 0.075));
      } else { camPosition.copy(camTrack); lookPosition.copy(targetTrack); }

      const planeTrackPosition = sampleTrack(p, planeTrack, 'pos');
      // Lateral steering is centered at the current screen pointer, and naturally tightens through the gap and arch.
      planePosition.set(planeTrackPosition.x + controls.pointerX * bound, planeTrackPosition.y + controls.pointerY * 0.46 * (1 - Math.max(treeNarrow, archNarrow) * 0.88) * (1 - gapNarrow), planeTrackPosition.z);
      objects.plane.position.copy(planePosition);
      const previous = sampleTrack(clamp(p - 0.012, 0, 1), planeTrack, 'pos');
      const next = sampleTrack(clamp(p + 0.012, 0, 1), planeTrack, 'pos');
      const curve = next.x - previous.x;
      const wings = (objects.plane.userData.wings ?? []) as { wing: THREE.Group; side: number }[];
      objects.plane.rotation.set(
        clamp(-(next.y - previous.y) * 0.08, -0.12, 0.12) + controls.pointerY * 0.045,
        clamp(curve * 0.09, -0.2, 0.2),
        clamp(-controls.pointerX * 0.15 - curve * 0.055, -0.36, 0.36),
      );
      wings.forEach(({ wing, side }) => { wing.rotation.z = side * (0.016 + Math.sin(time * 2.4 + side) * (reducedMotion ? 0 : 0.018)) + objects.plane.rotation.z * -0.24; });
      camPosition.x += controls.pointerX * bound * 0.24;
      camPosition.y += controls.pointerY * 0.27;
      lookPosition.x += controls.pointerX * bound * 0.14;
      if (controls.mode === 'freeze') camera.position.copy(camPosition);
      else camera.position.lerp(camPosition, 0.12);
      camera.lookAt(lookPosition);

      // Three painterly palettes crossfade along the camera's one continuous track.
      const forestBlend = smooth((p - 0.34) / 0.12);
      const skyBlend = smooth((p - 0.69) / 0.13);
      const meadowToForest = palette[0].clone().lerp(palette[1], forestBlend);
      const finalSky = meadowToForest.lerp(palette[2], skyBlend);
      const fadeToCloud = smooth((p - 0.91) / 0.09);
      finalSky.lerp(white, fadeToCloud * 0.92);
      scene.background = finalSky;
      const fog = scene.fog as THREE.Fog;
      fog.color.copy(finalSky);
      const near = THREE.MathUtils.lerp(THREE.MathUtils.lerp(fogNear[0], fogNear[1], forestBlend), fogNear[2], skyBlend);
      const far = THREE.MathUtils.lerp(THREE.MathUtils.lerp(fogFar[0], fogFar[1], forestBlend), fogFar[2], skyBlend);
      fog.near = THREE.MathUtils.lerp(near, 2, fadeToCloud);
      fog.far = THREE.MathUtils.lerp(far, 26, fadeToCloud);
      objects.skyLight.intensity = THREE.MathUtils.lerp(2.0, 2.45, skyBlend);
      objects.sun.intensity = THREE.MathUtils.lerp(2.35, 2.75, skyBlend);
      objects.glimmer.intensity = 1.6 + Math.sin(time * 0.85) * (reducedMotion ? 0 : 0.28);
      objects.shaftMat.opacity = 0.11 * (1 - smooth((p - 0.66) / 0.05));
      objects.smokePuffs.forEach((puff, index) => {
        if (!reducedMotion && controls.mode !== 'freeze') { puff.position.y += Math.sin(time * 0.8 + index) * 0.0008; puff.position.x += Math.sin(time * 0.47 + index * 2) * 0.0004; }
      });
      if (!reducedMotion && controls.mode !== 'freeze') {
        objects.forestWinds.forEach((tree, index) => { tree.rotation.z = Math.sin(time * 0.38 + index * 0.7) * 0.007; });
        objects.cloudSea.forEach((cloud, index) => { cloud.position.x += Math.sin(time * 0.11 + index) * 0.0007; });
        objects.birds.forEach((bird, index) => { bird.position.x += Math.sin(time * 0.3 + index * 2) * 0.0015; bird.rotation.z = Math.sin(time * 2 + index) * 0.04; });
        objects.finalClouds.forEach((cloud, index) => { cloud.position.x += Math.sin(time * 0.17 + index) * 0.001; });
        objects.highClouds.forEach((cloud, index) => { cloud.position.x += Math.sin(time * 0.12 + index) * 0.001; });
        objects.waterfallMats.forEach((material) => { if (material.map) material.map.offset.y = (time * 0.13) % 1; });
        const positions = objects.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i += 1) {
          const y = positions.getY(i) + 0.002 + Math.sin(time + i) * 0.0008;
          positions.setY(i, y > 7.5 ? 0.1 : y);
        }
        positions.needsUpdate = true;
      }
      finish.uniforms.time.value = controls.mode === 'freeze' ? 0 : time;
      finish.uniforms.mood.value = skyBlend;
      composer.render();
      document.documentElement.style.setProperty('--journey-progress', `${p * 100}%`);
      document.documentElement.style.setProperty('--ending-opacity', `${smooth((p - 0.965) / 0.035)}`);
      if (p !== progressRef.current && Math.abs(p - progressRef.current) > 0.003) { progressRef.current = p; setProgress(p); }
      if (controls.mode === 'demo' && p >= 1) controls.mode = 'freeze', controls.frozen = 1;
      raf = requestAnimationFrame(render);
    };
    const progressRef = { current: -1 };
    raf = requestAnimationFrame(render);
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !disposed && !raf) raf = requestAnimationFrame(render);
      if (document.visibilityState === 'hidden') { cancelAnimationFrame(raf); raf = 0; }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerout', onPointerOut);
      (scene.userData.cleanupResize as (() => void) | undefined)?.();
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        if (renderable.geometry) renderable.geometry.dispose();
        if (renderable.material) {
          const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
          materials.forEach((material) => { const withMap = material as THREE.Material & { map?: THREE.Texture | null }; withMap.map?.dispose(); material.dispose(); });
        }
      });
      composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  const beginJourney = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: maxScroll * 0.105, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const replay = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('p'); params.delete('t');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    controlsRef.current.mode = params.get('demo') === '1' ? 'demo' : 'scroll';
    controlsRef.current.frozen = 0;
    controlsRef.current.demoStart = performance.now();
    controlsRef.current.introStart = performance.now();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
  const ended = progress >= 0.985;
  const chapterIndex = progress < 0.37 ? 0 : progress < 0.74 ? 1 : 2;

  return <>
    <div className="paper-world-canvas" ref={mountRef} aria-hidden="true" />
    {!failed && <>
      <div className="paper-grain" aria-hidden="true" />
      {uiVisible && <div className="journey-ui">
        <header className="world-header">
          <a className="world-mark" href="#journey" aria-label="Paper Worlds home"><span className="paper-plane-mark" /><span>PAPER WORLDS</span></a>
          <span className="header-note">AN INTERACTIVE STORYBOOK <i /> SCROLL TO FLY</span>
        </header>
        {progress < 0.13 && <section className="opening-copy" aria-label="Paper Worlds introduction">
          <span className="tiny-label"><i /> A SMALL WORLD, FOLDED BY HAND</span>
          <h1>Paper<br /><em>Worlds.</em></h1>
          <p>A little flight. A world of wonder.</p>
          <button className="flight-button" onClick={beginJourney}>Begin the journey <span>↗</span></button>
          <span className="scroll-nudge"><span className="nudge-line" /> SCROLL OR MOVE YOUR POINTER TO STEER</span>
        </section>}
        {progress >= 0.13 && !ended && <section className="chapter-copy" key={chapter}>
          <span className="tiny-label"><i /> CHAPTER {chapterIndex + 1} / 03</span>
          <h2>{chapter}</h2>
          <p>{chapterIndex === 0 ? 'A folded wing, a sunlit meadow, and somewhere to go.' : chapterIndex === 1 ? 'Follow the little path where the forest keeps its light.' : 'A breath of open sky, above the clouds.'}</p>
        </section>}
        <div className="journey-progress" aria-label={`Journey progress: ${Math.round(progress * 100)} percent`}>
          <div className="progress-top"><span>YOUR LITTLE FLIGHT</span><span>{String(Math.round(progress * 100)).padStart(2, '0')}%</span></div>
          <div className="progress-rail"><span className="progress-fill" /><i className={`progress-plane ${ended ? 'at-end' : ''}`} /></div>
          <div className="chapter-markers">
            <span className={chapterIndex === 0 ? 'current' : ''}>MEADOW</span>
            <span className={chapterIndex === 1 ? 'current' : ''}>FOREST</span>
            <span className={chapterIndex === 2 ? 'current' : ''}>SKY CLIFFS</span>
          </div>
        </div>
        <span className="pointer-note">A GENTLE NUDGE IS ENOUGH</span>
      </div>}
      {uiVisible && <div className={`ending-screen ${ended ? 'is-visible' : ''}`} aria-hidden={!ended}>
        <span className="ending-kicker">THE WORLD IS YOURS</span>
        <h2>Where will<br /><em>you wander?</em></h2>
        <p>Every great journey begins with a simple fold.</p>
        <button className="flight-button ending-button" onClick={replay}><span className="replay-icon">↻</span> Start my journey</button>
      </div>}
    </>}
    {failed && <div className="webgl-fallback"><span className="tiny-label">PAPER WORLDS</span><h1>Your little flight<br /><em>is waiting.</em></h1><p>This browser couldn’t start the 3D scene. Try opening the page in a browser with WebGL enabled.</p></div>}
    <div className="whiteout" aria-hidden="true" />
    <div className="scroll-space" id="journey" aria-hidden="true" />
  </>;
}
