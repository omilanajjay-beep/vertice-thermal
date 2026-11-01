'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { HomeownerReview } from '../lib/reviews';

export type StoryStep = 'diagnostics' | 'repair' | 'comfort' | 'reviews' | 'booking';

type PhotorealMotion = { src: string; poster: string };

const motionSources: Partial<Record<StoryStep, PhotorealMotion>> = {
  repair: { src: '/video/room-repair.mp4', poster: '/video/room-repair-poster.jpg' },
  comfort: { src: '/video/room-comfort.mp4', poster: '/video/room-comfort-poster.jpg' },
  reviews: { src: '/video/room-reviews.mp4', poster: '/video/room-reviews-poster.jpg' },
  booking: { src: '/video/room-dispatch.mp4', poster: '/video/room-dispatch-poster.jpg' },
};

type CharacterRig = {
  root: THREE.Group;
  body: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  rightHand: THREE.Mesh;
  leftHand: THREE.Mesh;
};

type AnimatedProp = {
  object: THREE.Object3D;
  phase: number;
  height: number;
  scale: number;
};

function makeStandard(color: number | string, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  position: THREE.Vector3,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.copy(position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  parent.add(mesh);
  return mesh;
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  material: THREE.Material,
  position: THREE.Vector3,
  scale = new THREE.Vector3(1, 1, 1),
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 16), material);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  position: THREE.Vector3,
  radialSegments = 16,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeScreenTexture(title: string, values: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 600;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#182027');
  gradient.addColorStop(1, '#101518');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(166,207,202,.22)';
  context.lineWidth = 3;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.fillStyle = '#b7d8d3';
  context.font = '500 34px Arial, sans-serif';
  context.fillText(title.toUpperCase(), 58, 91);
  context.fillStyle = '#71827f';
  context.fillRect(58, 117, canvas.width - 116, 2);
  context.font = '600 74px Arial, sans-serif';
  context.fillStyle = '#eef2e8';
  context.fillText(values[0], 58, 258);
  context.font = '400 26px Arial, sans-serif';
  context.fillStyle = '#97b6ae';
  context.fillText('LOW-SIDE PRESSURE', 61, 302);
  context.font = '600 65px Arial, sans-serif';
  context.fillStyle = '#e9a762';
  context.fillText(values[1], 500, 258);
  context.font = '400 26px Arial, sans-serif';
  context.fillStyle = '#b08e69';
  context.fillText('HIGH-SIDE PRESSURE', 503, 302);
  context.strokeStyle = 'rgba(205,174,126,.44)';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(60, 384);
  context.lineTo(838, 384);
  context.stroke();
  context.font = '500 25px Arial, sans-serif';
  context.fillStyle = '#d4d8cc';
  context.fillText('SYSTEM CHECK', 60, 438);
  context.fillStyle = '#82c5b6';
  context.fillText('STABLE  /  LIVE READINGS', 60, 493);
  context.fillStyle = '#e5b66f';
  context.beginPath();
  context.arc(790, 472, 22, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeReviewTexture(review: HomeownerReview) {
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 760;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, 'rgba(255,253,247,.98)');
  background.addColorStop(1, 'rgba(240,234,221,.98)');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(156,126,76,.5)';
  context.lineWidth = 4;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.fillStyle = '#856b42';
  context.font = '500 22px Arial, sans-serif';
  context.fillText('HOMEOWNER NOTE  /  VERIFIED VISIT', 62, 86);
  context.fillStyle = '#ad8748';
  context.font = 'bold 40px Georgia, serif';
  context.fillText('★★★★★', 60, 155);
  context.fillStyle = '#31463d';
  context.font = '600 42px Georgia, serif';
  const titleLines = wrapText(context, review.headline, 970, 2);
  titleLines.forEach((line, index) => context.fillText(line, 62, 231 + index * 54));
  context.fillStyle = 'rgba(66,83,73,.88)';
  context.font = '400 25px Arial, sans-serif';
  const excerpt = review.body.length > 184 ? `${review.body.slice(0, 181).trimEnd()}…` : review.body;
  const excerptLines = wrapText(context, excerpt, 970, 4);
  excerptLines.forEach((line, index) => context.fillText(line, 62, 370 + index * 39));
  context.strokeStyle = 'rgba(70,86,74,.22)';
  context.beginPath();
  context.moveTo(62, 570);
  context.lineTo(1038, 570);
  context.stroke();
  context.fillStyle = '#31463d';
  context.font = '600 27px Arial, sans-serif';
  context.fillText(review.name, 62, 632);
  context.fillStyle = '#826b46';
  context.font = '400 21px Arial, sans-serif';
  context.fillText(`${review.location}  /  ${review.displayDate}`, 62, 680);
  context.fillStyle = '#557c68';
  context.font = '500 17px Arial, sans-serif';
  context.fillText(review.category.toUpperCase(), 62, 724);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = `${last.replace(/[.,;:!?…]?$/, '')}…`;
  }
  return lines;
}

