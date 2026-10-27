import React from 'react';
import type { CodeWalkthroughScene } from '../types/lesson';
import { SceneStage } from '../components/SceneStage';
import { easeOutCubic, easeOutBack } from '../anim/ease';
import { prog, typewriter, clamp01 } from '../anim/helpers';

interface CodeWalkthroughProps {
  scene: CodeWalkthroughScene;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

function highlightTokens(line: string): React.ReactNode[] {
  const commentIndex = line.indexOf('#');
  let codePart = line;
  let commentPart = '';
  if (commentIndex !== -1) {
    codePart = line.substring(0, commentIndex);
    commentPart = line.substring(commentIndex);
  }

  const tokens: React.ReactNode[] = [];
  const regex = /(".*?"|'.*?'|\b(?:def|for|in|range|print|if|else|elif|while|return|break|continue|True|False|None)\b|\b\d+\b|[()[\],.:=+\-*/]|\s+|[a-zA-Z_]\w*)/g;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(codePart)) !== null) {
    const text = match[0];
    let color = '#f8fafc';
    let fontWeight: 400 | 700 = 400;

    if (text.startsWith('"') || text.startsWith("'")) {
      color = '#38bdf8'; // Strings: Sky Cyan
    } else if (/^(?:def|for|in|if|else|elif|while|return|break|continue)$/.test(text)) {
      color = '#f43f5e'; // Keywords: Rose
      fontWeight = 700;
    } else if (/^(?:range|print)$/.test(text)) {
      color = '#a855f7'; // Built-ins: Violet
      fontWeight = 700;
    } else if (/^(?:True|False|None)$/.test(text)) {
      color = '#fbbf24'; // Constants: Amber
      fontWeight = 700;
    } else if (/^\d+$/.test(text)) {
      color = '#34d399'; // Numbers: Emerald
    } else if (/^[()[\],.:=+\-*/]$/.test(text)) {
      color = '#94a3b8'; // Punctuation / Operators
    }

    tokens.push(
      <span key={keyIndex++} style={{ color, fontWeight }}>
        {text}
      </span>
    );
  }

  if (commentPart) {
    tokens.push(
      <span key={keyIndex++} style={{ color: '#64748b', fontStyle: 'italic' }}>
        {commentPart}
      </span>
    );
  }

  return tokens.length > 0 ? tokens : [line];
}

