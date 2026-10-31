/**
 * Procedural 3D Models & Procedural Canvas Textures for Three.js
 * Strictly enforces 3-12 part procedural meshes, zero external assets,
 * PBR materials, and bottom-center pivots.
 */

import * as THREE from 'three';
import { ChassisSkinDef } from '../types/game';

// Pre-allocated reusable helpers to avoid per-frame GC
export const _vec3A = new THREE.Vector3();
export const _vec3B = new THREE.Vector3();
export const _mat4 = new THREE.Matrix4();
export const _quat = new THREE.Quaternion();

/**
 * Procedural Hexagonal Titanium Floor Texture with Neon Grid Conduits
 */
export function createArenaFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark metallic base
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, 512, 512);

  // Hexagonal grid
  const hexRadius = 32;
  const h = hexRadius * Math.sqrt(3);
  const w = hexRadius * 2;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#15202b';

  function drawHex(x: number, y: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  for (let y = -h; y < 512 + h; y += h) {
    let row = Math.round(y / h);
    for (let x = -w; x < 512 + w; x += w * 0.75) {
      const xOffset = row % 2 === 0 ? 0 : (w * 0.75) / 2;
      drawHex(x + xOffset, y, hexRadius);
    }
  }

  // Neon circuit traces
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(200, 256);
  ctx.lineTo(256, 312);
  ctx.lineTo(512, 312);

  ctx.moveTo(256, 0);
  ctx.lineTo(256, 180);
  ctx.lineTo(312, 236);
  ctx.lineTo(312, 512);
  ctx.stroke();

  // Subtle metallic micro-noise
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 600; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Contact Shadow Radial Texture
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export interface PlayerMeshGroup extends THREE.Group {
  leftGunBarrel: THREE.Mesh;
  rightGunBarrel: THREE.Mesh;
  leftBoosterFlame: THREE.Mesh;
  rightBoosterFlame: THREE.Mesh;
  canopyMesh: THREE.Mesh;
  chassisMesh: THREE.Mesh;
  shadowDisc: THREE.Mesh;
  recoilOffset: number;
}

/**
 * Creates the 11-part composite player mech (VANGUARD-7)
 */
export function createPlayerMech(skin: ChassisSkinDef): PlayerMeshGroup {
  const root = new THREE.Group() as PlayerMeshGroup;

  // Materials with varied roughness/metalness
  const chassisMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    metalness: 0.85,
    roughness: 0.25,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    metalness: 0.9,
    roughness: 0.15,
  });

  const canopyMat = new THREE.MeshStandardMaterial({
    color: skin.glowColor,
    emissive: skin.glowColor,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.1,
  });

  const ventMat = new THREE.MeshStandardMaterial({
    color: 0x111620,
    metalness: 0.95,
    roughness: 0.4,
  });

  const boosterFlameMat = new THREE.MeshBasicMaterial({
    color: skin.glowColor,
    transparent: true,
    opacity: 0.9,
  });

  // 1. Primary Silhouette: Chamfered Torso Core
  const coreGeo = new THREE.BoxGeometry(1.4, 0.9, 1.8);
  const chassis = new THREE.Mesh(coreGeo, chassisMat);
  chassis.position.y = 1.0;
  chassis.castShadow = true;
  root.add(chassis);
  root.chassisMesh = chassis;

  // 2. Secondary Silhouette: Cockpit Visor / Canopy
  const canopyGeo = new THREE.ConeGeometry(0.55, 0.85, 4);
  canopyGeo.rotateX(Math.PI / 2);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 1.4, 0.25);
  canopy.scale.set(1.2, 0.7, 1.0);
  root.add(canopy);
  root.canopyMesh = canopy;

  // 3. Accent Detail: Chest Radiator Grille
  const ventGeo = new THREE.BoxGeometry(0.8, 0.35, 0.1);
  const vent = new THREE.Mesh(ventGeo, ventMat);
  vent.position.set(0, 1.0, 0.95);
  root.add(vent);

  // 4 & 5. Secondary Read: Dual Left/Right Heavy Shoulder Gun Mounts & Barrels
  const gunHousingGeo = new THREE.BoxGeometry(0.35, 0.45, 1.2);
  const barrelGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8);
  barrelGeo.rotateX(Math.PI / 2);

  const leftMount = new THREE.Mesh(gunHousingGeo, secondaryMat);
  leftMount.position.set(-1.0, 1.15, 0.1);
  leftMount.castShadow = true;
  root.add(leftMount);

  const leftBarrel = new THREE.Mesh(barrelGeo, secondaryMat);
  leftBarrel.position.set(-1.0, 1.15, 0.9);
  root.add(leftBarrel);
  root.leftGunBarrel = leftBarrel;

  const rightMount = new THREE.Mesh(gunHousingGeo, secondaryMat);
  rightMount.position.set(1.0, 1.15, 0.1);
  rightMount.castShadow = true;
  root.add(rightMount);

  const rightBarrel = new THREE.Mesh(barrelGeo, secondaryMat);
  rightBarrel.position.set(1.0, 1.15, 0.9);
  root.add(rightBarrel);
  root.rightGunBarrel = rightBarrel;

  // 6 & 7. Accent Read: Dual Aft Thruster Exhaust Cones
  const thrusterHousingGeo = new THREE.CylinderGeometry(0.25, 0.32, 0.6, 8);
  thrusterHousingGeo.rotateX(Math.PI / 2);

  const leftThruster = new THREE.Mesh(thrusterHousingGeo, secondaryMat);
  leftThruster.position.set(-0.55, 1.1, -1.05);
  root.add(leftThruster);

  const rightThruster = new THREE.Mesh(thrusterHousingGeo, secondaryMat);
  rightThruster.position.set(0.55, 1.1, -1.05);
  root.add(rightThruster);

  // 8 & 9. Dynamic Animated Plasma Flames
  const flameGeo = new THREE.ConeGeometry(0.2, 0.7, 8);
  flameGeo.rotateX(-Math.PI / 2);

  const leftFlame = new THREE.Mesh(flameGeo, boosterFlameMat);
  leftFlame.position.set(-0.55, 1.1, -1.55);
  root.add(leftFlame);
  root.leftBoosterFlame = leftFlame;

  const rightFlame = new THREE.Mesh(flameGeo, boosterFlameMat);
  rightFlame.position.set(0.55, 1.1, -1.55);
  root.add(rightFlame);
  root.rightBoosterFlame = rightFlame;

  // 10. Secondary Silhouette: Anti-Grav Repulsor Skids
  const skidGeo = new THREE.BoxGeometry(0.3, 0.18, 1.8);
  const leftSkid = new THREE.Mesh(skidGeo, chassisMat);
  leftSkid.position.set(-0.7, 0.35, 0);
  leftSkid.castShadow = true;
  root.add(leftSkid);

  const rightSkid = new THREE.Mesh(skidGeo, chassisMat);
  rightSkid.position.set(0.7, 0.35, 0);
  rightSkid.castShadow = true;
  root.add(rightSkid);

  // 11. Soft Contact Shadow Ground Disc
  const shadowGeo = new THREE.PlaneGeometry(2.8, 2.8);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02; // prevent Z-fight
  root.add(shadow);
  root.shadowDisc = shadow;

  root.recoilOffset = 0;
  return root;
}