function addManifold(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.position.set(0, 1.1, 0);
  scene.add(root);
  const shellMaterial = makeStandard('#23292d', 0.12, 0.95);
  const edgeMaterial = makeStandard('#ef8747', 0.16, 0.9);
  const rubberMaterial = makeStandard('#101416', 0.63, 0.12);
  const brassMaterial = makeStandard('#d6a456', 0.12, 0.95);
  const silverMaterial = makeStandard('#c4c8c4', 0.12, 0.95);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: makeScreenTexture('Digital manifold', ['118.4 psi', '247.8 psi']) });

  addBox(root, 2.15, 2.42, 0.58, shellMaterial, new THREE.Vector3(0, 0.54, 0));
  addBox(root, 1.79, 2.13, 0.075, rubberMaterial, new THREE.Vector3(0, 0.56, 0.33));
  addBox(root, 0.25, 2.12, 0.2, edgeMaterial, new THREE.Vector3(-0.99, 0.56, 0.25));
  addBox(root, 0.25, 2.12, 0.2, edgeMaterial, new THREE.Vector3(0.99, 0.56, 0.25));
  addBox(root, 1.24, 0.91, 0.045, makeStandard('#10181a', 0.18, 0.18), new THREE.Vector3(0, 0.88, 0.386));
  addBox(root, 1.16, 0.82, 0.025, screenMaterial, new THREE.Vector3(0, 0.89, 0.414), { castShadow: false, receiveShadow: false });
  addBox(root, 1.12, 0.06, 0.05, silverMaterial, new THREE.Vector3(0, -0.03, 0.39));

  const buttonMaterial = makeStandard('#ed8d4e', 0.28, 0.25);
  const buttonPositions = [
    [-0.58, -0.26], [-0.2, -0.26], [0.2, -0.26], [0.58, -0.26],
    [-0.55, -0.52], [0.55, -0.52],
  ];
  buttonPositions.forEach(([x, y], index) => {
    addBox(root, index < 4 ? 0.24 : 0.3, 0.12, 0.08, buttonMaterial, new THREE.Vector3(x, y, 0.42));
  });

  [-0.48, 0.48].forEach((x, index) => {
    const dial = addCylinder(root, 0.33, 0.37, 0.31, rubberMaterial, new THREE.Vector3(x, -0.97, 0.39), 32);
    dial.rotation.x = Math.PI / 2;
    addCylinder(root, 0.13, 0.14, 0.034, index === 0 ? makeStandard('#252b30', 0.2, 0.6) : makeStandard('#252b30', 0.2, 0.6), new THREE.Vector3(x, -0.97, 0.56), 24);
  });

  [-0.68, -0.22, 0.22, 0.68].forEach((x, index) => {
    const stem = addCylinder(root, index === 0 || index === 3 ? 0.11 : 0.14, 0.16, 0.42, brassMaterial, new THREE.Vector3(x, -1.42, 0.02), 24);
    stem.rotation.x = Math.PI / 2;
    const collar = addCylinder(root, 0.17, 0.17, 0.09, silverMaterial, new THREE.Vector3(x, -1.4, 0.18), 24);
    collar.rotation.x = Math.PI / 2;
    if (index !== 1) {
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, -1.49, 0.04),
        new THREE.Vector3(x + (index < 2 ? -0.22 : 0.22), -1.94, 0.02),
        new THREE.Vector3(x + (index < 2 ? -0.48 : 0.48), -2.15, 0.06),
        new THREE.Vector3(x + (index < 2 ? -0.62 : 0.62), -1.83, 0.03),
      ]);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 30, 0.036, 8, false), rubberMaterial);
      hose.castShadow = true;
      root.add(hose);
    }
  });

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.008, 6, 128),
    new THREE.MeshBasicMaterial({ color: '#c4ab82', transparent: true, opacity: 0.54 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.42;
  root.add(halo);
  return root;
}

function addWindow(parent: THREE.Object3D, x: number, y: number, z: number) {
  const frame = makeStandard('#f0eee7', 0.48, 0.06);
  const glass = new THREE.MeshStandardMaterial({ color: '#a8cccf', roughness: 0.2, metalness: 0.08, emissive: '#2f6271', emissiveIntensity: 0.16 });
  addBox(parent, 1.6, 1.35, 0.13, frame, new THREE.Vector3(x, y, z));
  addBox(parent, 1.42, 1.17, 0.035, glass, new THREE.Vector3(x, y, z + 0.079));
  addBox(parent, 0.045, 1.17, 0.03, frame, new THREE.Vector3(x, y, z + 0.105));
  addBox(parent, 1.42, 0.045, 0.03, frame, new THREE.Vector3(x, y, z + 0.105));
  addBox(parent, 1.72, 0.11, 0.2, frame, new THREE.Vector3(x, y - 0.72, z + 0.03));
}

function addWallUnit(parent: THREE.Object3D, x: number, y: number, z: number, lightMaterial: THREE.Material) {
  const unitMaterial = makeStandard('#f0eee8', 0.5, 0.04);
  const insetMaterial = makeStandard('#c4c8c5', 0.67, 0.04);
  addBox(parent, 1.55, 0.38, 0.42, unitMaterial, new THREE.Vector3(x, y, z));
  addBox(parent, 1.28, 0.065, 0.06, insetMaterial, new THREE.Vector3(x, y - 0.12, z + 0.232));
  for (let index = 0; index < 8; index += 1) {
    addBox(parent, 0.035, 0.045, 0.012, makeStandard('#818887', 0.66, 0.03), new THREE.Vector3(x - 0.48 + index * 0.135, y - 0.12, z + 0.27));
  }
  const signal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), lightMaterial);
  signal.position.set(x + 0.64, y + 0.07, z + 0.23);
  parent.add(signal);
}

