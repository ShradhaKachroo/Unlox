import React, { useMemo } from 'react';
import { getCameraTransform } from '../anim/camera';
import { seeded } from '../anim/helpers';
import { clamp01 } from '../anim/ease';
import { useSettings } from '../context/useSettings';

interface SceneStageProps {
  t: number;
  duration: number;
  children: React.ReactNode;
  quality?: 'high' | 'low';
  title?: string;
  badge?: string;
}

interface Particle {
  x: number;
  baseY: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
}

export const SceneStage: React.FC<SceneStageProps> = ({
  t,
  duration,
  children,
  quality = 'high',
}) => {
  const { settings } = useSettings();
  const isReducedMotion = quality === 'low' || settings.dyslexia;

  // In dyslexia/reduced motion mode, keep camera fixed without drift
  const camera = isReducedMotion
    ? { transform: 'scale(1.0)', zoom: 1, tiltX: 0, tiltY: 0 }
    : getCameraTransform(t, duration);

  // Soft exit fade in last 400ms of scene
  const exitStart = Math.max(0, duration - 400);
  const exitProgress = t >= exitStart ? clamp01((t - exitStart) / 400) : 0;
  const stageOpacity = 1 - exitProgress * 0.95;

  // Moving radial glow center derived from t (static when reduced motion)
  const glowX = isReducedMotion ? 640 : 640 + Math.sin(t / 2200) * 220;
  const glowY = isReducedMotion ? 320 : 320 + Math.cos(t / 1800) * 120;
  const glowRadius = isReducedMotion ? 450 : 450 + Math.sin(t / 1500) * 50;

  // Floor grid drift derived from t
  const floorOffset = isReducedMotion ? 0 : (t * 0.04) % 60;

  // 30 deterministic particles generated from fixed seed
  const particles = useMemo<Particle[]>(() => {
    const rng = seeded(1337);
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#34d399', '#f59e0b'];
    const list: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      list.push({
        x: rng() * 1280,
        baseY: rng() * 720,
        size: 1.5 + rng() * 3.5,
        speed: 0.02 + rng() * 0.04,
        opacity: 0.15 + rng() * 0.45,
        color: colors[Math.floor(rng() * colors.length)],
      });
    }
    return list;
  }, []);

  return (
    <div
      style={{
        width: '1280px',
        height: '720px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #090e1f 0%, #060914 50%, #02040a 100%)',
        color: '#f8fafc',
        boxSizing: 'border-box',
        userSelect: 'none',
        opacity: stageOpacity,
      }}
    >
      {/* Dynamic Animated Glow (glides with t, or calm static glow in reduced motion) */}
      <div
        style={{
          position: 'absolute',
          left: `${glowX - glowRadius}px`,
          top: `${glowY - glowRadius}px`,
          width: `${glowRadius * 2}px`,
          height: `${glowRadius * 2}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(99, 102, 241, 0.12) 40%, rgba(15, 23, 42, 0) 70%)',
          pointerEvents: 'none',
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* 3D Perspective Floor Grid */}
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-20%',
          width: '140%',
          height: '420px',
          perspective: '600px',
          transform: 'rotateX(62deg)',
          transformOrigin: 'bottom center',
          pointerEvents: 'none',
          opacity: isReducedMotion ? 0.08 : 0.22,
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
        }}
      >
        <svg width="100%" height="100%">
          <defs>
            <pattern id="floorGrid" width="60" height="60" patternUnits="userSpaceOnUse" y={floorOffset}>
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#floorGrid)" />
        </svg>
      </div>

      {/* Floating Particles (Disabled in low quality or dyslexia mode) */}
      {!isReducedMotion && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1280px',
            height: '720px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {particles.map((p, idx) => {
            const currentY = (p.baseY - t * p.speed) % 720;
            const posY = currentY < 0 ? currentY + 720 : currentY;
            const pulse = 0.8 + 0.2 * Math.sin(t * 0.003 + idx);

            return (
              <circle
                key={`particle-${idx}`}
                cx={p.x + Math.sin(t * 0.001 + idx) * 12}
                cy={posY}
                r={p.size * pulse}
                fill={p.color}
                opacity={p.opacity * pulse}
              />
            );
          })}
        </svg>
      )}

      {/* 3D Perspective Stage Container with Camera Motion */}
      <div
        style={{
          width: '1280px',
          height: '720px',
          position: 'relative',
          perspective: '1400px',
          perspectiveOrigin: '50% 45%',
          transformStyle: 'preserve-3d',
          transform: camera.transform,
          zIndex: 2,
        }}
      >
        {children}
      </div>
    </div>
  );
};
