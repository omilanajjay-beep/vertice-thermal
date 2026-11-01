'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const MODULES = [
  { id: 'airflow', index: '01', label: 'Smart home airflow', short: 'X-RAY AIRFLOW', color: '#50b9ff' },
  { id: 'teardown', index: '02', label: 'Mechanical teardown', short: 'VRF TEARDOWN', color: '#e6b46a' },
  { id: 'filtration', index: '03', label: 'Clean air vortex', short: 'IAQ FILTRATION', color: '#79e7ef' },
  { id: 'dispatch', index: '04', label: 'Emergency dispatch', short: '24/7 DISPATCH', color: '#ff5961' },
  { id: 'roi', index: '05', label: 'Efficiency transformer', short: 'ROI / SEER', color: '#70d59a' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

function material(color, opacity = 1, emissive = color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: opacity < 1 ? 0.5 : 0.18,
    transparent: opacity < 1,
    opacity,
    metalness: 0.42,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });
}

function addBox(parent, size, position, mat, wire = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  if (wire) {
    mesh.material = new THREE.MeshBasicMaterial({ color: mat.color, wireframe: true, transparent: true, opacity: 0.7 });
  }
  parent.add(mesh);
  return mesh;
}

function addLabel(parent, text, position, color = '#b6c0ca') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '500 24px monospace';
  ctx.letterSpacing = '3px';
  ctx.fillStyle = color;
  ctx.fillText(text, 14, 54);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.7, 0.32, 1);
  sprite.position.set(...position);
  parent.add(sprite);
  return sprite;
}

function buildAirflow(group, state) {
  const home = new THREE.Group();
  const walls = material('#b7c8d5', 0.16, '#75b7d8');
  const accent = material('#52c7ff', 0.6, '#2e9fe6');
  const floor = addBox(home, [4.8, 0.06, 3.3], [0, -1.05, 0], material('#95a7b0', 0.18), true);
  floor.rotation.x = 0;
  addBox(home, [0.08, 1.8, 3.2], [-2.35, -0.12, 0], walls, true);
  addBox(home, [0.08, 1.8, 3.2], [2.35, -0.12, 0], walls, true);
  addBox(home, [4.7, 1.8, 0.08], [0, -0.12, -1.56], walls, true);
  addBox(home, [2.2, 1.8, 0.08], [-1.25, -0.12, 1.56], walls, true);
  addBox(home, [1.2, 1.8, 0.08], [1.8, -0.12, 1.56], walls, true);
  addBox(home, [0.08, 1.2, 1.4], [0.15, -0.42, 0.86], walls, true);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), accent);
  vent.position.set(-1.1, 0.94, 0.1);
  home.add(vent);
  addLabel(home, 'RESIDENTIAL AIR MAP', [-1.8, 1.34, 0], '#73c9ff');
  group.add(home);

  const count = window.matchMedia('(max-width: 680px)').matches ? 900 : 2200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    positions[i * 3] = -2.1 + t * 4.2;
    positions[i * 3 + 1] = -0.35 + Math.sin(t * 38) * 0.44 + (Math.random() - 0.5) * 0.28;
    positions[i * 3 + 2] = Math.sin(t * 22) * 1.15 + (Math.random() - 0.5) * 0.42;
    colors[i * 3] = 0.2;
    colors[i * 3 + 1] = 0.72;
    colors[i * 3 + 2] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending }));
  group.add(particles);
  state.air = { particles, positions, colors, count };
}

