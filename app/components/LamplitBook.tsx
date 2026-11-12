'use client';

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { IntakeStep } from '../lib/intake';

type PageId = 0 | 1 | 2 | 3 | 4;
type TurnDirection = 'next' | 'prev';
type ChatMessage = { role: 'assistant' | 'user'; text: string };
type SceneHandles = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  book: THREE.Group;
  pageCurl: THREE.Mesh;
  pageCurlMaterial: THREE.ShaderMaterial;
  lampLight: THREE.PointLight;
  cleanup: () => void;
};

type StoryPage = {
  id: Exclude<PageId, 0>;
  eyebrow: string;
  title: string;
  body: string;
  caption: string;
};

const STORY_PAGES: StoryPage[] = [
  {
    id: 1,
    eyebrow: '01 / THE PROBLEM',
    title: 'The 11:00 PM emergency.',
    body: 'A homeowner’s AC breaks down after hours. They call your number, but it rings out to voicemail.',
    caption: 'The 11:00 PM Emergency: A homeowner\'s AC breaks down, they call your number, but it rings out to voicemail.',
  },
  {
    id: 2,
    eyebrow: '02 / THE COMPETITOR LOSS',
    title: 'A customer you never hear about.',
    body: 'Nobody answers. The homeowner hangs up, dials a local competitor, and gets a human response in seconds.',
    caption: 'The Direct Loss: Because nobody picked up, a $450 repair and a lifelong customer just walked straight to your competitor.',
  },
  {
    id: 3,
    eyebrow: '03 / THE AUTOMATED SOLUTION',
    title: 'The overnight team that never clocks out.',
    body: 'An AI receptionist answers instantly, qualifies the job, texts the homeowner, and places a booking on your calendar.',
    caption: 'The 24/7 AI Receptionist: While you sleep, our automated pipeline engages the lead instantly, qualifies them, and books the job directly onto your calendar.',
  },
  {
    id: 4,
    eyebrow: '04 / THE RECOVERY',
    title: 'Turn missed calls into booked work.',
    body: 'A focused 30-minute pipeline review can show exactly where your after-hours revenue is leaking — and how to recover it.',
    caption: 'Recovered revenue: $5,400+ in extra booked work from the calls that used to disappear after hours.',
  },
];

