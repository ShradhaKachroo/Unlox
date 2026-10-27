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

export const Diagram: React.FC<DiagramProps> = ({
  scene,
  t,
  duration,
  quality = 'high',
}) => {
  const items = scene.items || [];
  const N = items.length;

  // Resolve arrows
  const arrows: DiagramArrow[] = scene.arrows && scene.arrows.length > 0
    ? scene.arrows
    : Array.from({ length: Math.max(0, N - 1) }, (_, i) => ({
        from: i,
        to: i + 1,
      }));

  const slotDuration = duration / Math.max(1, N);

  // Layout parameters on 1280x720 canvas
  const boxWidth = Math.min(280, Math.max(220, 920 / Math.max(1, N)));
  const boxHeight = 210;
  const stageWidth = 1280;
  const startY = 270;

  const totalBoxesWidth = N * boxWidth;
  const gap = N > 1 ? Math.min(130, (1000 - totalBoxesWidth) / (N - 1)) : 0;
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
            top: '40px',
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
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          >
            Execution Diagram
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '38px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 30%, #93c5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
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

        {/* 3D Boxes Container */}
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
          {items.map((itemText, idx) => {
            const pos = boxPositions[idx];
            const slotStart = idx * slotDuration;
            const slotEnd = slotStart + slotDuration;

            // Staggered 3D entrance with easeOutBack
            const boxEntranceP = prog(t, slotStart, slotStart + 450);
            const boxEased = easeOutBack(boxEntranceP);

            const isCurrentActive = t >= slotStart && (idx === N - 1 || t < slotEnd);
            const isFinished = t >= slotEnd;

            if (t < slotStart) return null;

            // 3D Card Dynamics
            const scale = (isCurrentActive ? 1.06 : 1.0) * boxEased;
            const translateZ = isCurrentActive ? 40 : 10;
            const tiltX = Math.sin(t * 0.0015 + idx) * 3;
            const tiltY = Math.cos(t * 0.0018 + idx) * 4;

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
                  padding: '24px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: isCurrentActive
                    ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(145deg, #0f172a 0%, #080c18 100%)',
                  border: isCurrentActive
                    ? '2.5px solid #38bdf8'
                    : isFinished
                    ? '2px solid #10b981'
                    : '1.5px solid #1e293b',
                  boxShadow: isCurrentActive
                    ? '0 25px 50px rgba(0,0,0,0.8), 0 0 35px rgba(56, 189, 248, 0.45)'
                    : isFinished
                    ? '0 15px 35px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.25)'
                    : '0 15px 30px rgba(0,0,0,0.5)',
                  backdropFilter: quality === 'low' ? undefined : 'blur(16px)',
                }}
              >
                {/* Step Header */}
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
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: isFinished
                          ? '#10b981'
                          : isCurrentActive
                          ? '#38bdf8'
                          : '#334155',
                        color: isFinished || !isCurrentActive ? '#ffffff' : '#090d16',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800,
                      }}
                    >
                      {isFinished ? '✓' : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isFinished ? '#34d399' : isCurrentActive ? '#38bdf8' : '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Iteration {idx + 1}
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

                {/* Box Main Content */}
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: isCurrentActive ? '#ffffff' : '#cbd5e1',
                    textAlign: 'center',
                    margin: 'auto 0',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {itemText}
                </div>

                {/* Status Bar */}
                <div
                  style={{
                    height: '5px',
                    borderRadius: '3px',
                    background: isFinished
                      ? '#10b981'
                      : isCurrentActive
                      ? 'linear-gradient(90deg, #38bdf8 0%, #f59e0b 100%)'
                      : '#1e293b',
                    width: '100%',
                    boxShadow: isCurrentActive ? '0 0 12px rgba(56, 189, 248, 0.6)' : undefined,
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
