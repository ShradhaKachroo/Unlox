import React from 'react';
import type { DiagramScene, DiagramArrow } from '../types/lesson';
import { SceneStage } from '../components/SceneStage';
import { easeOutBack, easeOutCubic } from '../anim/ease';
import { prog, lerp } from '../anim/helpers';

interface DiagramProps {
  scene: DiagramScene;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

interface BadgeConfig {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  cardPrefix: string;
}

const getSceneBadge = (heading: string): BadgeConfig => {
  const h = (heading || '').toLowerCase();
  if (h.includes('example') || h.includes('real-world') || h.includes('everyday') || h.includes('application')) {
    return {
      label: 'Real-World Applications',
      icon: '🌍',
      color: '#34d399',
      bg: 'rgba(16, 185, 129, 0.16)',
      border: 'rgba(52, 211, 153, 0.4)',
      cardPrefix: 'Example',
    };
  }
  if (h.includes('characteristic') || h.includes('property') || h.includes('feature') || h.includes('visual')) {
    return {
      label: 'Core Characteristics & Properties',
      icon: '✨',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.16)',
      border: 'rgba(56, 189, 248, 0.4)',
      cardPrefix: 'Feature',
    };
  }
  if (h.includes('component') || h.includes('architecture') || h.includes('structure') || h.includes('agent')) {
    return {
      label: 'System Architecture & Components',
      icon: '🧩',
      color: '#818cf8',
      bg: 'rgba(129, 140, 248, 0.16)',
      border: 'rgba(129, 140, 248, 0.4)',
      cardPrefix: 'Component',
    };
  }
  if (h.includes('function') || h.includes('process') || h.includes('flow') || h.includes('step') || h.includes('how')) {
    return {
      label: 'Interactive Process Flow',
      icon: '🔄',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.16)',
      border: 'rgba(245, 158, 11, 0.4)',
      cardPrefix: 'Stage',
    };
  }
  return {
    label: 'Key Concept Breakdown',
    icon: '💡',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.4)',
    cardPrefix: 'Concept',
  };
};

const CARD_THEMES = [
  {
    accent: '#38bdf8',
    glowActive: 'rgba(56, 189, 248, 0.45)',
    iconBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#38bdf8',
    barGradient: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
  },
  {
    accent: '#818cf8',
    glowActive: 'rgba(129, 140, 248, 0.45)',
    iconBg: 'rgba(129, 140, 248, 0.2)',
    badgeText: '#a5b4fc',
    barGradient: 'linear-gradient(90deg, #818cf8 0%, #c084fc 100%)',
  },
  {
    accent: '#34d399',
    glowActive: 'rgba(52, 211, 153, 0.45)',
    iconBg: 'rgba(52, 211, 153, 0.2)',
    badgeText: '#6ee7b7',
    barGradient: 'linear-gradient(90deg, #34d399 0%, #f59e0b 100%)',
  },
  {
    accent: '#f59e0b',
    glowActive: 'rgba(245, 158, 11, 0.45)',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    badgeText: '#fcd34d',
    barGradient: 'linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%)',
  },
];

const parseItemContent = (rawText: string, idx: number) => {
  const text = (rawText || '').trim();
  let title = '';
  let desc = '';

  const colonIdx = text.indexOf(':');
  const dashIdx = text.indexOf(' - ');

  if (colonIdx > 0 && colonIdx < 40) {
    title = text.slice(0, colonIdx).trim();
    desc = text.slice(colonIdx + 1).trim();
  } else if (dashIdx > 0 && dashIdx < 40) {
    title = text.slice(0, dashIdx).trim();
    desc = text.slice(dashIdx + 3).trim();
  } else {
    const words = text.split(/\s+/);
    if (words.length > 5) {
      title = words.slice(0, 3).join(' ');
      desc = words.slice(3).join(' ');
    } else {
      title = text;
      desc = '';
    }
  }

  // Detect context-aware icon
  const combined = (title + ' ' + desc).toLowerCase();
  let icon = '🔹';
  if (combined.includes('sensor') || combined.includes('camera') || combined.includes('eye') || combined.includes('vision') || combined.includes('perceiv')) {
    icon = '👁️';
  } else if (combined.includes('brain') || combined.includes('think') || combined.includes('reason') || combined.includes('process') || combined.includes('chip') || combined.includes('ai') || combined.includes('logic')) {
    icon = '🧠';
  } else if (combined.includes('act') || combined.includes('hand') || combined.includes('robot') || combined.includes('output') || combined.includes('motor') || combined.includes('action')) {
    icon = '🦾';
  } else if (combined.includes('phone') || combined.includes('smartphone') || combined.includes('siri') || combined.includes('alexa') || combined.includes('app')) {
    icon = '📱';
  } else if (combined.includes('airport') || combined.includes('station') || combined.includes('gas') || combined.includes('transit') || combined.includes('kiosk')) {
    icon = '✈️';
  } else if (combined.includes('navigat') || combined.includes('map') || combined.includes('route') || combined.includes('book') || combined.includes('gps')) {
    icon = '🗺️';
  } else if (combined.includes('cloud') || combined.includes('rain') || combined.includes('sun') || combined.includes('rainbow') || combined.includes('water')) {
    icon = '🌈';
  } else if (combined.includes('speed') || combined.includes('fast') || combined.includes('efficien') || combined.includes('power')) {
    icon = '⚡';
  } else if (combined.includes('code') || combined.includes('data') || combined.includes('program') || combined.includes('loop')) {
    icon = '💻';
  } else {
    const defaultIcons = ['✨', '🎯', '💡', '🚀', '📌'];
    icon = defaultIcons[idx % defaultIcons.length];
  }

  return { title, desc, icon };
};