function buildTeardown(group, state) {
  const machine = new THREE.Group();
  const shellMat = material('#aab1b6', 0.15, '#7f9aa6');
  const metal = material('#d2a26a', 1, '#8e4e22');
  const dark = material('#212a33', 1, '#0b1117');
  addBox(machine, [3.1, 1.7, 1.8], [0, -0.1, 0], shellMat, true);
  const panels = [];
  [[-1.55, 0, 0], [1.55, 0, 0], [0, 0.85, 0], [0, -0.85, 0]].forEach((position, index) => {
    const panel = addBox(machine, index < 2 ? [0.07, 1.75, 1.9] : [3.2, 0.07, 1.9], position, material('#9ca9b0', 0.76), false);
    panels.push({ panel, origin: panel.position.clone(), axis: index === 0 ? -1 : index === 1 ? 1 : index === 2 ? 1 : -1 });
  });
  const compressor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.12, 32), dark);
  compressor.rotation.z = Math.PI / 2;
  compressor.position.set(-0.75, -0.08, 0);
  machine.add(compressor);
  const rotor = new THREE.Group();
  rotor.position.set(0.75, -0.08, 0);
  const rotorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 32), metal);
  rotorCore.rotation.x = Math.PI / 2;
  rotor.add(rotorCore);
  for (let i = 0; i < 8; i += 1) {
    const blade = addBox(rotor, [0.06, 0.68, 0.12], [Math.cos(i * Math.PI / 4) * 0.28, Math.sin(i * Math.PI / 4) * 0.28, 0], metal);
    blade.rotation.z = i * Math.PI / 4;
  }
  machine.add(rotor);
  addLabel(machine, 'VRF / AHU CORE', [-1.05, 1.35, 0], '#e9bb7c');
  group.add(machine);
  state.teardown = { machine, panels, rotor, hover: 0 };
}

function buildFiltration(group, state) {
  const count = window.matchMedia('(max-width: 680px)').matches ? 900 : 3500;
  const positions = new Float32Array(count * 3);
  const origin = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 0.7 + Math.random() * 2.5;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 3.1;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    positions.set([x, y, z], i * 3);
    origin.set([x, y, z], i * 3);
    colors.set([0.72, 0.6, 0.2], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending }));
  group.add(particles);
  const filter = addBox(group, [1.9, 2.5, 0.16], [0, 0, 0], material('#75e7ef', 0.18, '#3bd6e0'), true);
  addLabel(group, 'HEPA / 99.97%', [-1.02, 1.52, 0], '#8ceff6');
  filter.visible = false;
  state.filtration = { particles, positions, origin, colors, count, filter, engaged: false };
}

function buildDispatch(group, state) {
  const globe = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.72, 28, 20), new THREE.MeshBasicMaterial({ color: '#6cc8ff', wireframe: true, transparent: true, opacity: 0.48 }));
  globe.add(sphere);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 12), new THREE.MeshBasicMaterial({ color: '#2d78b3', wireframe: true, transparent: true, opacity: 0.14 }));
  globe.add(inner);
  const beacons = [];
  for (let i = 0; i < 18; i += 1) {
    const phi = Math.acos(1 - 2 * ((i + 0.5) / 18));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const beacon = new THREE.Group();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff5961' }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 24), new THREE.MeshBasicMaterial({ color: '#ff5961', transparent: true, opacity: 0.85 }));
    const position = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(1.75);
    beacon.position.copy(position);
    beacon.lookAt(0, 0, 0);
    beacon.add(dot, ring);
    globe.add(beacon);
    beacons.push({ beacon, ring, phase: i * 0.31 });
  }
  addLabel(globe, 'LIVE RESPONSE NETWORK', [-1.6, 2.15, 0], '#ff7279');
  group.add(globe);
  state.dispatch = { globe, beacons };
}

function buildRoi(group, state) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 20, 80), new THREE.MeshPhysicalMaterial({ color: '#f05d59', metalness: 0.9, roughness: 0.1, clearcoat: 1, emissive: '#5b1212', emissiveIntensity: 0.3 }));
  ring.rotation.x = 0.55;
  group.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 10, 60), new THREE.MeshBasicMaterial({ color: '#ffb576', transparent: true, opacity: 0.8 }));
  inner.rotation.x = 0.55;
  group.add(inner);
  addLabel(group, 'EFFICIENCY / SEER', [-1.2, 1.55, 0], '#83dfa6');
  state.roi = { ring, inner };
}

