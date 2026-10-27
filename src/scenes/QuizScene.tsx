import React, { useState } from 'react';
import type { QuizScene as QuizSceneType } from '../types/lesson';

interface QuizSceneProps {
  scene: QuizSceneType;
  t: number;
  duration: number;
  quality?: 'high' | 'low';
}

export const QuizScene: React.FC<QuizSceneProps> = ({ scene }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const question = scene.question || scene.heading;
  const options = scene.options || ['A) Option 1', 'B) Option 2', 'C) Option 3'];
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
        padding: '32px',
        boxSizing: 'border-box',
        background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f172a 70%, #020617 100%)',
        color: '#f8fafc',
        fontFamily: '"Noto Sans", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow highlight */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(129, 140, 248, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '9999px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(129, 140, 248, 0.35)',
          color: '#a5b4fc',
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '16px',
        }}
      >
        <span>🎯</span> Quick Knowledge Check
      </div>

      {/* Question Card */}
      <div
        style={{
          maxWidth: '750px',
          textAlign: 'center',
          marginBottom: '28px',
          zIndex: 1,
        }}
      >
        <h2
          style={{
            fontSize: '24px',
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
          Test your grasp of what you just watched! Click an option below:
        </span>
      </div>

      {/* Options List */}
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 1,
        }}
      >
        {options.map((option, idx) => {
          let btnBg = 'rgba(30, 41, 59, 0.7)';
          let btnBorder = '1px solid rgba(71, 85, 105, 0.5)';
          let btnColor = '#f1f5f9';

          if (isAnswered) {
            if (idx === correctIdx) {
              btnBg = 'rgba(34, 197, 94, 0.22)';
              btnBorder = '2px solid #22c55e';
              btnColor = '#4ade80';
            } else if (idx === selectedIdx) {
              btnBg = 'rgba(239, 68, 68, 0.22)';
              btnBorder = '2px solid #ef4444';
              btnColor = '#f87171';
            } else {
              btnBg = 'rgba(15, 23, 42, 0.4)';
              btnBorder = '1px solid rgba(51, 65, 85, 0.3)';
              btnColor = '#64748b';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderRadius: '12px',
                background: btnBg,
                border: btnBorder,
                color: btnColor,
                fontSize: '15px',
                fontWeight: 600,
                cursor: isAnswered ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isAnswered && idx === correctIdx ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
              }}
            >
              <span>{option}</span>
              {isAnswered && idx === correctIdx && <span style={{ fontSize: '18px' }}>✅</span>}
              {isAnswered && idx === selectedIdx && idx !== correctIdx && (
                <span style={{ fontSize: '18px' }}>❌</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px 20px',
            borderRadius: '10px',
            maxWidth: '680px',
            width: '100%',
            boxSizing: 'border-box',
            background: isCorrect ? 'rgba(34, 197, 94, 0.12)' : 'rgba(56, 189, 248, 0.12)',
            border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
            color: isCorrect ? '#86efac' : '#7dd3fc',
            fontSize: '13px',
            textAlign: 'center',
            zIndex: 1,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <strong>{isCorrect ? '🎉 Correct! ' : '💡 Explanation: '}</strong>
          {scene.explanation || 'Great effort reviewing this topic!'}
        </div>
      )}
    </div>
  );
};
