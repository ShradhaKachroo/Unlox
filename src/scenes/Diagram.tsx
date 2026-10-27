import React from 'react';
import type { DiagramScene, DiagramArrow } from '../types/lesson';

interface DiagramProps {
  scene: DiagramScene;
  t: number;
  duration: number;
}

// Pure cubic ease-out
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
}

export const Diagram: React.FC<DiagramProps> = ({ scene, t, duration }) => {
  const items = scene.items || [];
  const N = items.length;

  // Resolve arrows: custom or default derived from item order
  const arrows: DiagramArrow[] = scene.arrows && scene.arrows.length > 0
    ? scene.arrows
    : Array.from({ length: Math.max(0, N - 1) }, (_, i) => ({
        from: i,
        to: i + 1,
      }));

  // Duration per item slot
  const slotDuration = duration / Math.max(1, N);

  // Box dimensions on 1280x720 canvas
  const boxWidth = Math.min(270, Math.max(200, 850 / Math.max(1, N)));
  const boxHeight = 190;
  const stageWidth = 1280;
  const startY = 270;

  // Calculate box positions
  const totalBoxesWidth = N * boxWidth;
  const gap = N > 1 ? Math.min(120, (960 - totalBoxesWidth) / (N - 1)) : 0;
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

  // Header entrance
  const headerEased = easeOutCubic(Math.min(1, Math.max(0, t / 400)));

  return (
    <div
      style={{
        width: '1280px',
        height: '720px',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 30%, #0f172a 0%, #060913 80%, #020408 100%)',
        color: '#f8fafc',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Background glow and grid */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1280px',
          height: '720px',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <pattern id="diagramGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagramGrid)" />
      </svg>

      {/* Heading at Top */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '80px',
          right: '80px',
          textAlign: 'center',
          opacity: headerEased,
          transform: `translateY(${(1 - headerEased) * 20}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: '9999px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
          }}
        >
          Flow Diagram
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 30%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {scene.heading}
        </h2>
      </div>

      {/* Main SVG Layer for Arrows and Connectors */}
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
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
          </marker>
          <marker
            id="arrowhead-completed"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
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

          // Compute timing for this arrow
          const fromSlotStart = arrow.from * slotDuration;
          const toSlotStart = arrow.to * slotDuration;
          const arrowStart = fromSlotStart + 350; // starts after fromBox has appeared
          const arrowEnd = Math.max(arrowStart + 200, toSlotStart);
          const arrowDuration = Math.max(150, arrowEnd - arrowStart);

          const arrowProgress = Math.min(1, Math.max(0, (t - arrowStart) / arrowDuration));
          const arrowEased = easeOutCubic(arrowProgress);
          const strokeOffset = arrowLength * (1 - arrowEased);

          const isArrowActive = t >= arrowStart && t < arrowEnd + 400;

          if (t < arrowStart) return null;

          return (
            <g key={`arrow-${aIdx}`}>
              {/* Glow filter behind arrow */}
              <line
                x1={startXArrow}
                y1={startYArrow}
                x2={endXArrow}
                y2={endYArrow}
                stroke="rgba(56, 189, 248, 0.3)"
                strokeWidth="7"
                strokeDasharray={arrowLength}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
              {/* Sharp primary arrow line */}
              <line
                x1={startXArrow}
                y1={startYArrow}
                x2={endXArrow}
                y2={endYArrow}
                stroke={isArrowActive ? '#38bdf8' : '#60a5fa'}
                strokeWidth="3.5"
                strokeDasharray={arrowLength}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                markerEnd={arrowProgress > 0.85 ? (isArrowActive ? 'url(#arrowhead-active)' : 'url(#arrowhead-completed)') : undefined}
              />
              {arrow.label && arrowProgress > 0.6 && (
                <text
                  x={(startXArrow + endXArrow) / 2}
                  y={startYArrow - 14}
                  fill="#94a3b8"
                  fontSize="13"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={easeOutCubic((arrowProgress - 0.6) / 0.4)}
                >
                  {arrow.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Interactive Boxes Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1280px',
          height: '720px',
          zIndex: 6,
        }}
      >
        {items.map((itemText, idx) => {
          const pos = boxPositions[idx];
          const slotStart = idx * slotDuration;
          const slotEnd = slotStart + slotDuration;

          // Pure function of time: Box appears at slotStart over 400ms
          const boxProgress = Math.min(1, Math.max(0, (t - slotStart) / 400));
          const boxEased = easeOutCubic(boxProgress);

          const opacity = boxEased;
          const scale = 0.82 + 0.18 * boxEased;
          const translateY = (1 - boxEased) * 35;

          const isCurrentActive = t >= slotStart && (idx === N - 1 || t < slotEnd);
          const isPassed = t >= slotEnd;

          // Don't render until item starts appearing
          if (t < slotStart) {
            return null;
          }

          return (
            <div
              key={`box-${idx}`}
              style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${pos.width}px`,
                height: `${pos.height}px`,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                boxSizing: 'border-box',
                borderRadius: '20px',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: isCurrentActive
                  ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(145deg, #0f172a 0%, #090d16 100%)',
                border: isCurrentActive
                  ? '2.5px solid #38bdf8'
                  : isPassed
                  ? '1.5px solid #3b82f6'
                  : '1px solid #1e293b',
                boxShadow: isCurrentActive
                  ? '0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(56, 189, 248, 0.4)'
                  : '0 15px 30px rgba(0,0,0,0.5)',
              }}
            >
              {/* Step indicator header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCurrentActive
                        ? '#38bdf8'
                        : isPassed
                        ? '#3b82f6'
                        : '#334155',
                      color: isCurrentActive ? '#090d16' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 800,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isCurrentActive ? '#38bdf8' : '#94a3b8',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Step {idx + 1}
                  </span>
                </div>

                {isCurrentActive && (
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Active
                  </span>
                )}
              </div>

              {/* Item text content */}
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: isCurrentActive ? '#ffffff' : '#cbd5e1',
                  textAlign: 'center',
                  margin: 'auto 0',
                  wordBreak: 'break-word',
                }}
              >
                {itemText}
              </div>

              {/* Bottom status indicator */}
              <div
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: isCurrentActive
                    ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
                    : isPassed
                    ? '#3b82f6'
                    : '#1e293b',
                  width: '100%',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
