'use client';

// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const HOTSPOTS = [
  { id: 'compressor', label: 'Inverter compressor', note: 'Variable output / 42 dB', x: '31%', y: '47%', camera: [4.5, 2.8, 6.6], target: [0, 0.5, 0] },
  { id: 'fan', label: 'AeroBlade fan', note: 'Laminar airflow / 1.8 kW', x: '67%', y: '34%', camera: [3.4, 2.2, 4.4], target: [0, 0.6, 0.8] },
  { id: 'exchanger', label: 'Copper core exchanger', note: 'Dual-coil / frost logic', x: '69%', y: '67%', camera: [-3.8, 1.7, 4.8], target: [0, 0.25, 0] },
];

export default function Hero3D() {
  const mount = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cameraTarget = useRef(new THREE.Vector3(0, 0.5, 0));
  const fanRef = useRef(null);
  const ledRefs = useRef([]);
  const frameRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const cameraBaseRef = useRef({ x: 4.5, y: 2.8, z: 6.6 });
  const cameraTweenRef = useRef(null);
  const assemblyPartsRef = useRef([]);
  const [active, setActive] = useState('compressor');

  useEffect(() => {
    if (!mount.current) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#121315');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(4.5, 2.8, 6.6);
    cameraBaseRef.current = { x: 4.5, y: 2.8, z: 6.6 };
    lastInteractionRef.current = performance.now();
    camera.lookAt(cameraTarget.current);
    cameraRef.current = camera;

    const isMobile = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    mount.current.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight('#fff5df', '#24262a', 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#f6d8a2', 4.2);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight('#b6c9ff', 10, 8);
    rim.position.set(-3, 2, 2);
    scene.add(rim);

    // Terrace architecture: rendered surfaces, parapet and a minimal railing.
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshStandardMaterial({ color: '#2a2b2b', roughness: 0.92 }),
    );
    wall.position.set(0, 2, -1.8);
    wall.receiveShadow = true;
    scene.add(wall);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 10),
      new THREE.MeshStandardMaterial({ color: '#69635c', roughness: 0.78 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    scene.add(floor);

    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: '#4d4b47', roughness: 0.8 }),
    );
    parapet.position.set(0, -0.72, 2.7);
    parapet.castShadow = true;
    scene.add(parapet);

    const railing = new THREE.Group();
    const railMaterial = new THREE.MeshStandardMaterial({ color: '#8d897f', metalness: 0.75, roughness: 0.25 });
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.06, 0.06), railMaterial);
    topRail.position.set(0, 0.2, 2.5);
    railing.add(topRail);
    for (let i = -5; i <= 5; i += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.8, 0.035), railMaterial);
      post.position.set(i * 0.7, -0.7, 2.5);
      railing.add(post);
    }
    scene.add(railing);

    // Architectural condenser chassis and front service grille.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.3, 1.55),
      new THREE.MeshPhysicalMaterial({ color: '#9a9b98', metalness: 0.88, roughness: 0.26, clearcoat: 0.5 }),
    );
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    scene.add(body);

    const front = new THREE.Mesh(
      new THREE.BoxGeometry(2.82, 2.94, 0.08),
      new THREE.MeshStandardMaterial({ color: '#1c1e20', metalness: 0.6, roughness: 0.32 }),
    );
    front.position.set(0, 0.54, 0.81);
    scene.add(front);

    const grille = new THREE.Group();
    for (let i = -8; i <= 8; i += 1) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(2.42, 0.035, 0.035),
        new THREE.MeshStandardMaterial({ color: '#74777a', metalness: 0.8, roughness: 0.25 }),
      );
      bar.position.set(0, 0.54 + i * 0.14, 0.87);
      grille.add(bar);
    }
    scene.add(grille);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: '#c5a880', metalness: 0.8, emissive: '#4a3925', emissiveIntensity: 0.55 }),
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, 0.54, 0.98);
    scene.add(hub);

    const rotor = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.18, 0.035),
        new THREE.MeshStandardMaterial({ color: '#a8abae', metalness: 0.85, roughness: 0.24 }),
      );
      blade.position.y = 0.58;
      blade.rotation.z = i * Math.PI / 3.5;
      rotor.add(blade);
    }
    rotor.rotation.x = Math.PI / 2;
    rotor.position.set(0, 0.54, 1.04);
    scene.add(rotor);
    fanRef.current = rotor;

    // Glowing status lights with a slow cinematic pulse.
    ledRefs.current = [-1.22, -0.92, -0.62].map((x, index) => {
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: index === 0 ? '#d9f4d8' : '#c5a880' }),
      );
      led.position.set(x, 1.74, 0.92);
      scene.add(led);
      const glow = new THREE.PointLight(index === 0 ? '#b9f1bd' : '#d8ae70', 0.9, 1.4);
      glow.position.copy(led.position);
      scene.add(glow);
      return { led, glow };
    });

    assemblyPartsRef.current = [
      { object: body, offset: [0, 1.25, -0.35] },
      { object: front, offset: [0, -0.8, 0.55] },
      { object: grille, offset: [0, 0.55, 0.2] },
      { object: hub, offset: [0, -0.35, 0.75] },
      { object: rotor, offset: [0, 0.45, 0.85] },
      ...ledRefs.current.map(({ led }) => ({ object: led, offset: [0, 0.7, 0.8] })),
    ].map(({ object, offset }) => ({ object, offset, base: object.position.clone() }));

    const updateAssembly = () => {
      const rect = mount.current?.getBoundingClientRect();
      if (!rect) return;
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.72 - rect.top) / Math.max(rect.height * 0.85, 1)));
      assemblyPartsRef.current.forEach(({ object, offset, base }) => {
        object.position.set(base.x + offset[0] * (1 - progress), base.y + offset[1] * (1 - progress), base.z + offset[2] * (1 - progress));
      });
    };

    const resize = () => {
      if (!mount.current) return;
      const { width, height } = mount.current.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      // The rotor is rotated onto the front grille with X=PI/2, so its
      // visible spin axis is Y—not Z. Keep the speed obvious on phones too.
      const fanSpeed = (isMobile ? 2.25 : 2.75) + Math.sin(elapsed * 1.4) * 0.22;
      rotor.rotation.y += delta * fanSpeed;
      rotor.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.9) * 0.025;
      ledRefs.current.forEach(({ led, glow }, index) => {
        const pulse = 0.78 + Math.sin(elapsed * 2.2 + index * 1.7) * 0.2;
        led.scale.setScalar(pulse);
        glow.intensity = 0.55 + pulse * 0.6;
      });
      if (performance.now() - lastInteractionRef.current > 900 && !cameraTweenRef.current?.isActive()) {
        const base = cameraBaseRef.current;
        const drift = isMobile ? 0.045 : 0.08;
        camera.position.x = base.x + Math.sin(elapsed * 0.32) * drift;
        camera.position.y = base.y + Math.cos(elapsed * 0.26) * drift * 0.44;
      }
      camera.lookAt(cameraTarget.current);
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    resize();
    updateAssembly();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateAssembly, { passive: true });
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateAssembly);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(cameraTarget.current);
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
    };
  }, []);

  const selectHotspot = (hotspot) => {
    setActive(hotspot.id);
    lastInteractionRef.current = performance.now();
    const camera = cameraRef.current;
    if (!camera) return;
    cameraBaseRef.current = { x: hotspot.camera[0], y: hotspot.camera[1], z: hotspot.camera[2] };
    cameraTweenRef.current?.kill();
    cameraTweenRef.current = gsap.timeline({ defaults: { duration: 1.35, ease: 'power3.inOut' } })
      .to(camera.position, { x: hotspot.camera[0], y: hotspot.camera[1], z: hotspot.camera[2] }, 0)
      .to(cameraTarget.current, { x: hotspot.target[0], y: hotspot.target[1], z: hotspot.target[2] }, 0);
  };

  return (
    <div className="scene-wrap">
      <div ref={mount} className="scene" />
      {HOTSPOTS.map((hotspot) => (
        <button
          key={hotspot.id}
          className={`hotspot ${active === hotspot.id ? 'active' : ''}`}
          style={{ left: hotspot.x, top: hotspot.y }}
          onClick={() => selectHotspot(hotspot)}
          aria-label={`Focus camera on ${hotspot.label}`}
        >
          <span className="hotspot-dot" />
          <span className="hotspot-label">{hotspot.label}<small>{hotspot.note}</small></span>
        </button>
      ))}
      <div className="scene-caption"><span>FIG. 01</span><span>VTX-480 / OUTDOOR UNIT</span></div>
    </div>
  );
}
