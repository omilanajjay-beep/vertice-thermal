'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ArrowUpRight, Pause, Play, Snowflake } from 'lucide-react';

const CHAPTERS = [
  { id: 'stifling', number: '01', label: 'The hot room', title: 'The stifling breakdown', note: 'A summer evening gets harder to enjoy when the air stops moving.' },
  { id: 'arrival', number: '02', label: 'The arrival', title: 'The expert arrives', note: 'A friendly, prepared technician meets the family at home.' },
  { id: 'repair', number: '03', label: 'The repair', title: 'Precision repair', note: 'A careful system check brings the cooling back into balance.' },
  { id: 'comfort', number: '04', label: 'The relief', title: 'Comfort restored', note: 'Fresh, even airflow—and the family settles back into their evening.' },
  { id: 'booking', number: '05', label: 'Your next step', title: 'A cooler home starts here', note: 'Tell Elena what your home needs. She can help arrange a visit.' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (current, target, lambda, delta) => THREE.MathUtils.damp(current, target, lambda, delta);

function physical(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.2,
    metalness: options.metalness ?? 0.02,
    clearcoat: options.clearcoat ?? 0.5,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.2,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    map: options.map ?? null,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: THREE.DoubleSide,
  });
}

function roundedBox(parent, size, position, material, radius = 0.06, segments = 3) {
  const bevel = Math.max(0.002, Math.min(radius, size[0] * 0.46, size[1] * 0.46, size[2] * 0.46));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], segments, bevel), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, radius, position, material, scale = [1, 1, 1], detail = 14) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, Math.max(8, Math.floor(detail * 0.7))), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinderBetween(parent, start, end, radius, material, radialSegments = 9) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.02, length - radius * 2), 3, radialSegments), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#9d7858';
  context.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row += 1) {
    const y = row * 64;
    const base = row % 2 === 0 ? '#a98260' : '#987352';
    context.fillStyle = base;
    context.fillRect(0, y + 2, 512, 60);
    context.strokeStyle = 'rgba(50,31,18,.42)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, y + 1);
    context.lineTo(512, y + 1);
    context.stroke();
    const split = row % 2 === 0 ? 190 : 360;
    context.strokeStyle = 'rgba(49,31,22,.3)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(split, y + 2);
    context.lineTo(split, y + 62);
    context.stroke();
    for (let grain = 0; grain < 13; grain += 1) {
      const gy = y + 7 + ((grain * 17 + row * 11) % 48);
      context.strokeStyle = `rgba(239,205,164,${0.025 + (grain % 4) * 0.012})`;
      context.beginPath();
      context.moveTo(10, gy);
      context.bezierCurveTo(110, gy - 3, 270, gy + 5, 502, gy - 1);
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.5);
  texture.anisotropy = 4;
  return texture;
}

function plasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#e5e0d5';
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i += 1) {
    const x = (i * 73) % 256;
    const y = (i * 131) % 256;
    context.fillStyle = `rgba(99,87,71,${(i % 5) * 0.014})`;
    context.fillRect(x, y, 1 + (i % 3), 1 + (i % 2));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.3);
  return texture;
}

function addLeaf(parent, position, direction, color) {
  const leaf = sphere(parent, 0.1, position, physical(color, { roughness: 0.68, clearcoat: 0.08 }), [0.62, 2.9, 0.34], 10);
  leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...direction).normalize());
  return leaf;
}

function buildPlant(parent, position) {
  const plant = new THREE.Group();
  plant.position.set(...position);
  parent.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.17, 0.36, 16), physical('#a86f55', { roughness: 0.48, clearcoat: 0.16 }));
  pot.position.y = 0.18;
  pot.castShadow = true;
  plant.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16), physical('#30281f', { roughness: 0.92, clearcoat: 0 }));
  soil.position.y = 0.37;
  plant.add(soil);
  const stemMat = physical('#526c4b', { roughness: 0.78, clearcoat: 0.05 });
  const green = ['#5f8060', '#769373', '#4d7055', '#91a886'];
  for (let i = 0; i < 7; i += 1) {
    const angle = i * Math.PI * 0.285;
    const direction = [Math.cos(angle) * (0.3 + (i % 3) * 0.08), 0.78 + (i % 2) * 0.14, Math.sin(angle) * 0.26];
    const stemEnd = [direction[0] * 0.75, 1.35 + (i % 3) * 0.08, direction[2] * 0.75];
    cylinderBetween(plant, [0, 0.36, 0], stemEnd, 0.018, stemMat, 6);
    addLeaf(plant, [direction[0] * 0.56, 0.92 + (i % 3) * 0.12, direction[2] * 0.56], direction, green[i % green.length]);
  }
  return plant;
}

function buildRug(parent) {
  const rug = new THREE.Group();
  rug.position.set(0, 0.02, 0.55);
  parent.add(rug);
  roundedBox(rug, [3.85, 0.035, 2.0], [0, 0, 0], physical('#53616a', { roughness: 0.94, clearcoat: 0.02 }), 0.14, 2);
  const thread = physical('#98a0a2', { roughness: 0.92, clearcoat: 0 });
  for (let i = 0; i < 11; i += 1) {
    const x = -1.55 + i * 0.31;
    roundedBox(rug, [0.018, 0.008, 1.63], [x, 0.024, 0], thread, 0.008, 1);
  }
  return rug;
}

