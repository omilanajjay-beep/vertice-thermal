'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { IntakeStep } from '../lib/intake';

type TurnDirection = 'next' | 'prev';
type ContactMessage = { role: 'assistant' | 'user'; text: string };

type FlatlayScene = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  currentLeft: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  currentRight: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  leftPivot: THREE.Group;
  rightPivot: THREE.Group;
  underLeft: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  underRight: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  currentLeftMaterial: THREE.ShaderMaterial;
  currentRightMaterial: THREE.ShaderMaterial;
  leftPageTexture: THREE.Texture;
  rightPageTexture: THREE.Texture;
  underLeftMaterial: THREE.ShaderMaterial;
  underRightMaterial: THREE.ShaderMaterial;
  textures: THREE.Texture[];
  cleanup: () => void;
};

const PAGE_WIDTH = 2048;
const PAGE_HEIGHT = 1280;
const PAGE_WORLD_WIDTH = 5.12;
const PAGE_WORLD_HEIGHT = 3.2;
const CHAPTERS = [
  '01. The 11:00 PM Emergency',
  '02. The Competitor Loss',
  '03. 24/7 AI Receptionist',
  '04. Revenue Recovery',
];
const STORY_LINES = [
  ['Every missed call', 'costs a job.'],
  ['The competitor', 'answers first.'],
  ['A better response', 'runs after hours.'],
  ['Recover the work', 'you already earned.'],
];
const CHAT_STEPS: IntakeStep[] = ['name', 'phone', 'email', 'address', 'problem'];
const STEP_LABELS: Record<IntakeStep, string> = { name: 'name', phone: 'phone number', email: 'email address', address: 'property address', problem: 'system issue' };

function drawText(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, weight = 500, family = 'Inter, Arial, sans-serif') {
  context.fillStyle = color;
  context.font = `${weight} ${size}px ${family}`;
  context.fillText(text, x, y);
}

function drawRule(context: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, thickness = 2) {
  context.fillStyle = color;
  context.fillRect(x, y, width, thickness);
}

function pageCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  return canvas;
}

function drawContentsPage() {
  const canvas = pageCanvas();
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.fillStyle = '#F3F2EE';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.fillStyle = '#E5E2D9';
  context.fillRect(0, 0, 28, PAGE_HEIGHT);
  drawText(context, 'CONTENTS', 128, 180, 38, '#191918', 700, 'Inter, Arial, sans-serif');
  drawText(context, 'FIELD NOTE / HVAC RESPONSE SYSTEMS', 132, 226, 16, '#8A7C66', 500, 'DM Mono, monospace');
  drawRule(context, 132, 272, 178, '#D6B36F', 4);
  drawText(context, 'Four moments between a missed call and a recovered booking.', 132, 348, 25, '#69665E', 400, 'Inter, Arial, sans-serif');
  const columns = [132, 1070];
  CHAPTERS.forEach((chapter, index) => {
    const column = columns[index % 2];
    const row = Math.floor(index / 2);
    const y = 540 + row * 190;
    drawText(context, chapter.slice(0, 3), column, y, 18, '#B08D51', 600, 'DM Mono, monospace');
    drawText(context, chapter.slice(4), column, y + 43, 27, '#191918', 600, 'Inter, Arial, sans-serif');
    drawRule(context, column, y + 82, 730, '#D0CDC3', 2);
  });
  drawText(context, 'VERTEX / 2026', 132, 1166, 16, '#8A7C66', 500, 'DM Mono, monospace');
  drawText(context, '01', 1882, 1166, 16, '#8A7C66', 500, 'DM Mono, monospace');
  return canvas;
}