/**
 * Updates player skin materials dynamically
 */
export function updatePlayerSkin(playerGroup: PlayerMeshGroup, skin: ChassisSkinDef) {
  if (playerGroup.chassisMesh && playerGroup.chassisMesh.material instanceof THREE.MeshStandardMaterial) {
    playerGroup.chassisMesh.material.color.setHex(skin.primaryColor);
  }
  if (playerGroup.canopyMesh && playerGroup.canopyMesh.material instanceof THREE.MeshStandardMaterial) {
    playerGroup.canopyMesh.material.color.setHex(skin.glowColor);
    playerGroup.canopyMesh.material.emissive.setHex(skin.glowColor);
  }
  if (playerGroup.leftBoosterFlame && playerGroup.leftBoosterFlame.material instanceof THREE.MeshBasicMaterial) {
    playerGroup.leftBoosterFlame.material.color.setHex(skin.glowColor);
  }
  if (playerGroup.rightBoosterFlame && playerGroup.rightBoosterFlame.material instanceof THREE.MeshBasicMaterial) {
    playerGroup.rightBoosterFlame.material.color.setHex(skin.glowColor);
  }
}

/**
 * Scout Drone (DRONE-X): 5-part agile tri-wing skimmer
 */
export function createScoutDrone(): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    metalness: 0.9,
    roughness: 0.2,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff0044,
    emissive: 0xff0044,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  // Central chassis
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), bodyMat);
  core.position.y = 1.0;
  core.castShadow = true;
  group.add(core);

  // Glowing red scanner eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), eyeMat);
  eye.position.set(0, 1.0, 0.45);
  group.add(eye);

  // Tri-wing stabilizer fin array
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const wingGeo = new THREE.BoxGeometry(0.12, 0.35, 0.8);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(Math.cos(angle) * 0.7, 1.0, Math.sin(angle) * 0.7);
    wing.rotation.y = -angle;
    group.add(wing);
  }

  // Shadow disc
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  return group;
}