export const CodeWalkthrough: React.FC<CodeWalkthroughProps> = ({
  scene,
  t,
  duration,
  quality = 'high',
}) => {
  const lines = scene.code.split('\n');
  const highlightSteps = scene.highlight_lines.length > 0 ? scene.highlight_lines : [1];
  const stepCount = highlightSteps.length;

  const slotDuration = duration / Math.max(1, stepCount);
  const currentStepIndex = Math.min(stepCount - 1, Math.max(0, Math.floor(t / slotDuration)));
  const nextStepIndex = Math.min(stepCount - 1, currentStepIndex + 1);

  const stepT = t - currentStepIndex * slotDuration;
  const stepProgress = Math.min(1, Math.max(0, stepT / slotDuration));

  const currentLineTarget = highlightSteps[currentStepIndex];
  const nextLineTarget = highlightSteps[nextStepIndex];

  // Glide highlight bar smoothly during the final 25% of step duration
  let smoothLineNum = currentLineTarget;
  if (currentStepIndex !== nextStepIndex && stepProgress > 0.75) {
    const transitionFraction = (stepProgress - 0.75) / 0.25;
    const eased = easeOutCubic(transitionFraction);
    smoothLineNum = currentLineTarget + (nextLineTarget - currentLineTarget) * eased;
  }

  const lineHeight = 46;
  const highlightBarTop = (smoothLineNum - 1) * lineHeight;

  // Active Variables: from scene.trace if provided, or auto-derived
  let activeVars: Record<string, string | number> = {};
  if (scene.trace && scene.trace.length > 0) {
    const matchedTrace = scene.trace[currentStepIndex] || scene.trace.find(tr => tr.line === currentLineTarget) || scene.trace[0];
    activeVars = matchedTrace.vars || {};
  } else {
    // Graceful auto fallback for Python loop demo
    activeVars = {
      i: currentStepIndex,
      'range(3)': '[0, 1, 2]',
      step: `${currentStepIndex + 1}/${stepCount}`,
    };
  }

  // Blinking animated cursor
  const showCursor = Math.sin(t * 0.009) > 0;

  // Entrance animation for cards
  const entrance = easeOutBack(prog(t, 0, 600));

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
          padding: '20px 40px',
          boxSizing: 'border-box',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top Header Information */}
        <div
          style={{
            width: '1160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            opacity: clamp01(t / 400),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                padding: '4px 14px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
              }}
            >
              {scene.language_label || 'Python'}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.02em',
              }}
            >
              {scene.heading}
            </h2>
          </div>

          <div
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Step {currentStepIndex + 1} of {stepCount} (Line {currentLineTarget})
          </div>
        </div>

        {/* 3D Double Glass Card Panels: Code Panel on Left + Variable Watch on Right */}
        <div
          style={{
            width: '1160px',
            display: 'flex',
            gap: '24px',
            alignItems: 'stretch',
            transform: `scale(${entrance}) rotateY(-3deg) rotateX(2deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* LEFT: Code Walkthrough Card */}
          <div
            style={{
              flex: 1.5,
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(9, 14, 26, 0.96) 100%)',
              borderRadius: '20px',
              border: '1.5px solid rgba(56, 189, 248, 0.28)',
              boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.1)',
              overflow: 'hidden',
              backdropFilter: quality === 'low' ? undefined : 'blur(16px)',
              transform: 'translateZ(20px)',
            }}
          >
            {/* Window Chrome */}
            <div
              style={{
                height: '40px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '8px',
              }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span
                style={{
                  marginLeft: '12px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 600,
                }}
              >
                program.py
              </span>
            </div>

            {/* Code Body */}
            <div
              style={{
                position: 'relative',
                padding: '20px 0',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '19px',
                lineHeight: `${lineHeight}px`,
              }}
            >
              {/* Smooth Gliding Highlight Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: `${20 + highlightBarTop}px`,
                  left: 0,
                  width: '100%',
                  height: `${lineHeight}px`,
                  background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.08) 75%, rgba(56, 189, 248, 0) 100%)',
                  borderLeft: '4px solid #38bdf8',
                  boxShadow: '0 0 24px rgba(56, 189, 248, 0.3)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />

              {lines.map((rawLine, idx) => {
                const lineNum = idx + 1;
                const isTarget = Math.round(smoothLineNum) === lineNum;

                // Progressive typewriter reveal per line
                const lineTypewriterP = prog(t, idx * 250, idx * 250 + 400);
                const visibleLineText = typewriter(rawLine, lineTypewriterP);

                return (
                  <div
                    key={`line-${idx}`}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      height: `${lineHeight}px`,
                      padding: '0 20px',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        color: '#38bdf8',
                        fontSize: '14px',
                        fontWeight: 700,
                        opacity: isTarget ? 1 : 0,
                      }}
                    >
                      ▶
                    </div>

                    <span
                      style={{
                        width: '32px',
                        textAlign: 'right',
                        paddingRight: '16px',
                        color: isTarget ? '#38bdf8' : '#475569',
                        fontWeight: isTarget ? 700 : 400,
                        userSelect: 'none',
                      }}
                    >
                      {lineNum}
                    </span>

                    <div style={{ flex: 1, whiteSpace: 'pre' }}>
                      {highlightTokens(visibleLineText)}
                      {isTarget && showCursor && (
                        <span style={{ color: '#38bdf8', fontWeight: 800, marginLeft: '2px' }}>
                          |
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Linked Variable Watch Panel */}
          <div
            style={{
              width: '340px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(9, 14, 26, 0.96) 100%)',
              borderRadius: '20px',
              border: '1.5px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.8), 0 0 35px rgba(168, 85, 247, 0.12)',
              overflow: 'hidden',
              backdropFilter: quality === 'low' ? undefined : 'blur(16px)',
              transform: 'translateZ(30px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Panel Header */}
            <div
              style={{
                height: '40px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#a855f7', fontSize: '14px' }}>⚡</span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Variable Watch
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                Line {currentLineTarget}
              </span>
            </div>

            {/* Live Variable Inspector Rows */}
            <div
              style={{
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                flex: 1,
              }}
            >
              {Object.entries(activeVars).map(([varName, val], idx) => {
                // Subtle slide/pulse animation when step advances
                const pulseP = Math.max(0, 1 - stepProgress * 2.5);
                const valShiftY = pulseP * -8;
                const valGlow = pulseP > 0 ? 'rgba(245, 158, 11, 0.5)' : 'transparent';

                return (
                  <div
                    key={`var-${varName}-${idx}`}
                    style={{
                      background: 'rgba(30, 41, 59, 0.65)',
                      borderRadius: '12px',
                      border: '1px solid rgba(71, 85, 105, 0.45)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: `0 0 15px ${valGlow}`,
                      transform: `translateY(${valShiftY}px)`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          color: '#38bdf8',
                          fontSize: '15px',
                          fontWeight: 700,
                        }}
                      >
                        {varName}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>=</span>
                    </div>

                    <div
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.15)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      {String(val)}
                    </div>
                  </div>
                );
              })}

              {/* Status footer inside Variable card */}
              <div
                style={{
                  marginTop: 'auto',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓</span>
                <span>Active Stack Frame Synchronized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneStage>
  );
};