function addSofa(parent: THREE.Object3D) {
  const base = makeStandard('#a5917c', 0.86, 0.02);
  const cushion = makeStandard('#e0d3bf', 0.94, 0);
  const accent = makeStandard('#eee2cf', 0.94, 0);
  addBox(parent, 2.25, 0.38, 0.94, base, new THREE.Vector3(0.86, 0.55, 0.77));
  addBox(parent, 2.25, 0.84, 0.23, base, new THREE.Vector3(0.86, 0.95, 0.33));
  addBox(parent, 0.28, 0.68, 0.91, base, new THREE.Vector3(-0.26, 0.77, 0.72));
  addBox(parent, 0.28, 0.68, 0.91, base, new THREE.Vector3(1.98, 0.77, 0.72));
  addBox(parent, 1.74, 0.15, 0.68, cushion, new THREE.Vector3(0.86, 0.78, 0.87));
  addBox(parent, 0.66, 0.38, 0.12, accent, new THREE.Vector3(0.33, 1.13, 0.46));
  addBox(parent, 0.66, 0.38, 0.12, makeStandard('#b9c8bc', 0.94, 0), new THREE.Vector3(1.32, 1.13, 0.46));
  for (const x of [-0.08, 1.8]) {
    addCylinder(parent, 0.045, 0.06, 0.42, makeStandard('#51473d', 0.58, 0.06), new THREE.Vector3(x, 0.23, 0.46), 10);
  }
}

function addPlant(parent: THREE.Object3D, x: number, z: number) {
  const pot = makeStandard('#b27c57', 0.78, 0.02);
  const leaf = makeStandard('#718b69', 0.82, 0);
  addCylinder(parent, 0.17, 0.24, 0.4, pot, new THREE.Vector3(x, 0.22, z), 18);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const sprig = addSphere(parent, 0.22, leaf, new THREE.Vector3(x + Math.cos(angle) * 0.19, 0.74 + (index % 2) * 0.1, z + Math.sin(angle) * 0.15), new THREE.Vector3(0.43, 1.4, 0.24));
    sprig.rotation.z = -Math.cos(angle) * 0.4;
  }
  addCylinder(parent, 0.022, 0.025, 0.48, makeStandard('#53654c', 0.9, 0), new THREE.Vector3(x, 0.68, z), 8);
}

function addRoom(scene: THREE.Scene, isWarm: boolean) {
  const room = new THREE.Group();
  scene.add(room);
  const floor = makeStandard('#ddc7a4', 0.83, 0.02);
  const wall = makeStandard('#f5f1e7', 0.93, 0.01);
  const trim = makeStandard('#fffaf0', 0.79, 0.02);
  const darkTrim = makeStandard('#756859', 0.77, 0.02);
  const rug = makeStandard('#eee8db', 0.98, 0);
  const screen = new THREE.MeshStandardMaterial({ color: isWarm ? '#6b3932' : '#19363b', emissive: isWarm ? '#a7372a' : '#2d9ca6', emissiveIntensity: isWarm ? 0.72 : 0.5, roughness: 0.25 });
  const wallSignal = new THREE.MeshStandardMaterial({ color: isWarm ? '#ff8872' : '#9be7ed', emissive: isWarm ? '#e84d38' : '#49bdce', emissiveIntensity: 1.5 });

  addBox(room, 7.65, 0.2, 5.75, floor, new THREE.Vector3(0, -0.1, 0));
  addBox(room, 7.65, 3.55, 0.16, wall, new THREE.Vector3(0, 1.76, -2.88));
  addBox(room, 0.16, 3.55, 5.75, wall, new THREE.Vector3(-3.82, 1.76, 0));
  addBox(room, 7.65, 0.12, 0.2, trim, new THREE.Vector3(0, 0.06, -2.74));
  addBox(room, 0.2, 0.12, 5.75, trim, new THREE.Vector3(-3.72, 0.06, 0));
  addBox(room, 1.88, 0.09, 1.3, rug, new THREE.Vector3(0.95, 0.014, 0.43), { castShadow: false });

  for (let index = 0; index < 12; index += 1) {
    const plank = addBox(room, 0.57, 0.012, 5.55, makeStandard(index % 2 ? '#d8ba91' : '#cbaa7c', 0.88, 0), new THREE.Vector3(-3.34 + index * 0.61, 0.009, 0), { castShadow: false, receiveShadow: true });
    plank.position.y = 0.008;
  }
  for (let index = 0; index < 6; index += 1) {
    addBox(room, 7.5, 0.008, 0.016, makeStandard('#b28e65', 0.93, 0), new THREE.Vector3(0, 0.018, -2.26 + index * 0.91), { castShadow: false, receiveShadow: false });
  }

  addWindow(room, 2.38, 2.05, -2.77);
  addWallUnit(room, -0.42, 2.62, -2.64, wallSignal);
  addBox(room, 0.5, 0.68, 0.12, darkTrim, new THREE.Vector3(-2.92, 1.78, -2.74));
  addBox(room, 0.39, 0.55, 0.055, screen, new THREE.Vector3(-2.92, 1.78, -2.66));
  addBox(room, 0.28, 0.022, 0.018, makeStandard('#dfe3d8', 0.45, 0), new THREE.Vector3(-2.92, 1.73, -2.624));
  addBox(room, 1.04, 0.12, 0.34, makeStandard('#745d4a', 0.82, 0), new THREE.Vector3(-2.14, 0.9, -2.35));
  addBox(room, 1.1, 0.72, 0.36, makeStandard('#947960', 0.82, 0), new THREE.Vector3(-2.14, 0.48, -2.35));
  addBox(room, 0.62, 0.05, 0.24, makeStandard('#313637', 0.43, 0.12), new THREE.Vector3(-2.1, 0.89, -2.12));

  addSofa(room);
  addBox(room, 1.42, 0.1, 0.62, makeStandard('#846e59', 0.73, 0.03), new THREE.Vector3(0.87, 0.43, -0.58));
  for (const x of [0.32, 1.42]) addCylinder(room, 0.045, 0.055, 0.45, makeStandard('#5a4f42', 0.59, 0.1), new THREE.Vector3(x, 0.21, -0.58), 10);
  addBox(room, 0.44, 0.07, 0.3, makeStandard('#d2c2a8', 0.44, 0.02), new THREE.Vector3(0.86, 0.53, -0.58));
  addPlant(room, 2.92, -2.12);
  addPlant(room, -3.06, 1.94);
  addBox(room, 0.46, 0.45, 0.18, makeStandard('#e0ddd3', 0.44, 0.03), new THREE.Vector3(-3.35, 1.68, 0.25));
  addBox(room, 0.34, 0.04, 0.1, makeStandard('#85908b', 0.54, 0.08), new THREE.Vector3(-3.28, 1.46, 0.25));

  const consoleMaterial = makeStandard('#d5d5ce', 0.56, 0.08);
  addBox(room, 0.74, 0.54, 0.55, consoleMaterial, new THREE.Vector3(-1.18, 0.3, 1.0));
  addBox(room, 0.58, 0.07, 0.035, makeStandard('#232b2e', 0.35, 0.18), new THREE.Vector3(-1.18, 0.49, 1.285));
  for (let index = 0; index < 5; index += 1) {
    addBox(room, 0.035, 0.25, 0.018, makeStandard('#777e7c', 0.66, 0.08), new THREE.Vector3(-1.38 + index * 0.1, 0.15, 1.285));
  }
  addSphere(room, 0.055, wallSignal, new THREE.Vector3(-0.88, 0.52, 1.31));

  return room;
}