function buildSofa(parent) {
  const sofa = new THREE.Group();
  parent.add(sofa);
  const body = physical('#315e60', { roughness: 0.76, clearcoat: 0.08 });
  const cushions = physical('#427778', { roughness: 0.8, clearcoat: 0.06 });
  const piping = physical('#78a3a0', { roughness: 0.55, clearcoat: 0.16 });
  roundedBox(sofa, [3.14, 0.43, 1.18], [0, 0.37, -0.57], body, 0.16, 4);
  roundedBox(sofa, [3.04, 1.02, 0.3], [0, 0.91, -1.08], body, 0.14, 4);
  roundedBox(sofa, [0.32, 0.72, 1.22], [-1.43, 0.67, -0.52], body, 0.12, 4);
  roundedBox(sofa, [0.32, 0.72, 1.22], [1.43, 0.67, -0.52], body, 0.12, 4);
  for (let i = 0; i < 3; i += 1) {
    const x = (i - 1) * 0.93;
    roundedBox(sofa, [0.87, 0.19, 0.74], [x, 0.68, -0.22], cushions, 0.1, 4);
    roundedBox(sofa, [0.82, 0.67, 0.14], [x, 1.0, -0.87], cushions, 0.09, 4);
    roundedBox(sofa, [0.02, 0.08, 0.04], [x, 0.56, 0.16], piping, 0.014, 2);
  }
  const darkWood = physical('#493729', { roughness: 0.42, clearcoat: 0.28 });
  for (const x of [-1.22, 1.22]) {
    for (const z of [-0.98, -0.08]) roundedBox(sofa, [0.12, 0.27, 0.12], [x, 0.13, z], darkWood, 0.025, 2);
  }
  const pillowA = roundedBox(sofa, [0.48, 0.42, 0.16], [-0.93, 1.19, -0.78], physical('#cfad83', { roughness: 0.81, clearcoat: 0.04 }), 0.09, 4);
  pillowA.rotation.z = -0.13;
  pillowA.rotation.y = -0.14;
  const pillowB = roundedBox(sofa, [0.44, 0.38, 0.15], [0.98, 1.18, -0.78], physical('#647e73', { roughness: 0.8, clearcoat: 0.05 }), 0.09, 4);
  pillowB.rotation.z = 0.1;
  return sofa;
}

function buildCoffeeTable(parent) {
  const table = new THREE.Group();
  table.position.set(0.1, 0, 1.25);
  parent.add(table);
  const brass = physical('#987b57', { roughness: 0.34, metalness: 0.55, clearcoat: 0.62 });
  const wood = physical('#7d5a3d', { roughness: 0.34, clearcoat: 0.45 });
  for (const x of [-0.69, 0.69]) for (const z of [-0.29, 0.29]) roundedBox(table, [0.07, 0.42, 0.07], [x, 0.28, z], brass, 0.025, 3);
  roundedBox(table, [1.62, 0.12, 0.84], [0, 0.51, 0], wood, 0.1, 4);
  roundedBox(table, [1.52, 0.025, 0.73], [0, 0.582, 0], physical('#b99570', { roughness: 0.28, clearcoat: 0.58 }), 0.065, 3);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.15, 16), physical('#e2d9c9', { roughness: 0.18, clearcoat: 0.72 }));
  cup.position.set(0.43, 0.68, 0.12);
  cup.castShadow = true;
  table.add(cup);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.025, 20), physical('#e2d9c9', { roughness: 0.26, clearcoat: 0.6 }));
  saucer.position.set(0.43, 0.6, 0.12);
  table.add(saucer);
  return table;
}

function buildWallArt(parent, x, y) {
  const frame = physical('#76573d', { roughness: 0.42, clearcoat: 0.35 });
  const canvasMat = physical('#cfc4ad', { roughness: 0.94, clearcoat: 0.02 });
  roundedBox(parent, [0.74, 0.58, 0.08], [x, y, -1.945], frame, 0.025, 3);
  roundedBox(parent, [0.62, 0.46, 0.025], [x, y, -1.895], canvasMat, 0.008, 2);
  const art = physical('#8ca39a', { roughness: 0.9, clearcoat: 0.02 });
  const oval = sphere(parent, 0.14, [x - 0.07, y + 0.03, -1.875], art, [1.1, 1.25, 0.16], 12);
  oval.rotation.z = -0.6;
  roundedBox(parent, [0.37, 0.1, 0.014], [x + 0.12, y - 0.11, -1.872], physical('#d0a77e', { roughness: 0.76, clearcoat: 0.04 }), 0.02, 2);
}

function buildClimateUnit(parent, state) {
  const unit = new THREE.Group();
  unit.position.set(-1.25, 2.42, -1.86);
  parent.add(unit);
  roundedBox(unit, [1.62, 0.42, 0.34], [0, 0, 0], physical('#e9eceb', { roughness: 0.19, clearcoat: 0.72 }), 0.11, 5);
  roundedBox(unit, [1.43, 0.025, 0.17], [0, -0.16, 0.175], physical('#879296', { roughness: 0.45, metalness: 0.25, clearcoat: 0.55 }), 0.018, 3);
  roundedBox(unit, [1.28, 0.026, 0.035], [0, -0.188, 0.245], physical('#30393d', { roughness: 0.62, clearcoat: 0.08 }), 0.012, 2);
  for (let i = 0; i < 12; i += 1) roundedBox(unit, [0.012, 0.024, 0.026], [-0.53 + i * 0.096, -0.202, 0.27], physical('#bac3c2', { roughness: 0.28, metalness: 0.2, clearcoat: 0.52 }), 0.005, 2);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), new THREE.MeshBasicMaterial({ color: '#9b4f45' }));
  led.position.set(0.66, 0.02, 0.19);
  unit.add(led);
  state.climateLed = led;
  state.climateUnit = unit;

  const thermostat = new THREE.Group();
  thermostat.position.set(1.4, 1.52, -1.87);
  parent.add(thermostat);
  roundedBox(thermostat, [0.38, 0.54, 0.1], [0, 0, 0], physical('#e5e2d7', { roughness: 0.24, clearcoat: 0.7 }), 0.055, 4);
  roundedBox(thermostat, [0.25, 0.2, 0.018], [0, 0.075, 0.06], physical('#243a3d', { roughness: 0.18, clearcoat: 0.75, emissive: '#258896', emissiveIntensity: 0.38 }), 0.025, 3);
  roundedBox(thermostat, [0.13, 0.02, 0.018], [0, 0.06, 0.073], physical('#a5efdf', { roughness: 0.18, emissive: '#42c3a2', emissiveIntensity: 0.9 }), 0.008, 2);
  sphere(thermostat, 0.028, [0, -0.12, 0.067], physical('#7e8581', { roughness: 0.35, clearcoat: 0.48 }), [1, 1, 0.35], 10);
  state.thermostat = thermostat;
}

