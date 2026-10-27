import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReplay: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onReplay,
}) => {
  const buttonStyle: React.CSSProperties = {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    color: '#f8fafc',
    borderRadius: '10px',
    padding: '9px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    outline: 'none',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isPlaying
      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
      : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    border: '1px solid #38bdf8',
    padding: '10px 22px',
    fontSize: '15px',
    fontWeight: 700,
    boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)',
  };

  return (
    <div
      className="controls-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          id="btn-prev"
          className="control-btn"
          onClick={onPrev}
          style={buttonStyle}
          title="Previous Scene (Left Arrow)"
        >
          <span>⏮</span>
          <span>Prev</span>
        </button>

        <button
          id="btn-play-pause"
          className="control-btn control-btn-primary"
          onClick={onTogglePlay}
          style={primaryButtonStyle}
          title="Play / Pause (Space)"
        >
          <span style={{ fontSize: '16px' }}>{isPlaying ? '⏸' : '▶'}</span>
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          id="btn-next"
          className="control-btn"
          onClick={onNext}
          style={buttonStyle}
          title="Next Scene (Right Arrow)"
        >
          <span>Next</span>
          <span>⏭</span>
        </button>

        <button
          id="btn-replay"
          className="control-btn"
          onClick={onReplay}
          style={buttonStyle}
          title="Replay from Beginning (R)"
        >
          <span>↺</span>
          <span>Replay</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className="keyboard-hints"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#64748b',
          fontSize: '12px',
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <span>
          <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', border: '1px solid #334155', color: '#cbd5e1' }}>Space</kbd> Play/Pause
        </span>
        <span>
          <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', border: '1px solid #334155', color: '#cbd5e1' }}>←</kbd>
          <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '4px', border: '1px solid #334155', color: '#cbd5e1', marginLeft: '3px' }}>→</kbd> Scenes
        </span>
      </div>
    </div>
  );
};
