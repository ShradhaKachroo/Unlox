import React from 'react';

interface DebugOverlayProps {
  visible: boolean;
  T: number;
  sceneIndex: number;
  localT: number;
  sceneDuration: number;
  totalDuration: number;
  isPlaying: boolean;
  isPause: boolean;
  quality: 'high' | 'low';
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  visible,
  T,
  sceneIndex,
  localT,
  sceneDuration,
  totalDuration,
  isPlaying,
  isPause,
  quality,
}) => {
  if (!visible) return null;

  return (
    <div
      id="debug-overlay"
      style={{
        position: 'fixed',
        top: '72px',
        right: '16px',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid #38bdf8',
        borderRadius: '10px',
        padding: '14px 18px',
        color: '#f8fafc',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '12px',
        lineHeight: 1.6,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.25)',
        backdropFilter: 'blur(8px)',
        minWidth: '240px',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
          paddingBottom: '6px',
          marginBottom: '8px',
          fontWeight: 700,
          color: '#38bdf8',
          letterSpacing: '0.05em',
        }}
      >
        <span>DEBUG MONITOR [D]</span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            background: isPlaying ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isPlaying ? '#4ade80' : '#f87171',
            border: `1px solid ${isPlaying ? '#22c55e' : '#ef4444'}`,
          }}
        >
          {isPlaying ? 'PLAYING' : 'PAUSED'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: '4px' }}>
        <span style={{ color: '#94a3b8' }}>Global T:</span>
        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{Math.round(T)} ms</span>

        <span style={{ color: '#94a3b8' }}>Total Dur:</span>
        <span style={{ color: '#cbd5e1' }}>{Math.round(totalDuration)} ms</span>

        <span style={{ color: '#94a3b8' }}>Scene Index:</span>
        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{sceneIndex} (Scene {sceneIndex + 1})</span>

        <span style={{ color: '#94a3b8' }}>Local t:</span>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{Math.round(localT)} ms</span>

        <span style={{ color: '#94a3b8' }}>Scene Dur:</span>
        <span style={{ color: '#cbd5e1' }}>{Math.round(sceneDuration)} ms</span>

        <span style={{ color: '#94a3b8' }}>Scene Prog:</span>
        <span style={{ color: '#a78bfa', fontWeight: 600 }}>
          {sceneDuration > 0 ? ((localT / sceneDuration) * 100).toFixed(1) : 0}%
        </span>

        <span style={{ color: '#94a3b8' }}>Interlude:</span>
        <span style={{ color: isPause ? '#fbbf24' : '#64748b' }}>{isPause ? 'YES (400ms)' : 'NO'}</span>

        <span style={{ color: '#94a3b8' }}>Quality:</span>
        <span style={{ color: quality === 'low' ? '#f59e0b' : '#38bdf8', fontWeight: 600 }}>
          {quality.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
