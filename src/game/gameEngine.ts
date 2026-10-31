/**
 * CYBERPULSE: OMEGA PROTOCOL - Core Game Engine Simulation
 * 60 FPS deterministic game loop with delta clamping, input buffering,
 * hitstop, telegraphed enemy behaviors, wave progression, and boss phases.
 */

import * as THREE from 'three';
import { ThreeRenderer } from './threeRenderer';
import { sound } from '../audio/soundEngine';
import {
  createBossTitan,
  createHeavyEnforcer,
  createHexMine,
  createPowerUpMesh,
  createScoutDrone,
} from './models';
import {
  ChassisSkinDef,
  DamageNumber,
  EnemyDef,
  EnemyType,
  GameState,
  PlayerStats,
  PowerUp,
  WeaponDef,
  WeaponId,
} from '../types/game';

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  PLASMA_AUTO: {
    id: 'PLASMA_AUTO',
    name: 'Twin Plasma Blasters',
    subtitle: 'High Fire-Rate Dual Pulse',
    fireRate: 8.5,
    damage: 32,
    bulletSpeed: 38,
    bulletColor: '#00f0ff',
    bulletSize: 0.22,
    recoil: 0.18,
    screenShake: 0.12,
    description: 'Rapid-firing plasma autocannons with alternating twin barrels and kinetic shredding.',
    icon: 'Zap',
  },
  GAUSS_RAILGUN: {
    id: 'GAUSS_RAILGUN',
    name: 'Hyper-Gauss Railgun',
    subtitle: 'Armor-Piercing Kinetic Lance',
    fireRate: 2.2,
    damage: 160,
    bulletSpeed: 75,
    bulletColor: '#38bdf8',
    bulletSize: 0.35,
    recoil: 0.55,
    screenShake: 0.45,
    description: 'High-caliber magnetic accelerator that pierces through multiple targets with heavy kickback.',
    icon: 'Crosshair',
  },
  TESLA_ARC: {
    id: 'TESLA_ARC',
    name: 'Tesla Shock Arc',
    subtitle: 'Chain Discharge Wave',
    fireRate: 3.8,
    damage: 65,
    bulletSpeed: 32,
    bulletColor: '#a855f7',
    bulletSize: 0.28,
    recoil: 0.25,
    screenShake: 0.22,
    description: 'High-voltage electric discharge that splits into a 3-way spread shockwave.',
    icon: 'Radio',
  },
};

export const CHASSIS_SKINS: ChassisSkinDef[] = [
  {
    id: 'CYBER_NEON',
    name: 'Neon Pulse',
    primaryColor: 0x0ea5e9,
    secondaryColor: 0x0284c7,
    glowColor: 0x00f0ff,
    accentColor: 0x38bdf8,
    description: 'Megacity tactical cyan alloy with superconductor glow conduits.',
  },
  {
    id: 'CRIMSON_FURY',
    name: 'Crimson Fury',
    primaryColor: 0xdc2626,
    secondaryColor: 0x991b1b,
    glowColor: 0xff0044,
    accentColor: 0xf87171,
    description: 'Aggressive heavy armor plating forged from molten volcanic titanium.',
  },
  {
    id: 'SOLAR_HAZARD',
    name: 'Solar Hazard',
    primaryColor: 0xeab308,
    secondaryColor: 0xca8a04,
    glowColor: 0xffaa00,
    accentColor: 0xfacc15,
    description: 'Industrial demolition scheme with radiant solar-flare reactor trim.',
  },
  {
    id: 'VOID_PHANTOM',
    name: 'Void Phantom',
    primaryColor: 0x7c3aed,
    secondaryColor: 0x5b21b6,
    glowColor: 0xc084fc,
    accentColor: 0xa855f7,
    description: 'Dark-matter stealth carbon matrix with ultra-violet hyper-emission.',
  },
];

export const ENEMY_TYPES: Record<EnemyType, EnemyDef> = {
  SCOUT_DRONE: {
    type: 'SCOUT_DRONE',
    name: 'Drone-X Skimmer',
    maxHp: 65,
    speed: 7.5,
    scoreValue: 120,
    radius: 0.9,
    attackCooldown: 2.2,
  },
  HEX_ROLLER: {
    type: 'HEX_ROLLER',
    name: 'Hex Mine Carrier',
    maxHp: 45,
    speed: 10.5,
    scoreValue: 90,
    radius: 0.8,
    attackCooldown: 1.2,
  },
  HEAVY_ENFORCER: {
    type: 'HEAVY_ENFORCER',
    name: 'Goliath-IV Walker',
    maxHp: 380,
    speed: 4.2,
    scoreValue: 450,
    radius: 1.8,
    attackCooldown: 3.0,
  },
  ARCHON_BOSS: {
    type: 'ARCHON_BOSS',
    name: 'ARCHON-OMEGA WAR TITAN',
    maxHp: 3200,
    speed: 3.5,
    scoreValue: 5000,
    radius: 3.2,
    attackCooldown: 1.8,
  },
};