function addLimb(parent: THREE.Object3D, radius: number, length: number, material: THREE.Material, y: number) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCharacter(
  scene: THREE.Scene,
  options: { x: number; z: number; coat: string; pants: string; skin: string; hair: string; scale?: number },
): CharacterRig {
  const root = new THREE.Group();
  root.position.set(options.x, 0, options.z);
  root.scale.setScalar(options.scale ?? 1);
  scene.add(root);
  const body = new THREE.Group();
  root.add(body);
  const coat = makeStandard(options.coat, 0.76, 0.02);
  const pants = makeStandard(options.pants, 0.83, 0.02);
  const skin = makeStandard(options.skin, 0.85, 0.01);
  const hair = makeStandard(options.hair, 0.86, 0.01);
  const shoe = makeStandard('#42413d', 0.68, 0.05);
  const highlight = makeStandard('#e1d6bb', 0.8, 0.02);

  addLimb(body, 0.17, 0.34, pants, 0.42).position.x = -0.16;
  addLimb(body, 0.17, 0.34, pants, 0.42).position.x = 0.16;
  addBox(body, 0.35, 0.13, 0.46, shoe, new THREE.Vector3(-0.16, 0.1, 0.1));
  addBox(body, 0.35, 0.13, 0.46, shoe, new THREE.Vector3(0.16, 0.1, 0.1));
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.4, 5, 12), coat);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  body.add(torso);
  addBox(body, 0.38, 0.09, 0.025, highlight, new THREE.Vector3(0, 0.96, 0.285));
  const neck = addCylinder(body, 0.09, 0.1, 0.16, skin, new THREE.Vector3(0, 1.39, 0), 14);
  neck.castShadow = true;
  addSphere(body, 0.27, skin, new THREE.Vector3(0, 1.66, 0.015), new THREE.Vector3(0.92, 1, 0.82));
  addSphere(body, 0.25, hair, new THREE.Vector3(0, 1.82, -0.015), new THREE.Vector3(1, 0.48, 0.87));

  const eyeMaterial = makeStandard('#25292a', 0.47, 0.02);
  addSphere(body, 0.025, eyeMaterial, new THREE.Vector3(-0.075, 1.68, 0.234), new THREE.Vector3(1, 0.9, 0.55));
  addSphere(body, 0.025, eyeMaterial, new THREE.Vector3(0.075, 1.68, 0.234), new THREE.Vector3(1, 0.9, 0.55));
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 1.57, 0.232),
    new THREE.Vector3(0, 1.54, 0.245),
    new THREE.Vector3(0.075, 1.57, 0.232),
  ]);
  const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 10, 0.012, 5, false), eyeMaterial);
  body.add(smile);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.27, 1.3, 0);
  body.add(rightArm);
  addLimb(rightArm, 0.105, 0.24, coat, -0.16);
  addLimb(rightArm, 0.09, 0.22, skin, -0.47);
  const rightHand = addSphere(rightArm, 0.105, skin, new THREE.Vector3(0, -0.66, 0.025));
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.27, 1.3, 0);
  body.add(leftArm);
  addLimb(leftArm, 0.105, 0.24, coat, -0.16);
  addLimb(leftArm, 0.09, 0.22, skin, -0.47);
  const leftHand = addSphere(leftArm, 0.105, skin, new THREE.Vector3(0, -0.66, 0.025));

  if (options.coat === '#5e817f' || options.coat === '#4c6d70') {
    addBox(body, 0.12, 0.26, 0.045, makeStandard('#dfa95e', 0.67, 0.01), new THREE.Vector3(0.16, 1.04, 0.25));
    addSphere(body, 0.052, makeStandard('#c7a865', 0.56, 0.02), new THREE.Vector3(-0.16, 1.31, 0.28));
  }

  return { root, body, rightArm, leftArm, rightHand, leftHand };
}

