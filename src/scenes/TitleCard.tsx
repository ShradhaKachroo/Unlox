import React from 'react';
import type { TitleCardScene } from '../types/lesson';
import { SceneStage } from '../components/SceneStage';
import { easeOutBack, easeOutCubic } from '../anim/ease';
import { prog, stagger, lerp } from '../anim/helpers';

interface TitleCardProps {
  scene: TitleCardScene;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

const ORBIT_ITEMS = [
  { label: '{ }', color: '#38bdf8' },
  { label: '01', color: '#a855f7' },
  { label: '< >', color: '#34d399' },
  { label: 'fn', color: '#f59e0b' },
  { label: 'λ', color: '#f43f5e' },
  { label: '//', color: '#60a5fa' },
];

export const TitleCard: React.FC<TitleCardProps> = ({
  scene,
  t,
  duration,
  quality = 'high',
}) => {
  // Animated underline under heading
  const underlineP = prog(t, 500, 1400);
  const underlineWidth = lerp(0, 520, easeOutCubic(underlineP));

  // Subtitle reveal
  const subP = prog(t, 900, 1700);
  const subEased = easeOutCubic(subP);

  // Subtle 3D tilt of the central card
  const tiltX = Math.sin(t * 0.0012) * 3.5;
  const tiltY = Math.cos(t * 0.0015) * 4.5;

  return (
    <SceneStage t={t} duration={duration} quality={quality}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 3D Orbiting Shapes Ring (behind/in front of text) */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transformStyle: 'preserve-3d',
          }}
        >
          {ORBIT_ITEMS.map((item, idx) => {
            const angle = t * 0.0006 + (idx * 2 * Math.PI) / ORBIT_ITEMS.length;
            const x = 640 + Math.cos(angle) * 440;
            const y = 330 + Math.sin(angle) * 110;
            const z = Math.sin(angle) * 180;
            const normZ = (z + 180) / 360; // 0 (back) to 1 (front)
            const scale = 0.75 + 0.35 * normZ;
            const opacity = 0.35 + 0.55 * normZ;

            return (
              <div
                key={`orbit-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) translateZ(${z}px) scale(${scale})`,
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: `1.5px solid ${item.color}`,
                  boxShadow: `0 0 16px ${item.color}55`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '16px',
                  fontWeight: 700,
                  opacity,
                  zIndex: z > 0 ? 10 : 1,
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Central 3D Glass Hero Card */}
        <div
          style={{
            width: '940px',
            padding: '48px 50px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(9, 14, 26, 0.94) 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.28)',
            boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.12)',
            backdropFilter: quality === 'low' ? undefined : 'blur(16px)',
            transform: `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateZ(40px)`,
            transformStyle: 'preserve-3d',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            zIndex: 5,
          }}
        >
          {/* Top Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '24px',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)',
              opacity: prog(t, 0, 400),
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
              }}
            />
            Interactive Visual Lesson
          </div>

          {/* Word-by-word reveal preserving Indic ligatures, matras and characters intact */}
          <h1
            style={{
              margin: '0 0 16px 0',
              fontSize: '50px',
              fontWeight: 800,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              textAlign: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {scene.heading.split(' ').map((word, wIdx) => {
              const wordP = stagger(t, wIdx, 80, 400);
              const wordEased = easeOutBack(wordP);
              const opacity = wordP;
              const translateY = (1 - wordEased) * 28;

              return (
                <span
                  key={`word-${wIdx}`}
                  style={{
                    display: 'inline-block',
                    opacity,
                    transform: `translateY(${translateY}px)`,
                    background: 'linear-gradient(135deg, #ffffff 20%, #93c5fd 80%, #60a5fa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {word}
                </span>
              );
            })}
          </h1>

          {/* Animated Growing Underline */}
          <div
            style={{
              height: '4px',
              width: `${underlineWidth}px`,
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #818cf8 100%)',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.6)',
              marginBottom: '22px',
            }}
          />

          {/* Subtitle */}
          {scene.subtitle && (
            <p
              style={{
                margin: 0,
                maxWidth: '780px',
                fontSize: '24px',
                fontWeight: 400,
                lineHeight: 1.45,
                color: '#cbd5e1',
                opacity: subEased,
                transform: `translateY(${(1 - subEased) * 20}px)`,
              }}
            >
              {scene.subtitle}
            </p>
          )}
        </div>
      </div>
    </SceneStage>
  );
};
