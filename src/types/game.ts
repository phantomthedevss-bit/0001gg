/**
 * Game data structures and type definitions for CYBERPULSE: OMEGA PROTOCOL
 */

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type WeaponId = 'PLASMA_AUTO' | 'GAUSS_RAILGUN' | 'TESLA_ARC';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  subtitle: string;
  fireRate: number; // shots per sec
  damage: number;
  bulletSpeed: number;
  bulletColor: string;
  bulletSize: number;
  recoil: number;
  screenShake: number;
  description: string;
  icon: string;
}

export type ChassisSkinId = 'CYBER_NEON' | 'CRIMSON_FURY' | 'SOLAR_HAZARD' | 'VOID_PHANTOM';

export interface ChassisSkinDef {
  id: ChassisSkinId;
  name: string;
  primaryColor: number;
  secondaryColor: number;
  glowColor: number;
  accentColor: number;
  description: string;
}

export type EnemyType = 'SCOUT_DRONE' | 'HEX_ROLLER' | 'HEAVY_ENFORCER' | 'ARCHON_BOSS';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  maxHp: number;
  speed: number;
  scoreValue: number;
  radius: number;
  attackCooldown: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
  novaCharge: number; // 0 to 100
  score: number;
  kills: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  wave: number;
  accuracyShotsFired: number;
  accuracyShotsHit: number;
  overclockTimer: number;
}

export interface PowerUp {
  id: string;
  type: 'HEALTH' | 'SHIELD' | 'OVERCLOCK' | 'NOVA';
  x: number;
  z: number;
  duration: number;
}

export interface DamageNumber {
  id: number;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  life: number;
  maxLife: number;
}