function buildSideTable(parent) {
  const table = new THREE.Group();
  table.position.set(2.05, 0, -0.65);
  parent.add(table);
  const wood = physical('#6d4c35', { roughness: 0.4, clearcoat: 0.38 });
  roundedBox(table, [0.74, 0.38, 0.62], [0, 0.27, 0], wood, 0.06, 3);
  roundedBox(table, [0.78, 0.1, 0.66], [0, 0.52, 0], physical('#ba9470', { roughness: 0.35, clearcoat: 0.56 }), 0.045, 3);
  roundedBox(table, [0.57, 0.22, 0.035], [0, 0.25, 0.32], physical('#402f24', { roughness: 0.55, clearcoat: 0.18 }), 0.02, 2);
  const lamp = physical('#d5c4a2', { roughness: 0.55, clearcoat: 0.2 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.32, 12), physical('#987956', { roughness: 0.3, metalness: 0.46, clearcoat: 0.58 }));
  stem.position.set(0, 0.72, 0);
  table.add(stem);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.2, 16), lamp);
  shade.position.set(0, 0.98, 0);
  table.add(shade);
  const bulb = new THREE.PointLight('#ffc97e', 0.9, 2.2, 2);
  bulb.position.set(0, 0.86, 0);
  table.add(bulb);
}

function buildRoom(parent) {
  const room = new THREE.Group();
  room.position.set(0.26, 0, 0.02);
  parent.add(room);
  const wood = woodTexture();
  const plaster = plasterTexture();
  const floorMat = physical('#ffffff', { roughness: 0.38, clearcoat: 0.42, map: wood });
  roundedBox(room, [6.0, 0.18, 4.35], [0, -0.08, 0], floorMat, 0.035, 2);
  roundedBox(room, [6.12, 0.08, 4.47], [0, -0.185, 0], physical('#d7d1c4', { roughness: 0.35, clearcoat: 0.42 }), 0.025, 2);

  const wall = physical('#ffffff', { roughness: 0.58, clearcoat: 0.25, map: plaster });
  roundedBox(room, [6.0, 3.05, 0.16], [0, 1.44, -2.08], wall, 0.025, 2);
  roundedBox(room, [0.16, 3.05, 4.26], [-2.92, 1.44, 0], physical('#d7d2c8', { roughness: 0.54, clearcoat: 0.22, map: plaster }), 0.025, 2);
  const trim = physical('#b9ab96', { roughness: 0.38, clearcoat: 0.42 });
  roundedBox(room, [5.92, 0.12, 0.09], [0, 0.08, -1.965], physical('#f0ece4', { roughness: 0.4, clearcoat: 0.4 }), 0.018, 2);
  roundedBox(room, [0.09, 0.12, 4.17], [-2.815, 0.08, 0], physical('#f0ece4', { roughness: 0.4, clearcoat: 0.4 }), 0.018, 2);
  roundedBox(room, [6.0, 0.1, 0.12], [0, 2.94, -1.975], trim, 0.02, 2);
  roundedBox(room, [0.11, 0.1, 4.2], [-2.82, 2.94, 0], trim, 0.02, 2);
  const corner = physical('#c3b6a1', { roughness: 0.45, clearcoat: 0.28 });
  roundedBox(room, [0.12, 2.9, 0.12], [-2.82, 1.43, -1.98], corner, 0.02, 2);
  roundedBox(room, [0.04, 2.8, 0.12], [-2.74, 1.42, -1.93], physical('#93aab0', { roughness: 0.22, metalness: 0.2, clearcoat: 0.7 }), 0.01, 2);

  buildWallArt(room, 0.45, 2.12);
  buildClimateUnit(room, parent.userData.storyState);
  buildRug(room);
  buildSofa(room);
  buildCoffeeTable(room);
  buildSideTable(room);
  buildPlant(room, [2.43, 0, -1.44]);

  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28), physical('#756957', { roughness: 0.66, clearcoat: 0.12 }));
  clock.position.set(-2.80, 2.14, 0.63);
  clock.rotation.y = Math.PI / 2;
  room.add(clock);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.235, 28), physical('#e5dbc8', { roughness: 0.5, clearcoat: 0.26 }));
  clockFace.position.set(-2.77, 2.14, 0.63);
  clockFace.rotation.y = Math.PI / 2;
  room.add(clockFace);
  const clockHand = roundedBox(room, [0.025, 0.16, 0.018], [-2.748, 2.15, 0.63], physical('#43433b', { roughness: 0.45, clearcoat: 0.2 }), 0.008, 2);
  clockHand.rotation.z = -0.28;

  const ledge = roundedBox(room, [0.44, 0.055, 0.2], [2.47, 1.13, 0.4], physical('#96785d', { roughness: 0.46, clearcoat: 0.28 }), 0.02, 2);
  ledge.rotation.y = 0.12;
  return room;
}