function drawStoryPage(chapter: number) {
  const canvas = pageCanvas();
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  const backgrounds = [
    ['#17191A', '#364447'],
    ['#21191A', '#57412E'],
    ['#121D22', '#273D3C'],
    ['#171411', '#6E5127'],
  ];
  const [top, bottom] = backgrounds[chapter];
  const gradient = context.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  context.globalAlpha = 0.18;
  for (let x = -PAGE_HEIGHT; x < PAGE_WIDTH + PAGE_HEIGHT; x += 86) {
    context.strokeStyle = '#F3F2EE';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - PAGE_HEIGHT, PAGE_HEIGHT);
    context.stroke();
  }
  context.globalAlpha = 1;

  const lineX = 120;
  drawText(context, `CHAPTER 0${chapter + 1} / HVAC RESPONSE SYSTEMS`, lineX, 142, 17, '#F5D996', 500, 'DM Mono, monospace');
  drawRule(context, lineX, 180, 240, '#E5BD67', 4);
  drawText(context, STORY_LINES[chapter][0], lineX, 340, 84, '#FFFFFF', 800, 'Inter, Arial, sans-serif');
  drawText(context, STORY_LINES[chapter][1], lineX, 430, 84, '#FFFFFF', 800, 'Inter, Arial, sans-serif');
  drawText(context, CHAPTERS[chapter], lineX, 510, 24, '#F5D996', 600, 'Inter, Arial, sans-serif');

  // Crisp editorial line art changes with each HVAC chapter.
  context.strokeStyle = 'rgba(255,255,255,.72)';
  context.lineWidth = 6;
  context.lineJoin = 'round';
  if (chapter === 0) {
    context.strokeRect(1150, 270, 520, 620);
    context.strokeRect(1230, 355, 360, 315);
    for (let y = 400; y < 650; y += 48) { context.beginPath(); context.moveTo(1270, y); context.lineTo(1550, y); context.stroke(); }
    context.beginPath(); context.arc(1410, 818, 76, 0, Math.PI * 2); context.stroke();
    drawText(context, '11:00 PM', 1200, 1010, 25, '#FFFFFF', 600, 'DM Mono, monospace');
  } else if (chapter === 1) {
    context.beginPath(); context.arc(1400, 530, 210, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(1215, 690); context.lineTo(1585, 690); context.lineTo(1510, 910); context.lineTo(1290, 910); context.closePath(); context.stroke();
    drawText(context, 'NO ANSWER', 1240, 1020, 26, '#F5D996', 600, 'DM Mono, monospace');
  } else if (chapter === 2) {
    context.strokeRect(1180, 310, 390, 500);
    context.strokeRect(1230, 370, 290, 240);
    context.beginPath(); context.moveTo(1110, 900); context.lineTo(1690, 900); context.stroke();
    context.beginPath(); context.moveTo(1120, 840); context.lineTo(1260, 730); context.lineTo(1370, 790); context.lineTo(1500, 650); context.lineTo(1680, 560); context.stroke();
    drawText(context, 'RESPONSE / 00:08', 1165, 1010, 24, '#FFFFFF', 600, 'DM Mono, monospace');
  } else {
    context.beginPath(); context.arc(1410, 560, 240, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(1410, 325); context.lineTo(1410, 795); context.moveTo(1175, 560); context.lineTo(1645, 560); context.stroke();
    drawText(context, '$5,400+', 1210, 1015, 58, '#FFFFFF', 800, 'Inter, Arial, sans-serif');
  }

  context.fillStyle = '#E3B956';
  const buttonX = 120;
  const buttonY = 1088;
  context.beginPath();
  context.roundRect(buttonX, buttonY, 320, 58, 29);
  context.fill();
  drawText(context, chapter === 3 ? 'GET THE PIPELINE' : 'TURN THE PAGE', buttonX + 36, buttonY + 36, 17, '#171411', 700, 'DM Mono, monospace');
  drawText(context, `0${chapter + 2} / 05`, 1845, 1166, 16, '#F5D996', 500, 'DM Mono, monospace');
  return canvas;
}

function makePageTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function makePageMaterial(texture: THREE.Texture, hinge: 'left' | 'right') {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: texture }, uCurl: { value: 0 }, uHinge: { value: hinge === 'left' ? 1 : 0 } },
    vertexShader: `uniform float uCurl; uniform float uHinge; varying vec2 vUv; void main() { vUv = uv; vec3 p = position; float hingeDistance = uHinge > 0.5 ? (1.0 - uv.x) : uv.x; float bend = sin(hingeDistance * 3.14159265) * uCurl; p.z += bend * 0.42; p.y += bend * 0.10; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; void main() { gl_FragColor = texture2D(uMap, vUv); }`,
    side: THREE.DoubleSide,
  });
}

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#111111';
  context.fillRect(0, 0, 1024, 1024);
  for (let line = 0; line < 120; line += 1) {
    context.strokeStyle = line % 4 === 0 ? 'rgba(86,61,40,.26)' : 'rgba(255,255,255,.035)';
    context.lineWidth = line % 4 === 0 ? 3 : 1;
    context.beginPath();
    context.moveTo(0, line * 13);
    context.bezierCurveTo(260, line * 13 + 18, 600, line * 13 - 20, 1024, line * 13 + 4);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 1.8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addPropShadow(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
  });
}

