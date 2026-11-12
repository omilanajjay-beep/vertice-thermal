'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const HOTSPOTS = [
  { id: 'compressor', label: 'Inverter compressor', note: 'Variable output', left: '12%', top: '62%', anchor: [-1.02, 0.16, 0.78], camera: [-3.0, 1.65, 5.5], target: [-0.82, 0.18, 0.12] },
  { id: 'fan', label: 'AeroBlade fan', note: 'Low-noise airflow', left: '55%', top: '30%', anchor: [-0.15, 0.16, 1.02], camera: [0.65, 1.55, 4.35], target: [0.0, 0.18, 0.62] },
  { id: 'exchanger', label: 'Copper core exchanger', note: 'Thermal exchange', left: '70%', top: '62%', anchor: [0.92, 0.1, 0.58], camera: [3.0, 1.55, 4.9], target: [0.92, 0.1, 0.48] },
];

function createSlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#343638';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 28409;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const tileW = 512;
  const tileH = 384;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = col * tileW;
      const y = row * tileH;
      const light = Math.floor(48 + rand() * 14);
      const gradient = ctx.createLinearGradient(x, y, x + tileW, y + tileH);
      gradient.addColorStop(0, `rgb(${light + 4},${light + 5},${light + 7})`);
      gradient.addColorStop(1, `rgb(${light - 8},${light - 7},${light - 5})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6);
      for (let i = 0; i < 900; i += 1) {
        const v = 80 + Math.floor(rand() * 110);
        ctx.fillStyle = `rgba(${v},${v},${v},${0.025 + rand() * 0.045})`;
        const px = x + rand() * tileW;
        const py = y + rand() * tileH;
        ctx.fillRect(px, py, 1 + rand() * 4, 1 + rand() * 2);
      }
      ctx.strokeStyle = 'rgba(10,11,12,.28)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, tileW - 3, tileH - 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.3);
  texture.anisotropy = 8;
  return texture;
}

function createConcreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#565551';
  ctx.fillRect(0, 0, 1024, 1024);
  let seed = 102401;
  const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 18000; i += 1) {
    const gray = 90 + Math.floor(rand() * 85);
    ctx.fillStyle = `rgba(${gray},${gray - 1},${gray - 3},${0.025 + rand() * 0.07})`;
    const x = rand() * 1024;
    const y = rand() * 1024;
    ctx.fillRect(x, y, 1 + rand() * 5, 1 + rand() * 3);
  }
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = `rgba(24,25,26,${0.015 + rand() * 0.02})`;
    ctx.fillRect(rand() * 1024, rand() * 1024, 30 + rand() * 300, 1 + rand() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 2.5);
  texture.anisotropy = 8;
  return texture;
}

function box(width, height, depth, material, position, parent, cast = true, receive = true) {
  const minimum = Math.min(width, height, depth);
  const geometry = minimum > 0.052 ? new RoundedBoxGeometry(width, height, depth, 3, Math.min(0.025, minimum * 0.15)) : new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function createCopperCore(scene, copperMaterial) {
  const group = new THREE.Group();
  const x = 0.92;
  for (let i = 0; i < 8; i += 1) {
    const y = -0.53 + i * 0.15;
    const points = [
      new THREE.Vector3(x - 0.23, y, 0.51),
      new THREE.Vector3(x - 0.23, y + 0.04, 0.54),
      new THREE.Vector3(x - 0.17, y + 0.07, 0.56),
      new THREE.Vector3(x + 0.17, y + 0.07, 0.56),
      new THREE.Vector3(x + 0.23, y + 0.02, 0.54),
      new THREE.Vector3(x + 0.23, y - 0.04, 0.51),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.025, 8, false), copperMaterial);
    group.add(tube);
  }
  scene.add(group);
  return group;
}

export default function Hero3D({ onReady, finish = 'metal' } = {}) {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const targetRef = useRef(new THREE.Vector3(0, 0.2, 0.05));
  const cameraGoalRef = useRef(new THREE.Vector3(3.6, 2.55, 7.35));
  const cameraTweenRef = useRef(null);
  const renderRef = useRef(() => {});
  const pointerRef = useRef(new THREE.Vector2());
  const hotspotRefs = useRef({});
  const reducedMotionRef = useRef(false);
  const dragStateRef = useRef({ angle: 0, velocity: 0, active: false, lastX: 0 });
  const fanRef = useRef(null);
  const telemetryRef = useRef(null);
  const louverRefs = useRef([]);
  const ledRefs = useRef([]);
  const [active, setActive] = useState('fan');

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const mount = mountRef.current;
    const mobile = window.matchMedia('(max-width: 680px), (pointer: coarse)').matches;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    reducedMotionRef.current = reducedMotion;
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog('#11130e', 13, 30);
    const environmentCanvas = document.createElement('canvas');
    environmentCanvas.width = 1024;
    environmentCanvas.height = 512;
    const environmentContext = environmentCanvas.getContext('2d');
    if (environmentContext) {
      const environment = environmentContext.createLinearGradient(0, 0, 0, 512);
      environment.addColorStop(0, '#252820');
      environment.addColorStop(0.42, '#9b9f88');
      environment.addColorStop(0.56, '#55584c');
      environment.addColorStop(1, '#151711');
      environmentContext.fillStyle = environment;
      environmentContext.fillRect(0, 0, 1024, 512);
      [[116, 120, 112, 154], [368, 112, 74, 135], [655, 102, 148, 168], [911, 124, 72, 132]].forEach(([x, y, width, height]) => {
        environmentContext.save();
        environmentContext.shadowColor = 'rgba(236,239,219,.7)';
        environmentContext.shadowBlur = 29;
        environmentContext.fillStyle = 'rgba(242,241,222,.78)';
        environmentContext.fillRect(x, y, width, height);
        environmentContext.restore();
      });
      environmentContext.fillStyle = 'rgba(201,243,72,.28)';
      environmentContext.fillRect(513, 96, 7, 162);
      environmentContext.fillStyle = 'rgba(28,30,23,.7)';
      environmentContext.fillRect(0, 327, 1024, 4);
    }
    const environmentTexture = new THREE.CanvasTexture(environmentCanvas);
    environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
    environmentTexture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = environmentTexture;
    scene.environmentIntensity = 0.8;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(3.6, 2.55, 7.35);
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;
    cameraGoalRef.current.copy(camera.position);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    } catch {
      mount.dataset.webglUnavailable = 'true';
      onReady?.();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2.25));
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    let environmentDisposed = false;
    let studioEnvironment;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader().load('/environments/studio-small-09.hdr', (hdr) => {
      if (environmentDisposed) { hdr.dispose(); return; }
      studioEnvironment = pmrem.fromEquirectangular(hdr);
      scene.environment = studioEnvironment.texture;
      scene.environmentIntensity = finish === 'white' ? 0.65 : 0.9;
      hdr.dispose();
      renderRef.current();
      onReady?.();
    }, undefined, () => { onReady?.(); /* The procedural studio environment remains available offline. */ });
    const ambient = new THREE.HemisphereLight('#f4f3ec', '#1d2023', 0.78);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#f3f2e7', mobile ? 2.7 : 3.1);
    key.position.set(3.5, 6.8, 5.5);
    key.castShadow = !mobile;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 5;
    scene.add(key);
    const coolRim = new THREE.PointLight('#dce9e1', 20, 12, 1.6);
    coolRim.position.set(-4.1, 2.5, 2.2);
    scene.add(coolRim);
    const warmFill = new THREE.PointLight('#e8e5d2', 10, 10, 1.5);
    warmFill.position.set(3.1, 3.2, -0.2);
    scene.add(warmFill);

    const floorMaterial = new THREE.ShadowMaterial({ opacity: finish === 'white' ? 0.2 : 0.34 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 15), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.02;
    floor.receiveShadow = true;
    scene.add(floor);
    const contactCanvas = document.createElement('canvas');
    contactCanvas.width = contactCanvas.height = 128;
    const contactContext = contactCanvas.getContext('2d');
    if (contactContext) {
      const contactGradient = contactContext.createRadialGradient(64, 64, 9, 64, 64, 64);
      contactGradient.addColorStop(0, 'rgba(0,0,0,.62)');
      contactGradient.addColorStop(.5, 'rgba(0,0,0,.25)');
      contactGradient.addColorStop(1, 'rgba(0,0,0,0)');
      contactContext.fillStyle = contactGradient;
      contactContext.fillRect(0, 0, 128, 128);
    }
    const contactTexture = new THREE.CanvasTexture(contactCanvas);
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.9), new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: .78 }));
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -1.009, .05);
    scene.add(contactShadow);

    const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#202319', roughness: 0.62, metalness: 0.34 });
    box(3.45, 0.1, 1.55, plinthMaterial, [0, -0.94, 0.1], scene);
    const footMaterial = new THREE.MeshStandardMaterial({ color: '#17191b', roughness: 0.58, metalness: 0.45 });
    for (const x of [-1.18, 1.18]) {
      box(0.18, 0.17, 0.18, footMaterial, [x, -0.84, 0.12], scene);
    }

    const finishCanvas = document.createElement('canvas');
    finishCanvas.width = 512;
    finishCanvas.height = 512;
    const finishContext = finishCanvas.getContext('2d');
    if (finishContext) {
      finishContext.fillStyle = '#cfcfcf';
      finishContext.fillRect(0, 0, 512, 512);
      let finishSeed = 11821;
      const finishRandom = () => { finishSeed = (finishSeed * 1664525 + 1013904223) >>> 0; return finishSeed / 4294967296; };
      for (let line = 0; line < 620; line += 1) {
        const brightness = 96 + Math.floor(finishRandom() * 92);
        finishContext.strokeStyle = `rgba(${brightness},${brightness},${brightness},${0.04 + finishRandom() * 0.16})`;
        finishContext.lineWidth = 1 + finishRandom() * 2;
        finishContext.beginPath();
        finishContext.moveTo(0, line * 0.83);
        finishContext.lineTo(512, line * 0.83 + (finishRandom() - 0.5) * 1.5);
        finishContext.stroke();
      }
      for (let grain = 0; grain < 3600; grain += 1) {
        const gray = 105 + Math.floor(finishRandom() * 110);
        finishContext.fillStyle = `rgba(${gray},${gray},${gray},${0.018 + finishRandom() * 0.055})`;
        finishContext.fillRect(finishRandom() * 512, finishRandom() * 512, 1 + finishRandom() * 2, 1);
      }
    }
    const finishTexture = new THREE.CanvasTexture(finishCanvas);
    finishTexture.wrapS = finishTexture.wrapT = THREE.RepeatWrapping;
    finishTexture.repeat.set(3, 3);
    const aluminum = new THREE.MeshPhysicalMaterial({ color: finish === 'white' ? '#fafaf2' : '#e0e1d6', roughnessMap: finishTexture, metalness: finish === 'white' ? 0.13 : 0.74, roughness: finish === 'white' ? 0.52 : 0.28, clearcoat: 0.86, clearcoatRoughness: 0.18 });
    const fasciaMaterial = new THREE.MeshStandardMaterial({ color: finish === 'white' ? '#c4c7bb' : '#20241b', metalness: finish === 'white' ? 0.1 : 0.58, roughness: 0.3 });
    const grilleMaterial = new THREE.MeshStandardMaterial({ color: finish === 'white' ? '#f6f7ee' : '#7c8173', metalness: finish === 'white' ? 0.16 : 0.84, roughness: 0.3 });
    const copperMaterial = new THREE.MeshStandardMaterial({ color: '#c77d4e', metalness: 0.82, roughness: 0.23, emissive: '#381c10', emissiveIntensity: 0.12 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#24271e', metalness: 0.68, roughness: 0.35 });

    // Satin aluminum enclosure and folded edges.
    box(3.1, 2.26, 1.42, aluminum, [0, 0.14, 0.0], scene);
    box(3.12, 0.08, 1.47, grilleMaterial, [0, 1.31, 0.0], scene);
    box(3.12, 0.075, 1.47, grilleMaterial, [0, -1.02, 0.0], scene);
    box(0.08, 2.16, 1.47, grilleMaterial, [-1.55, 0.14, 0.0], scene);
    box(0.08, 2.16, 1.47, grilleMaterial, [1.55, 0.14, 0.0], scene);
    box(2.94, 0.035, 1.28, darkMaterial, [0, 1.365, 0.0], scene, false, false);

    // Front intake field and subtle repeated ventilation slats.
    box(2.86, 1.88, 0.055, fasciaMaterial, [0, 0.14, 0.735], scene, false, false);
    for (let i = 0; i < 21; i += 1) {
      const y = -0.76 + i * 0.088;
      box(2.69, 0.017, 0.038, grilleMaterial, [0, y + 0.14, 0.778], scene, false, false);
    }
    for (let i = -5; i <= 5; i += 1) {
      const rib = box(0.018, 1.9, 0.025, grilleMaterial, [i * 0.24, 0.14, 0.784], scene, false, false);
      rib.material = grilleMaterial;
    }
    louverRefs.current = Array.from({ length: 9 }, (_, index) => {
      const louver = box(0.035, 0.042, 1.08, grilleMaterial, [1.596, -0.55 + index * 0.16, 0], scene, false, false);
      louver.rotation.y = Math.sin(index * 0.7) * 0.035;
      return louver;
    });

    // Copper exchanger visible through the open fin field.
    createCopperCore(scene, copperMaterial);

    // Inverter compressor visible through a slim technical side window.
    const compressor = new THREE.Group();
    const compressorShell = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.72, 40), darkMaterial);
    compressorShell.position.set(-1.02, 0.16, 0.28);
    compressorShell.castShadow = true;
    compressor.add(compressorShell);
    const compressorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 40), aluminum);
    compressorCap.rotation.x = Math.PI / 2;
    compressorCap.position.set(-1.02, 0.16, 0.68);
    compressor.add(compressorCap);
    const compressorRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 10, 40), copperMaterial);
    compressorRing.position.set(-1.02, 0.16, 0.71);
    compressor.add(compressorRing);
    scene.add(compressor);

    // Circular grille, motor hub and eight swept blades.
    const fanCenter = new THREE.Vector3(-0.15, 0.16, 0.86);
    const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.027, 14, 72), grilleMaterial);
    fanRing.position.copy(fanCenter);
    scene.add(fanRing);
    const rotor = new THREE.Group();
    rotor.position.copy(fanCenter);
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.035, 0.045);
    bladeShape.bezierCurveTo(0.03, 0.08, 0.23, 0.22, 0.48, 0.59);
    bladeShape.bezierCurveTo(0.56, 0.72, 0.48, 0.75, 0.37, 0.68);
    bladeShape.bezierCurveTo(0.14, 0.53, 0.045, 0.3, -0.035, 0.045);
    const bladeGeometry = new THREE.ShapeGeometry(bladeShape, 20);
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: '#bbc0c0', metalness: 0.83, roughness: 0.24, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i += 1) {
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.rotation.z = i * Math.PI / 4;
      rotor.add(blade);
    }
    scene.add(rotor);
    fanRef.current = rotor;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.18, 40), aluminum);
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(fanCenter).setZ(fanCenter.z + 0.065);
    scene.add(hub);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.19, 32), darkMaterial);
    hubCap.rotation.x = Math.PI / 2;
    hubCap.position.copy(fanCenter).setZ(fanCenter.z + 0.15);
    scene.add(hubCap);
    for (let i = 0; i < 4; i += 1) {
      const spoke = box(0.018, 1.36, 0.03, grilleMaterial, [fanCenter.x, fanCenter.y, fanCenter.z + 0.045], scene, false, false);
      spoke.rotation.z = i * Math.PI / 4;
    }
    for (let ringIndex = 0; ringIndex < 4; ringIndex += 1) {
      const guardRing = new THREE.Mesh(new THREE.TorusGeometry(0.42 + ringIndex * 0.105, 0.009, 8, 72), grilleMaterial);
      guardRing.position.copy(fanCenter).setZ(fanCenter.z + 0.052);
      scene.add(guardRing);
    }
    const fastenerMaterial = new THREE.MeshStandardMaterial({ color: '#c8cbbb', metalness: 0.88, roughness: 0.26 });
    for (const x of [-1.38, 1.38]) {
      for (const y of [-0.91, 1.08]) {
        const fastener = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 20), fastenerMaterial);
        fastener.rotation.x = Math.PI / 2;
        fastener.position.set(x, y, 0.795);
        scene.add(fastener);
      }
    }

    // A satin-metal control plate carries the user's existing VERTICE branding.
    const plate = box(1.06, 0.31, 0.045, darkMaterial, [0.98, 1.105, 0.82], scene, false, false);
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 1600;
    plateCanvas.height = 256;
    const plateContext = plateCanvas.getContext('2d');
    if (plateContext) {
      const brushed = plateContext.createLinearGradient(0, 0, 1600, 256);
      brushed.addColorStop(0, '#35382e');
      brushed.addColorStop(0.52, '#1e211b');
      brushed.addColorStop(1, '#30342a');
      plateContext.fillStyle = brushed;
      plateContext.fillRect(0, 0, 1600, 256);
      for (let line = 0; line < 72; line += 1) {
        plateContext.strokeStyle = `rgba(226,232,205,${line % 3 === 0 ? 0.07 : 0.025})`;
        plateContext.lineWidth = 1;
        plateContext.beginPath();
        plateContext.moveTo(0, line * 3.7);
        plateContext.lineTo(1600, line * 3.7);
        plateContext.stroke();
      }
      plateContext.fillStyle = '#c9f348';
      plateContext.font = '500 25px monospace';
      plateContext.fillText('INVERTER  /  LIVE', 42, 64);
      plateContext.fillStyle = '#eceee2';
      plateContext.font = '500 36px monospace';
      plateContext.fillText('VERTICE THERMAL · Commercial Grade 2026©', 42, 148);
      plateContext.fillStyle = 'rgba(235,238,222,.62)';
      plateContext.font = '400 18px monospace';
      plateContext.fillText('VARIABLE OUTPUT    •    QUIET AIRFLOW    •    SERVICE READY', 43, 202);
    }
    const plateTexture = new THREE.CanvasTexture(plateCanvas);
    plateTexture.colorSpace = THREE.SRGBColorSpace;
    const plateScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.99, 0.158), new THREE.MeshBasicMaterial({ map: plateTexture }));
    plateScreen.position.set(0.98, 1.105, 0.845);
    scene.add(plateScreen);

    // A 1,100-point heat-field mesh is deformed per frame in its GPU vertex shader.
    const particleCount = 1100;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    let seed = 73261;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let index = 0; index < particleCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 0.18 + Math.sqrt(random()) * 1.17;
      particlePositions[index * 3] = Math.cos(angle) * radius;
      particlePositions[index * 3 + 1] = -0.04 + (random() - 0.5) * 1.72;
      particlePositions[index * 3 + 2] = 0.36 + Math.sin(angle) * radius * 0.52;
      particleSeeds[index] = random();
    }
    const telemetryGeometry = new THREE.BufferGeometry();
    telemetryGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    telemetryGeometry.setAttribute('aSeed', new THREE.BufferAttribute(particleSeeds, 1));
    const telemetryMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSeed; uniform float uTime; varying float vSeed; varying float vAlpha; void main(){ vec3 p=position; float phase=uTime*0.82+aSeed*6.28318; p.x+=sin(phase+p.y*2.4)*0.046; p.y+=cos(phase*0.72+p.x*2.2)*0.079; p.z+=sin(phase+p.x*1.7)*0.11; vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp((2.3+2.1*sin(phase))*210.0/-mv.z,1.0,6.5); vSeed=aSeed; vAlpha=0.42+0.36*(0.5+0.5*sin(phase)); }`,
      fragmentShader: `varying float vSeed; varying float vAlpha; void main(){ vec2 q=gl_PointCoord-0.5; float d=length(q); float soft=1.0-smoothstep(0.08,0.5,d); vec3 cold=vec3(0.42,0.72,0.78); vec3 warm=vec3(0.78,0.94,0.28); vec3 tint=mix(cold,warm,smoothstep(0.28,0.78,vSeed)); gl_FragColor=vec4(tint,soft*vAlpha*.18); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const telemetry = new THREE.Points(telemetryGeometry, telemetryMaterial);
    telemetry.renderOrder = 4;
    telemetry.visible = finish !== 'white';
    scene.add(telemetry);
    telemetryRef.current = telemetryMaterial;

    // Restrained lime and warm status indicators show the unit is running.
    const ledMaterial = new THREE.MeshBasicMaterial({ color: '#d9e7cf' });
    ledRefs.current = [-0.95, -0.73, -0.51].map((x, index) => {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.046, 18, 18), ledMaterial.clone());
      led.material.color.set(index === 0 ? '#dcf4d8' : '#c5a880');
      led.position.set(x, 1.08, 0.79);
      scene.add(led);
      const glow = new THREE.PointLight(index === 0 ? '#b5edb2' : '#d8ae70', 0.5, 0.7, 2);
      glow.position.copy(led.position);
      scene.add(glow);
      return { led, glow };
    });

    // Fine floor seams keep the isolated product study grounded.
    const seamMaterial = new THREE.MeshStandardMaterial({ color: '#77736c', roughness: 0.75 });
    for (let i = -4; i <= 4; i += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 7.5), seamMaterial);
      seam.position.set(i * 1.7, -1.013, -0.7);
      seam.visible = false;
      scene.add(seam);
    }
    const resize = () => {
      const bounds = mount.getBoundingClientRect();
      const width = Math.max(bounds.width, 1);
      const height = Math.max(bounds.height, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderRef.current();
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });
    const interactionRoot = mount.parentElement || mount;
    const onPointerMove = (event) => {
      const drag = dragStateRef.current;
      if (drag.active) {
        const delta = event.clientX - drag.lastX;
        drag.lastX = event.clientX;
        drag.angle += delta * 0.009;
        drag.velocity = delta * 0.00048;
        pointerRef.current.set(0, 0);
        if (reducedMotion) renderRef.current();
        return;
      }
      if (mobile || reducedMotion) return;
      const bounds = interactionRoot.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
      const y = 1 - ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2;
      pointerRef.current.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    };
    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const drag = dragStateRef.current;
      drag.active = true;
      drag.lastX = event.clientX;
      drag.velocity = 0;
      renderer.domElement.style.cursor = 'grabbing';
      try { renderer.domElement.setPointerCapture(event.pointerId); } catch { /* Pointer capture is not available in every embedded browser. */ }
    };
    const onPointerUp = (event) => {
      dragStateRef.current.active = false;
      renderer.domElement.style.cursor = 'grab';
      try { if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId); } catch { /* The pointer may already have been released by the browser. */ }
      if (reducedMotion) renderRef.current();
    };
    const onPointerLeave = () => pointerRef.current.set(0, 0);
    interactionRoot.addEventListener('pointermove', onPointerMove, { passive: true });
    interactionRoot.addEventListener('pointerleave', onPointerLeave, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: true });
    renderer.domElement.addEventListener('pointercancel', onPointerUp, { passive: true });

    let frame = 0;
    let running = false;
    let disposed = false;
    let lastRender = 0;
    const clock = new THREE.Clock();
    const desiredCamera = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const projectedHotspot = new THREE.Vector3();
    const orbitAxis = new THREE.Vector3(0, 1, 0);
    const renderFrame = (now = performance.now()) => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const pointer = pointerRef.current;
      const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.34) * 0.035;
      const idleOrbit = reducedMotion ? 0 : Math.sin(elapsed * 0.19) * 0.038;
      const drag = dragStateRef.current;
      if (!drag.active && !reducedMotion && Math.abs(drag.velocity) > 0.00001) {
        drag.angle += drag.velocity * delta * 60;
        drag.velocity *= Math.exp(-delta * 3.7);
      }
      desiredCamera.copy(cameraGoalRef.current).sub(targetRef.current).applyAxisAngle(orbitAxis, drag.angle + idleOrbit).add(targetRef.current);
      desiredCamera.x += (reducedMotion || mobile ? 0 : pointer.x * 0.2) + drift;
      desiredCamera.y += (reducedMotion || mobile ? 0 : pointer.y * 0.11) + (reducedMotion ? 0 : Math.sin(elapsed * 0.47) * 0.018);
      desiredCamera.z += reducedMotion || mobile ? 0 : pointer.x * 0.045;
      if (reducedMotion) camera.position.copy(desiredCamera);
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 3.2));
      if (!reducedMotion) {
        rotor.rotation.z += delta * ((mobile ? 2.2 : 2.65) + Math.min(Math.abs(drag.velocity) * 22, 4));
        warmFill.position.x = 3.1 + Math.sin(elapsed * 0.22) * 0.18;
        louverRefs.current.forEach((louver, index) => {
          louver.rotation.y = Math.sin(elapsed * 1.35 + index * 0.38) * 0.065 + drag.velocity * 1.4;
        });
        if (telemetryRef.current) telemetryRef.current.uniforms.uTime.value = elapsed;
      }
      ledRefs.current.forEach(({ led, glow }, index) => {
        const pulse = reducedMotion ? 1 : 0.78 + Math.sin(elapsed * 2.1 + index * 1.6) * 0.16;
        led.scale.setScalar(pulse);
        glow.intensity = 0.35 + pulse * 0.34;
      });
      desiredLook.set(
        targetRef.current.x + (reducedMotion || mobile ? 0 : pointer.x * 0.035),
        targetRef.current.y + (reducedMotion || mobile ? 0 : pointer.y * 0.025),
        targetRef.current.z,
      );
      camera.lookAt(desiredLook);
      HOTSPOTS.forEach((hotspot) => {
        const element = hotspotRefs.current[hotspot.id];
        if (!element) return;
        projectedHotspot.set(...hotspot.anchor).project(camera);
        const visible = projectedHotspot.z > -1 && projectedHotspot.z < 1
          && Math.abs(projectedHotspot.x) < 0.96 && Math.abs(projectedHotspot.y) < 0.94;
        element.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) {
          element.style.left = `${(projectedHotspot.x * 0.5 + 0.5) * 100}%`;
          element.style.top = `${(-projectedHotspot.y * 0.5 + 0.5) * 100}%`;
        }
      });
      renderer.render(scene, camera);
      lastRender = now;
    };
    renderRef.current = renderFrame;

    const animate = (now) => {
      if (disposed || !running) return;
      frame = requestAnimationFrame(animate);
      if (mobile && now - lastRender < 1000 / 30) return;
      renderFrame(now);
    };
    const startRendering = () => {
      if (disposed || running) return;
      running = true;
      clock.start();
      renderFrame();
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    };
    const stopRendering = () => {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clock.stop();
    };
    const isVisible = () => document.visibilityState === 'visible';
    const updateRendering = () => {
      if (isVisible() && mountIsVisible) {
        if (reducedMotion) {
          stopRendering();
          renderFrame();
        } else startRendering();
      } else stopRendering();
    };
    let mountIsVisible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      mountIsVisible = entry.isIntersecting;
      updateRendering();
    }, { threshold: 0.01 });
    visibilityObserver.observe(mount);
    const onVisibilityChange = () => updateRendering();
    const onReducedMotionChange = (event) => {
      reducedMotion = event.matches;
      reducedMotionRef.current = reducedMotion;
      cameraTweenRef.current?.kill();
      cameraTweenRef.current = null;
      if (reducedMotion) {
        camera.position.copy(cameraGoalRef.current);
        camera.lookAt(targetRef.current);
      }
      updateRendering();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    else reducedMotionQuery.addListener?.(onReducedMotionChange);
    updateRendering();

    return () => {
      disposed = true;
      stopRendering();
      window.removeEventListener('resize', onResize);
      interactionRoot.removeEventListener('pointermove', onPointerMove);
      interactionRoot.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (reducedMotionQuery.removeEventListener) reducedMotionQuery.removeEventListener('change', onReducedMotionChange);
      else reducedMotionQuery.removeListener?.(onReducedMotionChange);
      visibilityObserver.disconnect();
      cameraTweenRef.current?.kill();
      renderRef.current = () => {};
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            if (material.roughnessMap) material.roughnessMap.dispose();
            material.dispose();
          });
        }
      });
      environmentTexture.dispose();
      environmentDisposed = true;
      studioEnvironment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      mount.replaceChildren();
      ledRefs.current = [];
      hotspotRefs.current = {};
      fanRef.current = null;
      telemetryRef.current = null;
      louverRefs.current = [];
    };
  }, []);

  const focusHotspot = (hotspot) => {
    const camera = cameraRef.current;
    if (!camera) return;
    setActive(hotspot.id);
    cameraTweenRef.current?.kill();
    if (reducedMotionRef.current) {
      cameraGoalRef.current.set(...hotspot.camera);
      targetRef.current.set(...hotspot.target);
      camera.position.copy(cameraGoalRef.current);
      camera.lookAt(targetRef.current);
      renderRef.current();
      return;
    }
    cameraTweenRef.current = gsap.timeline({ defaults: { duration: 1.35, ease: 'power3.inOut' } })
      .to(cameraGoalRef.current, { x: hotspot.camera[0], y: hotspot.camera[1], z: hotspot.camera[2] }, 0)
      .to(targetRef.current, { x: hotspot.target[0], y: hotspot.target[1], z: hotspot.target[2] }, 0);
  };

  return <div className="scene-wrap">
    <div className="scene-canvas" ref={mountRef} />
    <div className="scene-vignette" aria-hidden="true" />
    <div className="scene-hotspots" aria-label="Explore equipment components">
      {HOTSPOTS.map((hotspot) => <button
        key={hotspot.id}
        className={`hotspot ${active === hotspot.id ? 'active' : ''}`}
        style={{ left: hotspot.left, top: hotspot.top }}
        ref={(element) => { hotspotRefs.current[hotspot.id] = element; }}
        onClick={() => focusHotspot(hotspot)}
        aria-pressed={active === hotspot.id}
        aria-label={`Focus on ${hotspot.label}`}
      ><span className="hotspot-marker" /><span className="hotspot-copy"><b>{hotspot.label}</b><small>{hotspot.note}</small></span></button>)}
    </div>
    <div className="scene-scale" aria-hidden="true"><span>ARCHITECTURAL STUDY</span><span>DRAG-FREE / SELECT A COMPONENT</span></div>
  </div>;
}
