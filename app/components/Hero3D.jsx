'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const HOTSPOTS = [
  { id: 'compressor', label: 'Inverter compressor', note: 'Variable output', left: '12%', top: '62%', anchor: [-1.02, 0.16, 0.78], camera: [-3.0, 1.65, 5.5], target: [-0.82, 0.18, 0.12] },
  { id: 'fan', label: 'Field technician', note: 'Smiling service specialist', left: '55%', top: '30%', anchor: [-0.15, 0.16, 1.02], camera: [0.65, 1.55, 4.35], target: [0.0, 0.18, 0.62] },
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
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
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

export default function Hero3D() {
  const mountRef = useRef(null);
  const cameraRef = useRef(null);
  const targetRef = useRef(new THREE.Vector3(0, 0.2, 0.05));
  const cameraGoalRef = useRef(new THREE.Vector3(3.6, 2.55, 7.35));
  const cameraTweenRef = useRef(null);
  const renderRef = useRef(() => {});
  const pointerRef = useRef(new THREE.Vector2());
  const hotspotRefs = useRef({});
  const reducedMotionRef = useRef(false);
  const fanRef = useRef(null);
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
    scene.background = new THREE.Color('#171818');
    scene.fog = new THREE.Fog('#171818', 10, 27);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(3.6, 2.55, 7.35);
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;
    cameraGoalRef.current.copy(camera.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2.25));
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight('#fff7e8', '#1d2023', 1.7);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#f2dbb6', mobile ? 3.1 : 4.0);
    key.position.set(3.5, 6.8, 5.5);
    key.castShadow = !mobile;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const coolRim = new THREE.PointLight('#a6bed0', 34, 12, 1.6);
    coolRim.position.set(-4.1, 2.5, 2.2);
    scene.add(coolRim);
    const warmFill = new THREE.PointLight('#c5a880', 18, 10, 1.5);
    warmFill.position.set(3.1, 3.2, -0.2);
    scene.add(warmFill);

    const slateTexture = createSlateTexture();
    const concreteTexture = createConcreteTexture();
    const slateMaterial = new THREE.MeshStandardMaterial({ color: '#b6b4b0', map: slateTexture, roughness: 0.92, metalness: 0.02 });
    const concreteMaterial = new THREE.MeshStandardMaterial({ color: '#b7b3ac', map: concreteTexture, roughness: 0.84, metalness: 0.02 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), slateMaterial);
    wall.position.set(0, 2.25, -2.15);
    wall.receiveShadow = true;
    scene.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 15), concreteMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.02;
    floor.receiveShadow = true;
    scene.add(floor);
    const returnWall = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), slateMaterial);
    returnWall.rotation.y = Math.PI / 2;
    returnWall.position.set(-8.2, 2.1, 3.0);
    returnWall.receiveShadow = true;
    scene.add(returnWall);

    const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#353638', roughness: 0.76, metalness: 0.25 });
    box(3.45, 0.1, 1.55, plinthMaterial, [0, -0.94, 0.1], scene);
    const footMaterial = new THREE.MeshStandardMaterial({ color: '#17191b', roughness: 0.58, metalness: 0.45 });
    for (const x of [-1.18, 1.18]) {
      box(0.18, 0.17, 0.18, footMaterial, [x, -0.84, 0.12], scene);
    }

    const aluminum = new THREE.MeshPhysicalMaterial({ color: '#aeb1b0', metalness: 0.88, roughness: 0.27, clearcoat: 0.72, clearcoatRoughness: 0.22 });
    const fasciaMaterial = new THREE.MeshStandardMaterial({ color: '#202326', metalness: 0.58, roughness: 0.3 });
    const grilleMaterial = new THREE.MeshStandardMaterial({ color: '#767d7e', metalness: 0.86, roughness: 0.25 });
    const copperMaterial = new THREE.MeshStandardMaterial({ color: '#c77d4e', metalness: 0.82, roughness: 0.23, emissive: '#381c10', emissiveIntensity: 0.12 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#242729', metalness: 0.68, roughness: 0.35 });

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

    // Stylized 3D service technician replacing the original AeroBlade fan visual.
    const fanCenter = new THREE.Vector3(-0.15, 0.16, 0.86);
    const rotor = new THREE.Group();
    rotor.position.copy(fanCenter).setZ(fanCenter.z + 0.12);
    const technicianSkin = new THREE.MeshStandardMaterial({ color: '#c9825c', roughness: 0.72 });
    const technicianShirt = new THREE.MeshStandardMaterial({ color: '#00FF87', roughness: 0.58, metalness: 0.08 });
    const technicianPants = new THREE.MeshStandardMaterial({ color: '#202326', roughness: 0.75 });
    const toolboxMaterial = new THREE.MeshStandardMaterial({ color: '#00FF87', roughness: 0.42, metalness: 0.32 });
    const faceMaterial = new THREE.MeshBasicMaterial({ color: '#171819' });
    const technicianBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.52, 18), technicianShirt);
    technicianBody.position.y = -0.18;
    rotor.add(technicianBody);
    [-0.11, 0.11].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.34, 12), technicianPants);
      leg.position.set(x, -0.58, 0);
      rotor.add(leg);
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), technicianSkin);
    head.position.set(0, 0.29, 0.01);
    rotor.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), technicianShirt);
    cap.position.set(0, 0.39, 0.01);
    rotor.add(cap);
    [-0.065, 0.065].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), faceMaterial);
      eye.position.set(x, 0.31, 0.18);
      rotor.add(eye);
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 18, Math.PI), faceMaterial);
    smile.position.set(0, 0.235, 0.18);
    smile.rotation.z = Math.PI;
    rotor.add(smile);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.38, 12), technicianShirt);
    arm.position.set(0.29, -0.12, 0.02);
    arm.rotation.z = -0.72;
    rotor.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), technicianSkin);
    hand.position.set(0.42, -0.27, 0.04);
    rotor.add(hand);
    const toolbox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.23, 0.22), toolboxMaterial);
    toolbox.position.set(0.43, -0.43, 0.05);
    rotor.add(toolbox);
    const toolboxHandle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 18, Math.PI), grilleMaterial);
    toolboxHandle.position.set(0.43, -0.29, 0.05);
    toolboxHandle.rotation.z = Math.PI;
    rotor.add(toolboxHandle);
    scene.add(rotor);
    fanRef.current = rotor;

    // Restrained warm status emblem, with no printed branding or text.
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

    // Fine terrace seams, a raised threshold and distant architectural fins.
    const seamMaterial = new THREE.MeshStandardMaterial({ color: '#77736c', roughness: 0.75 });
    for (let i = -4; i <= 4; i += 1) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 7.5), seamMaterial);
      seam.position.set(i * 1.7, -1.013, -0.7);
      scene.add(seam);
    }
    for (let i = 0; i < 5; i += 1) {
      const fin = box(0.055, 3.1, 0.07, darkMaterial, [3.1 + i * 0.52, 0.45, -2.02], scene, true, true);
      fin.rotation.z = -0.02;
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
      if (mobile || reducedMotion) return;
      const bounds = interactionRoot.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1;
      const y = 1 - ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2;
      pointerRef.current.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    };
    const onPointerLeave = () => pointerRef.current.set(0, 0);
    interactionRoot.addEventListener('pointermove', onPointerMove, { passive: true });
    interactionRoot.addEventListener('pointerleave', onPointerLeave, { passive: true });

    let frame = 0;
    let running = false;
    let disposed = false;
    let lastRender = 0;
    const clock = new THREE.Clock();
    const desiredCamera = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const projectedHotspot = new THREE.Vector3();
    const renderFrame = (now = performance.now()) => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const pointer = pointerRef.current;
      const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.34) * 0.035;
      desiredCamera.set(
        cameraGoalRef.current.x + (reducedMotion || mobile ? 0 : pointer.x * 0.2) + drift,
        cameraGoalRef.current.y + (reducedMotion || mobile ? 0 : pointer.y * 0.11) + (reducedMotion ? 0 : Math.sin(elapsed * 0.47) * 0.018),
        cameraGoalRef.current.z + (reducedMotion || mobile ? 0 : pointer.x * 0.045),
      );
      if (reducedMotion) camera.position.copy(cameraGoalRef.current);
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 3.2));
      if (!reducedMotion) {
        rotor.rotation.z = Math.sin(elapsed * (mobile ? 0.9 : 1.15)) * 0.045;
        rotor.position.y = fanCenter.y + Math.sin(elapsed * 1.8) * 0.018;
        warmFill.position.x = 3.1 + Math.sin(elapsed * 0.22) * 0.18;
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
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      mount.replaceChildren();
      ledRefs.current = [];
      hotspotRefs.current = {};
      fanRef.current = null;
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