function addToolbox(parent: THREE.Object3D, position: THREE.Vector3) {
  const caseMaterial = makeStandard('#4a5556', 0.3, 0.55);
  const edgeMaterial = makeStandard('#d5a354', 0.2, 0.91);
  const boxGroup = new THREE.Group();
  boxGroup.position.copy(position);
  parent.add(boxGroup);
  addBox(boxGroup, 0.64, 0.38, 0.36, caseMaterial, new THREE.Vector3(0, 0, 0));
  addBox(boxGroup, 0.69, 0.055, 0.4, edgeMaterial, new THREE.Vector3(0, 0.2, 0));
  addBox(boxGroup, 0.09, 0.13, 0.025, edgeMaterial, new THREE.Vector3(0, 0.02, 0.19));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 20, Math.PI), edgeMaterial);
  handle.position.set(0, 0.31, 0);
  handle.rotation.z = Math.PI;
  boxGroup.add(handle);
  return boxGroup;
}

function addAirflow(scene: THREE.Scene) {
  const curves = [
    new THREE.CatmullRomCurve3([new THREE.Vector3(-0.25, 2.54, -2.18), new THREE.Vector3(-0.35, 2.28, -1.12), new THREE.Vector3(0.26, 2.08, -0.25), new THREE.Vector3(0.66, 2.12, 0.72)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, 2.52, -2.16), new THREE.Vector3(-0.78, 2.15, -1.2), new THREE.Vector3(-1.04, 1.84, -0.2), new THREE.Vector3(-0.65, 1.8, 0.7)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 2.51, -2.15), new THREE.Vector3(0.35, 2.22, -1.15), new THREE.Vector3(1.02, 2.02, -0.4), new THREE.Vector3(1.42, 1.91, 0.45)]),
  ];
  const lineMaterial = new THREE.MeshBasicMaterial({ color: '#7fe4ef', transparent: true, opacity: 0.46, depthWrite: false });
  const particleMaterial = new THREE.MeshBasicMaterial({ color: '#c7fbff', transparent: true, opacity: 0.9 });
  const particles: AnimatedProp[] = [];
  curves.forEach((curve) => {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 5, false), lineMaterial);
    scene.add(tube);
    for (let index = 0; index < 8; index += 1) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (index % 3) * 0.006, 9, 8), particleMaterial);
      scene.add(particle);
      particles.push({ object: particle, phase: index / 8, height: 0, scale: 1 });
    }
  });
  return (time: number) => {
    particles.forEach((particle, index) => {
      const curve = curves[Math.floor(index / 8)];
      const t = (particle.phase + time * 0.055) % 1;
      particle.object.position.copy(curve.getPoint(t));
      const pulse = 0.78 + Math.sin(time * 2.8 + index) * 0.22;
      particle.object.scale.setScalar(pulse);
    });
  };
}

function addSparks(scene: THREE.Scene) {
  const sparks: AnimatedProp[] = [];
  const material = new THREE.MeshBasicMaterial({ color: '#ffd085', transparent: true, opacity: 0.95 });
  const center = new THREE.Vector3(-1.08, 0.82, 1.21);
  for (let index = 0; index < 14; index += 1) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018 + (index % 3) * 0.009, 8, 8), material);
    dot.position.copy(center);
    scene.add(dot);
    sparks.push({ object: dot, phase: index * 0.72, height: 0.55 + (index % 4) * 0.1, scale: 0.55 + (index % 3) * 0.28 });
  }
  return (time: number) => {
    sparks.forEach((spark, index) => {
      const cycle = (time * 0.8 + spark.phase) % 2.2;
      const rise = cycle / 2.2;
      spark.object.position.set(center.x + Math.sin(time * 5 + index) * 0.15 * rise, center.y + rise * spark.height, center.z + Math.cos(time * 4 + index) * 0.09);
      const visibility = Math.sin(Math.min(cycle / 0.16, 1) * Math.PI) * (1 - rise * 0.35);
      spark.object.scale.setScalar(Math.max(0.06, visibility * spark.scale));
    });
  };
}

