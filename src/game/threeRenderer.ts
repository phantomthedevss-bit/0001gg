/**
 * Three.js High-Performance Rendering Subsystem
 * Follows Three.js architectural guidelines: RoomEnvironment, SRGBColorSpace,
 * Software WebGL guard, pooled particle bursts, screen shake, and zero-GC frame loops.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createArenaFloorTexture,
  createCityBackdrop,
  createPlayerMech,
  PlayerMeshGroup,
  updatePlayerSkin,
} from './models';
import { ChassisSkinDef } from '../types/game';

export interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleSpeed: number;
  active: boolean;
}

export interface Shockwave {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  growthRate: number;
  active: boolean;
}

export class ThreeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public isSoftwareGl: boolean = false;

  // Main game actors in 3D
  public playerGroup: PlayerMeshGroup | null = null;
  public arenaFloor: THREE.Mesh | null = null;
  public cityBackdrop: THREE.Group | null = null;

  // Dynamic lights
  public keyLight: THREE.DirectionalLight | null = null;
  public hemiLight: THREE.HemisphereLight | null = null;
  public playerMuzzleLight: THREE.PointLight | null = null;

  // Particle pool
  private particlePool: Particle[] = [];
  private shockwaves: Shockwave[] = [];

  // Ground telegraphs container
  public telegraphGroup: THREE.Group;

  // Screen shake
  public cameraShake: number = 0;
  private cameraBaseY: number = 22;
  private cameraBaseZ: number = 18;

  // Mouse Raycasting
  public raycaster = new THREE.Raycaster();
  public mousePos = new THREE.Vector2();
  public groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  public groundTarget = new THREE.Vector3();

  // Targeting reticle mesh
  public reticleMesh: THREE.Group | null = null;

  constructor(container: HTMLDivElement, initialSkin: ChassisSkinDef) {
    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070e, 0.016);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 300);
    this.camera.position.set(0, this.cameraBaseY, this.cameraBaseZ);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback
    }

    // 5. Lighting Setup
    this.setupLighting();

    // 6. Arena Environment
    this.setupArena();

    // 7. Player Mech
    this.playerGroup = createPlayerMech(initialSkin);
    this.scene.add(this.playerGroup);

    // 8. Ground Reticle
    this.setupReticle();

    // 9. Telegraph Group
    this.telegraphGroup = new THREE.Group();
    this.scene.add(this.telegraphGroup);

    // 10. Particle Pool Initialization
    this.initParticlePool();
  }

  private setupLighting() {
    // Warm key light
    this.keyLight = new THREE.DirectionalLight(0xffecd4, 2.4);
    this.keyLight.position.set(16, 28, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 70;
      const d = 26;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Cool ambient hemisphere fill
    this.hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x111625, 1.2);
    this.scene.add(this.hemiLight);

    // Dynamic muzzle flash light
    this.playerMuzzleLight = new THREE.PointLight(0x00ffff, 0, 15);
    this.playerMuzzleLight.position.set(0, 1.2, 1.2);
    this.scene.add(this.playerMuzzleLight);
  }

  private setupArena() {
    // Arena Floor
    const floorTexture = createArenaFloorTexture();
    const floorGeo = new THREE.PlaneGeometry(64, 64);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35,
      metalness: 0.75,
    });

    this.arenaFloor = new THREE.Mesh(floorGeo, floorMat);
    this.arenaFloor.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.arenaFloor);

    // Arena Perimeter Glowing Barrier Posts
    const postMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const postCount = 20;
    const arenaRadius = 28;
    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 6), postMat);
      post.position.set(Math.cos(angle) * arenaRadius, 1.5, Math.sin(angle) * arenaRadius);
      this.scene.add(post);
    }

    // Outer City Skyline
    this.cityBackdrop = createCityBackdrop();
    this.scene.add(this.cityBackdrop);
  }

  private setupReticle() {
    this.reticleMesh = new THREE.Group();

    // Outer spinning ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.85, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.reticleMesh.add(ring);

    // Center cross
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.6), crossMat);
    c1.rotateX(-Math.PI / 2);
    const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), crossMat);
    c2.rotateX(-Math.PI / 2);
    this.reticleMesh.add(c1);
    this.reticleMesh.add(c2);

    this.reticleMesh.position.y = 0.05;
    this.scene.add(this.reticleMesh);
  }

  private initParticlePool() {
    const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 1,
    });

    for (let i = 0; i < 160; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scaleSpeed: 0.95,
        active: false,
      });
    }

    // Shockwave rings pool
    const swGeo = new THREE.RingGeometry(0.5, 0.8, 32);
    swGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const swMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const swMesh = new THREE.Mesh(swGeo, swMat);
      swMesh.position.y = 0.08;
      swMesh.visible = false;
      this.scene.add(swMesh);
      this.shockwaves.push({
        mesh: swMesh,
        life: 0,
        maxLife: 0.4,
        growthRate: 18,
        active: false,
      });
    }
  }

  public spawnParticleBurst(x: number, y: number, z: number, colorHex: number, count: number = 12, speed: number = 8) {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        p.active = true;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.set(1, 1, 1);
        (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;

        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        const vel = speed * (0.6 + Math.random() * 0.8);
        p.vx = Math.cos(phi) * Math.cos(theta) * vel;
        p.vy = Math.sin(phi) * vel + 3.0; // upward pop
        p.vz = Math.cos(phi) * Math.sin(theta) * vel;

        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.25;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public spawnShockwave(x: number, z: number, colorHex: number, maxRadius: number = 12) {
    for (const sw of this.shockwaves) {
      if (!sw.active) {
        sw.active = true;
        sw.mesh.visible = true;
        sw.mesh.position.set(x, 0.08, z);
        sw.mesh.scale.set(1, 1, 1);
        (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
        sw.life = 0;
        sw.maxLife = 0.45;
        sw.growthRate = maxRadius / sw.maxLife;
        break;
      }
    }
  }

  public triggerMuzzleFlash(x: number, y: number, z: number, colorHex: number) {
    if (this.playerMuzzleLight) {
      this.playerMuzzleLight.color.setHex(colorHex);
      this.playerMuzzleLight.position.set(x, y, z);
      this.playerMuzzleLight.intensity = 8.0;
    }
  }

  public addCameraShake(amount: number) {
    this.cameraShake = Math.min(this.cameraShake + amount, 1.4);
  }

  public updateRaycast(screenX: number, screenY: number, width: number, height: number) {
    this.mousePos.x = (screenX / width) * 2 - 1;
    this.mousePos.y = -(screenY / height) * 2 + 1;
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.groundTarget);

    if (this.reticleMesh) {
      this.reticleMesh.position.x = this.groundTarget.x;
      this.reticleMesh.position.z = this.groundTarget.z;
      this.reticleMesh.rotation.y += 0.03;
    }
  }

  public update(dt: number, playerX: number, playerZ: number, isTitleMode: boolean, titleAngle: number) {
    // 1. Decay muzzle light
    if (this.playerMuzzleLight && this.playerMuzzleLight.intensity > 0) {
      this.playerMuzzleLight.intensity = Math.max(0, this.playerMuzzleLight.intensity - dt * 45);
    }

    // 2. Camera movement & shake
    if (isTitleMode) {
      // Cinematic orbital showcase around the hero mech
      const orbitDist = 8.5;
      const camX = Math.cos(titleAngle) * orbitDist;
      const camZ = Math.sin(titleAngle) * orbitDist;
      this.camera.position.set(camX, 4.2 + Math.sin(titleAngle * 2) * 0.6, camZ);
      this.camera.lookAt(0, 1.2, 0);
      if (this.reticleMesh) this.reticleMesh.visible = false;
    } else {
      if (this.reticleMesh) this.reticleMesh.visible = true;

      // Smooth camera follow player
      const targetCamX = playerX;
      const targetCamZ = playerZ + this.cameraBaseZ;
      const targetCamY = this.cameraBaseY;

      // Exponential damping
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 7, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 7, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 7, dt);

      // Decaying camera shake
      if (this.cameraShake > 0.001) {
        const shakeX = (Math.random() - 0.5) * this.cameraShake * 1.5;
        const shakeY = (Math.random() - 0.5) * this.cameraShake * 1.2;
        const shakeZ = (Math.random() - 0.5) * this.cameraShake * 1.5;
        this.camera.position.x += shakeX;
        this.camera.position.y += shakeY;
        this.camera.position.z += shakeZ;
        this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8);
      } else {
        this.cameraShake = 0;
      }

      this.camera.lookAt(playerX, 0, playerZ - 2.5);
    }

    // 3. Update pooled particles
    for (const p of this.particlePool) {
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.vy -= 9.8 * dt; // gravity
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;

          const progress = p.life / p.maxLife;
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
          p.mesh.scale.multiplyScalar(p.scaleSpeed);
        }
      }
    }

    // 4. Update shockwaves
    for (const sw of this.shockwaves) {
      if (sw.active) {
        sw.life += dt;
        if (sw.life >= sw.maxLife) {
          sw.active = false;
          sw.mesh.visible = false;
        } else {
          const progress = sw.life / sw.maxLife;
          const s = 1 + progress * sw.growthRate;
          sw.mesh.scale.set(s, s, s);
          (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
        }
      }
    }
  }

  public setSkin(skin: ChassisSkinDef) {
    if (this.playerGroup) {
      updatePlayerSkin(this.playerGroup, skin);
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
