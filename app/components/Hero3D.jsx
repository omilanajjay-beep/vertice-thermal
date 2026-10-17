'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const HOTSPOTS = [
  { id: 'compressor', label: 'Inverter compressor', note: 'Variable output', left: '12%', top: '62%', camera: [-3.0, 1.65, 5.5], target: [-0.82, 0.18, 0.12] },
  { id: 'fan', label: 'AeroBlade fan', note: 'Low-noise airflow', left: '55%', top: '30%', camera: [0.65, 1.55, 4.35], target: [0.0, 0.18, 0.62] },
  { id: 'exchanger', label: 'Copper core exchanger', note: 'Thermal exchange', left: '70%', top: '62%', camera: [3.0, 1.55, 4.9], target: [0.92, 0.1, 0.48] },
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
  const cameraTweenRef = useRef(null);
  const fanRef = useRef(null);
  const ledRefs = useRef([]);
  const [active, setActive] = useState('fan');

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const mount = mountRef.current;
    const mobile = window.matchMedia('(max-width: 680px), (pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#171818');
    scene.fog = new THREE.Fog('#171818', 10, 27);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    camera.position.set(3.6, 2.55, 7.35);
    camera.lookAt(targetRef.current);
    cameraRef.current = camera;

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
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.19, 32), copperMaterial);
    hubCap.rotation.x = Math.PI / 2;
    hubCap.position.copy(fanCenter).setZ(fanCenter.z + 0.15);
    scene.add(hubCap);
    for (let i = 0; i < 4; i += 1) {
      const spoke = box(0.018, 1.36, 0.03, grilleMaterial, [fanCenter.x, fanCenter.y, fanCenter.z + 0.045], scene, false, false);
      spoke.rotation.z = i * Math.PI / 4;
    }

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
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      if (!reducedMotion) rotor.rotation.z += delta * (mobile ? 2.2 : 2.65);
      ledRefs.current.forEach(({ led, glow }, index) => {
        const pulse = reducedMotion ? 1 : 0.78 + Math.sin(elapsed * 2.1 + index * 1.6) * 0.16;
        led.scale.setScalar(pulse);
        glow.intensity = 0.35 + pulse * 0.34;
      });
      camera.lookAt(targetRef.current);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
      cameraTweenRef.current?.kill();
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
      fanRef.current = null;
    };
  }, []);

  const focusHotspot = (hotspot) => {
    const camera = cameraRef.current;
    if (!camera) return;
    setActive(hotspot.id);
    cameraTweenRef.current?.kill();
    cameraTweenRef.current = gsap.timeline({ defaults: { duration: 1.35, ease: 'power3.inOut' } })
      .to(camera.position, { x: hotspot.camera[0], y: hotspot.camera[1], z: hotspot.camera[2] }, 0)
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
        onClick={() => focusHotspot(hotspot)}
        aria-pressed={active === hotspot.id}
        aria-label={`Focus on ${hotspot.label}`}
      ><span className="hotspot-marker" /><span className="hotspot-copy"><b>{hotspot.label}</b><small>{hotspot.note}</small></span></button>)}
    </div>
    <div className="scene-scale" aria-hidden="true"><span>ARCHITECTURAL STUDY</span><span>DRAG-FREE / SELECT A COMPONENT</span></div>
  </div>;
}
