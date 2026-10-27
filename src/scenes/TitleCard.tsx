import React from 'react';
import type { TitleCardScene } from '../types/lesson';

interface TitleCardProps {
  scene: TitleCardScene;
  t: number;
  duration: number;
}

// Pure cubic ease-out
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
}

export const TitleCard: React.FC<TitleCardProps> = ({ scene, t, duration }) => {
  // Pure function of time: Heading fades and slides in over the first 600ms
  const headingProgress = Math.min(1, Math.max(0, t / 600));
  const headingEased = easeOutCubic(headingProgress);
  const headingOpacity = headingEased;
  const headingTranslateY = (1 - headingEased) * 45; // slides up from +45px to 0

  // Subtitle fades and slides in over 350ms -> 950ms
  const subtitleProgress = Math.min(1, Math.max(0, (t - 300) / 650));
  const subtitleEased = easeOutCubic(subtitleProgress);
  const subtitleOpacity = subtitleEased;
  const subtitleTranslateY = (1 - subtitleEased) * 30;

  // Background ambient element: subtle deterministic expansion purely as function of t
  const ambientScale = 1 + (Math.min(t, duration) / duration) * 0.08;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, #172554 0%, #0b0f19 75%, #05070d 100%)',
        color: '#f8fafc',
        padding: '0 80px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Background SVG grid and accents - pure function of t */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.35,
          transform: `scale(${ambientScale})`,
        }}
        viewBox="0 0 1280 720"
      >
        <defs>
          <radialGradient id="titleGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <pattern id="titleGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="0.75"
              strokeOpacity="0.18"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#titleGrid)" />
        <circle cx="640" cy="340" r="320" fill="url(#titleGlow)" />

        {/* Orbit ring purely drawn with t */}
        <circle
          cx="640"
          cy="340"
          r="260"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1.5"
          strokeDasharray="1633"
          strokeDashoffset={1633 * (1 - Math.min(1, t / 1200))}
          opacity="0.3"
        />
      </svg>

      {/* Pill Badge */}
      <div
        style={{
          opacity: headingOpacity,
          transform: `translateY(${headingTranslateY * 0.8}px)`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 20px',
          borderRadius: '9999px',
          background: 'rgba(59, 130, 246, 0.16)',
          border: '1px solid rgba(96, 165, 250, 0.35)',
          color: '#93c5fd',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '28px',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
          zIndex: 2,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#60a5fa',
            boxShadow: '0 0 10px #60a5fa',
          }}
        />
        Visual Lesson Card
      </div>

      {/* Title / Heading */}
      <h1
        style={{
          margin: '0 0 20px 0',
          maxWidth: '1100px',
          textAlign: 'center',
          fontSize: '56px',
          fontWeight: 800,
          lineHeight: 1.18,
          letterSpacing: '-0.025em',
          opacity: headingOpacity,
          transform: `translateY(${headingTranslateY}px)`,
          background: 'linear-gradient(135deg, #ffffff 30%, #bfdbfe 70%, #93c5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      >
        {scene.heading}
      </h1>

      {/* Subtitle */}
      {scene.subtitle && (
        <p
          style={{
            margin: '0',
            maxWidth: '920px',
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 400,
            lineHeight: 1.5,
            color: '#cbd5e1',
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
            zIndex: 2,
          }}
        >
          {scene.subtitle}
        </p>
      )}

      {/* Dynamic bottom indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: Math.min(1, Math.max(0, (t - 600) / 400)),
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          zIndex: 2,
        }}
      >
        <span>BLU VISUAL TEACHER</span>
        <span>•</span>
        <span>OFFLINE INTERACTIVE</span>
      </div>
    </div>
  );
};
