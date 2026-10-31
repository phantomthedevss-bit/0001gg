/**
 * CYBERPULSE: OMEGA PROTOCOL - Main Application Orchestrator
 * Mounts WebGL canvas inside an isolated ref container, runs 60fps simulation loop,
 * wires procedural audio, and coordinates Game Shell state transitions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ThreeRenderer } from './game/threeRenderer';
import { CHASSIS_SKINS, GameEngine, WEAPONS } from './game/gameEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import {
  ChassisSkinDef,
  DamageNumber,
  GameState,
  PlayerStats,
  WeaponDef,
  WeaponId,
} from './types/game';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);

  // High-level UI state
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPONS.PLASMA_AUTO);
  const [currentSkin, setCurrentSkin] = useState<ChassisSkinDef>(CHASSIS_SKINS[0]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
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
  });

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('cyberpulse_high_score') || 0);
    } catch {
      return 0;
    }
  });

  // Floating damage numbers
  const [damagePopups, setDamagePopups] = useState<DamageNumber[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Initialize ThreeRenderer
    const renderer = new ThreeRenderer(mountRef.current, currentSkin);
    rendererRef.current = renderer;

    // 2. Initialize GameEngine
    const engine = new GameEngine(
      renderer,
      (nextState) => {
        setGameState(nextState);
      },
      (stats) => {
        setPlayerStats({ ...stats });
        if (stats.score > highScore) {
          setHighScore(stats.score);
          try {
            localStorage.setItem('cyberpulse_high_score', stats.score.toString());
          } catch {
            // LocalStorage disabled or quota exceeded
          }
        }
      },
      (dmg) => {
        setDamagePopups((prev) => [...prev.slice(-12), dmg]);
      }
    );
    engineRef.current = engine;

    // 3. 60 FPS Game Loop with delta timing & Software WebGL support
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function loop(currentTime: number) {
      const rawDt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Advance game engine simulation
      engine.tick(rawDt);

      // Advance floating damage numbers
      setDamagePopups((prev) =>
        prev
          .map((d) => ({ ...d, life: d.life + rawDt }))
          .filter((d) => d.life < d.maxLife)
      );

      // Software WebGL pacing vs native GPU requestAnimationFrame
      if (renderer.isSoftwareGl) {
        afterDraw(() => {
          lastTime = performance.now();
          loop(lastTime);
        });
      } else {
        frameId = requestAnimationFrame(loop);
      }
    }

    frameId = requestAnimationFrame((t) => {
      lastTime = t;
      loop(t);
    });

    // 4. Window Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 5. Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      renderer.dispose();
    };
  }, []);

  // Weapon selection handler
  const handleSelectWeapon = (wId: WeaponId) => {
    setCurrentWeapon(WEAPONS[wId]);
    if (engineRef.current) {
      engineRef.current.setWeapon(wId);
    }
  };

  // Skin selection handler
  const handleSelectSkin = (skin: ChassisSkinDef) => {
    setCurrentSkin(skin);
    if (engineRef.current) {
      engineRef.current.setSkin(skin);
    }
  };

  // Start game handler
  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  };

  // Pause & Resume handlers
  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
    }
  };

  const handleResume = () => {
    if (engineRef.current) {
      engineRef.current.resumeGame();
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.startGame();
    }
  };

  const handleExitToTitle = () => {
    if (engineRef.current) {
      engineRef.current.returnToTitle();
    }
  };

  const bossInstance = engineRef.current?.getBossInstance();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050608]">
      {/* 1. Isolated WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* 2. Title Screen / Hangar Mode */}
      {gameState === 'TITLE' && (
        <TitleScreen
          currentWeapon={currentWeapon}
          currentSkin={currentSkin}
          onSelectWeapon={handleSelectWeapon}
          onSelectSkin={handleSelectSkin}
          onStartGame={handleStartGame}
          highScore={highScore}
        />
      )}

      {/* 3. In-Game Low-Occlusion HUD */}
      {gameState === 'PLAYING' && (
        <GameHUD
          stats={playerStats}
          weapon={currentWeapon}
          onPause={handlePause}
          bossInstance={bossInstance}
          damagePopups={damagePopups}
        />
      )}

      {/* 4. Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {/* 5. Game Over / Victory Screen */}
      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <GameOverModal
          isVictory={gameState === 'VICTORY'}
          stats={playerStats}
          onRestart={handleRestart}
          onExitToTitle={handleExitToTitle}
        />
      )}
    </div>
  );
}