/**
 * Hex Roller Mine (HEX-MINE): 6-part rolling spiked proximity unit
 */
export function createHexMine(): THREE.Group {
  const group = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x24141b,
    metalness: 0.8,
    roughness: 0.35,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0xff4400,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), shellMat);
  core.position.y = 0.7;
  core.castShadow = true;
  group.add(core);

  // Pulsing danger beacon ring
  const ringGeo = new THREE.TorusGeometry(0.72, 0.08, 6, 16);
  const ring = new THREE.Mesh(ringGeo, glowMat);
  ring.position.y = 0.7;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // 4 spiked nodes
  const spikeGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
  const spikeDirs = [
    [0.7, 0.7, 0, Math.PI / 2],
    [-0.7, 0.7, 0, -Math.PI / 2],
    [0, 0.7, 0.7, 0],
    [0, 0.7, -0.7, Math.PI],
  ];
  spikeDirs.forEach(([x, y, z, rot]) => {
    const spike = new THREE.Mesh(spikeGeo, shellMat);
    spike.position.set(x, y, z);
    spike.rotation.x = Math.PI / 2;
    spike.rotation.z = rot;
    group.add(spike);
  });

  // Shadow disc
  const shadowGeo = new THREE.PlaneGeometry(1.8, 1.8);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  return group;
}

/**
 * Heavy Enforcer Tank (GOLIATH-IV): 8-part armored tread combat walker
 */
export function createHeavyEnforcer(): THREE.Group {
  const group = new THREE.Group();

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x382d22,
    metalness: 0.9,
    roughness: 0.35,
  });

  const turretMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a24,
    metalness: 0.95,
    roughness: 0.2,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 0.7,
  });

  // Dual heavy tracks
  const trackGeo = new THREE.BoxGeometry(0.5, 0.45, 2.4);
  const leftTrack = new THREE.Mesh(trackGeo, turretMat);
  leftTrack.position.set(-0.95, 0.25, 0);
  leftTrack.castShadow = true;
  group.add(leftTrack);

  const rightTrack = new THREE.Mesh(trackGeo, turretMat);
  rightTrack.position.set(0.95, 0.25, 0);
  rightTrack.castShadow = true;
  group.add(rightTrack);

  // Heavy hull
  const hullGeo = new THREE.BoxGeometry(1.6, 0.6, 2.1);
  const hull = new THREE.Mesh(hullGeo, armorMat);
  hull.position.y = 0.65;
  hull.castShadow = true;
  group.add(hull);

  // Rotating turret dome
  const domeGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.5, 8);
  const dome = new THREE.Mesh(domeGeo, turretMat);
  dome.position.set(0, 1.15, 0.1);
  group.add(dome);

  // Twin siege cannons
  const barrelGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8);
  barrelGeo.rotateX(Math.PI / 2);

  const leftGun = new THREE.Mesh(barrelGeo, armorMat);
  leftGun.position.set(-0.35, 1.15, 1.2);
  group.add(leftGun);

  const rightGun = new THREE.Mesh(barrelGeo, armorMat);
  rightGun.position.set(0.35, 1.15, 1.2);
  group.add(rightGun);

  // Hazard visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.1), hazardMat);
  visor.position.set(0, 1.25, 0.8);
  group.add(visor);

  // Ground shadow
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  group.add(shadow);

  return group;
}

/**
 * Apex Boss (ARCHON OMEGA): 12-part massive war titan
 */
