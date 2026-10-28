import React, { useEffect } from 'react';
import type { Lesson } from '../types/lesson';
import { LANGUAGE_LABELS } from '../utils/fonts';
import { playCelebrationSound } from '../utils/audioSfx';

interface VictoryModalProps {
  lesson: Lesson;
  onReplay: () => void;
  onExportMP4: () => void;
  onRevoice: (lang: string) => void;
  onClose: () => void;
  onGoToStudyPlan?: () => void;
  onBackToInput?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  lesson,
  onReplay,
  onExportMP4,
  onRevoice,
  onClose,
  onGoToStudyPlan,
  onBackToInput,
}) => {
  useEffect(() => {
    playCelebrationSound();
  }, []);

  const totalSeconds = lesson.scenes.reduce((acc, s) => acc + (s.duration_ms || 0), 0) / 1000;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4, 7, 17, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '20px',
          padding: '32px 28px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.2)',
          textAlign: 'center',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: '#94a3b8',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            height: '140px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Trophy Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '16px',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)',
          }}
        >
          🏆
        </div>

        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '26px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}
        >
          Concept Mastered!
        </h2>

        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            color: '#38bdf8',
            fontWeight: 600,
          }}
        >
          {lesson.title || 'Visual Lesson'}
        </p>

        {/* Achievement Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 8px',
            marginBottom: '22px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>XP Gained</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>+150 XP</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Runtime</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{Math.round(totalSeconds)}s</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Level</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#a78bfa', marginTop: '3px' }}>{lesson.level.toUpperCase()}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Streak</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>🔥 Active</div>
          </div>
        </div>

        {/* Regional Revoice Quick Pills */}
        <div style={{ marginBottom: '22px', textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Instant Regional Revoice (Zero Generation Wait):
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(LANGUAGE_LABELS).map(([code, label]) => {
              const isActive = lesson.language === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onRevoice(code)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#38bdf8' : '#cbd5e1',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label.name} ({code.toUpperCase()})
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={onExportMP4}
              className="btn-hover-lift"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              }}
            >
              <span>🎬</span>
              <span>Export Offline MP4</span>
            </button>

            <button
              type="button"
              onClick={onReplay}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🔄</span>
              <span>Replay Lesson</span>
            </button>
          </div>

          {onGoToStudyPlan && (
            <button
              type="button"
              onClick={onGoToStudyPlan}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🗺️</span>
              <span>Continue in Study Track</span>
            </button>
          )}

          {onBackToInput && (
            <button
              type="button"
              onClick={onBackToInput}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to Create Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
