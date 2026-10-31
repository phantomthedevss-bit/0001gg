/**
 * GameOver & Victory Post-Battle Telemetry Screen
 * Displays performance metrics, combat rank, and instant restart actions.
 */

import React from 'react';
import { PlayerStats } from '../types/game';
import { RotateCcw, Home, Award, Target, Flame, ShieldAlert } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  stats: PlayerStats;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  stats,
  onRestart,
  onExitToTitle,
}) => {
  const accuracy = stats.accuracyShotsFired > 0
    ? Math.min(100, Math.round((stats.accuracyShotsHit / stats.accuracyShotsFired) * 100))
    : 0;

  // Calculate combat rank
  let rank = 'C';
  let rankColor = 'text-slate-400 border-slate-600';
  if (isVictory || stats.score > 12000) {
    rank = 'S';
    rankColor = 'text-amber-400 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]';
  } else if (stats.score > 6000 || stats.wave >= 4) {
    rank = 'A';
    rankColor = 'text-cyan-400 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]';
  } else if (stats.score > 2500 || stats.wave >= 2) {
    rank = 'B';
    rankColor = 'text-sky-400 border-sky-500';
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 p-6 md:p-8 space-y-6 shadow-2xl relative">
        {/* Status Header */}
        <div className="text-center space-y-1">
          <div className="inline-block px-3 py-0.5 text-[10px] font-code tracking-widest uppercase border mb-1">
            {isVictory ? (
              <span className="text-emerald-400 border-emerald-500/50 bg-emerald-950/40 px-2 py-0.5">
                TITAN ELIMINATED // VICTORY ACHIEVED
              </span>
            ) : (
              <span className="text-rose-400 border-rose-500/50 bg-rose-950/40 px-2 py-0.5 flex items-center gap-1 mx-auto w-fit">
                <ShieldAlert size={12} /> HULL BREACH // SYSTEM OFFLINE
              </span>
            )}
          </div>

          <h2
            className={`text-3xl md:text-4xl font-extrabold tracking-wider font-cyber ${
              isVictory ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {isVictory ? 'SECTOR LIBERATED' : 'MISSION FAILED'}
          </h2>
        </div>

        {/* Rank & Score Callout */}
        <div className="grid grid-cols-3 gap-3 items-center bg-slate-950/70 border border-slate-800 p-4">
          <div className="col-span-2 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-code block">
              FINAL COMBAT SCORE
            </span>
            <div className="text-2xl md:text-3xl font-extrabold text-white font-code tabular-nums tracking-wider">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-code block mb-1">
              RATING
            </span>
            <div
              className={`w-12 h-12 md:w-14 md:h-14 mx-auto flex items-center justify-center text-2xl md:text-3xl font-extrabold font-cyber border-2 rounded-sm ${rankColor}`}
            >
              {rank}
            </div>
          </div>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 gap-3 font-code text-xs">
          <div className="bg-slate-950/50 border border-slate-800 p-3 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Award size={14} className="text-cyan-400" /> SECTORS SURVIVED
            </span>
            <span className="text-lg font-bold text-slate-200 tabular-nums">
              {stats.wave} {stats.wave > 1 ? 'WAVES' : 'WAVE'}
            </span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 p-3 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Target size={14} className="text-rose-400" /> HOSTILES DESTROYED
            </span>
            <span className="text-lg font-bold text-slate-200 tabular-nums">
              {stats.kills} UNITS
            </span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 p-3 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Flame size={14} className="text-amber-400" /> MAX KILL COMBO
            </span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              {stats.maxCombo}x MULTIPLIER
            </span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 p-3 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Target size={14} className="text-purple-400" /> WEAPON ACCURACY
            </span>
            <span className="text-lg font-bold text-slate-200 tabular-nums">
              {accuracy}% HIT RATIO
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 font-code pt-2">
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center space-x-2 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
          >
            <RotateCcw size={18} />
            <span>DEPLOY AGAIN [SPACE / R]</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-2"
          >
            <Home size={16} />
            <span>RETURN TO HANGAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
