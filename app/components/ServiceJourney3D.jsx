'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';

const scenes = [
  { id: 'repair', label: 'THE CRAFT', title: 'People who know the system.', copy: 'A quiet repair is a precise one. Our engineers work around the home, not against it.' },
  { id: 'home', label: 'THE RESULT', title: 'Comfort moves through the home.', copy: 'From first commissioning to the last room upstairs, every space stays in the conversation.' },
  { id: 'growth', label: 'THE NETWORK', title: 'Good work compounds.', copy: 'Qualified service, predictable aftercare and a contractor network built to last.' },
  { id: 'review', label: 'THE PROOF', title: 'The people notice.', copy: 'Real homes. Real technicians. A better feeling when the system disappears into daily life.' },
];

function person(color, scale = 1) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 16, 16), material);
  head.position.y = 1.45 * scale;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * scale, 0.5 * scale, 6, 12), material);
  body.position.y = 0.92 * scale;
  group.add(head, body);
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.07 * scale, 0.55 * scale, 10), material);
    leg.position.set(side * 0.1 * scale, 0.38 * scale, 0);
    group.add(leg);
  });
  return group;
}

export default function ServiceJourney3D() {
  const mount = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const stageRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneGroupsRef = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!mount.current) return undefined;
    const mobile = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101112');
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(4.8, 3.0, 7.5);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.35 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mount.current.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#fff4dd', '#24262b', 2.1));
    const key = new THREE.DirectionalLight('#f1d5a1', 4.5);
    key.position.set(3, 6, 4);
    scene.add(key);
    const blue = new THREE.PointLight('#8ca8ff', 12, 9);
    blue.position.set(-4, 2, 3);
    scene.add(blue);

    const stage = new THREE.Group();
    stageRef.current = stage;
    scene.add(stage);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#2a2925', metalness: 0.2, roughness: 0.8 }));
    floor.position.y = -0.1;
    stage.add(floor);

    const condenser = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.9, 1.0), new THREE.MeshPhysicalMaterial({ color: '#999b99', metalness: 0.86, roughness: 0.3, clearcoat: 0.5 }));
    shell.position.y = 0.92;
    condenser.add(shell);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: '#16191b', metalness: 0.7, roughness: 0.25 }));
    grille.position.set(0, 0.92, 0.53);
    condenser.add(grille);
    const rotor = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.025), new THREE.MeshStandardMaterial({ color: '#c7c8c4', metalness: 0.8, roughness: 0.22 }));
      blade.position.y = 0.31;
      blade.rotation.z = i * Math.PI / 3.5;
      rotor.add(blade);
    }
    rotor.rotation.x = Math.PI / 2;
    rotor.position.set(0, 0.92, 0.58);
    condenser.add(rotor);
    condenser.position.x = -1.6;
    stage.add(condenser);

    const engineer = person('#c5a880', 1.25);
    engineer.position.set(0.15, 0, 0.25);
    stage.add(engineer);
    const toolbox = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.35, 0.38), new THREE.MeshStandardMaterial({ color: '#a3482d', metalness: 0.3, roughness: 0.65 }));
    toolbox.position.set(0.75, 0.18, 0.3);
    stage.add(toolbox);

    const house = new THREE.Group();
    const houseBody = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.9, 2.2), new THREE.MeshStandardMaterial({ color: '#dad0bd', roughness: 0.9 }));
    houseBody.position.y = 0.95;
    house.add(houseBody);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.15, 4), new THREE.MeshStandardMaterial({ color: '#4d514f', roughness: 0.85 }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.45;
    house.add(roof);
    [-0.8, 0.8].forEach((x) => {
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.55), new THREE.MeshBasicMaterial({ color: '#d5b979' }));
      window.position.set(x, 1.15, 1.12);
      house.add(window);
    });
    const residentA = person('#7890a9', 0.62);
    residentA.position.set(-0.75, -0.02, 1.35);
    const residentB = person('#b98c77', 0.62);
    residentB.position.set(0.8, -0.02, 1.35);
    house.add(residentA, residentB);
    house.position.x = 0.2;
    stage.add(house);

    const bars = new THREE.Group();
    for (let i = 0; i < 6; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35 + i * 0.17, 0.18), new THREE.MeshStandardMaterial({ color: i % 2 ? '#c5a880' : '#9db7df', emissive: i % 2 ? '#2a1e12' : '#18243e', emissiveIntensity: 0.7 }));
      bar.position.set(-1.2 + i * 0.48, (0.35 + i * 0.17) / 2, 0.2);
      bars.add(bar);
    }
    bars.position.x = 0.1;
    stage.add(bars);
    const reviewPerson = person('#e4e0d6', 1.05);
    reviewPerson.position.set(0.9, 0, 0.1);
    const reviewBox = toolbox.clone();
    reviewBox.material = new THREE.MeshStandardMaterial({ color: '#c5a880', metalness: 0.35, roughness: 0.55 });
    reviewBox.position.set(0.25, 1.0, 0.3);
    reviewPerson.add(reviewBox);
    stage.add(reviewPerson);

    const groups = [condenser, house, bars, reviewPerson];
    sceneGroupsRef.current = groups;
    groups.forEach((group, index) => { group.visible = index === 0; });
    const resize = () => { if (!mount.current) return; const { width, height } = mount.current.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
    resize();
    window.addEventListener('resize', resize);
    const clock = new THREE.Clock();
    let frame;
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      rotor.rotation.y += delta * 2.4;
      stage.rotation.y = Math.sin(t * 0.25) * 0.08;
      engineer.position.y = Math.sin(t * 1.4) * 0.018;
      residentA.position.y = Math.sin(t * 1.8) * 0.025 - 0.02;
      residentB.position.y = Math.cos(t * 1.5) * 0.025 - 0.02;
      bars.children.forEach((bar, i) => { bar.scale.y = 0.9 + Math.sin(t * 1.5 + i) * 0.12; });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frame); renderer.dispose(); renderer.domElement.remove(); scene.clear(); };
  }, []);

  const changeScene = (index) => {
    setActive(index);
    const stage = stageRef.current;
    if (!stage) return;
    const sceneGroups = sceneGroupsRef.current;
    sceneGroups.forEach((group, i) => { group.visible = i === index; if (i === index) { group.scale.setScalar(0.8); gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.7)' }); } });
  };

  return <div className="journey-shell"><div className="journey-stage" ref={mount} /><div className="journey-copy"><span className="eyebrow">05 / THE SERVICE STORY</span><h2>{scenes[active].title}</h2><p>{scenes[active].copy}</p><div className="journey-tabs">{scenes.map((item, index) => <button className={active === index ? 'active' : ''} key={item.id} onClick={() => changeScene(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}</div></div></div>;
}
