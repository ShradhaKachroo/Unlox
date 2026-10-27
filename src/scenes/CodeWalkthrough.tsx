import React from 'react';
import type { CodeWalkthroughScene } from '../types/lesson';

interface CodeWalkthroughProps {
  scene: CodeWalkthroughScene;
  t: number;
  duration: number;
}

// Pure cubic ease-out
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
}

// Lightweight syntax tokenizer for Python (pure string parsing, safe and offline)
function highlightPythonLine(line: string): React.ReactNode[] {
  // Check comment
  const commentIndex = line.indexOf('#');
  let codePart = line;
  let commentPart = '';
  if (commentIndex !== -1) {
    codePart = line.substring(0, commentIndex);
    commentPart = line.substring(commentIndex);
  }

  const tokens: React.ReactNode[] = [];
  // Tokenize codePart with regex matching strings, keywords, numbers, identifiers, symbols
  const regex = /(".*?"|'.*?'|\b(?:def|for|in|range|print|if|else|elif|while|return|break|continue|True|False|None)\b|\b\d+\b|[()[\],.:=+\-*/]|\s+|[a-zA-Z_]\w*)/g;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(codePart)) !== null) {
    const text = match[0];
    let color = '#e2e8f0'; // default text
    let fontWeight: 400 | 700 = 400;

    if (text.startsWith('"') || text.startsWith("'")) {
      color = '#38bdf8'; // strings: vibrant sky cyan
    } else if (
      /^(?:def|for|in|if|else|elif|while|return|break|continue)$/.test(text)
    ) {
      color = '#f43f5e'; // control flow keywords: rose coral
      fontWeight = 700;
    } else if (/^(?:range|print)$/.test(text)) {
      color = '#a855f7'; // built-in functions: purple
      fontWeight = 700;
    } else if (/^(?:True|False|None)$/.test(text)) {
      color = '#fbbf24'; // constants: amber
      fontWeight = 700;
    } else if (/^\d+$/.test(text)) {
      color = '#34d399'; // numbers: emerald green
    } else if (/^[()[\],.:=+\-*/]$/.test(text)) {
      color = '#94a3b8'; // operators / punctuation: slate
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

export const CodeWalkthrough: React.FC<CodeWalkthroughProps> = ({ scene, t, duration }) => {
  const lines = scene.code.split('\n');
  const highlightSteps = scene.highlight_lines.length > 0 ? scene.highlight_lines : [1];
  const stepCount = highlightSteps.length;

  // Compute current step and smooth transition to next step purely from t
  const slotDuration = duration / Math.max(1, stepCount);
  const currentStepIndex = Math.min(stepCount - 1, Math.max(0, Math.floor(t / slotDuration)));
  const nextStepIndex = Math.min(stepCount - 1, currentStepIndex + 1);

  const stepT = t - currentStepIndex * slotDuration;
  const stepProgress = Math.min(1, Math.max(0, stepT / slotDuration));

  const currentLineTarget = highlightSteps[currentStepIndex];
  const nextLineTarget = highlightSteps[nextStepIndex];

  // Glide highlight bar in the last 25% of step duration
  let smoothLineNum = currentLineTarget;
  if (currentStepIndex !== nextStepIndex && stepProgress > 0.75) {
    const transitionFraction = (stepProgress - 0.75) / 0.25;
    const eased = easeOutCubic(transitionFraction);
    smoothLineNum = currentLineTarget + (nextLineTarget - currentLineTarget) * eased;
  }

  const lineHeight = 50; // px
  const highlightBarTop = (smoothLineNum - 1) * lineHeight;

  // Smooth entrance of the editor window purely from t
  const entranceProgress = Math.min(1, Math.max(0, t / 450));
  const entranceEased = easeOutCubic(entranceProgress);

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
        background: 'linear-gradient(145deg, #090d16 0%, #0d1322 50%, #070913 100%)',
        color: '#f8fafc',
        padding: '30px 60px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: '500px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(14, 165, 233, 0) 70%)',
          pointerEvents: 'none',
          transform: `scale(${1 + (t / duration) * 0.1})`,
        }}
      />

      {/* Header bar / Title info */}
      <div
        style={{
          width: '1000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          opacity: entranceEased,
          transform: `translateY(${(1 - entranceEased) * 20}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
            }}
          >
            {scene.language_label || 'Python'}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 700,
              color: '#f1f5f9',
            }}
          >
            {scene.heading}
          </h2>
        </div>

        {/* Step progress counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            fontSize: '14px',
            fontWeight: 600,
            color: '#38bdf8',
          }}
        >
          <span>Line Execution:</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>
            Step {currentStepIndex + 1} of {stepCount} (Line {currentLineTarget})
          </span>
        </div>
      </div>

      {/* Editor Container */}
      <div
        style={{
          width: '1000px',
          background: '#0b1120',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden',
          opacity: entranceEased,
          transform: `translateY(${(1 - entranceEased) * 30}px)`,
        }}
      >
        {/* Editor Window Chrome */}
        <div
          style={{
            height: '42px',
            background: '#0f172a',
            borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            gap: '8px',
          }}
        >
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
          <span
            style={{
              marginLeft: '14px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            lesson_demo.py
          </span>
        </div>

        {/* Code Content with Smooth Highlight Bar */}
        <div
          style={{
            position: 'relative',
            padding: '24px 0',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '20px',
            lineHeight: `${lineHeight}px`,
          }}
        >
          {/* Smooth Highlight Bar computed directly from t */}
          <div
            style={{
              position: 'absolute',
              top: `${24 + highlightBarTop}px`,
              left: 0,
              width: '100%',
              height: `${lineHeight}px`,
              background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.08) 70%, rgba(56, 189, 248, 0) 100%)',
              borderLeft: '4px solid #38bdf8',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.2)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Lines */}
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const isTarget = Math.round(smoothLineNum) === lineNum;

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  height: `${lineHeight}px`,
                  padding: '0 24px',
                  zIndex: 2,
                }}
              >
                {/* Arrow indicator for active line */}
                <div
                  style={{
                    width: '24px',
                    color: '#38bdf8',
                    fontSize: '14px',
                    fontWeight: 700,
                    opacity: isTarget ? 1 : 0,
                  }}
                >
                  ▶
                </div>

                {/* Line number */}
                <span
                  style={{
                    width: '40px',
                    textAlign: 'right',
                    paddingRight: '20px',
                    color: isTarget ? '#38bdf8' : '#475569',
                    fontWeight: isTarget ? 700 : 400,
                    userSelect: 'none',
                  }}
                >
                  {lineNum}
                </span>

                {/* Highlighted code tokens */}
                <div style={{ flex: 1, whiteSpace: 'pre' }}>
                  {highlightPythonLine(line)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