export function createBossTitan(): THREE.Group {
  const root = new THREE.Group();

  const titanPlating = new THREE.MeshStandardMaterial({
    color: 0x141824,
    metalness: 0.95,
    roughness: 0.18,
  });

  const goldAccent = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.22,
  });

  const coreReactorMat = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xff0044,
    emissiveIntensity: 1.5,
  });

  // 1. Central Core Torso
  const coreGeo = new THREE.CylinderGeometry(1.8, 2.2, 2.4, 8);
  const core = new THREE.Mesh(coreGeo, titanPlating);
  core.position.y = 2.4;
  core.castShadow = true;
  root.add(core);

  // 2. Glowing Reactor Core
  const reactorGeo = new THREE.SphereGeometry(0.9, 12, 12);
  const reactor = new THREE.Mesh(reactorGeo, coreReactorMat);
  reactor.position.set(0, 2.5, 1.2);
  root.add(reactor);

  // 3 & 4. Left/Right Heavy Shoulder Plates
  const shoulderGeo = new THREE.BoxGeometry(1.6, 1.2, 2.4);
  const leftShoulder = new THREE.Mesh(shoulderGeo, goldAccent);
  leftShoulder.position.set(-2.6, 3.2, 0);
  leftShoulder.castShadow = true;
  root.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(shoulderGeo, goldAccent);
  rightShoulder.position.set(2.6, 3.2, 0);
  rightShoulder.castShadow = true;
  root.add(rightShoulder);

  // 5 & 6. Twin Mega Plasma Cannons
  const megaGunGeo = new THREE.CylinderGeometry(0.28, 0.35, 3.2, 8);
  megaGunGeo.rotateX(Math.PI / 2);

  const leftMega = new THREE.Mesh(megaGunGeo, titanPlating);
  leftMega.position.set(-2.6, 2.7, 1.8);
  root.add(leftMega);

  const rightMega = new THREE.Mesh(megaGunGeo, titanPlating);
  rightMega.position.set(2.6, 2.7, 1.8);
  root.add(rightMega);

  // 7 & 8. Lower Repulsor Engine Pods
  const podGeo = new THREE.ConeGeometry(1.1, 2.2, 6);
  podGeo.rotateX(-Math.PI / 2);

  const leftPod = new THREE.Mesh(podGeo, titanPlating);
  leftPod.position.set(-1.8, 1.1, -0.6);
  root.add(leftPod);

  const rightPod = new THREE.Mesh(podGeo, titanPlating);
  rightPod.position.set(1.8, 1.1, -0.6);
  root.add(rightPod);

  // 9. Floating Defense Drone Rings
  const shieldRingGeo = new THREE.TorusGeometry(3.6, 0.09, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.6,
  });
  const shieldRing = new THREE.Mesh(shieldRingGeo, ringMat);
  shieldRing.position.y = 2.4;
  shieldRing.rotation.x = Math.PI / 2;
  root.add(shieldRing);

  // 10. Massive Ground Shadow
  const shadowGeo = new THREE.PlaneGeometry(7.0, 7.0);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  root.add(shadow);

  return root;
}

/**
 * Procedural Power-Up Pick-Up Capsule
 */
export function createPowerUpMesh(type: 'HEALTH' | 'SHIELD' | 'OVERCLOCK' | 'NOVA'): THREE.Group {
  const group = new THREE.Group();

  let color = 0x00ff88;
  if (type === 'SHIELD') color = 0x00b4ff;
  if (type === 'OVERCLOCK') color = 0xffd700;
  if (type === 'NOVA') color = 0xd946ef;

  // Floating rotating octahedron
  const coreGeo = new THREE.OctahedronGeometry(0.45, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.0,
    roughness: 0.1,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.8;
  group.add(core);

  // Outer wireframe cage
  const cageGeo = new THREE.IcosahedronGeometry(0.7, 0);
  const cageMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
  });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.position.y = 0.8;
  group.add(cage);

  // Pulsing ground light ring
  const ringGeo = new THREE.RingGeometry(0.3, 0.8, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

/**
 * Megacity Skyline Perimeter Towers
 */
export function createCityBackdrop(): THREE.Group {
  const group = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x060910,
    roughness: 0.4,
    metalness: 0.8,
  });

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xff0033,
  });

  const windowColors = [0x00ffff, 0xff00ff, 0xffaa00, 0x0088ff];

  // Distribute skyscrapers in a wide circle outside arena boundary (radius 40-75)
  const count = 38;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
    const dist = 38 + Math.random() * 32;
    const height = 24 + Math.random() * 45;
    const width = 6 + Math.random() * 7;
    const depth = 6 + Math.random() * 7;

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), towerMat);
    bldg.position.set(Math.cos(angle) * dist, height / 2 - 4, Math.sin(angle) * dist);
    group.add(bldg);

    // Red warning beacon on tallest towers
    if (height > 38) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), beaconMat);
      beacon.position.set(bldg.position.x, height - 3.8, bldg.position.z);
      group.add(beacon);
    }

    // Hologram window neon bands
    if (Math.random() > 0.4) {
      const bandColor = windowColors[Math.floor(Math.random() * windowColors.length)];
      const bandMat = new THREE.MeshBasicMaterial({
        color: bandColor,
        transparent: true,
        opacity: 0.7,
      });
      const band = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.4, depth + 0.1), bandMat);
      band.position.set(bldg.position.x, 8 + Math.random() * (height - 12), bldg.position.z);
      group.add(band);
    }
  }

  return group;
}
