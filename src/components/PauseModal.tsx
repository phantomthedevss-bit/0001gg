/**
 * Tactical In-Game Pause Modal
 * Direct shortcuts for Resume, Restart, and Audio Configuration.
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());
  const [volume, setVolume] = React.useState(80);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    sound.setMasterVolume(val / 100);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 p-6 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-wider text-white font-cyber">TACTICAL PAUSE</h2>
            <div className="text-[11px] text-cyan-400 font-code tracking-widest">OPERATION SUSPENDED</div>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 font-code border border-slate-700">ESC</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 font-code">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm tracking-wider uppercase transition-colors flex items-center justify-center space-x-2"
          >
            <Play size={18} className="fill-current" />
            <span>RESUME MISSION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw size={16} />
            <span>RESTART SECTOR [R]</span>
          </button>

          <button
            onClick={onExitToTitle}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-2"
          >
            <Home size={16} />
            <span>ABORT TO HANGAR</span>
          </button>
        </div>

        {/* Audio Slider */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-code">
            <span className="flex items-center gap-1.5">
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />} AUDIO VOLUME
            </span>
            <button
              onClick={handleToggleMute}
              className="text-[10px] text-cyan-400 hover:underline uppercase"
            >
              {isMuted ? 'UNMUTE [M]' : 'MUTE [M]'}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Control Cheat Sheet */}
        <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 font-code space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">WASD / ARROWS</span>
            <span>Omni-Directional Movement</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">MOUSE / RETICLE</span>
            <span>3D Directional Aim</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">LEFT-CLICK</span>
            <span>Fire Active Armament</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SHIFT / R-CLICK</span>
            <span>Hyper-Booster Dash</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SPACE / KEY E</span>
            <span>EMP Nova Shockwave</span>
          </div>
        </div>
      </div>
    </div>
  );
};