const CHAT_STEPS: IntakeStep[] = ['name', 'phone', 'email', 'address', 'problem'];
const STEP_LABELS: Record<IntakeStep, string> = {
  name: 'name',
  phone: 'phone number',
  email: 'email address',
  address: 'property address',
  problem: 'system issue',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeCanvasTexture(base: string, palette: string[], seed: number, mode: 'wood' | 'paper' | 'black') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext('2d');
  if (!context) return null;
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  context.fillStyle = base;
  context.fillRect(0, 0, 768, 768);
  for (let index = 0; index < (mode === 'paper' ? 2200 : 1700); index += 1) {
    const color = palette[Math.floor(random() * palette.length)];
    context.globalAlpha = mode === 'black' ? 0.035 + random() * 0.06 : 0.025 + random() * 0.11;
    context.strokeStyle = color;
    context.fillStyle = color;
    const x = random() * 768;
    const y = random() * 768;
    if (mode === 'wood') {
      context.lineWidth = 0.4 + random() * 2.4;
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + (random() - 0.5) * 22, y + 24, x + (random() - 0.5) * 30, y + 84, x + (random() - 0.5) * 18, y + 170 + random() * 180);
      context.stroke();
    } else {
      context.beginPath();
      context.ellipse(x, y, 2 + random() * 18, 1 + random() * 6, random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createDeskScene(mount: HTMLDivElement): SceneHandles {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070707');
  scene.fog = new THREE.Fog('#070707', 10, 28);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0.2, 8.15, 10.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.display = 'block';
  mount.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight('#d7d1c4', '#0b0b0b', 1.25);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight('#8d9aaa', 0.42);
  moon.position.set(-5, 8, 7);
  scene.add(moon);
  const lampLight = new THREE.PointLight('#ffbd68', 145, 17, 2.05);
  lampLight.position.set(-4.35, 4.9, 0.15);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  scene.add(lampLight);

  const woodTexture = makeCanvasTexture('#111111', ['#1d1d1d', '#080808', '#2a211b', '#4a3122'], 4831, 'wood');
  const blackTexture = makeCanvasTexture('#090909', ['#1c1c1c', '#303030', '#050505'], 2181, 'black');
  const paperTexture = makeCanvasTexture('#e9e6dc', ['#fffdf5', '#c7c1b2', '#aaa394'], 8327, 'paper');
  const deskMaterial = new THREE.MeshStandardMaterial({ color: '#0d0d0d', map: woodTexture, roughness: 0.25, metalness: 0.18 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(24, 0.45, 18), deskMaterial);
  desk.position.y = -0.33;
  desk.receiveShadow = true;
  scene.add(desk);

  for (let index = -8; index <= 8; index += 1) {
    const grain = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.008, 17.5),
      new THREE.MeshStandardMaterial({ color: index % 2 ? '#1a1a1a' : '#070707', transparent: true, opacity: 0.42, roughness: 0.8 }),
    );
    grain.position.set(index * 0.78, -0.094, 0.2);
    scene.add(grain);
  }

  const book = new THREE.Group();
  book.position.set(0.55, 0.08, 0.15);
  book.rotation.y = -0.11;
  book.rotation.z = -0.035;
  scene.add(book);

  const coverMaterial = new THREE.MeshPhysicalMaterial({ color: '#070707', map: blackTexture, roughness: 0.34, metalness: 0.3, clearcoat: 0.72, clearcoatRoughness: 0.24 });
  const coverEdgeMaterial = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.62, metalness: 0.22 });
  const paperMaterial = new THREE.MeshStandardMaterial({ color: '#e9e6dc', map: paperTexture, roughness: 0.96, side: THREE.DoubleSide });
  const paperShadowMaterial = new THREE.MeshStandardMaterial({ color: '#b7b0a3', roughness: 1, side: THREE.DoubleSide });

  addBox(book, [8.25, 0.28, 5.65], [0, 0.05, 0], coverMaterial);
  addBox(book, [7.72, 0.23, 5.12], [0, 0.25, 0], paperShadowMaterial);
  addBox(book, [7.58, 0.2, 4.98], [0, 0.38, 0], paperMaterial);
  addBox(book, [0.22, 0.34, 5.53], [-4.01, 0.18, 0], coverEdgeMaterial);
  addBox(book, [0.16, 0.18, 5.06], [-3.78, 0.45, 0], new THREE.MeshStandardMaterial({ color: '#725038', roughness: 0.58, metalness: 0.18 }));
  addBox(book, [8.02, 0.045, 5.42], [0, 0.51, 0], new THREE.MeshStandardMaterial({ color: '#d9c797', roughness: 0.58, metalness: 0.32 }));

  const coverMark = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.35),
    new THREE.MeshBasicMaterial({ color: '#caa96a', transparent: true, opacity: 0.68, side: THREE.DoubleSide }),
  );
  coverMark.rotation.x = -Math.PI / 2;
  coverMark.position.set(-2.6, 0.535, -1.65);
  book.add(coverMark);

  const pageCurlMaterial = new THREE.ShaderMaterial({
    uniforms: { uProgress: { value: 0 }, uDirection: { value: 1 } },
    vertexShader: `uniform float uProgress; uniform float uDirection; varying vec2 vUv; void main() { vUv = uv; vec3 p = position; float lift = sin(uv.x * 3.14159265) * uProgress; p.z += lift * 0.78; p.y += (uv.x - 0.5) * uProgress * 0.16 * uDirection; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform float uProgress; varying vec2 vUv; void main() { float shade = 0.90 + 0.10 * cos(vUv.x * 3.14159265); float edge = smoothstep(0.96, 0.55, vUv.x); vec3 paper = vec3(0.93, 0.91, 0.85) * shade; paper *= mix(0.83, 1.0, edge); gl_FragColor = vec4(paper, 0.96); }`,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const pageCurl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.82, 48, 32), pageCurlMaterial);
  pageCurl.rotation.x = -Math.PI / 2;
  pageCurl.position.set(1.83, 0.59, 0);
  pageCurl.visible = false;
  book.add(pageCurl);

  const lamp = new THREE.Group();
  lamp.position.set(-4.35, 0, -0.05);
  const lampBaseMaterial = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.29, metalness: 0.7 });
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 2.95, 18), lampBaseMaterial);
  lampStem.position.y = 1.52;
  lampStem.rotation.z = -0.06;
  lamp.add(lampStem);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.18, 32), lampBaseMaterial);
  lampBase.position.y = 0.09;
  lamp.add(lampBase);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.35, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.28, metalness: 0.46, side: THREE.DoubleSide }));
  shade.position.set(-0.16, 3.1, 0);
  shade.rotation.z = -0.13;
  lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff0bf' }));
  bulb.position.set(-0.18, 2.63, 0);
  lamp.add(bulb);
  scene.add(lamp);

  const cupMaterial = new THREE.MeshStandardMaterial({ color: '#252525', roughness: 0.38, metalness: 0.12 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 0.75, 32), cupMaterial);
  cup.position.set(5.1, 0.17, -1.2);
  cup.castShadow = true;
  scene.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32), new THREE.MeshStandardMaterial({ color: '#3b2418', roughness: 0.7 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.set(5.1, 0.56, -1.2);
  scene.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 12, 32, Math.PI * 1.3), cupMaterial);
  handle.rotation.y = Math.PI / 2;
  handle.position.set(5.65, 0.25, -1.2);
  scene.add(handle);

  const pencilMaterial = new THREE.MeshStandardMaterial({ color: '#a47e4a', roughness: 0.62, metalness: 0.1 });
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.1, 10), pencilMaterial);
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = -0.1;
  pencil.position.set(4.0, 0.12, 1.7);
  scene.add(pencil);
  const pencilTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 10), new THREE.MeshStandardMaterial({ color: '#d7c3a0', roughness: 0.8 }));
  pencilTip.rotation.z = -Math.PI / 2;
  pencilTip.position.set(5.62, 0.12, 1.7);
  scene.add(pencilTip);

  const cardMaterial = new THREE.MeshStandardMaterial({ color: '#dedbd1', map: paperTexture, roughness: 0.85 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.055, 1.0), cardMaterial);
  card.rotation.y = -0.16;
  card.position.set(3.8, 0.08, -3.0);
  scene.add(card);
  const cardAccent = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.01, 0.08), new THREE.MeshStandardMaterial({ color: '#8d6b3f', roughness: 0.58 }));
  cardAccent.position.set(3.88, 0.115, -2.82);
  cardAccent.rotation.y = -0.16;
  scene.add(cardAccent);

  const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.35, 0.68, 24), new THREE.MeshStandardMaterial({ color: '#313131', roughness: 0.8 }));
  planter.position.set(-5.8, 0.18, 2.8);
  scene.add(planter);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshStandardMaterial({ color: '#17100b', roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(-5.8, 0.54, 2.8);
  scene.add(soil);
  for (let index = 0; index < 7; index += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: index % 2 ? '#3f5b43' : '#64734d', roughness: 0.92 }));
    leaf.scale.set(0.34, 0.14, 0.82);
    leaf.rotation.y = index * 0.9;
    leaf.rotation.z = (index % 2 ? 1 : -1) * 0.42;
    leaf.position.set(-5.8 + Math.cos(index * 0.9) * 0.18, 0.86 + (index % 3) * 0.11, 2.8 + Math.sin(index * 0.9) * 0.2);
    scene.add(leaf);
  }

  const resize = () => {
    const bounds = mount.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  return {
    renderer,
    camera,
    scene,
    book,
    pageCurl,
    pageCurlMaterial,
    lampLight,
    cleanup: () => {
      window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        const renderable = object as THREE.Mesh;
        if (renderable.geometry) renderable.geometry.dispose();
        if (renderable.material) {
          const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
          materials.forEach((material) => {
            const mapped = material as THREE.Material & { map?: THREE.Texture | null };
            mapped.map?.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function PhoneVisual() {
  return <div className="case-visual phone-visual" aria-label="A phone ringing at 11 PM">
    <div className="visual-time">11:00<span>PM</span></div>
    <div className="phone-device"><span className="phone-speaker" /><span className="phone-screen"><b>INCOMING CALL</b><strong>UNKNOWN HOMEOWNER</strong><i>RINGING…</i></span><span className="phone-button" /></div>
    <div className="waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <div className="voicemail-chip"><span className="status-dot" /> ROUTED TO VOICEMAIL</div>
  </div>;
}

function CompetitorVisual() {
  return <div className="case-visual competitor-visual" aria-label="A homeowner calling a competitor">
    <div className="call-card missed"><span className="call-icon">↘</span><div><b>YOUR NUMBER</b><small>NO ANSWER</small></div><strong>00:00</strong></div>
    <div className="handoff-arrow">→</div>
    <div className="call-card answered"><span className="call-icon">↗</span><div><b>LOCAL COMPETITOR</b><small>ANSWERED IN 0:08</small></div><strong>$450</strong></div>
    <div className="competitor-note">CUSTOMER<br /><em>GONE.</em></div>
  </div>;
}

function PipelineVisual() {
  const stages = [
    ['01', 'CALL CAPTURED', '11:00:04 PM'],
    ['02', 'TEXT BACK SENT', '11:00:07 PM'],
    ['03', 'JOB QUALIFIED', '11:01:14 PM'],
    ['04', 'BOOKING LOCKED', '11:02:02 PM'],
  ];
  return <div className="case-visual pipeline-visual" aria-label="Automated receptionist pipeline">
    <div className="pipeline-header"><span><i className="status-dot" /> LIVE PIPELINE</span><b>AFTER-HOURS</b></div>
    <div className="pipeline-list">{stages.map(([number, title, time], index) => <div className="pipeline-stage" key={number}><span className="stage-number">{number}</span><span className="stage-line" /><div><b>{title}</b><small>{time}</small></div><span className="stage-check">✓</span>{index < stages.length - 1 && <span className="stage-connector" />}</div>)}</div>
    <div className="pipeline-result"><span>NEW BOOKING</span><strong>Tue 08:30 AM</strong><small>Added to your calendar automatically</small></div>
  </div>;
}

function MetricsVisual({ onDemo }: { onDemo: () => void }) {
  return <div className="case-visual metrics-visual" aria-label="Recovered revenue dashboard">
    <div className="metrics-topline"><span>REVENUE RECOVERY / 30 DAYS</span><span className="metric-live"><i className="status-dot" /> LIVE MODEL</span></div>
    <div className="recovered-number"><span>$</span>5,400<sup>+</sup></div>
    <div className="metric-bars"><span style={{ height: '36%' }} /><span style={{ height: '48%' }} /><span style={{ height: '43%' }} /><span style={{ height: '66%' }} /><span style={{ height: '58%' }} /><span style={{ height: '82%' }} /><span style={{ height: '100%' }} /></div>
    <div className="metric-foot"><span><b>12</b> recovered jobs</span><span><b>24/7</b> response coverage</span></div>
    <button className="paper-cta" onClick={onDemo}>Claim Your Custom 30-Minute Pipeline Demo For Your HVAC Business <span>↗</span></button>
  </div>;
}

function StoryArtwork({ page, onDemo }: { page: PageId; onDemo: () => void }) {
  if (page === 1) return <PhoneVisual />;
  if (page === 2) return <CompetitorVisual />;
  if (page === 3) return <PipelineVisual />;
  return <MetricsVisual onDemo={onDemo} />;
}

function ChatDock({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi, I’m Elena — VERTICE’s after-hours receptionist. I can help map the calls your business is currently missing.' },
    { role: 'assistant', text: 'To get us started, what name would you like me to use?' },
  ]);
  const [step, setStep] = useState<IntakeStep>('name');
  const [answers, setAnswers] = useState<Partial<Record<IntakeStep, string>>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || busy || complete) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: answer }]);
    setBusy(true);
    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step,
          answer,
          website: '',
          knownName: answers.name || '',
          completedFields: Object.keys(answers),
        }),
      });
      const data = await response.json() as { accepted?: boolean; value?: string; reply?: string; complete?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || 'Please try that again.');
      setMessages((current) => [...current, { role: 'assistant', text: data.reply || 'Thanks — I’ve got that.' }]);
      if (data.accepted) {
        const nextAnswers = { ...answers, [step]: data.value || answer };
        setAnswers(nextAnswers);
        if (data.complete) {
          setComplete(true);
        } else {
          const nextStep = CHAT_STEPS[CHAT_STEPS.indexOf(step) + 1];
          if (nextStep) setStep(nextStep);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'I couldn’t send that just now. Please try once more.';
      setMessages((current) => [...current, { role: 'assistant', text: message }]);
    } finally {
      setBusy(false);
    }
  };

  return <aside className={`chat-dock ${open ? 'is-open' : ''}`} aria-label="Elena AI receptionist">
    <button className="chat-launcher" onClick={onToggle} aria-expanded={open} aria-controls="elena-chat-panel">
      <span className="chat-orb"><i className="status-dot" /></span><span><b>ELENA / AI RECEPTIONIST</b><small>{open ? 'Close conversation' : 'Available 24 / 7'}</small></span><span className="chat-chevron">{open ? '×' : '↗'}</span>
    </button>
    {open && <div className="chat-panel" id="elena-chat-panel">
      <div className="chat-panel-head"><div><span className="tiny-label"><i className="status-dot" /> LIVE INTAKE</span><h3>Let’s recover your next call.</h3></div><span className="chat-lock">PRIVATE / SECURE</span></div>
      <div className="chat-messages" ref={messagesRef}>{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === 'assistant' ? 'E' : 'YOU'}</span><p>{message.text}</p></div>)}{busy && <div className="chat-message assistant"><span className="message-avatar">E</span><p className="typing"><i /><i /><i /></p></div>}</div>
      <form className="chat-form" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={complete ? 'Intake complete' : `Enter your ${STEP_LABELS[step]}`} disabled={busy || complete} aria-label={`Enter your ${STEP_LABELS[step]}`} /><button type="submit" disabled={busy || complete || !input.trim()} aria-label="Send message">↗</button></form>
      <div className="chat-footnote">Elena collects the essentials, then the team can follow up with a live pipeline review.</div>
    </div>}
  </aside>;
}

