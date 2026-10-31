/**
 * World-Matched, Low-Occlusion In-Game HUD
 * Enforces >= 85% unobstructed viewport, pointer-events: none wrappers,
 * tabular-nums integer readouts, and zero backdrop-filter over WebGL.
 */

import React from 'react';
import { DamageNumber, PlayerStats, WeaponDef } from '../types/game';
import { sound } from '../audio/soundEngine';
import { Volume2, VolumeX, Pause, Zap, Shield, Heart, Activity } from 'lucide-react';
import { EnemyInstance } from '../game/gameEngine';

interface GameHUDProps {
  stats: PlayerStats;
  weapon: WeaponDef;
  onPause: () => void;
  bossInstance?: EnemyInstance;
  damagePopups: DamageNumber[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  weapon,
  onPause,
  bossInstance,
  damagePopups,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const dashReady = stats.dashTimer <= 0;
  const novaReady = stats.novaCharge >= 100;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Player Hull & Shield Gauges */}
        <div className="w-56 md:w-64 space-y-2 pointer-events-auto bg-slate-950/80 border border-slate-800 p-3">
          {/* Hull Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-code">
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <Heart size={13} /> HULL
              </span>
              <span className="tabular-nums font-bold text-slate-200">
                {Math.ceil(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  hpPercent < 30 ? 'bg-rose-600' : 'bg-gradient-to-r from-rose-500 to-amber-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Shield Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-code">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Shield size={13} /> SHIELD
              </span>
              <span className="tabular-nums font-bold text-slate-200">
                {Math.ceil(stats.shield)} / {stats.maxShield}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-100"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>

          {/* Dash & Overclock Status */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-code">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">BOOSTER:</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  dashReady ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {dashReady ? 'READY [SHIFT]' : 'RECHARGING'}
              </span>
            </div>

            {stats.overclockTimer > 0 && (
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <Zap size={12} /> HYPER-FIRE {stats.overclockTimer.toFixed(1)}s
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Boss Titan Health Bar (when active) */}
        {bossInstance && (
          <div className="w-80 md:w-96 bg-slate-950/85 border border-rose-600/70 p-3 pointer-events-auto text-center mx-4">
            <div className="flex items-center justify-between text-xs font-code mb-1">
              <span className="text-rose-400 font-bold tracking-widest flex items-center gap-1.5">
                <Activity size={14} className="animate-pulse" /> {bossInstance.def.name}
              </span>
              <span className="tabular-nums font-bold text-rose-300">
                {Math.max(0, Math.ceil(bossInstance.hp))} / {bossInstance.def.maxHp}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 border border-rose-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-500 transition-all duration-100"
                style={{ width: `${Math.max(0, (bossInstance.hp / bossInstance.def.maxHp) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-rose-300 font-code mt-1 tracking-wider">
              WARNING: HEAVY ARTILLERY & LASER BOMBARDMENT DETECTED
            </div>
          </div>
        )}

        {/* Top-Right: Wave, Score & Quick Controls */}
        <div className="space-y-1.5 pointer-events-auto text-right">
          <div className="bg-slate-950/80 border border-slate-800 p-2 md:p-3 inline-block min-w-32 md:min-w-44">
            <div className="flex items-center justify-between gap-3 text-[9px] md:text-[10px] text-cyan-400 font-code tracking-widest uppercase mb-0.5">
              <span>WAVE 0{stats.wave}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleToggleMute}
                  className="p-1 hover:text-white transition-colors"
                  title="Toggle Audio [M]"
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={onPause}
                  className="p-1 hover:text-white transition-colors"
                  title="Pause Game [Esc]"
                >
                  <Pause size={14} />
                </button>
              </div>
            </div>
            <div className="text-lg md:text-2xl font-bold font-code text-white tabular-nums tracking-wider">
              {stats.score.toLocaleString()}
            </div>

            {/* Combo Streak */}
            {stats.combo > 1 && (
              <div className="mt-1 pt-1 border-t border-slate-800 flex items-center justify-end space-x-1.5 text-[10px] md:text-xs font-code font-bold text-amber-400">
                <span>COMBO</span>
                <span className="px-1 py-0.2 bg-amber-500/20 border border-amber-500/50 rounded tabular-nums">
                  {stats.combo}x
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Floating Damage Popups (World-rendered in screen overlay) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {damagePopups.map((dmg) => (
          <div
            key={dmg.id}
            className="absolute font-bold text-sm md:text-base font-code drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all"
            style={{
              left: `${50 + (dmg.x * 2.2)}%`,
              top: `${50 + (dmg.z * 1.8) - (dmg.life * 45)}%`,
              color: dmg.color,
              opacity: 1 - dmg.life / dmg.maxLife,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {dmg.text}
          </div>
        ))}
      </div>

      {/* Bottom Perimeter Cluster (Desktop View / Centered for Mobile Clearance) */}
      <div className="hidden md:flex items-end justify-between w-full">
        {/* Weapon Readout */}
        <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 pointer-events-auto flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Zap size={16} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-code uppercase tracking-wider">ACTIVE ARMAMENT</div>
            <div className="text-xs font-bold text-slate-200 font-code">{weapon.name}</div>
          </div>
        </div>

        {/* Center: Nova Shockwave Gauge */}
        <div className="bg-slate-950/85 border border-slate-800 p-3 pointer-events-auto text-center w-64 md:w-80">
          <div className="flex items-center justify-between text-xs font-code mb-1">
            <span className={`font-bold ${novaReady ? 'text-fuchsia-400' : 'text-slate-400'}`}>
              EMP NOVA SHOCKWAVE [SPACE / E]
            </span>
            <span className="tabular-nums font-bold text-slate-300">{Math.round(stats.novaCharge)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                novaReady
                  ? 'bg-gradient-to-r from-fuchsia-500 via-pink-400 to-fuchsia-400 shadow-[0_0_12px_#d946ef]'
                  : 'bg-fuchsia-900'
              }`}
              style={{ width: `${stats.novaCharge}%` }}
            />
          </div>
        </div>

        {/* Action Controls: Pause & Audio */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            onClick={handleToggleMute}
            className="p-2.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Toggle Audio [M]"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={onPause}
            className="p-2.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition-colors flex items-center space-x-1.5 text-xs font-code"
            title="Pause Game [Esc]"
          >
            <Pause size={18} />
            <span className="hidden md:inline">PAUSE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