function createFlatlayScene(mount: HTMLDivElement, onPageHit: (direction: TurnDirection) => void): FlatlayScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#090909');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 13, 5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.appendChild(renderer.domElement);

  const deskMaterial = new THREE.MeshStandardMaterial({ color: '#111111', map: woodTexture(), roughness: 0.72, metalness: 0.08 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 18), deskMaterial);
  desk.position.y = -0.23;
  desk.receiveShadow = true;
  scene.add(desk);
  scene.add(new THREE.HemisphereLight('#D8D3C8', '#080808', 1.0));
  const fill = new THREE.DirectionalLight('#8C9AA8', 0.42);
  fill.position.set(-6, 10, 7);
  scene.add(fill);
  const spotlight = new THREE.SpotLight('#FFD28B', 850, 20, 0.56, 0.74, 1.35);
  spotlight.position.set(0, 9, 0.5);
  spotlight.castShadow = true;
  spotlight.shadow.mapSize.set(2048, 2048);
  spotlight.shadow.bias = -0.0004;
  spotlight.target.position.set(0, 0, 0);
  scene.add(spotlight, spotlight.target);

  const bookRoot = new THREE.Group();
  bookRoot.position.set(0, 0.03, 0);
  scene.add(bookRoot);
  const coverMaterial = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.32, metalness: 0.24 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.22, 3.48), coverMaterial);
  cover.position.y = 0.05;
  cover.castShadow = true;
  cover.receiveShadow = true;
  bookRoot.add(cover);

  const allCanvases = [drawContentsPage(), drawStoryPage(0), drawStoryPage(1), drawStoryPage(2), drawStoryPage(3)];
  const textures = allCanvases.map((canvas) => makePageTexture(canvas, renderer));
  const spreads = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
  const pageGeometry = new THREE.PlaneGeometry(PAGE_WORLD_WIDTH, PAGE_WORLD_HEIGHT, 32, 10);
  const currentLeftMaterial = makePageMaterial(textures[spreads[0][0]], 'left');
  const currentRightMaterial = makePageMaterial(textures[spreads[0][1]], 'right');
  const underLeftMaterial = makePageMaterial(textures[spreads[1][0]], 'left');
  const underRightMaterial = makePageMaterial(textures[spreads[1][1]], 'right');
  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  leftPivot.position.x = 0;
  rightPivot.position.x = 0;
  const currentLeft = new THREE.Mesh(pageGeometry, currentLeftMaterial);
  const currentRight = new THREE.Mesh(pageGeometry, currentRightMaterial);
  const underLeft = new THREE.Mesh(pageGeometry, underLeftMaterial);
  const underRight = new THREE.Mesh(pageGeometry, underRightMaterial);
  [currentLeft, currentRight, underLeft, underRight].forEach((page) => { page.rotation.x = -Math.PI / 2; page.position.y = 0.22; page.castShadow = true; page.receiveShadow = true; });
  currentLeft.position.x = -PAGE_WORLD_WIDTH / 2;
  currentRight.position.x = PAGE_WORLD_WIDTH / 2;
  underLeft.position.x = -PAGE_WORLD_WIDTH / 2;
  underRight.position.x = PAGE_WORLD_WIDTH / 2;
  leftPivot.add(currentLeft);
  rightPivot.add(currentRight);
  bookRoot.add(underLeft, underRight, leftPivot, rightPivot);
  underLeft.visible = false;
  underRight.visible = false;

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 3.45), new THREE.MeshStandardMaterial({ color: '#A78B5B', roughness: 0.52, metalness: 0.22 }));
  spine.position.set(0, 0.25, 0);
  bookRoot.add(spine);

  const succulent = new THREE.Group();
  succulent.position.set(-7.1, 0, 1.0);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.85, 6), new THREE.MeshStandardMaterial({ color: '#252525', roughness: 0.86 }));
  pot.position.y = 0.45;
  succulent.add(pot);
  for (let index = 0; index < 9; index += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), new THREE.MeshStandardMaterial({ color: index % 2 ? '#49604A' : '#75805A', roughness: 0.92 }));
    leaf.scale.set(0.35, 0.14, 0.85);
    leaf.position.set(Math.cos(index * 0.7) * 0.26, 1.12 + (index % 3) * 0.16, Math.sin(index * 0.7) * 0.26);
    leaf.rotation.y = index * 0.8;
    leaf.rotation.z = (index % 2 ? 1 : -1) * 0.38;
    succulent.add(leaf);
  }
  addPropShadow(succulent);
  scene.add(succulent);

  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.6, 12), new THREE.MeshStandardMaterial({ color: '#68442B', roughness: 0.68 }));
  pencil.position.set(-5.8, 0.14, 2.38);
  pencil.rotation.y = Math.PI / 2;
  pencil.rotation.z = -0.1;
  addPropShadow(pencil);
  scene.add(pencil);
  const pencilTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.25, 12), new THREE.MeshStandardMaterial({ color: '#D0B18A', roughness: 0.88 }));
  pencilTip.position.set(-4.02, 0.14, 2.2);
  pencilTip.rotation.z = -Math.PI / 2;
  scene.add(pencilTip);

  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.08, 0.13, 48), new THREE.MeshStandardMaterial({ color: '#F6F4EE', roughness: 0.64 }));
  saucer.position.set(8.15, 0.08, 0.9);
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  scene.add(saucer);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.58, 0.92, 40), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.44 }));
  cup.position.set(8.15, 0.56, 0.9);
  cup.castShadow = true;
  cup.receiveShadow = true;
  scene.add(cup);
  const latte = new THREE.Mesh(new THREE.CircleGeometry(0.59, 40), new THREE.MeshStandardMaterial({ color: '#A77648', roughness: 0.74 }));
  latte.rotation.x = -Math.PI / 2;
  latte.position.set(8.15, 1.03, 0.9);
  scene.add(latte);
  const foam = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 12, 30), new THREE.MeshStandardMaterial({ color: '#EBD9B5', roughness: 0.85 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(8.1, 1.045, 0.91);
  scene.add(foam);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 12, 28, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.48 }));
  handle.rotation.y = Math.PI / 2;
  handle.position.set(8.85, 0.57, 0.9);
  scene.add(handle);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const onPointerUp = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([currentLeft, currentRight], false);
    if (hits.length) onPageHit(hits[0].object === currentRight ? 'next' : 'prev');
  };
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
    camera.aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  return {
    renderer, camera, scene, currentLeft, currentRight, leftPivot, rightPivot, underLeft, underRight,
    currentLeftMaterial, currentRightMaterial, leftPageTexture: textures[0], rightPageTexture: textures[1], underLeftMaterial, underRightMaterial, textures,
    cleanup: () => {
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function ContactPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([
    { role: 'assistant', text: 'Tell me where your after-hours revenue is leaking. What name should I use?' },
  ]);
  const [step, setStep] = useState<IntakeStep>('name');
  const [answers, setAnswers] = useState<Partial<Record<IntakeStep, string>>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || busy) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: answer }]);
    setBusy(true);
    try {
      const response = await fetch('/api/concierge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step, answer, website: '', knownName: answers.name || '', completedFields: Object.keys(answers) }) });
      const data = await response.json() as { accepted?: boolean; value?: string; reply?: string; complete?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || 'Please try that again.');
      setMessages((current) => [...current, { role: 'assistant', text: data.reply || 'Thanks — I have that.' }]);
      if (data.accepted) {
        const nextAnswers = { ...answers, [step]: data.value || answer };
        setAnswers(nextAnswers);
        if (!data.complete) {
          const next = CHAT_STEPS[CHAT_STEPS.indexOf(step) + 1];
          if (next) setStep(next);
        }
      }
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'Please try again.' }]);
    } finally { setBusy(false); }
  };

  if (!open) return null;
  return <aside className="contact-panel" aria-label="Get in touch panel">
    <div className="contact-head"><div><span className="contact-kicker">VERTEX / LIVE INTAKE</span><h2>Get in touch.</h2></div><button onClick={onClose} aria-label="Close contact panel">×</button></div>
    <div className="contact-messages">{messages.map((message, index) => <div className={`contact-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'V' : 'YOU'}</span><p>{message.text}</p></div>)}{busy && <div className="contact-message assistant"><span>V</span><p>Working…</p></div>}</div>
    <form className="contact-form" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} placeholder={`Your ${STEP_LABELS[step]}`} aria-label={`Your ${STEP_LABELS[step]}`} /><button type="submit" disabled={busy || !input.trim()}>SEND</button></form>
  </aside>;
}

export default function LamplitBook() {
  const mountRef = useRef<HTMLDivElement>(null);
  const spreadIndexRef = useRef(0);
  const turningRef = useRef<{ direction: TurnDirection; from: number; to: number; started: number } | null>(null);
  const requestTurnRef = useRef<(direction: TurnDirection) => void>(() => undefined);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    let sceneHandles: FlatlayScene;
    const requestTurn = (direction: TurnDirection) => {
      if (turningRef.current) return;
      const from = spreadIndexRef.current;
      const to = direction === 'next' ? Math.min(4, from + 1) : Math.max(0, from - 1);
      if (from === to) return;
      turningRef.current = { direction, from, to, started: performance.now() };
      const targetLeft = [0, 1, 2, 3, 4][to];
      const targetRight = [1, 2, 3, 4, 0][to];
      sceneHandles.underLeftMaterial.uniforms.uMap.value = sceneHandles.textures[targetLeft];
      sceneHandles.underRightMaterial.uniforms.uMap.value = sceneHandles.textures[targetRight];
      sceneHandles.underLeft.visible = true;
      sceneHandles.underRight.visible = true;
    };
    requestTurnRef.current = requestTurn;
    sceneHandles = createFlatlayScene(mountRef.current, requestTurn);
    let frame = 0;
    let disposed = false;
    const render = (now: number) => {
      if (disposed) return;
      const turn = turningRef.current;
      if (turn) {
        const progress = Math.min(1, (now - turn.started) / 760);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        sceneHandles.currentLeftMaterial.uniforms.uCurl.value = turn.direction === 'prev' ? Math.sin(progress * Math.PI) : 0;
        sceneHandles.currentRightMaterial.uniforms.uCurl.value = turn.direction === 'next' ? Math.sin(progress * Math.PI) : 0;
        if (turn.direction === 'next') sceneHandles.rightPivot.rotation.z = -Math.PI * eased;
        else sceneHandles.leftPivot.rotation.z = Math.PI * eased;
        if (progress >= 1) {
          const leftIndex = [0, 1, 2, 3, 4][turn.to];
          const rightIndex = [1, 2, 3, 4, 0][turn.to];
          sceneHandles.currentLeftMaterial.uniforms.uMap.value = sceneHandles.textures[leftIndex];
          sceneHandles.currentRightMaterial.uniforms.uMap.value = sceneHandles.textures[rightIndex];
          sceneHandles.currentLeftMaterial.uniforms.uCurl.value = 0;
          sceneHandles.currentRightMaterial.uniforms.uCurl.value = 0;
          sceneHandles.rightPivot.rotation.z = 0;
          sceneHandles.leftPivot.rotation.z = 0;
          sceneHandles.underLeft.visible = false;
          sceneHandles.underRight.visible = false;
          spreadIndexRef.current = turn.to;
          setSpreadIndex(turn.to);
          turningRef.current = null;
        }
      }
      sceneHandles.renderer.render(sceneHandles.scene, sceneHandles.camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { disposed = true; cancelAnimationFrame(frame); requestTurnRef.current = () => undefined; sceneHandles.cleanup(); };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); requestTurnRef.current('next'); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); requestTurnRef.current('prev'); }
      if (event.key === 'Escape') setContactOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <main className="flatlay-shell">
    <div className="flatlay-canvas" ref={mountRef} />
    <div className="flatlay-vignette" aria-hidden="true" />
    <header className="flatlay-header">
      <a className="vertex-wordmark" href="#top" aria-label="VERTEX home">VERTEX</a>
      <button className="get-in-touch" onClick={() => setContactOpen((open) => !open)}>{contactOpen ? 'Close' : 'Get in Touch'}</button>
    </header>
    <div className="flatlay-meta top-meta"><span>HVAC RESPONSE SYSTEMS</span><i /> <span>FIELD NOTE / 01</span></div>
    <div className="flatlay-meta bottom-meta"><span>CLICK A PAGE TO TURN</span><span>← / →</span><span>SPREAD 0{spreadIndex + 1} / 05</span></div>
    <ContactPanel open={contactOpen} onClose={() => setContactOpen(false)} />
  </main>;
}
