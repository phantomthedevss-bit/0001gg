/**
 * Mobile Virtual Twin-Stick & Combat Action Controls
 * Touch-optimized analog thumbstick on the left and tactical action cluster on the right.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Zap, ShieldAlert, Crosshair, Wind, Sparkles } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface MobileControlsProps {
  onMove: (x: number, z: number) => void;
  onAim: (angle: number | null) => void;
  onShooting: (active: boolean) => void;
  onDash: () => void;
  onNova: () => void;
  stats: PlayerStats;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onAim,
  onShooting,
  onDash,
  onNova,
  stats,
}) => {
  // Left Movement Joystick State
  const joyPadRef = useRef<HTMLDivElement>(null);
  const [joyActive, setJoyActive] = useState(false);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const moveTouchId = useRef<number | null>(null);

  // Right Aim/Fire Joystick State
  const aimPadRef = useRef<HTMLDivElement>(null);
  const [aimActive, setAimActive] = useState(false);
  const [aimOffset, setAimOffset] = useState({ x: 0, y: 0 });
  const aimTouchId = useRef<number | null>(null);

  const dashReady = stats.dashTimer <= 0;
  const novaReady = stats.novaCharge >= 100;
  const maxRadius = 45;

  // --- MOVEMENT JOYSTICK HANDLERS ---
  const handleMoveStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (moveTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    moveTouchId.current = touch.identifier;
    setJoyActive(true);
    updateMoveJoystick(touch.clientX, touch.clientY);
  };

  const handleMoveMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === moveTouchId.current) {
        updateMoveJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleMoveEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === moveTouchId.current) {
        moveTouchId.current = null;
        setJoyActive(false);
        setJoyOffset({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateMoveJoystick = (clientX: number, clientY: number) => {
    if (!joyPadRef.current) return;
    const rect = joyPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setJoyOffset({ x: clampedX, y: clampedY });

    // Output normalized movement vector (X and Z)
    const normX = clampedX / maxRadius;
    const normZ = clampedY / maxRadius;
    onMove(normX, normZ);
  };

  // --- AIM & FIRE BUTTON / JOYSTICK HANDLERS ---
  const handleAimStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (aimTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    aimTouchId.current = touch.identifier;
    setAimActive(true);
    onShooting(true);
    updateAimJoystick(touch.clientX, touch.clientY);
  };

  const handleAimMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchId.current) {
        updateAimJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleAimEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === aimTouchId.current) {
        aimTouchId.current = null;
        setAimActive(false);
        setAimOffset({ x: 0, y: 0 });
        onShooting(false);
        onAim(null); // Return to auto-aim
        break;
      }
    }
  };

  const updateAimJoystick = (clientX: number, clientY: number) => {
    if (!aimPadRef.current) return;
    const rect = aimPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > 10) {
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);
      setAimOffset({
        x: Math.cos(angle) * clampedDist,
        y: Math.sin(angle) * clampedDist,
      });

      // 3D rotation angle in horizontal ground plane
      const groundAngle = Math.atan2(dx, dy);
      onAim(groundAngle);
    } else {
      setAimOffset({ x: 0, y: 0 });
      onAim(null); // Auto-aim at nearest enemy
    }
  };

  // Global cancel safety
  useEffect(() => {
    const handleGlobalTouchEnd = () => {
      if (moveTouchId.current !== null) {
        moveTouchId.current = null;
        setJoyActive(false);
        setJoyOffset({ x: 0, y: 0 });
        onMove(0, 0);
      }
      if (aimTouchId.current !== null) {
        aimTouchId.current = null;
        setAimActive(false);
        setAimOffset({ x: 0, y: 0 });
        onShooting(false);
        onAim(null);
      }
    };
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    return () => {
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [onMove, onAim, onShooting]);

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none z-20 flex justify-between items-end p-4 md:p-8 select-none">
      {/* 1. Left Movement Virtual Stick */}
      <div
        ref={joyPadRef}
        onTouchStart={handleMoveStart}
        onTouchMove={handleMoveMove}
        onTouchEnd={handleMoveEnd}
        onTouchCancel={handleMoveEnd}
        className="pointer-events-auto relative w-36 h-36 md:w-44 md:h-44 rounded-full border-2 border-cyan-500/30 bg-slate-950/40 flex items-center justify-center touch-none mb-2 ml-1"
        style={{ touchAction: 'none' }}
      >
        {/* Outer Ring Decal */}
        <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400/40" />

        {/* Joystick Thumb Knob */}
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 transition-transform duration-75 flex items-center justify-center ${
            joyActive
              ? 'border-cyan-400 bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
              : 'border-cyan-500/40 bg-slate-900/60'
          }`}
          style={{
            transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)`,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-cyan-400" />
        </div>
      </div>

      {/* 2. Right Combat Action Cluster */}
      <div className="pointer-events-auto relative flex flex-col items-end space-y-3 mb-2 mr-1">
        {/* Top Mini Buttons: Nova EMP + Dash */}
        <div className="flex items-center space-x-3">
          {/* Nova EMP Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onNova();
            }}
            disabled={!novaReady}
            className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all active:scale-90 ${
              novaReady
                ? 'border-fuchsia-400 bg-fuchsia-600/30 text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.7)] animate-pulse'
                : 'border-slate-800 bg-slate-950/60 text-slate-600'
            }`}
          >
            <Sparkles size={20} />
            <span className="text-[8px] font-bold font-code mt-0.5">
              {novaReady ? 'NOVA' : `${Math.round(stats.novaCharge)}%`}
            </span>
          </button>

          {/* Dash Booster Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onDash();
            }}
            disabled={!dashReady}
            className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all active:scale-90 ${
              dashReady
                ? 'border-cyan-400 bg-cyan-600/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'border-slate-800 bg-slate-950/60 text-slate-600'
            }`}
          >
            <Wind size={20} />
            <span className="text-[8px] font-bold font-code mt-0.5">
              {dashReady ? 'DASH' : `${stats.dashTimer.toFixed(1)}s`}
            </span>
          </button>
        </div>

        {/* Large Primary Fire / Aim Stick */}
        <div
          ref={aimPadRef}
          onTouchStart={handleAimStart}
          onTouchMove={handleAimMove}
          onTouchEnd={handleAimEnd}
          onTouchCancel={handleAimEnd}
          className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-rose-500/40 bg-slate-950/50 flex items-center justify-center touch-none"
          style={{ touchAction: 'none' }}
        >
          {/* Target Guide Ring */}
          <div className="absolute inset-1.5 rounded-full border border-dashed border-rose-500/20" />

          {/* Knob / Button */}
          <div
            className={`w-16 h-16 md:w-18 md:h-18 rounded-full border-2 flex flex-col items-center justify-center transition-transform duration-75 ${
              aimActive
                ? 'border-rose-400 bg-rose-600/40 shadow-[0_0_20px_rgba(244,63,94,0.7)] text-white'
                : 'border-rose-500/50 bg-rose-950/40 text-rose-300'
            }`}
            style={{
              transform: `translate(${aimOffset.x}px, ${aimOffset.y}px)`,
            }}
          >
            <Crosshair size={24} />
            <span className="text-[9px] font-extrabold font-code mt-0.5 tracking-wider">
              {aimActive ? 'AIMING' : 'FIRE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
