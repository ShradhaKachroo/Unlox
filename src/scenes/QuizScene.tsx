import React, { useState } from 'react';
import type { QuizScene as QuizSceneType } from '../types/lesson';

interface QuizSceneProps {
  scene: QuizSceneType;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

/**
 * Strips leading redundant prefixes like "A) ", "B. ", "Option 1: ", "(A) ", "1. "
 * so badges remain clean and never duplicated.
 */
function cleanOptionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(\(?[A-Da-d0-9]\)?[\).\:\-]\s*|Option\s+[A-Da-d0-9][\).\:\-]?\s*)/i, '')
    .trim() || text.trim();
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export const QuizScene: React.FC<QuizSceneProps> = ({ scene }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const question = scene.question || scene.heading || 'Knowledge Check';
  const rawOptions = scene.options && scene.options.length >= 2
    ? scene.options
    : ['Repeats an instruction across a sequence', 'Stops after one run', 'Creates unrelated memory pointers'];
  const correctIdx = scene.answer_idx ?? 0;
  const isAnswered = selectedIdx !== null;
  const isCorrect = selectedIdx === correctIdx;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 24px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f172a 70%, #020617 100%)',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glow highlight */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(129, 140, 248, 0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(99, 102, 241, 0.18)',
          border: '1px solid rgba(129, 140, 248, 0.4)',
          color: '#c7d2fe',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '14px',
          zIndex: 1,
        }}
      >
        <span>🎯</span> Quick Knowledge Check
      </div>

      {/* Question Card */}
      <div
        style={{
          maxWidth: '740px',
          textAlign: 'center',
          marginBottom: '22px',
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            lineHeight: 1.35,
            margin: '0 0 8px 0',
            color: '#ffffff',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {question}
        </h2>
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
          Select the best answer below to check your understanding:
        </span>
      </div>

      {/* Options List */}
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1,
        }}
      >
        {rawOptions.map((rawOpt, idx) => {
          const letter = OPTION_LETTERS[idx] || String(idx + 1);
          const optionText = cleanOptionText(rawOpt);

          let btnBg = 'rgba(30, 41, 59, 0.75)';
          let btnBorder = '1px solid rgba(71, 85, 105, 0.55)';
          let btnColor = '#f1f5f9';
          let badgeBg = 'rgba(99, 102, 241, 0.25)';
          let badgeColor = '#c7d2fe';
          let badgeBorder = '1px solid rgba(129, 140, 248, 0.4)';

          if (isAnswered) {
            if (idx === correctIdx) {
              btnBg = 'rgba(34, 197, 94, 0.18)';
              btnBorder = '2px solid #22c55e';
              btnColor = '#4ade80';
              badgeBg = '#22c55e';
              badgeColor = '#052e16';
              badgeBorder = 'none';
            } else if (idx === selectedIdx) {
              btnBg = 'rgba(239, 68, 68, 0.18)';
              btnBorder = '2px solid #ef4444';
              btnColor = '#f87171';
              badgeBg = '#ef4444';
              badgeColor = '#450a0a';
              badgeBorder = 'none';
            } else {
              btnBg = 'rgba(15, 23, 42, 0.4)';
              btnBorder = '1px solid rgba(51, 65, 85, 0.25)';
              btnColor = '#64748b';
              badgeBg = 'rgba(51, 65, 85, 0.4)';
              badgeColor = '#94a3b8';
              badgeBorder = '1px solid rgba(71, 85, 105, 0.3)';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!isAnswered) {
                  setSelectedIdx(idx);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 18px',
                borderRadius: '12px',
                background: btnBg,
                border: btnBorder,
                color: btnColor,
                fontSize: '15px',
                fontWeight: 600,
                cursor: isAnswered ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isAnswered && idx === correctIdx ? '0 0 20px rgba(34, 197, 94, 0.28)' : 'none',
                position: 'relative',
              }}
            >
              {/* Option Letter Badge (A, B, C, D) */}
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  minWidth: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  background: badgeBg,
                  color: badgeColor,
                  border: badgeBorder,
                  transition: 'all 0.2s ease',
                }}
              >
                {letter}
              </div>

              {/* Clean Option Text */}
              <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>
                {optionText}
              </span>

              {/* Status Indicator */}
              {isAnswered && idx === correctIdx && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#22c55e',
                    color: '#052e16',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ✓ Correct
                </span>
              )}

              {isAnswered && idx === selectedIdx && idx !== correctIdx && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#ef4444',
                    color: '#450a0a',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ✕ Incorrect
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner & Reset Option */}
      {isAnswered && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 18px',
            borderRadius: '10px',
            maxWidth: '680px',
            width: '100%',
            boxSizing: 'border-box',
            background: isCorrect ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
            border: isCorrect ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
            color: isCorrect ? '#86efac' : '#7dd3fc',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 1,
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ flex: 1, lineHeight: 1.4 }}>
            <strong>{isCorrect ? '🎉 Correct! ' : '💡 Explanation: '}</strong>
            {scene.explanation || 'Reviewing this core principle solidifies what you learned.'}
          </div>
          <button
            type="button"
            onClick={() => setSelectedIdx(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
            title="Try answering again"
          >
            ↻ Try Again
          </button>
        </div>
      )}
    </div>
  );
};
