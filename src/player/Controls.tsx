import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  isMuted?: boolean;
  currentLanguage?: string;
  isRevoicing?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReplay: () => void;
  onToggleMute?: () => void;
  onOpenSettings?: () => void;
  onLanguageChange?: (lang: string) => void;
}

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'kn', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
  { code: 'ta', label: '🇮🇳 தமிழ் (Tamil)' },
  { code: 'te', label: '🇮🇳 తెలుగు (Telugu)' },
  { code: 'bn', label: '🇮🇳 বাংলা (Bengali)' },
  { code: 'mr', label: '🇮🇳 मराठी (Marathi)' },
];

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  isMuted = false,
  currentLanguage = 'en',
  isRevoicing = false,
  onTogglePlay,
  onNext,
  onPrev,
  onReplay,
  onToggleMute,
  onOpenSettings,
  onLanguageChange,
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

        {onToggleMute && (
          <button
            id="btn-mute-toggle"
            className="control-btn"
            onClick={onToggleMute}
            style={{
              ...buttonStyle,
              background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.7)',
              borderColor: isMuted ? '#ef4444' : 'rgba(71, 85, 105, 0.5)',
              color: isMuted ? '#fca5a5' : '#38bdf8',
            }}
            title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
            <span>{isMuted ? 'Muted' : 'Voice On'}</span>
          </button>
        )}

        {/* Revoice Language Switcher */}
        {onLanguageChange && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              id="select-language"
              className="control-btn"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={isRevoicing}
              style={{
                ...buttonStyle,
                appearance: 'none',
                paddingRight: '28px',
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1.5px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                cursor: isRevoicing ? 'wait' : 'pointer',
              }}
              title="Revoice lesson in Indian regional languages"
            >
              {AVAILABLE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} style={{ background: '#0f172a', color: '#ffffff' }}>
                  {lang.label}
                </option>
              ))}
            </select>
            <span
              style={{
                position: 'absolute',
                right: '10px',
                pointerEvents: 'none',
                fontSize: '10px',
                color: '#38bdf8',
              }}
            >
              ▼
            </span>
          </div>
        )}

        {onOpenSettings && (
          <button
            id="btn-settings-toggle"
            className="control-btn"
            onClick={onOpenSettings}
            style={{
              ...buttonStyle,
              background: 'rgba(30, 41, 59, 0.85)',
              borderColor: 'rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
            }}
            title="Learner Preferences & Dyslexia Mode (P)"
          >
            <span>⚙️</span>
            <span>Preferences</span>
          </button>
        )}
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