function buildSittingPerson(parent, options) {
  const root = new THREE.Group();
  root.position.set(options.x, 0.94, -0.49);
  parent.add(root);
  root.scale.setScalar(options.scale ?? 1);
  const skin = physical(options.skin, { roughness: 0.64, clearcoat: 0.04 });
  const shirt = physical(options.shirt, { roughness: 0.82, clearcoat: 0.04 });
  const pants = physical(options.pants, { roughness: 0.82, clearcoat: 0.04 });
  const hair = physical(options.hair, { roughness: 0.91, clearcoat: 0.01 });
  const dark = physical('#263034', { roughness: 0.35, clearcoat: 0.14 });
  const body = new THREE.Group();
  root.add(body);
  roundedBox(body, [0.43, 0.57, 0.3], [0, 0.25, 0.01], shirt, 0.13, 4);
  roundedBox(body, [0.2, 0.11, 0.14], [0, 0.55, 0.015], physical(options.shirt, { roughness: 0.74, clearcoat: 0.04 }), 0.04, 3);
  cylinderBetween(body, [0, 0.48, 0], [0, 0.62, 0], 0.09, skin, 10);
  const head = sphere(body, 0.23, [0, 0.79, 0.025], skin, [0.93, 1.08, 0.91], 16);
  sphere(body, 0.21, [0, 0.98, -0.015], hair, [1.02, 0.43, 0.98], 14);
  if (options.longHair) {
    roundedBox(body, [0.42, 0.32, 0.2], [0, 0.73, -0.12], hair, 0.1, 3);
    sphere(body, 0.09, [-0.18, 0.8, 0.01], hair, [0.8, 1.8, 0.9], 10);
    sphere(body, 0.09, [0.18, 0.8, 0.01], hair, [0.8, 1.8, 0.9], 10);
  }
  sphere(body, 0.05, [-0.214, 0.8, 0.015], skin, [0.5, 0.8, 0.55], 10);
  sphere(body, 0.05, [0.214, 0.8, 0.015], skin, [0.5, 0.8, 0.55], 10);
  sphere(body, 0.026, [-0.075, 0.805, 0.224], dark, [0.82, 1, 0.45], 10);
  sphere(body, 0.026, [0.075, 0.805, 0.224], dark, [0.82, 1, 0.45], 10);
  sphere(body, 0.029, [0, 0.75, 0.24], skin, [0.82, 1.05, 0.8], 10);
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.055, 0.69, 0.221),
    new THREE.Vector3(0, 0.674, 0.239),
    new THREE.Vector3(0.055, 0.69, 0.221),
  ]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 8, 0.008, 5, false), physical('#744f45', { roughness: 0.62, clearcoat: 0.02 })));
  const legLeft = new THREE.Group();
  const legRight = new THREE.Group();
  root.add(legLeft, legRight);
  for (const [index, leg] of [legLeft, legRight].entries()) {
    const x = index === 0 ? -0.14 : 0.14;
    cylinderBetween(leg, [x, -0.02, 0.02], [x, -0.31, 0.31], 0.09, pants, 9);
    cylinderBetween(leg, [x, -0.31, 0.31], [x, -0.57, 0.47], 0.075, pants, 9);
    roundedBox(leg, [0.18, 0.105, 0.32], [x, -0.64, 0.57], dark, 0.06, 3);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.24, 0.46, 0.01);
    body.add(arm);
    cylinderBetween(arm, [0, 0, 0], [side * 0.085, -0.19, 0.09], 0.092, shirt, 9);
    cylinderBetween(arm, [side * 0.085, -0.19, 0.09], [side * 0.03, -0.31, 0.3], 0.072, skin, 9);
    sphere(arm, 0.07, [side * 0.03, -0.34, 0.31], skin, [0.8, 0.7, 1], 10);
    arm.rotation.z = side * 0.32;
    arms.push({ arm, side });
  }
  return { root, body, head, arms, phase: options.phase ?? 0, options };
}

function buildTechnician(parent) {
  const root = new THREE.Group();
  parent.add(root);
  const skin = physical('#c58f6e', { roughness: 0.56, clearcoat: 0.06 });
  const coverall = physical('#21484a', { roughness: 0.82, clearcoat: 0.04 });
  const shirt = physical('#e8e3d8', { roughness: 0.68, clearcoat: 0.08 });
  const bootMat = physical('#3b3430', { roughness: 0.62, clearcoat: 0.1 });
  const brass = physical('#c5a26b', { roughness: 0.32, metalness: 0.48, clearcoat: 0.62 });
  const body = new THREE.Group();
  root.add(body);
  const torso = roundedBox(body, [0.54, 0.66, 0.31], [0, 1.03, 0], coverall, 0.12, 4);
  roundedBox(body, [0.17, 0.55, 0.035], [-0.17, 1.02, 0.171], physical('#a9bbb0', { roughness: 0.8, clearcoat: 0.05 }), 0.03, 3);
  roundedBox(body, [0.17, 0.55, 0.035], [0.17, 1.02, 0.171], physical('#a9bbb0', { roughness: 0.8, clearcoat: 0.05 }), 0.03, 3);
  roundedBox(body, [0.34, 0.25, 0.12], [0, 1.33, 0.02], shirt, 0.06, 3);
  roundedBox(body, [0.22, 0.16, 0.035], [0, 1.17, 0.177], physical('#c6a46e', { roughness: 0.43, metalness: 0.22, clearcoat: 0.46 }), 0.025, 2);
  roundedBox(body, [0.15, 0.15, 0.045], [0.17, 0.99, 0.18], physical('#c5d1c6', { roughness: 0.8, clearcoat: 0.05 }), 0.025, 3);
  roundedBox(body, [0.1, 0.09, 0.025], [0.17, 0.99, 0.21], physical('#496659', { roughness: 0.8, clearcoat: 0.04 }), 0.02, 2);
  cylinderBetween(body, [0, 1.32, 0], [0, 1.42, 0], 0.105, skin, 10);
  sphere(body, 0.22, [0, 1.66, 0], skin, [0.93, 1.05, 0.88], 16);
  sphere(body, 0.2, [0, 1.83, -0.025], physical('#4c352a', { roughness: 0.94, clearcoat: 0.01 }), [1.04, 0.43, 1.03], 14);
  sphere(body, 0.045, [-0.205, 1.65, 0], skin, [0.48, 0.8, 0.56], 10);
  sphere(body, 0.045, [0.205, 1.65, 0], skin, [0.48, 0.8, 0.56], 10);
  const cap = roundedBox(body, [0.48, 0.105, 0.45], [0, 1.86, 0.01], physical('#bf975f', { roughness: 0.66, clearcoat: 0.14 }), 0.045, 4);
  cap.rotation.x = -0.06;
  roundedBox(body, [0.28, 0.035, 0.14], [0, 1.81, 0.24], physical('#d2b47b', { roughness: 0.62, clearcoat: 0.18 }), 0.018, 2);
  sphere(body, 0.024, [-0.07, 1.66, 0.21], physical('#24302d', { roughness: 0.4, clearcoat: 0.08 }), [0.9, 1, 0.42], 8);
  sphere(body, 0.024, [0.07, 1.66, 0.21], physical('#24302d', { roughness: 0.4, clearcoat: 0.08 }), [0.9, 1, 0.42], 8);
  const mouth = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.05, 1.54, 0.207), new THREE.Vector3(0, 1.525, 0.222), new THREE.Vector3(0.05, 1.54, 0.207)]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(mouth, 8, 0.007, 5, false), physical('#70463a', { roughness: 0.58, clearcoat: 0.02 })));

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.72, 0);
    root.add(leg);
    roundedBox(leg, [0.2, 0.72, 0.24], [0, -0.33, 0], coverall, 0.075, 3);
    roundedBox(leg, [0.26, 0.16, 0.38], [0.045, -0.69, 0.09], bootMat, 0.055, 3);
    roundedBox(leg, [0.205, 0.08, 0.08], [0.045, -0.63, 0.185], physical('#73634a', { roughness: 0.55, metalness: 0.14, clearcoat: 0.22 }), 0.018, 2);
    legs.push(leg);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.29, 1.27, 0);
    body.add(arm);
    cylinderBetween(arm, [0, 0, 0], [side * 0.06, -0.28, 0.03], 0.095, coverall, 10);
    cylinderBetween(arm, [side * 0.06, -0.28, 0.03], [side * 0.03, -0.51, 0.13], 0.074, shirt, 9);
    cylinderBetween(arm, [side * 0.03, -0.51, 0.13], [side * 0.03, -0.56, 0.15], 0.062, skin, 9);
    arms.push({ arm, side });
  }
  const caseGroup = new THREE.Group();
  const caseBody = roundedBox(caseGroup, [0.46, 0.27, 0.31], [0, 0, 0], physical('#5d6260', { roughness: 0.26, metalness: 0.68, clearcoat: 0.84 }), 0.055, 4);
  caseBody.castShadow = true;
  roundedBox(caseGroup, [0.28, 0.035, 0.055], [0, 0.158, 0], physical('#c0a06a', { roughness: 0.25, metalness: 0.52, clearcoat: 0.8 }), 0.015, 3);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 7, 18, Math.PI), physical('#d3d1c8', { roughness: 0.22, metalness: 0.78, clearcoat: 0.9 }));
  handle.position.y = 0.15;
  handle.rotation.z = Math.PI;
  caseGroup.add(handle);
  roundedBox(caseGroup, [0.05, 0.11, 0.035], [-0.1, -0.02, 0.163], brass, 0.009, 2);
  roundedBox(caseGroup, [0.05, 0.11, 0.035], [0.1, -0.02, 0.163], brass, 0.009, 2);
  root.add(caseGroup);
  return { root, body, torso, arms, legs, caseGroup, caseStart: new THREE.Vector3(0.46, 0.55, 0.23) };
}