export const Diagram: React.FC<DiagramProps> = ({
  scene,
  t,
  duration,
  quality = 'high',
}) => {
  const items = scene.items || [];
  const N = items.length;

  const badgeConfig = getSceneBadge(scene.heading);

  // Resolve arrows
  const arrows: DiagramArrow[] = scene.arrows && scene.arrows.length > 0
    ? scene.arrows
    : Array.from({ length: Math.max(0, N - 1) }, (_, i) => ({
        from: i,
        to: i + 1,
      }));

  const slotDuration = duration / Math.max(1, N);

  // Layout parameters on 1280x720 canvas
  const boxWidth = Math.min(290, Math.max(220, 940 / Math.max(1, N)));
  const boxHeight = 220;
  const stageWidth = 1280;
  const startY = 260;

  const totalBoxesWidth = N * boxWidth;
  const gap = N > 1 ? Math.min(110, (1020 - totalBoxesWidth) / (N - 1)) : 0;
  const totalSpan = totalBoxesWidth + (N - 1) * gap;
  const startX = (stageWidth - totalSpan) / 2;

  const boxPositions = items.map((_, idx) => ({
    x: startX + idx * (boxWidth + gap),
    y: startY,
    width: boxWidth,
    height: boxHeight,
    cx: startX + idx * (boxWidth + gap) + boxWidth / 2,
    cy: startY + boxHeight / 2,
  }));

  return (
    <SceneStage t={t} duration={duration} quality={quality}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Title Header */}
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: prog(t, 0, 450),
            transform: `translateY(${(1 - easeOutCubic(prog(t, 0, 450))) * 25}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: badgeConfig.bg,
              border: `1px solid ${badgeConfig.border}`,
              color: badgeConfig.color,
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
              boxShadow: `0 4px 16px ${badgeConfig.bg}`,
            }}
          >
            <span>{badgeConfig.icon}</span>
            <span>{badgeConfig.label}</span>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '36px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 40%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 20px rgba(15, 23, 42, 0.4)',
            }}
          >
            {scene.heading}
          </h2>
        </div>

        {/* SVG Arrows & Flowing Tokens Layer */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1280px',
            height: '720px',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <defs>
            <marker
              id="arrowhead-flow"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
            </marker>
            <filter id="tokenGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {arrows.map((arrow, aIdx) => {
            const fromBox = boxPositions[arrow.from];
            const toBox = boxPositions[arrow.to];
            if (!fromBox || !toBox) return null;

            const startXArrow = fromBox.x + fromBox.width;
            const startYArrow = fromBox.cy;
            const endXArrow = toBox.x;
            const endYArrow = toBox.cy;
            const arrowLength = Math.max(1, Math.hypot(endXArrow - startXArrow, endYArrow - startYArrow));

            const fromSlotStart = arrow.from * slotDuration;
            const toSlotStart = arrow.to * slotDuration;
            const arrowStart = fromSlotStart + 350;
            const arrowEnd = Math.max(arrowStart + 300, toSlotStart);

            // Progressive arrow line drawing
            const arrowP = prog(t, arrowStart, arrowEnd);
            const arrowEased = easeOutCubic(arrowP);
            const strokeOffset = arrowLength * (1 - arrowEased);

            // Glowing Token travelling along the arrow
            const tokenStart = arrowStart + 100;
            const tokenEnd = arrowEnd + 400;
            const tokenP = prog(t, tokenStart, tokenEnd);
            const isTokenTraveling = tokenP > 0 && tokenP < 1;
            const tokenX = lerp(startXArrow, endXArrow, tokenP);
            const tokenY = lerp(startYArrow, endYArrow, tokenP);

            if (t < arrowStart) return null;

            return (
              <g key={`arrow-${aIdx}`}>
                {/* Glow underlay */}
                <line
                  x1={startXArrow}
                  y1={startYArrow}
                  x2={endXArrow}
                  y2={endYArrow}
                  stroke="rgba(56, 189, 248, 0.25)"
                  strokeWidth="8"
                  strokeDasharray={arrowLength}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />

                {/* Primary progressive arrow line */}
                <line
                  x1={startXArrow}
                  y1={startYArrow}
                  x2={endXArrow}
                  y2={endYArrow}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeDasharray={arrowLength}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  markerEnd={arrowP > 0.85 ? 'url(#arrowhead-flow)' : undefined}
                />

                {/* Travelling Flow Token Dot */}
                {isTokenTraveling && (
                  <g filter="url(#tokenGlow)">
                    <circle
                      cx={tokenX}
                      cy={tokenY}
                      r="9"
                      fill="#f59e0b"
                      opacity="0.9"
                    />
                    <circle
                      cx={tokenX}
                      cy={tokenY}
                      r="4"
                      fill="#ffffff"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 3D Cards Container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1280px',
            height: '720px',
            transformStyle: 'preserve-3d',
            zIndex: 6,
          }}
        >
          {items.map((rawItemText, idx) => {
            const pos = boxPositions[idx];
            const slotStart = idx * slotDuration;
            const slotEnd = slotStart + slotDuration;

            // Parse rich title, description & icon
            const { title, desc, icon } = parseItemContent(rawItemText, idx);
            const theme = CARD_THEMES[idx % CARD_THEMES.length];

            // Staggered 3D entrance with easeOutBack
            const boxEntranceP = prog(t, slotStart, slotStart + 450);
            const boxEased = easeOutBack(boxEntranceP);

            const isCurrentActive = t >= slotStart && (idx === N - 1 || t < slotEnd);
            const isFinished = t >= slotEnd;

            if (t < slotStart) return null;

            // 3D Card Dynamics
            const scale = (isCurrentActive ? 1.05 : 1.0) * boxEased;
            const translateZ = isCurrentActive ? 40 : 10;
            const tiltX = Math.sin(t * 0.0015 + idx) * 2.5;
            const tiltY = Math.cos(t * 0.0018 + idx) * 3.5;

            return (
              <div
                key={`box-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.width}px`,
                  height: `${pos.height}px`,
                  opacity: boxEntranceP,
                  transform: `translate3d(0, ${(1 - boxEased) * 40}px, ${translateZ}px) scale(${scale}) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`,
                  transformStyle: 'preserve-3d',
                  boxSizing: 'border-box',
                  borderRadius: '22px',
                  padding: '20px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: isCurrentActive
                    ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(145deg, #0f172a 0%, #080c18 100%)',
                  border: isCurrentActive
                    ? `2.5px solid ${theme.accent}`
                    : isFinished
                    ? '2px solid #10b981'
                    : '1.5px solid #1e293b',
                  boxShadow: isCurrentActive
                    ? `0 25px 50px rgba(0,0,0,0.8), 0 0 35px ${theme.glowActive}`
                    : isFinished
                    ? '0 15px 35px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.25)'
                    : '0 15px 30px rgba(0,0,0,0.5)',
                  backdropFilter: quality === 'low' ? undefined : 'blur(16px)',
                  transition: 'border 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                {/* Card Top Category & State Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: isCurrentActive ? theme.iconBg : 'rgba(255, 255, 255, 0.05)',
                        border: isCurrentActive ? `1px solid ${theme.accent}` : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}
                    >
                      {icon}
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isFinished ? '#34d399' : isCurrentActive ? theme.badgeText : '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {badgeConfig.cardPrefix} {idx + 1}
                    </span>
                  </div>

                  {isCurrentActive && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      Active
                    </span>
                  )}
                  {isFinished && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Done
                    </span>
                  )}
                </div>

                {/* Card Main Concept & Detail */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    margin: 'auto 0',
                    textAlign: 'left',
                    padding: '4px 2px',
                  }}
                >
                  <div
                    style={{
                      fontSize: title.length > 22 ? '18px' : '21px',
                      fontWeight: 800,
                      lineHeight: 1.3,
                      color: isCurrentActive ? '#ffffff' : '#e2e8f0',
                      letterSpacing: '-0.01em',
                      fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {title}
                  </div>
                  {desc && (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        lineHeight: 1.45,
                        color: isCurrentActive ? '#94a3b8' : '#64748b',
                        marginTop: '6px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
                    >
                      {desc}
                    </div>
                  )}
                </div>

                {/* Animated Status Bar */}
                <div
                  style={{
                    height: '5px',
                    borderRadius: '3px',
                    background: isFinished
                      ? '#10b981'
                      : isCurrentActive
                      ? theme.barGradient
                      : '#1e293b',
                    width: '100%',
                    boxShadow: isCurrentActive ? `0 0 12px ${theme.glowActive}` : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </SceneStage>
  );
};