function addSunlitDust(scene: THREE.Scene, count: number) {
  const positions = new Float32Array(count * 3);
  const origins: Array<[number, number, number]> = [];
  const phases: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = ((index * 37) % 101) / 100 * 4.8 - 2.4;
    const y = ((index * 61) % 97) / 96 * 3.6 - 1.8;
    const z = 1.2 + ((index * 43) % 89) / 88 * 2.3;
    origins.push([x, y, z]);
    phases.push((index * 2.399) % (Math.PI * 2));
    positions.set([x, y, z], index * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#fff8e7', size: 0.036, transparent: true, opacity: 0.28, depthWrite: false, sizeAttenuation: true });
  const motes = new THREE.Points(geometry, material);
  motes.frustumCulled = false;
  scene.add(motes);
  return (time: number) => {
    for (let index = 0; index < count; index += 1) {
      const [x, y, z] = origins[index];
      const phase = phases[index];
      positions[index * 3] = x + Math.sin(time * 0.22 + phase) * 0.045;
      positions[index * 3 + 1] = y + Math.cos(time * 0.19 + phase) * 0.07;
      positions[index * 3 + 2] = z + Math.sin(time * 0.16 + phase) * 0.035;
    }
    geometry.attributes.position.needsUpdate = true;
  };
}

function addReviewBoard(scene: THREE.Scene, review: HomeownerReview) {
  const board = new THREE.Group();
  board.position.set(2.44, 1.8, -1.52);
  board.rotation.y = -0.18;
  scene.add(board);
  const glass = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.26, metalness: 0.08, transparent: true, opacity: 0.94, emissive: '#f7f2e6', emissiveIntensity: 0.3 });
  const gold = makeStandard('#c8a66c', 0.22, 0.42);
  addBox(board, 2.4, 1.66, 0.095, glass, new THREE.Vector3(0, 0, 0));
  const texture = makeReviewTexture(review);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.54), new THREE.MeshBasicMaterial({ map: texture, transparent: false }));
  face.position.z = 0.052;
  board.add(face);
  for (const x of [-1.16, 1.16]) {
    const rail = addBox(board, 0.03, 1.68, 0.04, gold, new THREE.Vector3(x, 0, 0.04));
    rail.castShadow = false;
  }
  const halo = new THREE.PointLight('#e8c78d', 0.52, 3.7, 2);
  halo.position.set(0, 0.15, 0.7);
  board.add(halo);
  return board;
}

function setupRoomScene(scene: THREE.Scene, step: StoryStep, review: HomeownerReview, photorealMotion: boolean) {
  if (photorealMotion) {
    const updateDust = addSunlitDust(scene, step === 'reviews' ? 20 : 34);
    return { rigs: [] as CharacterRig[], update: updateDust };
  }

  const warm = step === 'repair';
  addRoom(scene, warm);
  const rigs: CharacterRig[] = [];
  let updateAirflow: ((time: number) => void) | null = null;
  let updateSparks: ((time: number) => void) | null = null;

  if (step === 'repair') {
    const technician = addCharacter(scene, { x: -1.65, z: 0.72, coat: '#4c6d70', pants: '#343d40', skin: '#c38b6b', hair: '#3e3731', scale: 1.04 });
    technician.body.rotation.z = -0.12;
    technician.rightArm.rotation.z = 0.76;
    technician.leftArm.rotation.z = -0.42;
    rigs.push(technician);
    updateSparks = addSparks(scene);
  }

  if (step === 'comfort' || step === 'reviews') {
    const technician = addCharacter(scene, { x: -1.25, z: 0.9, coat: '#4c6d70', pants: '#343d40', skin: '#c38b6b', hair: '#3e3731', scale: 0.98 });
    const parentOne = addCharacter(scene, { x: 0.24, z: 1.22, coat: '#d3a887', pants: '#5a6464', skin: '#c99477', hair: '#4b3b32', scale: 1.03 });
    const parentTwo = addCharacter(scene, { x: 1.11, z: 1.28, coat: '#8b9c81', pants: '#454f4c', skin: '#d8ac8b', hair: '#604b38', scale: 0.98 });
    const child = addCharacter(scene, { x: 1.95, z: 1.36, coat: '#c6bd8d', pants: '#5d7180', skin: '#e1b797', hair: '#765439', scale: 0.76 });
    parentOne.rightArm.rotation.z = 0.72;
    parentTwo.rightArm.rotation.z = 0.72;
    child.rightArm.rotation.z = 0.88;
    rigs.push(technician, parentOne, parentTwo, child);
    updateAirflow = addAirflow(scene);
    if (step === 'reviews') addReviewBoard(scene, review);
  }

  if (step === 'booking') {
    const technician = addCharacter(scene, { x: 0.1, z: 2.0, coat: '#4c6d70', pants: '#343d40', skin: '#c38b6b', hair: '#3e3731', scale: 1.12 });
    technician.rightArm.rotation.z = 1.16;
    technician.leftArm.rotation.z = -0.34;
    addToolbox(technician.root, new THREE.Vector3(0.46, 0.54, 0.2));
    rigs.push(technician);
    updateAirflow = addAirflow(scene);
  }

  return {
    rigs,
    update(time: number) {
      if (updateAirflow) updateAirflow(time);
      if (updateSparks) updateSparks(time);
      rigs.forEach((rig, index) => {
        rig.root.position.y = Math.sin(time * 1.25 + index * 1.7) * 0.025;
        rig.body.rotation.z = Math.sin(time * 1.3 + index * 0.8) * 0.015;
        if (step === 'comfort' || step === 'reviews') {
          if (index > 0) rig.rightArm.rotation.z = 0.68 + Math.sin(time * 2.7 + index) * 0.2;
        }
        if (step === 'repair' && index === 0) {
          rig.rightArm.rotation.z = 0.74 + Math.sin(time * 4.5) * 0.12;
          rig.leftArm.rotation.z = -0.42 + Math.sin(time * 3.4 + 1) * 0.08;
        }
        if (step === 'booking' && index === 0) {
          const arrivalProgress = 1 - Math.pow(1 - Math.min(time / 1.8, 1), 3);
          rig.root.position.z = 1.18 + arrivalProgress * 0.82;
          rig.rightArm.rotation.z = 1.12 + Math.sin(time * 1.5) * 0.035;
        }
      });
    },
  };
}