export interface Bullet {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  isPlayer: boolean;
  pierce: number;
  life: number;
  maxLife: number;
  colorHex: number;
}

export interface EnemyInstance {
  id: number;
  def: EnemyDef;
  mesh: THREE.Group;
  hp: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  attackTimer: number;
  telegraphTimer: number; // windup warning
  telegraphMesh?: THREE.Mesh | THREE.Line;
  isTelegraphing: boolean;
  hitFlashTimer: number;
  phase?: number;
}

export interface TelegraphMarker {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  radius: number;
  duration: number;
  elapsed: number;
  onExplode: () => void;
}

export class GameEngine {
  private renderer: ThreeRenderer;
  private onStateChange: (state: GameState) => void;
  private onStatsUpdate: (stats: PlayerStats) => void;
  private onDamagePopup: (dmg: DamageNumber) => void;

  public state: GameState = 'TITLE';
  public currentWeapon: WeaponDef = WEAPONS.PLASMA_AUTO;
  public currentSkin: ChassisSkinDef = CHASSIS_SKINS[0];

  // Player Entity
  public player = {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    rotation: 0,
    bankAngle: 0,
    speed: 13.5,
    stats: {
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      dashCooldown: 1.8,
      dashTimer: 0,
      isDashing: false,
      novaCharge: 100,
      score: 0,
      kills: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      wave: 1,
      accuracyShotsFired: 0,
      accuracyShotsHit: 0,
      overclockTimer: 0,
    } as PlayerStats,
  };

  // Bullets & Enemies
  private bullets: Bullet[] = [];
  private enemies: EnemyInstance[] = [];
  private powerups: { data: PowerUp; mesh: THREE.Group }[] = [];
  private telegraphs: TelegraphMarker[] = [];

  // Input state
  private keysHeld: Record<string, boolean> = {};
  private isMouseDown: boolean = false;
  private shootTimer: number = 0;
  private alternatingBarrel: boolean = false;

  // Wave Director
  private waveEnemiesRemaining: number = 0;
  private waveSpawnTimer: number = 0;
  private waveBreakTimer: number = 0;
  private isBossWave: boolean = false;

  // Hitstop & screen feel
  private hitstopTimer: number = 0;
  private titleOrbitAngle: number = 0;

