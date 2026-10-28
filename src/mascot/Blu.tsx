import React, { useState } from 'react';
import type { Scene, SceneMood } from '../types/lesson';
import { type AnchorPoint } from './anchors';
import { prog } from '../anim/helpers';
import { easeOutBack, clamp01 } from '../anim/ease';
import { useSettings } from '../context/useSettings';
import { playClickSound } from '../utils/audioSfx';

interface BluProps {
  scene: Scene;
  t: number;
  duration: number;
  mood?: SceneMood;
  anchor: AnchorPoint | null;
}


export const Blu: React.FC<BluProps> = ({
  scene,
  t,
  duration,
  mood,
  anchor,
}) => {
  const { settings } = useSettings();
  const isReducedMotion = settings.dyslexia;
  const [tipBubble, setTipBubble] = useState<string | null>(null);

  const handleBluClick = () => {
    playClickSound();
    const tips = [
      '💡 Notice how the memory reference updates step-by-step!',
      '🦉 Blu is narrating with offline neural voice and phonemes!',
      '🎯 Follow the pointer stick to trace the exact line!',
      '✨ Keep your focus sharp, you are mastering this concept!',
      '🚀 Try solving the quiz question when it appears!',
    ];
    const picked = tips[Math.floor(Math.random() * tips.length)];
    setTipBubble(picked);
    setTimeout(() => setTipBubble(null), 3500);
  };

  // Resolve active mood with intelligent defaults
  let currentMood: SceneMood = mood || scene.mood || 'happy';
  if (!mood && !scene.mood) {
    if (scene.type === 'title_card') {
      currentMood = 'happy';
    } else if (scene.type === 'code_walkthrough' || scene.type === 'diagram') {
      currentMood = anchor ? 'thinking' : 'happy';
    }
  }


  // Entrance bounce in first 600ms
  const entranceP = prog(t, 0, 600);
  const entranceEased = easeOutBack(entranceP);
  const entranceScale = clamp01(entranceEased);

  // Breathing (gentle squash and stretch)
  const breath = Math.sin(t * 0.003) * 0.035;
  const scaleX = (1 - breath) * entranceScale;
  const scaleY = (1 + breath) * entranceScale;

  // Idle bob & sway (disabled/minimized in reduced motion)
  const bobY = isReducedMotion ? 0 : Math.sin(t * 0.0024) * 4;
  const swayAngle = isReducedMotion ? 0 : Math.sin(t * 0.0016) * 2.5;

  // Excited hop
  const hopY = (currentMood === 'excited' && !isReducedMotion)
    ? -Math.abs(Math.sin(t * 0.006)) * 8
    : 0;

  // Curious head tilt
  const tiltAngle = currentMood === 'curious' ? swayAngle + 6 : swayAngle;

  // Deterministic blinking: cycle of 3200ms, blink occurs in last 160ms
  const blinkCycle = t % 3400;
  const isBlinking = blinkCycle > 3240 && blinkCycle < 3400;

  // Mouth openness calculation (0..1)
  let mouthOpenness = 0;
  if (scene.mouth && Array.isArray(scene.mouth) && scene.mouth.length > 0) {
    const idx = Math.floor(t / 40);
    // 3-sample moving average smoothing
    const m0 = scene.mouth[Math.max(0, idx - 1)] ?? 0;
    const m1 = scene.mouth[idx] ?? 0;
    const m2 = scene.mouth[Math.min(scene.mouth.length - 1, idx + 1)] ?? 0;
    mouthOpenness = (m0 + m1 + m2) / 3;
  } else {
    // Deterministic fallback: ~4 Hz pulses while speaking (t < duration - 500)
    if (t > 400 && t < duration - 500) {
      const pulse = Math.sin(t * 0.025);
      mouthOpenness = pulse > 0 ? pulse * 0.85 : 0;
    }
  }

  // Pointer stick angle: calculate vector toward anchor
  // Blu's stage position on 1280x720 canvas: right 1060, top 470
  // Blu's left shoulder is around (45, 120) inside local 200x220 box
  const bluShoulderStageX = 1060 + 45;
  const bluShoulderStageY = 470 + 120 + bobY + hopY;

  let armAngle = 55; // resting down-forward angle
  if (anchor) {
    const dx = anchor.x - bluShoulderStageX;
    const dy = anchor.y - bluShoulderStageY;
    const rad = Math.atan2(dy, dx);
    const deg = (rad * 180) / Math.PI;
    // Rotate arm so stick aims directly at anchor
    armAngle = deg + 180;
  }

  // Waving gesture during entrance (first 700ms)
  let rightArmAngle = 15;
  if (t < 750) {
    rightArmAngle = -45 + Math.sin(t * 0.02) * 35;
  }

  // Eye gaze direction: looks slightly toward pointer or up when thinking
  const pupilOffsetX = anchor ? -3.5 : 0;
  const pupilOffsetY = currentMood === 'thinking' ? -3 : 0;

  // Eyebrow shapes based on mood
  let leftBrowY = 72;
  let rightBrowY = 72;
  let leftBrowRotate = 0;
  let rightBrowRotate = 0;

  if (currentMood === 'thinking') {
    leftBrowY = 66; // one brow quizzically raised
    rightBrowY = 74;
    leftBrowRotate = -8;
  } else if (currentMood === 'excited') {
    leftBrowY = 67;
    rightBrowY = 67;
    leftBrowRotate = -10;
    rightBrowRotate = 10;
  } else if (currentMood === 'curious') {
    leftBrowY = 68;
    rightBrowY = 72;
    leftBrowRotate = -12;
  }

  return (
    <div
      id="mascot-blu"
      data-testid="mascot-blu"
      className="blu-mascot"
      style={{
        position: 'absolute',
        right: '24px',
        bottom: '8px',
        width: '210px',
        height: '230px',
        pointerEvents: 'auto',
        cursor: 'pointer',
        zIndex: 15,
        transform: `translateY(${bobY + hopY}px)`,
      }}
      onClick={handleBluClick}
      title="Click Blu for teacher tips!"
    >
      {/* Floating Tip Bubble */}
      {tipBubble && (
        <div
          style={{
            position: 'absolute',
            top: '-54px',
            right: '10px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #38bdf8',
            borderRadius: '10px',
            padding: '7px 12px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.25)',
            zIndex: 30,
            animation: 'fadeInUp 0.2s ease',
            pointerEvents: 'none',
          }}
        >
          {tipBubble}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '35px',
              width: '10px',
              height: '10px',
              background: 'rgba(15, 23, 42, 0.94)',
              borderRight: '1px solid #38bdf8',
              borderBottom: '1px solid #38bdf8',
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}

      <svg
        viewBox="0 0 210 230"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >

        <defs>
          {/* Blu's vibrant teacher blue gradient */}
          <linearGradient id="bluBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* Soft ambient ground shadow */}
          <radialGradient id="bluShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 0, 0, 0.45)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          {/* Golden pointer tip glow */}
          <radialGradient id="bluTipGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
        </defs>

        {/* 1. Ground Shadow Ellipse */}
        <ellipse
          cx="105"
          cy="214"
          rx={54 * scaleX}
          ry={10 * scaleX}
          fill="url(#bluShadow)"
        />

        {/* Mascot Root Container with squash, stretch & sway */}
        <g
          transform={`translate(105, 205) scale(${scaleX}, ${scaleY}) rotate(${tiltAngle}) translate(-105, -205)`}
        >
          {/* 2. Soft Blob Body */}
          <path
            d="M 52 186 C 36 128, 44 48, 105 48 C 166 48, 174 128, 158 186 C 144 204, 66 204, 52 186 Z"
            fill="url(#bluBodyGrad)"
            stroke="#0284c7"
            strokeWidth="2"
          />

          {/* 3. Upper-left Soft Specular Highlight */}
          <ellipse
            cx="82"
            cy="76"
            rx="24"
            ry="14"
            transform="rotate(-22 82 76)"
            fill="rgba(255, 255, 255, 0.28)"
          />

          {/* 4. Left Arm & Pointer Stick */}
          <g transform={`translate(52, 128) rotate(${armAngle})`}>
            {/* Blue Arm Limb */}
            <path
              d="M 0 0 C -8 10, -16 16, -26 12 C -32 8, -28 -4, -18 -6 Z"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1.5"
            />
            {/* Thin Golden Pointer Stick */}
            <line
              x1="-24"
              y1="8"
              x2="-105"
              y2="18"
              stroke="#fbbf24"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Glowing Pointer Tip */}
            <circle
              cx="-105"
              cy="18"
              r="4.5"
              fill="url(#bluTipGlow)"
            />
          </g>

          {/* 5. Right Arm (waving during entrance, or resting) */}
          <g transform={`translate(158, 134) rotate(${rightArmAngle})`}>
            <path
              d="M 0 0 C 10 12, 18 16, 26 8 C 30 2, 24 -6, 16 -6 Z"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1.5"
            />
          </g>

          {/* 6. Eyebrows */}
          <g>
            <path
              d={`M 74 ${leftBrowY} Q 84 ${leftBrowY - 4} 94 ${leftBrowY + 1}`}
              stroke="#0c4a6e"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              transform={`rotate(${leftBrowRotate} 84 ${leftBrowY})`}
            />
            <path
              d={`M 116 ${rightBrowY + 1} Q 126 ${rightBrowY - 4} 136 ${rightBrowY}`}
              stroke="#0c4a6e"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              transform={`rotate(${rightBrowRotate} 126 ${rightBrowY})`}
            />
          </g>

          {/* 7. Expressive Eyes */}
          {isBlinking ? (
            // Closed eyes slit during blink
            <g>
              <line x1="76" y1="96" x2="92" y2="96" stroke="#082f49" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="118" y1="96" x2="134" y2="96" stroke="#082f49" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              {/* Left Eye White & Pupil */}
              <ellipse cx="84" cy="96" rx="8" ry="10" fill="#ffffff" />
              <circle cx={84 + pupilOffsetX} cy={96 + pupilOffsetY} r="4.5" fill="#082f49" />
              <circle cx={82 + pupilOffsetX} cy={93 + pupilOffsetY} r="1.5" fill="#ffffff" />

              {/* Right Eye White & Pupil */}
              <ellipse cx="126" cy="96" rx="8" ry="10" fill="#ffffff" />
              <circle cx={126 + pupilOffsetX} cy={96 + pupilOffsetY} r="4.5" fill="#082f49" />
              <circle cx={124 + pupilOffsetX} cy={93 + pupilOffsetY} r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* 8. Small Round Teacher Glasses */}
          <g>
            {/* Left Rim */}
            <circle
              cx="84"
              cy="96"
              r="14"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            {/* Right Rim */}
            <circle
              cx="126"
              cy="96"
              r="14"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            {/* Glasses Bridge */}
            <path
              d="M 98 94 Q 105 91 112 94"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* 9. Expressive Talking Mouth */}
          {mouthOpenness > 0.08 ? (
            // Open animated mouth cavity with tongue
            <g transform="translate(105, 126)">
              <ellipse
                cx="0"
                cy="0"
                rx="11"
                ry={Math.max(2, mouthOpenness * 12)}
                fill="#881337"
                stroke="#4c0519"
                strokeWidth="1.5"
              />
              <path
                d="M -6 3 Q 0 8 6 3 Z"
                fill="#f43f5e"
              />
            </g>
          ) : (
            // Gentle resting smile
            <path
              d="M 96 124 Q 105 132 114 124"
              fill="none"
              stroke="#082f49"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* 10. Cute Blush Marks */}
          <ellipse cx="68" cy="114" rx="6" ry="3.5" fill="rgba(244, 63, 94, 0.35)" />
          <ellipse cx="142" cy="114" rx="6" ry="3.5" fill="rgba(244, 63, 94, 0.35)" />
        </g>
      </svg>
    </div>
  );
};