function addDiagnosticPedestal(scene: THREE.Scene) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 96),
    new THREE.MeshStandardMaterial({ color: '#e8e2d5', roughness: 0.55, metalness: 0.08, transparent: true, opacity: 0.82 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.28;
  ground.receiveShadow = true;
  scene.add(ground);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.45, 0.22, 80),
    makeStandard('#c8b892', 0.22, 0.42),
  );
  pedestal.position.y = -1.22;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: '#d8b87f', transparent: true, opacity: 0.78 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.08;
  scene.add(ring);
  const underRing = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.008, 6, 96), new THREE.MeshBasicMaterial({ color: '#8fb4b6', transparent: true, opacity: 0.56 }));
  underRing.rotation.x = Math.PI / 2;
  underRing.position.y = -1.05;
  scene.add(underRing);
}

export default function StoryScene({ step, review }: { step: StoryStep; review: HomeownerReview }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const motionSource = motionSources[step] ?? null;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrame = 0;
    let active = true;
    let disposed = false;
    let elapsed = 0;
    let lastTime = 0;
    let roomUpdater: ReturnType<typeof setupRoomScene> | null = null;
    let device: THREE.Group | null = null;
    let environmentTexture: THREE.Texture | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const projectedHandPosition = new THREE.Vector3();
    const reviewSweepOffset = new THREE.Vector3(1.1, 0.25, -0.7);
    const scene = new THREE.Scene();
    const backdrop = step === 'repair' ? '#f5e4dc' : step === 'diagnostics' ? '#f7f4ed' : '#e9f2ee';
    const backgroundVideo = mount.querySelector<HTMLVideoElement>('.story-photoreal-video');
    scene.background = motionSource ? null : new THREE.Color(backdrop);
    scene.fog = motionSource ? null : new THREE.Fog(backdrop, 14, 28);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 70);
    let cameraBasePosition = new THREE.Vector3(7.15, 5.25, 8.2);
    let cameraTarget = new THREE.Vector3(0, 0.85, 0);
    if (step === 'diagnostics') {
      cameraBasePosition = new THREE.Vector3(0, 2.1, 10.8);
      cameraTarget = new THREE.Vector3(0, 0.7, 0);
    } else if (motionSource) {
      cameraBasePosition = new THREE.Vector3(0, 0, 10);
      cameraTarget = new THREE.Vector3(0, 0, 0);
    } else if (step === 'reviews') {
      cameraBasePosition = new THREE.Vector3(7.05, 5.35, 8.05);
      cameraTarget = new THREE.Vector3(0.3, 0.88, -0.03);
    }
    camera.position.copy(cameraBasePosition);
    camera.lookAt(cameraTarget);

    const ambient = new THREE.HemisphereLight(step === 'repair' ? '#ffd0bd' : '#fffaf0', '#999080', step === 'repair' ? 1.9 : 1.65);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(step === 'repair' ? '#ffddc2' : '#fff8e8', 2.4);
    key.position.set(-4.6, 8.2, 5.1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.00018;
    scene.add(key);
    const fill = new THREE.DirectionalLight(step === 'repair' ? '#df7563' : '#93d5d0', step === 'repair' ? 0.85 : 0.95);
    fill.position.set(5.5, 3.5, 2.4);
    scene.add(fill);
    const rim = new THREE.PointLight(step === 'repair' ? '#e87763' : '#a2ded9', step === 'repair' ? 1.7 : 1.35, 16, 2);
    rim.position.set(-2.6, 3.9, -2.3);
    scene.add(rim);
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      if (event.matches) backgroundVideo?.pause();
      else void backgroundVideo?.play().catch(() => undefined);
    };
    reducedMotionQuery.addEventListener('change', onMotionPreferenceChange);
    if (prefersReducedMotion) backgroundVideo?.pause();
    else void backgroundVideo?.play().catch(() => undefined);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: Boolean(motionSource), powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
      renderer.setClearColor(motionSource ? 0x000000 : backdrop, motionSource ? 0 : 1);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      if (motionSource) renderer.domElement.className = 'story-photoreal-overlay';
      mount.appendChild(renderer.domElement);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnvironment = new RoomEnvironment();
      environmentTexture = pmrem.fromScene(roomEnvironment, 0.04).texture;
      scene.environment = environmentTexture;
      roomEnvironment.dispose();
      pmrem.dispose();
      if (step === 'diagnostics') {
        addDiagnosticPedestal(scene);
        device = addManifold(scene);
        const topLight = new THREE.SpotLight('#fff3d0', 145, 16, Math.PI / 6, 0.58, 1.5);
        topLight.position.set(-4.8, 5.8, 4.4);
        topLight.target.position.set(0, 0.5, 0);
        scene.add(topLight, topLight.target);
      } else {
        roomUpdater = setupRoomScene(scene, step, review, Boolean(motionSource));
      }
      setWebglUnavailable(false);
    } catch {
      setWebglUnavailable(true);
      return () => {
        reducedMotionQuery.removeEventListener('change', onMotionPreferenceChange);
        renderer?.dispose();
        renderer?.forceContextLoss();
      };
    }

    const flushResources = () => {
      if (disposed) return;
      disposed = true;
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            const mapped = material as THREE.Material & { map?: THREE.Texture; emissiveMap?: THREE.Texture };
            mapped.map?.dispose();
            mapped.emissiveMap?.dispose();
            material.dispose();
          });
        }
      });
      environmentTexture?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };

    const resize = () => {
      if (!renderer || !mount) return;
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const framingRatio = step === 'diagnostics' ? 0.88 : 1.3;
      const fitFactor = Math.max(1, framingRatio / camera.aspect);
      camera.position.copy(cameraBasePosition).sub(cameraTarget).multiplyScalar(fitFactor).add(cameraTarget);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const render = (now: number) => {
      if (!renderer || disposed || !active) return;
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
      lastTime = now;
      if (!prefersReducedMotion) {
        elapsed += delta;
        if (step === 'reviews') {
          const sweepProgress = 1 - Math.pow(1 - Math.min(elapsed / 2.4, 1), 3);
          const fitFactor = Math.max(1, 1.3 / camera.aspect);
          camera.position.copy(cameraBasePosition).addScaledVector(reviewSweepOffset, 1 - sweepProgress).sub(cameraTarget).multiplyScalar(fitFactor).add(cameraTarget);
          camera.lookAt(cameraTarget);
        }
        if (device) {
          device.rotation.y = elapsed * 0.48;
          device.rotation.x = Math.sin(elapsed * 0.52) * 0.055;
          device.position.y = 1.1 + Math.sin(elapsed * 1.35) * 0.055;
        }
        roomUpdater?.update(elapsed);
      }
      if (step === 'booking' && roomUpdater?.rigs[0]) {
        roomUpdater.rigs[0].rightHand.getWorldPosition(projectedHandPosition);
        projectedHandPosition.project(camera);
        mount.style.setProperty('--hand-x', `${(projectedHandPosition.x * 0.5 + 0.5) * 100}%`);
        mount.style.setProperty('--hand-y', `${(-projectedHandPosition.y * 0.5 + 0.5) * 100}%`);
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    const beginRendering = () => {
      if (disposed || !active || animationFrame) return;
      lastTime = 0;
      animationFrame = window.requestAnimationFrame(render);
    };
    const stopRendering = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const onVisibilityChange = () => {
      active = document.visibilityState !== 'hidden';
      if (active) beginRendering();
      else stopRendering();
    };
    const onBeforeUnload = () => flushResources();

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    intersectionObserver = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting && document.visibilityState !== 'hidden';
      if (active) beginRendering();
      else stopRendering();
    }, { threshold: 0.02 });
    intersectionObserver.observe(mount);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    resize();
    beginRendering();

    return () => {
      stopRendering();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      reducedMotionQuery.removeEventListener('change', onMotionPreferenceChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flushResources();
      renderer?.domElement.remove();
    };
  }, [step, review]);

  const sceneDescriptions: Record<StoryStep, string> = {
    diagnostics: 'A metallic digital HVAC manifold gauge floats above an illuminated pedestal, rotating slowly in a bright warm-white studio.',
    repair: 'Photoreal moving footage of the same friendly technician inspecting a home HVAC system in a bright family living room.',
    comfort: 'Photoreal moving footage of a family relaxing with the same technician after restoring comfort in their bright home.',
    reviews: 'Photoreal moving footage of the same family and technician sharing a grateful, relaxed moment in their bright home.',
    booking: 'Photoreal moving footage of the same technician inviting the homeowner toward the live booking concierge.',
  };

  const handAnchor = step === 'booking' ? { '--hand-x': motionSource ? '86%' : '64%', '--hand-y': motionSource ? '60%' : '48%' } as CSSProperties : undefined;

  return <div ref={mountRef} className={`story-scene story-scene-${step} ${motionSource ? 'story-scene-photoreal' : ''} ${step === 'booking' ? 'comfort-story-scene' : ''}`} style={handAnchor} role="img" aria-label={sceneDescriptions[step]}>
    {motionSource && <video className="story-photoreal-video" src={motionSource.src} poster={motionSource.poster} loop muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />}
    {webglUnavailable && !motionSource && <div className="scene-fallback"><span>VERTICE / {step.toUpperCase()}</span><strong>Comfort, considered.</strong><small>Interactive scene unavailable on this device.</small></div>}
    <span className="scene-screen-reader">{sceneDescriptions[step]}</span>
  </div>;
}