  // Geometry cache for bullets
  private bulletGeo = new THREE.SphereGeometry(0.25, 8, 8);
  private enemyBulletGeo = new THREE.SphereGeometry(0.28, 8, 8);
  private laserLineMat = new THREE.LineBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.85 });

  constructor(
    renderer: ThreeRenderer,
    onStateChange: (state: GameState) => void,
    onStatsUpdate: (stats: PlayerStats) => void,
    onDamagePopup: (dmg: DamageNumber) => void
  ) {
    this.renderer = renderer;
    this.onStateChange = onStateChange;
    this.onStatsUpdate = onStatsUpdate;
    this.onDamagePopup = onDamagePopup;

    this.setupInputs();
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keysHeld[e.code] = true;

      // Space / Enter on Title screen starts game
      if (this.state === 'TITLE' && (e.code === 'Space' || e.code === 'Enter')) {
        this.startGame();
        return;
      }

      // Pause toggle
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
        return;
      }

      // Restart on GameOver or Victory
      if ((this.state === 'GAMEOVER' || this.state === 'VICTORY') && (e.code === 'KeyR' || e.code === 'Space')) {
        this.startGame();
        return;
      }

      // Dash action
      if (this.state === 'PLAYING' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        this.triggerDash();
      }

      // Nova Shockwave
      if (this.state === 'PLAYING' && (e.code === 'KeyE' || e.code === 'KeyQ')) {
        this.triggerNova();
      }

      // Mute audio
      if (e.code === 'KeyM') {
        sound.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keysHeld = {};
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.renderer.updateRaycast(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        if (this.state === 'TITLE') {
          // Click on title screen starts game
          this.startGame();
        }
      } else if (e.button === 2) {
        // Right click dash
        if (this.state === 'PLAYING') this.triggerDash();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public setWeapon(weaponId: WeaponId) {
    this.currentWeapon = WEAPONS[weaponId];
    sound.playUiClick();
  }

  public setSkin(skin: ChassisSkinDef) {
    this.currentSkin = skin;
    this.renderer.setSkin(skin);
    sound.playUiClick();
  }

  public startGame() {
    sound.ensureContext();
    sound.startMusic();
    sound.playUiClick();

    // Reset player stats
    this.player.x = 0;
    this.player.z = 6;
    this.player.vx = 0;
    this.player.vz = 0;
    this.player.stats = {
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      dashCooldown: 1.8,
      dashTimer: 0,
      isDashing: false,
      novaCharge: 100,
      score: 0,
      kills: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      wave: 1,
      accuracyShotsFired: 0,
      accuracyShotsHit: 0,
      overclockTimer: 0,
    };

    // Clean up active actors
    this.clearAllActors();

    this.state = 'PLAYING';
    this.onStateChange('PLAYING');
    this.onStatsUpdate(this.player.stats);

    // Initialize Wave 1
    this.initWave(1);
  }

  public pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    sound.stopMusic();
    this.onStateChange('PAUSED');
  }

  public resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    sound.startMusic();
    this.onStateChange('PLAYING');
  }

  public returnToTitle() {
    this.state = 'TITLE';
    this.clearAllActors();
    this.player.x = 0;
    this.player.z = 0;
    this.player.rotation = 0;
    if (this.renderer.playerGroup) {
      this.renderer.playerGroup.position.set(0, 0, 0);
      this.renderer.playerGroup.rotation.set(0, 0, 0);
    }
    sound.stopMusic();
    this.onStateChange('TITLE');
  }

  private clearAllActors() {
    // Remove bullets
    for (const b of this.bullets) {
      this.renderer.scene.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
    }
    this.bullets = [];

    // Remove enemies
    for (const en of this.enemies) {
      this.renderer.scene.remove(en.mesh);
      if (en.telegraphMesh) this.renderer.scene.remove(en.telegraphMesh);
    }
    this.enemies = [];

    // Remove powerups
    for (const p of this.powerups) {
      this.renderer.scene.remove(p.mesh);
    }
    this.powerups = [];

    // Remove telegraph markers
    for (const tg of this.telegraphs) {
      this.renderer.telegraphGroup.remove(tg.mesh);
    }
    this.telegraphs = [];
  }

  // --- WAVE DIRECTOR ---
  private initWave(waveNum: number) {
    this.player.stats.wave = waveNum;
    this.isBossWave = waveNum % 5 === 0;
    this.waveBreakTimer = 2.0; // short breather before spawns

    if (this.isBossWave) {
      this.waveEnemiesRemaining = 1;
      sound.playBossWarning();
    } else {
      this.waveEnemiesRemaining = 6 + waveNum * 4;
    }
    this.waveSpawnTimer = 0.5;
  }

  private spawnEnemy(type: EnemyType) {
    const def = ENEMY_TYPES[type];
    let mesh: THREE.Group;

    if (type === 'SCOUT_DRONE') mesh = createScoutDrone();
    else if (type === 'HEX_ROLLER') mesh = createHexMine();
    else if (type === 'HEAVY_ENFORCER') mesh = createHeavyEnforcer();
    else mesh = createBossTitan();

    // Spawn randomly outside player field on arena perimeter
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = type === 'ARCHON_BOSS' ? 18 : 22 + Math.random() * 4;
    const sx = Math.cos(spawnAngle) * spawnDist;
    const sz = Math.sin(spawnAngle) * spawnDist;

    mesh.position.set(sx, 0, sz);
    this.renderer.scene.add(mesh);

    // Initial telegraph guide line for Scout Drone
    let telegraphMesh: THREE.Line | undefined;
    if (type === 'SCOUT_DRONE') {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.0, 0),
        new THREE.Vector3(0, 1.0, 15),
      ]);
      telegraphMesh = new THREE.Line(geo, this.laserLineMat);
      telegraphMesh.visible = false;
      this.renderer.scene.add(telegraphMesh);
    }

    this.enemies.push({
      id: Math.random(),
      def,
      mesh,
      hp: def.maxHp,
      x: sx,
      z: sz,
      vx: 0,
      vz: 0,
      attackTimer: Math.random() * def.attackCooldown,
      telegraphTimer: 0,
      telegraphMesh,
      isTelegraphing: false,
      hitFlashTimer: 0,
      phase: 1,
    });
  }

  // --- ACTIONS ---
  private triggerDash() {
    if (this.player.stats.dashTimer > 0) return;
    this.player.stats.dashTimer = this.player.stats.dashCooldown;
    this.player.stats.isDashing = true;

    // Burst speed in movement direction or facing direction
    let dirX = this.player.vx;
    let dirZ = this.player.vz;
    if (Math.hypot(dirX, dirZ) < 0.1) {
      dirX = Math.sin(this.player.rotation);
      dirZ = Math.cos(this.player.rotation);
    } else {
      const len = Math.hypot(dirX, dirZ);
      dirX /= len;
      dirZ /= len;
    }

    this.player.vx = dirX * 36;
    this.player.vz = dirZ * 36;

    sound.playDash();
    this.renderer.spawnShockwave(this.player.x, this.player.z, this.currentSkin.glowColor, 8);
    this.renderer.spawnParticleBurst(this.player.x, 1.0, this.player.z, this.currentSkin.glowColor, 16, 12);
  }

  private triggerNova() {
    if (this.player.stats.novaCharge < 100) return;
    this.player.stats.novaCharge = 0;

    sound.playNovaBlast();
    this.renderer.addCameraShake(0.9);
    this.renderer.spawnShockwave(this.player.x, this.player.z, 0xff00ff, 20);
    this.renderer.spawnParticleBurst(this.player.x, 1.2, this.player.z, 0xff00ff, 35, 18);

    // Clear all enemy bullets within 22 units
    this.bullets = this.bullets.filter((b) => {
      if (!b.isPlayer && Math.hypot(b.x - this.player.x, b.z - this.player.z) < 22) {
        this.renderer.scene.remove(b.mesh);
        (b.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    // Damage all enemies within 20 units
    for (const en of this.enemies) {
      const dist = Math.hypot(en.x - this.player.x, en.z - this.player.z);
      if (dist < 20) {
        this.damageEnemy(en, 320, true);
      }
    }
  }

  private shootPlayerWeapon() {
    this.player.stats.accuracyShotsFired++;

    const isOverclocked = this.player.stats.overclockTimer > 0;
    const effectiveFireRate = isOverclocked ? this.currentWeapon.fireRate * 2.2 : this.currentWeapon.fireRate;
    this.shootTimer = 1 / effectiveFireRate;

    // Recoil and camera shake
    this.renderer.addCameraShake(this.currentWeapon.screenShake * (isOverclocked ? 0.6 : 1));

    // Target direction towards reticle
    const tx = this.renderer.groundTarget.x - this.player.x;
    const tz = this.renderer.groundTarget.z - this.player.z;
    const dist = Math.hypot(tx, tz) || 1;
    const nx = tx / dist;
    const nz = tz / dist;

    // Weapon kickback
    this.player.vx -= nx * this.currentWeapon.recoil * 12;
    this.player.vz -= nz * this.currentWeapon.recoil * 12;

    // Alternating barrel offset
    this.alternatingBarrel = !this.alternatingBarrel;
    const sideOffset = this.alternatingBarrel ? 0.9 : -0.9;
    const perpX = -nz * sideOffset;
    const perpZ = nx * sideOffset;

    const spawnX = this.player.x + nx * 1.5 + perpX;
    const spawnZ = this.player.z + nz * 1.5 + perpZ;

    // Visual muzzle flash
    const glowHex = this.currentSkin.glowColor;
    this.renderer.triggerMuzzleFlash(spawnX, 1.2, spawnZ, glowHex);
    this.renderer.spawnParticleBurst(spawnX, 1.2, spawnZ, glowHex, 4, 6);

    if (this.currentWeapon.id === 'PLASMA_AUTO') {
      sound.playLaserShot('PLASMA');
      this.spawnBullet(spawnX, spawnZ, nx, nz, this.currentWeapon.damage, true, 1, this.currentWeapon.bulletSpeed, glowHex);
    } else if (this.currentWeapon.id === 'GAUSS_RAILGUN') {
      sound.playLaserShot('RAILGUN');
      // Piercing beam with trail
      this.spawnBullet(spawnX, spawnZ, nx, nz, this.currentWeapon.damage, true, 5, this.currentWeapon.bulletSpeed, glowHex);
    } else if (this.currentWeapon.id === 'TESLA_ARC') {
      sound.playLaserShot('TESLA');
      // 3-way spread
      const angles = [-0.18, 0, 0.18];
      angles.forEach((ang) => {
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const rx = nx * cos - nz * sin;
        const rz = nx * sin + nz * cos;
        this.spawnBullet(spawnX, spawnZ, rx, rz, this.currentWeapon.damage, true, 2, this.currentWeapon.bulletSpeed, glowHex);
      });
    }
  }

  private spawnBullet(
    x: number,
    z: number,
    nx: number,
    nz: number,
    damage: number,
    isPlayer: boolean,
    pierce: number,
    speed: number,
    colorHex: number
  ) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(isPlayer ? this.bulletGeo : this.enemyBulletGeo, mat);
    mesh.position.set(x, 1.1, z);
    this.renderer.scene.add(mesh);

    this.bullets.push({
      mesh,
      x,
      z,
      vx: nx * speed,
      vz: nz * speed,
      damage,
      isPlayer,
      pierce,
      life: 0,
      maxLife: isPlayer ? 1.4 : 3.0,
      colorHex,
    });
  }

  // --- DAMAGE & IMPACTS ---
  private damageEnemy(enemy: EnemyInstance, dmg: number, isCrit: boolean = false) {
    enemy.hp -= dmg;
    enemy.hitFlashTimer = 0.08;

    // Flash mesh emissive white
    enemy.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
        child.material.emissive.setHex(0xffffff);
      }
    });

    // Damage popup
    this.onDamagePopup({
      id: Math.random(),
      text: `${Math.round(dmg)}${isCrit ? '!' : ''}`,
      x: enemy.x + (Math.random() - 0.5) * 0.8,
      y: 2.2,
      z: enemy.z + (Math.random() - 0.5) * 0.8,
      color: isCrit ? '#facc15' : '#ffffff',
      life: 0,
      maxLife: 0.65,
    });

    // Particle sparks
    this.renderer.spawnParticleBurst(enemy.x, 1.2, enemy.z, 0xffeedd, 6, 8);
    sound.playHit();

    // Nova charge gain
    this.player.stats.novaCharge = Math.min(100, this.player.stats.novaCharge + 3);

    // Enemy Death
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyInstance) {
    // 40ms simulation hitstop on kill for visceral punch!
    this.hitstopTimer = 0.04;

    const isBoss = enemy.def.type === 'ARCHON_BOSS';
    sound.playExplosion(isBoss);
    this.renderer.addCameraShake(isBoss ? 1.2 : 0.35);
    this.renderer.spawnShockwave(enemy.x, enemy.z, 0xff4400, isBoss ? 24 : 10);
    this.renderer.spawnParticleBurst(enemy.x, 1.2, enemy.z, 0xff4400, isBoss ? 60 : 22, isBoss ? 18 : 12);

    // Combo streak update
    this.player.stats.kills++;
    this.player.stats.combo++;
    this.player.stats.comboTimer = 3.5;
    if (this.player.stats.combo > this.player.stats.maxCombo) {
      this.player.stats.maxCombo = this.player.stats.combo;
    }

    const comboMult = Math.min(5, 1 + Math.floor(this.player.stats.combo / 4) * 0.5);
    this.player.stats.score += Math.round(enemy.def.scoreValue * comboMult);

    // Chance to drop power-up
    if (Math.random() < 0.28 || isBoss) {
      this.spawnPowerUp(enemy.x, enemy.z);
    }

    // Clean up enemy meshes
    this.renderer.scene.remove(enemy.mesh);
    if (enemy.telegraphMesh) {
      this.renderer.scene.remove(enemy.telegraphMesh);
    }

    // Filter out of active list
    this.enemies = this.enemies.filter((e) => e.id !== enemy.id);

    // Victory if boss defeated
    if (isBoss) {
      this.state = 'VICTORY';
      sound.stopMusic();
      this.onStateChange('VICTORY');
    }
  }

  private damagePlayer(amount: number) {
    if (this.player.stats.isDashing || this.state !== 'PLAYING') return;

    this.renderer.addCameraShake(0.5);
    this.renderer.spawnParticleBurst(this.player.x, 1.2, this.player.z, 0xff0044, 14, 10);

    // Shield absorbs first
    if (this.player.stats.shield > 0) {
      sound.playShieldDeflect();
      const absorbed = Math.min(this.player.stats.shield, amount);
      this.player.stats.shield -= absorbed;
      amount -= absorbed;
    }

    if (amount > 0) {
      sound.playHit();
      this.player.stats.hp = Math.max(0, this.player.stats.hp - amount);
      // Reset combo on hit
      this.player.stats.combo = 0;

      if (this.player.stats.hp <= 0) {
        this.killPlayer();
      }
    }

    this.onStatsUpdate(this.player.stats);
  }

  private killPlayer() {
    this.state = 'GAMEOVER';
    sound.playExplosion(true);
    sound.stopMusic();
    this.renderer.addCameraShake(1.2);
    this.renderer.spawnShockwave(this.player.x, this.player.z, 0xff0044, 18);
    this.renderer.spawnParticleBurst(this.player.x, 1.2, this.player.z, 0xff0044, 45, 16);
    this.onStateChange('GAMEOVER');
  }

  private spawnPowerUp(x: number, z: number) {
    const types: ('HEALTH' | 'SHIELD' | 'OVERCLOCK' | 'NOVA')[] = ['HEALTH', 'SHIELD', 'OVERCLOCK', 'NOVA'];
    const type = types[Math.floor(Math.random() * types.length)];
    const mesh = createPowerUpMesh(type);
    mesh.position.set(x, 0, z);
    this.renderer.scene.add(mesh);

    this.powerups.push({
      data: {
        id: Math.random().toString(),
        type,
        x,
        z,
        duration: 16.0,
      },
      mesh,
    });
  }

  // --- 60 FPS MAIN SIMULATION TICK ---
  public tick(rawDt: number) {
    // 1. Delta time clamping (prevent spiral of death)
    const dt = Math.min(rawDt, 0.05);

    // 2. Title screen mode
    if (this.state === 'TITLE') {
      this.titleOrbitAngle += dt * 0.45;
      if (this.renderer.playerGroup) {
        this.renderer.playerGroup.position.set(0, 0, 0);
        this.renderer.playerGroup.rotation.y = Math.sin(this.titleOrbitAngle * 0.5) * 0.3;
      }
      this.renderer.update(dt, 0, 0, true, this.titleOrbitAngle);
      this.renderer.render();
      return;
    }

    // 3. Paused or GameOver still renders the world
    if (this.state === 'PAUSED' || this.state === 'GAMEOVER' || this.state === 'VICTORY') {
      this.renderer.update(dt, this.player.x, this.player.z, false, 0);
      this.renderer.render();
      return;
    }

    // 4. Hitstop simulation freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render();
      return;
    }

    // 5. Update Player Physics & Locomotion
    this.updatePlayer(dt);

    // 6. Update Bullets & Projectiles
    this.updateBullets(dt);

    // 7. Update Enemies & AI
    this.updateEnemies(dt);

    // 8. Update Telegraph Markers
    this.updateTelegraphs(dt);

    // 9. Update Power-ups
    this.updatePowerUps(dt);

    // 10. Update Wave Director
    this.updateWaveDirector(dt);

    // 11. Update Renderer & Particle Bursts
    this.renderer.update(dt, this.player.x, this.player.z, false, 0);
    this.renderer.render();

    // 12. Send stats update to HUD
    this.onStatsUpdate(this.player.stats);
  }

  private updatePlayer(dt: number) {
    // Movement input vector
    let moveX = 0;
    let moveZ = 0;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveZ -= 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveZ += 1;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveX -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    // Dash timer
    if (this.player.stats.dashTimer > 0) {
      this.player.stats.dashTimer = Math.max(0, this.player.stats.dashTimer - dt);
      if (this.player.stats.dashTimer <= this.player.stats.dashCooldown - 0.22) {
        this.player.stats.isDashing = false;
      }
    }

    // Acceleration & friction
    if (this.player.stats.isDashing) {
      // Keep velocity during dash
      this.player.x += this.player.vx * dt;
      this.player.z += this.player.vz * dt;
    } else {
      const targetSpeed = this.player.speed * (this.player.stats.overclockTimer > 0 ? 1.25 : 1.0);
      const accel = 60;
      this.player.vx = THREE.MathUtils.damp(this.player.vx, moveX * targetSpeed, accel, dt);
      this.player.vz = THREE.MathUtils.damp(this.player.vz, moveZ * targetSpeed, accel, dt);

      this.player.x += this.player.vx * dt;
      this.player.z += this.player.vz * dt;
    }

    // Arena boundary clamp (radius 27)
    const arenaRadius = 27;
    const playerDist = Math.hypot(this.player.x, this.player.z);
    if (playerDist > arenaRadius) {
      this.player.x = (this.player.x / playerDist) * arenaRadius;
      this.player.z = (this.player.z / playerDist) * arenaRadius;
    }

    // Player facing rotation towards mouse ground target
    const dx = this.renderer.groundTarget.x - this.player.x;
    const dz = this.renderer.groundTarget.z - this.player.z;
    const targetAngle = Math.atan2(dx, dz);
    this.player.rotation = THREE.MathUtils.damp(this.player.rotation, targetAngle, 16, dt);

    // Banking roll into turns
    const targetBank = -moveX * 0.25;
    this.player.bankAngle = THREE.MathUtils.damp(this.player.bankAngle, targetBank, 10, dt);

    // Update 3D player mesh
    if (this.renderer.playerGroup) {
      this.renderer.playerGroup.position.set(this.player.x, 0, this.player.z);
      this.renderer.playerGroup.rotation.y = this.player.rotation;
      this.renderer.playerGroup.rotation.z = this.player.bankAngle;

      // Booster flame scaling
      const flameScale = 0.8 + inputLen * 0.6 + (this.player.stats.isDashing ? 1.5 : 0);
      this.renderer.playerGroup.leftBoosterFlame.scale.set(1, flameScale, 1);
      this.renderer.playerGroup.rightBoosterFlame.scale.set(1, flameScale, 1);
    }

    // Shooting
    if (this.shootTimer > 0) {
      this.shootTimer -= dt;
    }
    if ((this.isMouseDown || this.keysHeld['Space']) && this.shootTimer <= 0) {
      this.shootPlayerWeapon();
    }

    // Passive Shield Regen (if not damaged in last 3s)
    if (this.player.stats.shield < this.player.stats.maxShield) {
      this.player.stats.shield = Math.min(this.player.stats.maxShield, this.player.stats.shield + 8 * dt);
    }

    // Combo timer decay
    if (this.player.stats.comboTimer > 0) {
      this.player.stats.comboTimer -= dt;
      if (this.player.stats.comboTimer <= 0) {
        this.player.stats.combo = 0;
      }
    }

    // Overclock timer decay
    if (this.player.stats.overclockTimer > 0) {
      this.player.stats.overclockTimer = Math.max(0, this.player.stats.overclockTimer - dt);
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life += dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, 1.1, b.z);

      // Despawn on max life or out of bounds
      if (b.life >= b.maxLife || Math.hypot(b.x, b.z) > 34) {
        this.renderer.scene.remove(b.mesh);
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      // Player bullet vs enemies
      if (b.isPlayer) {
        let hitSomething = false;
        for (const en of this.enemies) {
          const dist = Math.hypot(b.x - en.x, b.z - en.z);
          if (dist < en.def.radius + 0.3) {
            this.player.stats.accuracyShotsHit++;
            this.damageEnemy(en, b.damage, Math.random() < 0.2);
            hitSomething = true;
            b.pierce--;
            if (b.pierce <= 0) break;
          }
        }
        if (hitSomething && b.pierce <= 0) {
          this.renderer.scene.remove(b.mesh);
          (b.mesh.material as THREE.Material).dispose();
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        // Enemy bullet vs player
        const dist = Math.hypot(b.x - this.player.x, b.z - this.player.z);
        if (dist < 1.1) {
          this.damagePlayer(b.damage);
          this.renderer.scene.remove(b.mesh);
          (b.mesh.material as THREE.Material).dispose();
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const en of this.enemies) {
      // 1. Recover from hit flash
      if (en.hitFlashTimer > 0) {
        en.hitFlashTimer -= dt;
        if (en.hitFlashTimer <= 0) {
          en.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
              child.material.emissive.setHex(0x000000);
            }
          });
        }
      }

      // 2. Vector towards player
      const dx = this.player.x - en.x;
      const dz = this.player.z - en.z;
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;

      // Rotate enemy to face player
      const targetAngle = Math.atan2(dx, dz);
      en.mesh.rotation.y = THREE.MathUtils.damp(en.mesh.rotation.y, targetAngle, 8, dt);

      // 3. Enemy specific behaviors
      if (en.def.type === 'SCOUT_DRONE') {
        // Hover at mid-distance (8-12 units)
        const desiredDist = 10;
        let speedMult = 1;
        if (dist < desiredDist) speedMult = -0.5; // back up

        en.vx = nx * en.def.speed * speedMult;
        en.vz = nz * en.def.speed * speedMult;
        en.x += en.vx * dt;
        en.z += en.vz * dt;

        // Attack cycle: targeting beam -> burst
        en.attackTimer += dt;
        if (en.attackTimer >= en.def.attackCooldown - 1.2) {
          // Show red laser telegraph line
          if (en.telegraphMesh) {
            en.telegraphMesh.visible = true;
            const points = [
              new THREE.Vector3(en.x, 1.0, en.z),
              new THREE.Vector3(this.player.x, 1.0, this.player.z),
            ];
            (en.telegraphMesh as THREE.Line).geometry.setFromPoints(points);
          }
        }

        if (en.attackTimer >= en.def.attackCooldown) {
          en.attackTimer = 0;
          if (en.telegraphMesh) en.telegraphMesh.visible = false;
          // Fire plasma bolt
          this.spawnBullet(en.x, en.z, nx, nz, 18, false, 1, 24, 0xff0044);
          sound.playLaserShot('PLASMA');
        }
      } else if (en.def.type === 'HEX_ROLLER') {
        // Skitters fast towards player, explodes when close
        en.vx = nx * en.def.speed;
        en.vz = nz * en.def.speed;
        en.x += en.vx * dt;
        en.z += en.vz * dt;

        if (dist < 3.2 && !en.isTelegraphing) {
          en.isTelegraphing = true;
          en.telegraphTimer = 0.8;
          // Spawn floor warning ring
          this.spawnTelegraphMarker(en.x, en.z, 4.5, 0.8, () => {
            // Detonate
            sound.playExplosion(false);
            this.renderer.spawnShockwave(en.x, en.z, 0xff4400, 9);
            const pDist = Math.hypot(this.player.x - en.x, this.player.z - en.z);
            if (pDist < 4.8) {
              this.damagePlayer(45);
            }
            this.killEnemy(en);
          });
        }
      } else if (en.def.type === 'HEAVY_ENFORCER') {
        // Slow advance, heavy twin cannon burst
        en.vx = nx * en.def.speed;
        en.vz = nz * en.def.speed;
        en.x += en.vx * dt;
        en.z += en.vz * dt;

        en.attackTimer += dt;
        if (en.attackTimer >= en.def.attackCooldown) {
          en.attackTimer = 0;
          // Fire dual spread
          [-0.15, 0.15].forEach((ang) => {
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            const rx = nx * cos - nz * sin;
            const rz = nx * sin + nz * cos;
            this.spawnBullet(en.x, en.z, rx, rz, 28, false, 1, 22, 0xff8800);
          });
          sound.playLaserShot('RAILGUN');
        }
      } else if (en.def.type === 'ARCHON_BOSS') {
        // Boss AI: sweeps laser, spawns orbital strike telegraphs, and heavy barrage
        en.vx = nx * en.def.speed * 0.7;
        en.vz = nz * en.def.speed * 0.7;
        en.x += en.vx * dt;
        en.z += en.vz * dt;

        en.attackTimer += dt;
        if (en.attackTimer >= en.def.attackCooldown) {
          en.attackTimer = 0;
          const attackChoice = Math.random();

          if (attackChoice < 0.45) {
            // Orbital strike bombardment: 4-6 red circles around player
            sound.playBossWarning();
            for (let i = 0; i < 5; i++) {
              const ox = this.player.x + (Math.random() - 0.5) * 14;
              const oz = this.player.z + (Math.random() - 0.5) * 14;
              this.spawnTelegraphMarker(ox, oz, 3.6, 1.4, () => {
                sound.playExplosion(false);
                this.renderer.spawnShockwave(ox, oz, 0xff0044, 8);
                const pDist = Math.hypot(this.player.x - ox, this.player.z - oz);
                if (pDist < 3.8) {
                  this.damagePlayer(40);
                }
              });
            }
          } else {
            // Radial plasma spread
            const bulletCount = 12;
            for (let i = 0; i < bulletCount; i++) {
              const angle = (i / bulletCount) * Math.PI * 2;
              const bx = Math.cos(angle);
              const bz = Math.sin(angle);
              this.spawnBullet(en.x, en.z, bx, bz, 24, false, 1, 18, 0xff0055);
            }
            sound.playLaserShot('PLASMA');
          }
        }
      }

      // Update mesh position
      en.mesh.position.set(en.x, 0, en.z);
    }
  }

  private spawnTelegraphMarker(x: number, z: number, radius: number, duration: number, onExplode: () => void) {
    const geo = new THREE.RingGeometry(0.1, radius, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.05, z);
    this.renderer.telegraphGroup.add(mesh);

    this.telegraphs.push({
      mesh,
      x,
      z,
      radius,
      duration,
      elapsed: 0,
      onExplode,
    });
  }

  private updateTelegraphs(dt: number) {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      tg.elapsed += dt;

      // Pulsing warning opacity
      const progress = tg.elapsed / tg.duration;
      const blink = Math.sin(tg.elapsed * 18) * 0.2 + 0.5;
      (tg.mesh.material as THREE.MeshBasicMaterial).opacity = blink;

      if (tg.elapsed >= tg.duration) {
        tg.onExplode();
        this.renderer.telegraphGroup.remove(tg.mesh);
        (tg.mesh.material as THREE.Material).dispose();
        (tg.mesh.geometry as THREE.BufferGeometry).dispose();
        this.telegraphs.splice(i, 1);
      }
    }
  }

  private updatePowerUps(dt: number) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.data.duration -= dt;

      // Rotation & bobbing
      p.mesh.rotation.y += dt * 2.5;
      p.mesh.position.y = 0.2 + Math.sin(p.data.duration * 4) * 0.15;

      // Pick-up check
      const dist = Math.hypot(this.player.x - p.data.x, this.player.z - p.data.z);
      if (dist < 1.6) {
        sound.playPowerUp();
        if (p.data.type === 'HEALTH') {
          this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + 45);
        } else if (p.data.type === 'SHIELD') {
          this.player.stats.shield = this.player.stats.maxShield;
        } else if (p.data.type === 'OVERCLOCK') {
          this.player.stats.overclockTimer = 7.0; // 7s rapid fire
        } else if (p.data.type === 'NOVA') {
          this.player.stats.novaCharge = 100;
        }

        this.renderer.spawnParticleBurst(p.data.x, 1.0, p.data.z, 0x00ff88, 16, 10);
        this.renderer.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.data.duration <= 0) {
        this.renderer.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
      }
    }
  }

  private updateWaveDirector(dt: number) {
    if (this.waveBreakTimer > 0) {
      this.waveBreakTimer -= dt;
      return;
    }

    // Spawn queue
    if (this.waveEnemiesRemaining > 0) {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        this.waveSpawnTimer = this.isBossWave ? 999 : 1.2;
        this.waveEnemiesRemaining--;

        if (this.isBossWave) {
          this.spawnEnemy('ARCHON_BOSS');
        } else {
          // Choose enemy based on wave
          const r = Math.random();
          if (this.player.stats.wave >= 3 && r < 0.25) {
            this.spawnEnemy('HEAVY_ENFORCER');
          } else if (r < 0.55) {
            this.spawnEnemy('HEX_ROLLER');
          } else {
            this.spawnEnemy('SCOUT_DRONE');
          }
        }
      }
    }

    // Wave completed
    if (this.waveEnemiesRemaining === 0 && this.enemies.length === 0) {
      sound.playPowerUp();
      this.initWave(this.player.stats.wave + 1);
    }
  }

  public getBossInstance(): EnemyInstance | undefined {
    return this.enemies.find((e) => e.def.type === 'ARCHON_BOSS');
  }

  public resize(width: number, height: number) {
    this.renderer.resize(width, height);
  }

  public dispose() {
    this.clearAllActors();
    this.renderer.dispose();
  }
}