export default function Hero3D() {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const activeRef = useRef('airflow');
  const climateRef = useRef('cooling');
  const seerRef = useRef(18);
  const pointerRef = useRef(new THREE.Vector2());
  const [active, setActive] = useState('airflow');
  const [climate, setClimate] = useState('cooling');
  const [engaged, setEngaged] = useState(false);
  const [seer, setSeer] = useState(18);
  const [rpm, setRpm] = useState(3420);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const mount = mountRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070c');
    scene.fog = new THREE.Fog('#05070c', 7, 20);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.1, 6.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight('#8aa2bd', 1.25));
    const key = new THREE.DirectionalLight('#dcecff', 3.2);
    key.position.set(3, 5, 5);
    scene.add(key);
    const blue = new THREE.PointLight('#2c9eff', 15, 10, 2);
    blue.position.set(-3, 1, 3);
    scene.add(blue);
    const red = new THREE.PointLight('#ff5260', 6, 8, 2);
    red.position.set(3, -1, 2);
    scene.add(red);

    const groups = {};
    MODULES.forEach((module) => {
      const group = new THREE.Group();
      group.visible = module.id === 'airflow';
      group.userData.opacity = module.id === 'airflow' ? 1 : 0;
      scene.add(group);
      groups[module.id] = group;
    });
    const state = { groups };
    buildAirflow(groups.airflow, state);
    buildTeardown(groups.teardown, state);
    buildFiltration(groups.filtration, state);
    buildDispatch(groups.dispatch, state);
    buildRoi(groups.roi, state);
    stateRef.current = state;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const root = mount.parentElement || mount;
    const pointerMove = (event) => {
      const bounds = root.getBoundingClientRect();
      pointerRef.current.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, 1 - ((event.clientY - bounds.top) / bounds.height) * 2);
      if (state.teardown) state.teardown.hover = clamp(pointerRef.current.x * 0.75 + 0.5, 0, 1);
    };
    root.addEventListener('pointermove', pointerMove, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const current = activeRef.current;
      if (state.air) {
        const attr = state.air.particles.geometry.attributes.position;
        for (let i = 0; i < state.air.count; i += 1) {
          const t = (i / state.air.count + elapsed * (climateRef.current === 'cooling' ? 0.13 : 0.055)) % 1;
          attr.array[i * 3] = -2.1 + t * 4.2;
          attr.array[i * 3 + 1] = -0.35 + Math.sin(t * 38 + elapsed) * (climateRef.current === 'cooling' ? 0.44 : 0.25) + Math.sin(i) * 0.02;
          attr.array[i * 3 + 2] = Math.sin(t * 22 + elapsed * 0.4) * (climateRef.current === 'cooling' ? 1.15 : 0.72);
        }
        attr.needsUpdate = true;
        state.air.particles.material.color.set(climateRef.current === 'cooling' ? '#49b9ff' : '#ffae59');
      }
      if (state.teardown) {
        state.teardown.rotor.rotation.z += 0.018;
        state.teardown.panels.forEach(({ panel, origin, axis }, index) => {
          const amount = state.teardown.hover * (index < 2 ? 0.72 : 0.42);
          panel.position.x = origin.x + (index < 2 ? axis * amount : 0);
          panel.position.y = origin.y + (index >= 2 ? axis * amount : 0);
        });
      }
      if (state.filtration) {
        const f = state.filtration;
        const attr = f.particles.geometry.attributes.position;
        const col = f.particles.geometry.attributes.color;
        const targetT = f.engaged ? 1 : 0;
        for (let i = 0; i < f.count; i += 1) {
          const index = i * 3;
          const ox = f.origin[index];
          const oy = f.origin[index + 1];
          const oz = f.origin[index + 2];
          const angle = Math.atan2(oz, ox) + elapsed * (f.engaged ? 1.8 : 0.08) + oy * 0.4;
          const radius = f.engaged ? lerp(Math.hypot(ox, oz), 0.18, Math.min(1, elapsed % 4 / 3)) : Math.hypot(ox, oz);
          attr.array[index] = lerp(ox, Math.cos(angle) * radius, targetT);
          attr.array[index + 1] = lerp(oy, oy * 0.92, targetT);
          attr.array[index + 2] = lerp(oz, Math.sin(angle) * radius, targetT);
          col.array[index] = lerp(0.72, 0.2, targetT);
          col.array[index + 1] = lerp(0.6, 0.95, targetT);
          col.array[index + 2] = lerp(0.2, 1, targetT);
        }
        attr.needsUpdate = true;
        col.needsUpdate = true;
        f.filter.visible = f.engaged;
      }
      if (state.dispatch) {
        state.dispatch.globe.rotation.y = elapsed * 0.08;
        state.dispatch.beacons.forEach(({ ring, phase }) => {
          const pulse = 1 + (Math.sin(elapsed * 2.4 + phase) + 1) * 0.32;
          ring.scale.setScalar(pulse);
          ring.material.opacity = 0.35 + (pulse - 1) * 0.9;
        });
      }
      if (state.roi) {
        state.roi.ring.rotation.z += 0.006 * (seerRef.current - 12);
        state.roi.inner.rotation.z -= 0.01;
        const t = (seerRef.current - 14) / 12;
        state.roi.ring.material.color.lerpColors(new THREE.Color('#ed5557'), new THREE.Color('#64d99a'), t);
        state.roi.ring.scale.setScalar(0.86 + t * 0.42);
      }
      if (!reduced) {
        camera.position.x += (pointerRef.current.x * 0.28 - camera.position.x) * 0.025;
        camera.position.y += (pointerRef.current.y * 0.18 + 0.1 - camera.position.y) * 0.025;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      root.removeEventListener('pointermove', pointerMove);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    climateRef.current = climate;
  }, [climate]);

  useEffect(() => {
    seerRef.current = seer;
  }, [seer]);

  useEffect(() => {
    activeRef.current = active;
    const state = stateRef.current;
    if (!state.groups) return;
    Object.entries(state.groups).forEach(([id, group]) => {
      const isActive = id === active;
      group.visible = true;
      gsap.to(group.scale, { x: isActive ? 1 : 0.78, y: isActive ? 1 : 0.78, z: isActive ? 1 : 0.78, duration: 0.65, ease: 'power3.out' });
      gsap.to(group, { alpha: isActive ? 1 : 0, duration: 0.45, ease: 'power2.out', onComplete: () => { if (!isActive) group.visible = false; } });
    });
  }, [active]);

  useEffect(() => {
    const state = stateRef.current;
    if (state.filtration) state.filtration.engaged = engaged;
  }, [engaged]);

  useEffect(() => {
    const timer = window.setInterval(() => setRpm(3200 + Math.floor(Math.random() * 401)), 900);
    return () => window.clearInterval(timer);
  }, []);

  const current = MODULES.find((module) => module.id === active) || MODULES[0];
  const savings = Math.round((seer - 14) * 65);

  return <div className="capability-dashboard">
    <div ref={mountRef} className="capability-canvas" />
    <div className="capability-vignette" />
    <aside className="capability-sidebar" aria-label="Interactive HVAC modules">
      <span className="dashboard-kicker">VERTICE / CAPABILITIES</span>
      <strong>THERMAL<br /><i>INTELLIGENCE</i></strong>
      <div className="module-tabs">{MODULES.map((module) => <button key={module.id} type="button" className={active === module.id ? 'active' : ''} onClick={() => setActive(module.id)}><span>{module.index}</span>{module.short}</button>)}</div>
      <span className="dashboard-foot">DRAG TO INSPECT / SELECT A MODULE</span>
    </aside>
    <div className="capability-topline"><span><i className="live-dot" /> LIVE SYSTEM STUDY</span><span>{current.index} / 05 &nbsp; {current.label}</span></div>
    {active === 'airflow' && <div className="module-control climate-control"><span>MODE</span><button type="button" className={climate === 'cooling' ? 'selected' : ''} onClick={() => setClimate('cooling')}>COOLING</button><button type="button" className={climate === 'heating' ? 'selected heating' : ''} onClick={() => setClimate('heating')}>HEATING</button></div>}
    {active === 'teardown' && <div className="telemetry"><span>RPM <b>{rpm}</b></span><span>STATIC PRESSURE <b>0.84 in</b></span><span>SEER <b>21.6</b></span></div>}
    {active === 'filtration' && <button type="button" className={`filter-cta ${engaged ? 'engaged' : ''}`} onClick={() => setEngaged((value) => !value)}>{engaged ? 'FILTRATION ENGAGED' : 'ENGAGE HEPA FILTRATION'}<span>↗</span></button>}
    {active === 'dispatch' && <div className="dispatch-ticker"><span>● PRIORITY RESPONSE NETWORK</span><b>18 UNITS ACTIVE / GLOBAL COVERAGE</b></div>}
    {active === 'roi' && <div className="roi-control"><div><span>SEER RATING</span><b>{seer}</b></div><input aria-label="SEER rating" type="range" min="14" max="26" value={seer} onChange={(event) => setSeer(Number(event.target.value))} /><small>EST. SAVINGS <strong>${savings}</strong> / UNIT INCREASE</small></div>}
    <div className="capability-caption"><span>PROCEDURAL WEBGL STUDY / NO EXTERNAL ASSETS</span><span>60 FPS RENDER PIPELINE</span></div>
  </div>;
}