export default function LamplitBook() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState<PageId>(0);
  const [turning, setTurning] = useState<TurnDirection | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const activePageRef = useRef<PageId>(0);
  const turningRef = useRef<TurnDirection | null>(null);
  const openRef = useRef(false);
  const pointerStartRef = useRef<number | null>(null);

  useEffect(() => { activePageRef.current = activePage; openRef.current = activePage > 0; }, [activePage]);
  useEffect(() => { turningRef.current = turning; }, [turning]);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const handles = createDeskScene(mountRef.current);
    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    let animationFrame = 0;
    let disposed = false;
    let turnStarted = 0;
    let turnDirection: TurnDirection | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onPointerMove = (event: globalThis.PointerEvent) => {
      targetPointer.x = clamp((event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1, -1, 1);
      targetPointer.y = clamp(1 - (event.clientY / Math.max(window.innerHeight, 1)) * 2, -1, 1);
    };
    const onPointerLeave = () => targetPointer.set(0, 0);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerLeave, { passive: true });

    const render = (now: number) => {
      if (disposed) return;
      const opening = openRef.current ? 1 : 0;
      const current = handles.book.userData.openProgress ?? 0;
      const next = reducedMotion ? opening : THREE.MathUtils.lerp(current, opening, 0.072);
      handles.book.userData.openProgress = next;
      pointer.lerp(targetPointer, reducedMotion ? 1 : 0.055);
      const elapsed = now * 0.001;
      const cameraTarget = new THREE.Vector3(pointer.x * 0.22, reducedMotion ? 7.42 : 7.5 - next * 0.95 + pointer.y * 0.22, reducedMotion ? 9.55 : 9.55 - next * 1.18);
      handles.camera.position.lerp(cameraTarget, reducedMotion ? 1 : 0.055);
      handles.camera.lookAt(pointer.x * 0.14, 0.12 + next * 0.05, 0.1);
      handles.book.rotation.z = -0.035 + pointer.x * 0.012;
      handles.book.rotation.y = -0.11 + pointer.x * 0.018;
      handles.book.position.y = 0.08 + next * 0.03;
      handles.lampLight.intensity = 142 + Math.sin(elapsed * 0.8) * 3.5;

      if (turningRef.current !== turnDirection) {
        turnDirection = turningRef.current;
        if (turnDirection) turnStarted = now;
      }
      if (turnDirection) {
        const progress = clamp((now - turnStarted) / 680, 0, 1);
        handles.pageCurl.visible = true;
        handles.pageCurlMaterial.uniforms.uProgress.value = Math.sin(progress * Math.PI);
        handles.pageCurlMaterial.uniforms.uDirection.value = turnDirection === 'next' ? 1 : -1;
      } else {
        handles.pageCurl.visible = false;
        handles.pageCurlMaterial.uniforms.uProgress.value = 0;
      }

      handles.renderer.render(handles.scene, handles.camera);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerLeave);
      handles.cleanup();
    };
  }, []);

  const currentStory = useMemo(() => STORY_PAGES.find((story) => story.id === activePage), [activePage]);

  const turnPage = (direction: TurnDirection) => {
    if (turningRef.current) return;
    const current = activePageRef.current;
    const nextPage = direction === 'next' ? Math.min(4, current + 1) : Math.max(0, current - 1) as PageId;
    if (nextPage === current) return;
    setTurning(direction);
    window.setTimeout(() => {
      setActivePage(nextPage as PageId);
      setTurning(null);
    }, 680);
  };

  const openBook = () => {
    if (activePageRef.current === 0) turnPage('next');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') { event.preventDefault(); turnPage('next'); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); turnPage('prev'); }
      if (event.key === 'Escape' && chatOpen) setChatOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chatOpen]);

  const handleSpreadPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { pointerStartRef.current = event.clientX; };
  const handleSpreadPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (start !== null && Math.abs(event.clientX - start) > 42) {
      turnPage(event.clientX < start ? 'next' : 'prev');
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    turnPage(event.clientX - bounds.left < bounds.width / 2 ? 'prev' : 'next');
  };

  const goToDemo = () => setChatOpen(true);

  return <main className="lamplit-shell">
    <div className="desk-scene" ref={mountRef} aria-hidden="true" />
    <div className="desk-shadow" aria-hidden="true" />
    <div className="paper-grain" aria-hidden="true" />

    <header className="lamplit-header">
      <a className="vertice-mark" href="#top" aria-label="VERTICE THERMAL home"><span className="v-monogram">V</span><span>VERTICE<br /><b>THERMAL</b></span></a>
      <div className="header-field-note"><span className="status-dot" /> FIELD NOTE 01 <b>AFTER-HOURS REVENUE</b></div>
      <button className="header-chat-button" onClick={() => setChatOpen((open) => !open)}><span className="status-dot" /> TALK TO ELENA <span>↗</span></button>
    </header>

    <section className={`hero-copy ${activePage > 0 ? 'is-book-open' : ''}`} id="top">
      <span className="tiny-label"><i className="status-dot" /> A REVENUE LEAK, BOUND IN BLACK</span>
      <h1>The after-hours<br /><em>leak.</em></h1>
      <p>How local HVAC companies lose <b>$5,000+ every month</b> — and how to fix it in 30 minutes.</p>
      {activePage === 0 && <div className="hero-hint"><span className="hint-line" /> CLICK THE COVER TO OPEN THE FIELD NOTE</div>}
    </section>

    {activePage === 0 && !turning && <button className="cover-hit" onClick={openBook} aria-label="Open The After-Hours Leak field note"><span className="cover-title">The After-Hours Leak:<br /><em>How Local HVAC Companies Lose $5,000+ Every Month</em><small>(And How to Fix It in 30 Minutes)</small></span><span className="cover-hit-label">OPEN FIELD NOTE <b>↗</b></span></button>}

    {activePage > 0 && <section className="book-reader" aria-label="The After-Hours Leak interactive book">
      <div className={`book-spread ${turning ? `is-turning-${turning}` : ''}`} onPointerDown={handleSpreadPointerDown} onPointerUp={handleSpreadPointerUp}>
        <div className="book-page left-page">
          <span className="page-stamp">VERTICE / SYSTEMS STUDY</span>
          <div className="page-rule" />
          <span className="chapter-number">0{activePage}</span>
          <p className="left-page-note">A short field note on the calls that disappear between “closed” and “open.”</p>
          <div className="left-page-mark"><span className="v-monogram">V</span><small>VERTICE<br />THERMAL</small></div>
          <span className="page-folio">{String(activePage).padStart(2, '0')} / 04</span>
        </div>
        <div className="book-page right-page">
          {currentStory && <><span className="page-eyebrow">{currentStory.eyebrow}</span><h2>{currentStory.title}</h2><p className="page-body">{currentStory.body}</p><StoryArtwork page={activePage} onDemo={goToDemo} /><p className="page-caption">{currentStory.caption}</p></>}
          <span className="page-folio right-folio">VERTICE / 2026</span>
        </div>
      </div>
      <div className="book-controls"><button onClick={() => turnPage('prev')} disabled={activePage === 1 || Boolean(turning)} aria-label="Previous page">←</button><span>DRAG EDGES / CLICK A HALF / USE ARROW KEYS</span><button onClick={() => turnPage('next')} disabled={activePage === 4 || Boolean(turning)} aria-label="Next page">→</button></div>
    </section>}

    <div className={`book-status ${activePage > 0 ? 'is-visible' : ''}`}><span>{activePage === 0 ? 'THE AFTER-HOURS LEAK' : `PAGE 0${activePage} / 04`}</span><i /><span>{activePage === 4 ? 'DEMO READY' : 'CONTINUE READING'}</span></div>
    <div className="desk-caption"><span>PRIVATE FIELD NOTE</span><b>LOCAL HVAC / RESPONSE SYSTEMS</b><span>FRANKFURT / 2026</span></div>

    <ChatDock open={chatOpen} onToggle={() => setChatOpen((open) => !open)} />
  </main>;
}