function particleField(parent, count, material, positions) {
  const geometry = new THREE.BufferGeometry();
  const array = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const p = positions(i, count);
    array[i * 3] = p[0];
    array[i * 3 + 1] = p[1];
    array[i * 3 + 2] = p[2];
    phase[i] = (i * 2.399963229728653) % (Math.PI * 2);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(array, 3).setUsage(THREE.DynamicDrawUsage));
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  parent.add(points);
  return { points, array, phase, count };
}

function buildSparks(parent) {
  const count = 1680;
  const goldPoints = new THREE.PointsMaterial({ color: '#ffc973', size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = particleField(parent, count, goldPoints, (index, total) => {
    const t = index / total;
    const angle = t * Math.PI * 2 * 31;
    const radius = 0.14 + ((index * 37) % 97) / 97 * 0.55;
    return [1.43 + Math.cos(angle) * radius, 1.55 + Math.sin(angle * 0.71) * 0.38 + ((index * 11) % 17) / 80, -1.52 + Math.sin(angle) * radius * 0.55];
  });
  sparks.points.visible = false;
  return sparks;
}

function buildAir(parent) {
  const count = 1060;
  const airMaterial = new THREE.PointsMaterial({ color: '#83efff', size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
  const air = particleField(parent, count, airMaterial, (index, total) => {
    const t = index / total;
    return [-2.5 + t * 5, 1.45 + Math.sin(t * 24) * 0.15, -0.9 + Math.sin(t * 15) * 0.75];
  });
  air.points.visible = false;
  return air;
}

function setupScene(mount, onWebglFailure) {
  const isMobile = window.innerWidth < 680;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050a');
  scene.fog = new THREE.Fog('#03050a', 11, 22);
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 60);
  camera.position.set(6.8, 5.8, 8.4);
  const cameraTarget = new THREE.Vector3(0.15, 1.06, 0.02);
  camera.lookAt(cameraTarget);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onWebglFailure();
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'story-webgl-canvas';
  mount.appendChild(renderer.domElement);

  const lightScale = isMobile ? 2 : 1;
  const hemisphere = new THREE.HemisphereLight('#d7e5ec', '#272018', 1.4);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight('#fff0d9', 3.15);
  key.position.set(3.5, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 1536, isMobile ? 1024 : 1536);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key);
  const redLight = new THREE.PointLight('#ff3f45', 16 * lightScale, 10, 1.65);
  redLight.position.set(-0.1, 2.15, 1.25);
  scene.add(redLight);
  const blueLight = new THREE.PointLight('#4bbfff', 11 * lightScale, 9, 1.75);
  blueLight.position.set(-1.7, 2.4, 1.5);
  scene.add(blueLight);
  const repairLight = new THREE.PointLight('#ffc66b', 2 * lightScale, 5.3, 1.9);
  repairLight.position.set(1.35, 2.05, -1.35);
  scene.add(repairLight);

  const graph = new THREE.Group();
  graph.position.set(0, 0, 0);
  scene.add(graph);
  const savedState = {};
  const roomMount = new THREE.Group();
  roomMount.userData.storyState = savedState;
  scene.add(roomMount);
  const room = buildRoom(roomMount);
  room.position.set(0.26, 0, 0.02);

  const family = [
    buildSittingPerson(room, { x: -0.91, skin: '#c88e6d', hair: '#3a302c', shirt: '#bd7d64', pants: '#484a4b', longHair: true, phase: 0.1, scale: 0.96 }),
    buildSittingPerson(room, { x: 0.02, skin: '#dfad86', hair: '#4c3d32', shirt: '#708878', pants: '#424d51', phase: 1.9, scale: 1.02 }),
    buildSittingPerson(room, { x: 0.94, skin: '#d69a76', hair: '#563d31', shirt: '#d3aa62', pants: '#49606b', phase: 3.7, scale: 0.78 }),
  ];
  const technician = buildTechnician(room);
  const sparks = buildSparks(room);
  const air = buildAir(room);
  const state = { room, family, technician, sparks, air, key, hemisphere, redLight, blueLight, repairLight, climateLed: savedState.climateLed, keyTarget: new THREE.Color('#ffbea9'), ambientTarget: new THREE.Color('#ffb6a3'), groundTarget: new THREE.Color('#4c2723'), targetStage: -1, reducedMotion, isMobile };
  return { scene, camera, renderer, state, cameraTarget, isMobile, reducedMotion };
}

function stageTargets(index) {
  return [
    { ambient: '#ffb6a3', key: '#ffbea9', red: 28, blue: 0, repair: 0, air: 0, spark: 0 },
    { ambient: '#d9d8d4', key: '#f1e8da', red: 12, blue: 0, repair: 1, air: 0, spark: 0 },
    { ambient: '#f1d39b', key: '#ffe3ae', red: 5, blue: 1, repair: 16, air: 0, spark: 1 },
    { ambient: '#b9e9ff', key: '#e5f6ff', red: 0, blue: 27, repair: 1, air: 1, spark: 0 },
    { ambient: '#bceeff', key: '#effaff', red: 0, blue: 23, repair: 3, air: 1, spark: 0 },
  ][index];
}

export default function Hero3D({ onOpenChat, onStageChange = () => {} }) {
  const mountRef = useRef(null);
  const setupRef = useRef(null);
  const stageRef = useRef(0);
  const elapsedRef = useRef(0);
  const visibleRef = useRef(false);
  const playRef = useRef(true);
  const pointerRef = useRef(new THREE.Vector2(0, 0));
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    stageRef.current = stage;
    onStageChange(stage);
  }, [stage, onStageChange]);

  useEffect(() => {
    playRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setStage((current) => (current + 1) % CHAPTERS.length), 7600);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let raf = 0;
    let disposed = false;
    let sceneSetup = null;
    let drawOnce = false;
    let prevTime = 0;
    let qualityAverage = 0;
    let slowFrames = 0;
    let smoothFrames = 0;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeQualityReduced = false;
    const clock = new THREE.Clock();

    const start = () => {
      if (disposed || raf || !sceneSetup || !visibleRef.current || document.visibilityState === 'hidden') return;
      raf = window.requestAnimationFrame(render);
    };

    const resize = () => {
      if (!sceneSetup) return;
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      const camera = sceneSetup.camera;
      const mobile = window.innerWidth < 680;
      const viewHeight = 7.5 * (mobile ? 1.35 : 1);
      const aspect = width / height;
      camera.left = -(viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(6.8, 5.8, 8.4);
      if (mobile) camera.position.set(6.6, 6.1, 8.2);
      camera.lookAt(sceneSetup.cameraTarget);
      camera.updateProjectionMatrix();
      sceneSetup.renderer.setSize(width, height, false);
      start();
    };

    const drawFamily = (state, stageIndex, elapsed, delta) => {
      const joyful = stageIndex === 3 || stageIndex === 4;
      state.family.forEach((person, index) => {
        const pulse = Math.sin(elapsed * (joyful ? 2.1 : 1.45) + person.phase);
        person.body.scale.y = 1 + pulse * (joyful ? 0.012 : 0.027);
        person.head.rotation.z = Math.sin(elapsed * 0.55 + person.phase) * (joyful ? 0.025 : 0.045);
        person.root.position.y = 0.94 + (joyful ? Math.max(0, Math.sin(elapsed * 3 + person.phase)) * (index === 2 ? 0.065 : 0.022) : 0);
        person.arms.forEach(({ arm, side }) => {
          const resting = side * 0.32;
          const wave = joyful && (index === 0 || index === 2)
            ? (index === 0 ? 2.28 + Math.sin(elapsed * 3.2 + person.phase) * 0.14 : -2.32 + Math.sin(elapsed * 3.8 + person.phase) * 0.17)
            : resting;
          arm.rotation.z = damp(arm.rotation.z, wave, 5, delta);
        });
      });
    };

    function render(now) {
      raf = 0;
      if (disposed || !sceneSetup || !visibleRef.current || document.visibilityState === 'hidden') return;
      const delta = Math.min((now - (prevTime || now)) / 1000 || 1 / 60, 0.05);
      prevTime = now;
      elapsedRef.current += delta;
      const elapsed = elapsedRef.current;
      const currentStage = stageRef.current;
      const state = sceneSetup.state;
      const settings = stageTargets(currentStage);
      if (state.targetStage !== currentStage) {
        state.targetStage = currentStage;
        state.keyTarget.set(settings.key);
        state.ambientTarget.set(settings.ambient);
        state.groundTarget.set(currentStage === 0 ? '#542723' : currentStage === 2 ? '#48341f' : '#263943');
      }
      qualityAverage = qualityAverage === 0 ? delta : qualityAverage * 0.92 + delta * 0.08;
      if (qualityAverage > 0.031) { slowFrames += 1; smoothFrames = 0; }
      else if (qualityAverage < 0.021) { smoothFrames += 1; slowFrames = 0; }
      else { slowFrames = Math.max(0, slowFrames - 1); smoothFrames = Math.max(0, smoothFrames - 1); }
      if (slowFrames > 75 && !activeQualityReduced) {
        activeQualityReduced = true;
        sceneSetup.renderer.setPixelRatio(Math.max(1, Math.min(window.devicePixelRatio || 1, 2) * 0.74));
        sceneSetup.renderer.shadowMap.enabled = false;
        sceneSetup.renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
      } else if (smoothFrames > 230 && activeQualityReduced) {
        activeQualityReduced = false;
        sceneSetup.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        sceneSetup.renderer.shadowMap.enabled = true;
        sceneSetup.renderer.setSize(mount.clientWidth || 1, mount.clientHeight || 1, false);
      }

      state.key.color.lerp(state.keyTarget, 1 - Math.exp(-delta * 1.9));
      state.hemisphere.color.lerp(state.ambientTarget, 1 - Math.exp(-delta * 1.5));
      state.hemisphere.groundColor.lerp(state.groundTarget, 1 - Math.exp(-delta * 1.5));
      state.hemisphere.intensity = damp(state.hemisphere.intensity, currentStage === 0 ? 1.68 : 1.36, 1.8, delta);
      state.redLight.intensity = damp(state.redLight.intensity, settings.red * (state.isMobile ? 2 : 1), 2.6, delta);
      state.blueLight.intensity = damp(state.blueLight.intensity, settings.blue * (state.isMobile ? 2 : 1), 2.6, delta);
      state.repairLight.intensity = damp(state.repairLight.intensity, settings.repair * (state.isMobile ? 2 : 1), 2.8, delta);
      state.key.intensity = damp(state.key.intensity, (currentStage === 0 ? 2.35 : 3.2), 1.7, delta);
      if (state.climateLed) state.climateLed.material.color.set(currentStage === 0 ? '#df5044' : currentStage === 2 ? '#f5bb5f' : '#69c7b9');
      drawFamily(state, currentStage, elapsed, delta);

      const tech = state.technician;
      const poses = [
        { visible: false, pos: [2.5, 0, 0.8], yaw: -2.4 },
        { visible: true, pos: [2.08, 0, 0.62], yaw: -2.36 },
        { visible: true, pos: [1.44, 0, -1.18], yaw: Math.PI },
        { visible: true, pos: [1.44, 0, -1.18], yaw: Math.PI },
        { visible: true, pos: [2.1, 0, 0.92], yaw: 0.72 },
      ][currentStage];
      tech.root.visible = poses.visible;
      if (poses.visible) {
        tech.root.position.x = damp(tech.root.position.x, poses.pos[0], 2.6, delta);
        tech.root.position.y = damp(tech.root.position.y, poses.pos[1] + (currentStage === 4 ? Math.sin(elapsed * 2.4) * 0.025 : 0), 3, delta);
        tech.root.position.z = damp(tech.root.position.z, poses.pos[2], 2.6, delta);
        tech.root.rotation.y += THREE.MathUtils.euclideanModulo(poses.yaw - tech.root.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
        tech.root.rotation.y = damp(tech.root.rotation.y, poses.yaw, 3.2, delta);
        tech.caseGroup.position.set(currentStage >= 2 ? 0.44 : 0.48, currentStage >= 2 ? 0.16 : 0.56, currentStage >= 2 ? 0.34 : 0.2);
        tech.arms.forEach(({ arm, side }) => {
          const target = currentStage === 2 ? side * 0.64 : currentStage === 4 && side === 1 ? 1.75 : side * 0.15;
          arm.rotation.z = damp(arm.rotation.z, target, 4.2, delta);
        });
      }

      state.sparks.points.visible = currentStage === 2;
      if (currentStage === 2) {
        const positions = state.sparks.points.geometry.attributes.position;
        for (let i = 0; i < state.sparks.count; i += 1) {
          const offset = i * 3;
          const angle = state.sparks.phase[i] + elapsed * (0.82 + (i % 7) * 0.075);
          const drift = 0.14 + ((i * 37) % 97) / 97 * 0.52;
          positions.array[offset] = 1.43 + Math.cos(angle) * drift;
          positions.array[offset + 1] = 1.55 + Math.sin(angle * 0.73) * 0.42 + ((i * 11) % 17) / 90;
          positions.array[offset + 2] = -1.53 + Math.sin(angle) * drift * 0.55;
        }
        positions.needsUpdate = true;
      }
      state.air.points.visible = currentStage === 3;
      if (currentStage === 3) {
        const positions = state.air.points.geometry.attributes.position;
        for (let i = 0; i < state.air.count; i += 1) {
          const offset = i * 3;
          const t = (i / state.air.count + elapsed * 0.13) % 1;
          const phase = state.air.phase[i];
          positions.array[offset] = -2.55 + t * 5.05;
          positions.array[offset + 1] = 1.45 + Math.sin(t * 22 + elapsed * 0.72 + phase * 0.16) * 0.26;
          positions.array[offset + 2] = -0.78 + Math.sin(t * 14 + elapsed * 0.48 + phase) * 0.92;
        }
        positions.needsUpdate = true;
      }

      if (!reducedMotion) {
        const targetX = 0.15 + pointerRef.current.x * 0.13;
        const targetY = 1.06 + pointerRef.current.y * 0.08;
        sceneSetup.cameraTarget.x = damp(sceneSetup.cameraTarget.x, targetX, 1.4, delta);
        sceneSetup.cameraTarget.y = damp(sceneSetup.cameraTarget.y, targetY, 1.4, delta);
        sceneSetup.camera.lookAt(sceneSetup.cameraTarget);
        state.room.rotation.y = damp(state.room.rotation.y, pointerRef.current.x * 0.035, 1.2, delta);
      }
      sceneSetup.renderer.render(sceneSetup.scene, sceneSetup.camera);
      if (!reducedMotion) start();
    }

    const pointerMove = (event) => {
      const bounds = mount.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pointerRef.current.set(clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1), clamp(1 - ((event.clientY - bounds.top) / bounds.height) * 2, -1, 1));
    };
    const visibilityChange = () => {
      if (document.visibilityState === 'visible') start();
      else if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    };
    const observer = new IntersectionObserver((entries) => {
      visibleRef.current = Boolean(entries[0]?.isIntersecting);
      if (visibleRef.current) start();
      else if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: '120px 0px', threshold: 0.01 });

    try {
      sceneSetup = setupScene(mount, () => setWebglUnavailable(true));
    } catch (error) {
      setWebglUnavailable(true);
      return () => {};
    }
    if (!sceneSetup) return () => {};
    setupRef.current = sceneSetup;
    observer.observe(mount);
    window.addEventListener('resize', resize, { passive: true });
    mount.addEventListener('pointermove', pointerMove, { passive: true });
    document.addEventListener('visibilitychange', visibilityChange);
    resize();
    if (reducedMotion) start();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      mount.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('visibilitychange', visibilityChange);
      if (raf) window.cancelAnimationFrame(raf);
      sceneSetup.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      sceneSetup.renderer.dispose();
      if (sceneSetup.renderer.domElement.parentElement === mount) mount.removeChild(sceneSetup.renderer.domElement);
      setupRef.current = null;
    };
  }, []);

  const selectStage = (index) => {
    setPlaying(false);
    stageRef.current = index;
    setStage(index);
    const sceneSetup = setupRef.current;
    if (sceneSetup && visibleRef.current && sceneSetup.reducedMotion) {
      const state = sceneSetup.state;
      const lights = stageTargets(index);
      const poses = [
        { pos: [2.5, 0, 0.8], yaw: -2.4 },
        { pos: [2.08, 0, 0.62], yaw: -2.36 },
        { pos: [1.44, 0, -1.18], yaw: Math.PI },
        { pos: [1.44, 0, -1.18], yaw: Math.PI },
        { pos: [2.1, 0, 0.92], yaw: 0.72 },
      ][index];
      state.key.color.set(lights.key);
      state.hemisphere.color.set(lights.ambient);
      state.hemisphere.groundColor.set(index === 0 ? '#542723' : index === 2 ? '#48341f' : '#263943');
      state.hemisphere.intensity = index === 0 ? 1.68 : 1.36;
      state.redLight.intensity = lights.red * (sceneSetup.isMobile ? 2 : 1);
      state.blueLight.intensity = lights.blue * (sceneSetup.isMobile ? 2 : 1);
      state.repairLight.intensity = lights.repair * (sceneSetup.isMobile ? 2 : 1);
      state.technician.root.visible = index > 0;
      state.technician.root.position.set(...poses.pos);
      state.technician.root.rotation.y = poses.yaw;
      state.technician.caseGroup.position.set(index >= 2 ? 0.44 : 0.48, index >= 2 ? 0.16 : 0.56, index >= 2 ? 0.34 : 0.2);
      state.technician.arms.forEach(({ arm, side }) => { arm.rotation.z = index === 2 ? side * 0.64 : index === 4 && side === 1 ? 1.75 : side * 0.15; });
      state.family.forEach((person, personIndex) => {
        person.root.position.y = 0.94;
        person.body.scale.y = 1;
        person.head.rotation.z = 0;
        person.arms.forEach(({ arm, side }) => {
          arm.rotation.z = index >= 3 && (personIndex === 0 || personIndex === 2)
            ? (personIndex === 0 ? 2.28 : -2.32)
            : side * 0.32;
        });
      });
      if (state.climateLed) state.climateLed.material.color.set(index === 0 ? '#df5044' : index === 2 ? '#f5bb5f' : '#69c7b9');
      state.sparks.points.visible = index === 2;
      state.air.points.visible = index === 3;
      sceneSetup.renderer.render(sceneSetup.scene, sceneSetup.camera);
    }
  };
  const current = CHAPTERS[stage];

  return <div className={`comfort-story-scene ${stage === 4 ? 'booking-chapter' : ''}`}>
    <div ref={mountRef} className="comfort-story-canvas" aria-hidden="true" />
    {webglUnavailable && <div className="story-fallback"><Snowflake size={22} /><span>A considered home-comfort story</span><small>Your device is showing the low-motion version of this scene.</small></div>}
    <div className="story-grain" aria-hidden="true" />
    <div className="story-topline"><span><i className="story-live-dot" /> A HOME COMFORT STORY</span><span>AN EVENING, RESTORED</span></div>
    <aside className="story-sidebar" aria-label="Choose a story chapter">
      <div className="story-sidebar-heading"><span>THE COMFORT JOURNEY</span><b>05 <i>moments</i></b></div>
      <div className="story-chapters">
        {CHAPTERS.map((chapter, index) => <button key={chapter.id} type="button" className={stage === index ? 'selected' : ''} onClick={() => selectStage(index)} aria-current={stage === index ? 'step' : undefined} aria-label={`Chapter ${chapter.number}: ${chapter.title}`}>
          <span className="story-chapter-number">{chapter.number}</span><span className="story-chapter-copy"><b>{chapter.label}</b><small>{chapter.title}</small></span><span className="story-chapter-marker" />
        </button>)}
      </div>
      <button type="button" className="story-playback" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause story animation' : 'Resume story animation'}>
        {playing ? <Pause size={12} /> : <Play size={12} />}<span>{playing ? 'PAUSE STORY' : 'RESUME STORY'}</span>
      </button>
    </aside>
    <section className="story-narration" aria-live="polite">
      <span className="story-narration-index">CHAPTER {current.number} / 05</span>
      <h2>{current.title}</h2>
      <p>{current.note}</p>
      {stage === 4 && <button type="button" className="story-cta" onClick={onOpenChat}>Talk to Elena <ArrowUpRight size={14} /></button>}
    </section>
    <div className="story-footer"><span>ISOMETRIC HOME STUDY / VERTICE THERMAL</span><span>SELECT A MOMENT TO EXPLORE</span></div>
    <span className="scene-screen-reader" aria-live="polite">{current.title}. {current.note}</span>
  </div>;
}
