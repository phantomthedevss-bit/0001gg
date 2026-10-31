/**
 * Title Screen & Hangar Customizer
 * Bespoke inline SVG title lockup, weapon & skin selector, and single flat control hint line.
 */

import React from 'react';
import { ChassisSkinDef, WeaponDef, WeaponId, ChassisSkinId } from '../types/game';
import { WEAPONS, CHASSIS_SKINS } from '../game/gameEngine';
import { Zap, Crosshair, Radio, Volume2, VolumeX, Shield, Play } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface TitleScreenProps {
  currentWeapon: WeaponDef;
  currentSkin: ChassisSkinDef;
  onSelectWeapon: (id: WeaponId) => void;
  onSelectSkin: (skin: ChassisSkinDef) => void;
  onStartGame: () => void;
  highScore: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentWeapon,
  currentSkin,
  onSelectWeapon,
  onSelectSkin,
  onStartGame,
  highScore,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-10 pointer-events-none select-none overflow-y-auto">
      {/* Top Bar: Mission Telemetry & Audio Toggle */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-2 md:space-x-3 pointer-events-auto">
          <div className="px-2.5 py-1 bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 text-[10px] md:text-xs tracking-widest uppercase font-code">
            SYS.VER // 4.8.19
          </div>
          <div className="hidden sm:block px-2.5 py-1 bg-slate-900/70 border border-slate-700/50 text-slate-300 text-[10px] md:text-xs tracking-wider uppercase font-code">
            COMBAT DOCK: HANGAR-07
          </div>
        </div>

        <div className="flex items-center space-x-3 pointer-events-auto">
          {highScore > 0 && (
            <div className="text-right">
              <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest font-code block">RECORD SCORE</span>
              <span className="text-xs md:text-base font-bold text-amber-400 font-code tabular-nums">
                {highScore.toLocaleString()}
              </span>
            </div>
          )}

          <button
            onClick={handleToggleMute}
            className="p-2 md:p-2.5 bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Center: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto py-2 text-center">
        {/* Bespoke Inline SVG Logo */}
        <div className="w-full max-w-lg md:max-w-xl mx-auto mb-1 md:mb-2 pointer-events-auto">
          <svg viewBox="0 0 680 130" className="w-full h-auto drop-shadow-[0_0_24px_rgba(0,240,255,0.4)]">
            <defs>
              <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>

            {/* Futuristic Tech Frame Marks */}
            <path d="M 30,15 L 15,15 L 15,30" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
            <path d="M 650,15 L 665,15 L 665,30" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
            <path d="M 30,115 L 15,115 L 15,100" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
            <path d="M 650,115 L 665,115 L 665,100" stroke="#00f0ff" strokeWidth="2.5" fill="none" />

            {/* Glowing Accent Lines */}
            <line x1="120" y1="20" x2="560" y2="20" stroke="url(#neonGrad)" strokeWidth="1.5" strokeDasharray="12 6" />
            <line x1="80" y1="110" x2="600" y2="110" stroke="url(#neonGrad)" strokeWidth="1.5" strokeDasharray="8 4" />

            {/* Title Text */}
            <text
              x="340"
              y="74"
              textAnchor="middle"
              fill="url(#glowGrad)"
              fontFamily="Chakra Petch"
              fontWeight="800"
              fontSize="52"
              letterSpacing="8"
            >
              CYBERPULSE
            </text>

            {/* Subtitle Protocol */}
            <text
              x="340"
              y="100"
              textAnchor="middle"
              fill="#00f0ff"
              fontFamily="JetBrains Mono"
              fontWeight="700"
              fontSize="14"
              letterSpacing="12"
            >
              // OMEGA PROTOCOL //
            </text>
          </svg>
        </div>

        <p className="text-slate-400 text-[11px] md:text-sm max-w-md mx-auto mb-4 md:mb-6 font-code tracking-wide px-2">
          Tactical Mech Arena. Neutralize rogue synth swarms and defeat the colossal war titan.
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStartGame}
          className="pointer-events-auto group relative px-8 md:px-10 py-3.5 md:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm md:text-lg tracking-widest uppercase transition-all duration-150 shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:shadow-[0_0_45px_rgba(6,182,212,0.7)] flex items-center space-x-3 active:scale-95"
        >
          <Play size={18} className="fill-current" />
          <span>DEPLOY MECH</span>
          <span className="hidden sm:inline text-xs bg-slate-950/20 px-2 py-0.5 rounded text-slate-900 font-code font-bold">SPACE</span>
        </button>
      </div>

      {/* Bottom Area: Hangar Customizer Dock & Control Ribbon */}
      <div className="w-full max-w-4xl mx-auto space-y-2 md:space-y-4">
        {/* Hangar Customizer Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 bg-slate-950/80 border border-slate-800 p-2.5 md:p-4 pointer-events-auto">
          {/* Weapon Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <span className="text-[11px] md:text-xs font-bold text-cyan-400 uppercase tracking-widest font-code flex items-center gap-1.5">
                <Crosshair size={13} /> PRIMARY WEAPON
              </span>
              <span className="text-[10px] md:text-[11px] text-slate-400 font-code">{currentWeapon.subtitle}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              {(Object.keys(WEAPONS) as WeaponId[]).map((wId) => {
                const w = WEAPONS[wId];
                const active = currentWeapon.id === wId;
                return (
                  <button
                    key={wId}
                    onClick={() => onSelectWeapon(wId)}
                    className={`p-1.5 md:p-2.5 text-left border transition-all ${
                      active
                        ? 'border-cyan-400 bg-cyan-950/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-1 text-[11px] md:text-xs font-bold truncate mb-0.5">
                      {wId === 'PLASMA_AUTO' && <Zap size={12} className="text-cyan-400 shrink-0" />}
                      {wId === 'GAUSS_RAILGUN' && <Crosshair size={12} className="text-sky-400 shrink-0" />}
                      {wId === 'TESLA_ARC' && <Radio size={12} className="text-purple-400 shrink-0" />}
                      <span className="truncate">{w.name.split(' ')[0]}</span>
                    </div>
                    <div className="text-[9px] md:text-[10px] text-slate-500 font-code">DMG: {w.damage}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Armor Skin Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <span className="text-[11px] md:text-xs font-bold text-cyan-400 uppercase tracking-widest font-code flex items-center gap-1.5">
                <Shield size={13} /> CHASSIS ALLOY
              </span>
              <span className="text-[10px] md:text-[11px] text-slate-400 font-code">{currentSkin.name}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              {CHASSIS_SKINS.map((skin) => {
                const active = currentSkin.id === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => onSelectSkin(skin)}
                    className={`p-1.5 md:p-2 text-center border transition-all ${
                      active
                        ? 'border-cyan-400 bg-cyan-950/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-full h-2.5 md:h-3 rounded-sm mb-1 border border-white/20"
                      style={{ backgroundColor: `#${skin.primaryColor.toString(16).padStart(6, '0')}` }}
                    />
                    <div className="text-[9px] md:text-[10px] font-bold truncate">{skin.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Flat Control-Hint Line (Strict Game Craft Requirement) */}
        <div className="text-center">
          <div className="inline-block px-3 md:px-4 py-1 md:py-1.5 bg-slate-950/70 border border-slate-800/80 text-slate-400 text-[10px] md:text-xs tracking-wider font-code">
            {isTouch
              ? 'Virtual Stick Move · Tap/Drag Fire to Shoot · Dash & EMP Buttons'
              : 'WASD Move · Mouse Aim · Left-Click Shoot · Shift Dash · Space/E Nova · Esc Pause · M Mute'}
          </div>
        </div>
      </div>
    </div>
  );
};
