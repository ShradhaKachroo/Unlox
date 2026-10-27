import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  isMuted?: boolean;
  currentLanguage?: string;
  isRevoicing?: boolean;
  voiceStatuses?: Record<string, string>;
  onPlay: () => void;
  onPause: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReplay: () => void;
  onToggleMute?: () => void;
  onOpenSettings?: () => void;
  onLanguageChange?: (lang: string) => void;
  onExportMP4?: () => void;
  isExporting?: boolean;
}

// Only languages the backend TTS models actually support
const AVAILABLE_LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
  { code: 'kn', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
];

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  isMuted = false,
  currentLanguage = 'en',
  isRevoicing = false,
  voiceStatuses,
  onTogglePlay,
  onNext,
  onPrev,
  onReplay,
  onToggleMute,
  onOpenSettings,
  onLanguageChange,
  onExportMP4,
  isExporting = false,
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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  background: isRevoicing ? 'rgba(14, 165, 233, 0.1)' : 'rgba(30, 41, 59, 0.85)',
                  border: isRevoicing ? '1.5px solid rgba(56, 189, 248, 0.8)' : '1.5px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  cursor: isRevoicing ? 'wait' : 'pointer',
                  opacity: isRevoicing ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
                title="Switch lesson language (English, Hindi, Kannada)"
              >
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const status = voiceStatuses?.[lang.code];
                  let statusBadge = '';
                  if (status === 'ready') statusBadge = '✓ Ready';
                  else if (status === 'generating') statusBadge = '⏳ Generating...';
                  else if (status === 'pending') statusBadge = '⏳ Queued';
                  return (
                    <option key={lang.code} value={lang.code} style={{ background: '#0f172a', color: '#ffffff' }}>
                      {lang.label} {statusBadge ? `(${statusBadge})` : ''}
                    </option>
                  );
                })}
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
                {isRevoicing ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      border: '2px solid rgba(56, 189, 248, 0.3)',
                      borderTopColor: '#38bdf8',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                ) : '▼'}
              </span>
            </div>
            {isRevoicing ? (
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Generating...
              </span>
            ) : voiceStatuses && (
              <span style={{ fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {voiceStatuses['en'] === 'ready' && voiceStatuses['hi'] === 'ready' && voiceStatuses['kn'] === 'ready' ? (
                  <span style={{ color: '#4ade80' }} title="English, Hindi, and Kannada voices ready">EN · HI · KN Ready ✓</span>
                ) : voiceStatuses['hi'] === 'generating' || voiceStatuses['kn'] === 'generating' ? (
                  <span style={{ color: '#38bdf8' }}>⏳ Synthesizing voice...</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Background voices in queue</span>
                )}
              </span>
            )}
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

        {onExportMP4 && (
          <button
            id="btn-export-mp4"
            className="control-btn"
            onClick={onExportMP4}
            disabled={isExporting}
            style={{
              ...buttonStyle,
              background: isExporting
                ? 'rgba(168, 85, 247, 0.25)'
                : 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(126, 34, 206, 0.35) 100%)',
              borderColor: isExporting ? '#c084fc' : 'rgba(192, 132, 252, 0.5)',
              color: '#f3e8ff',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
              cursor: isExporting ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Download playable 720p MP4 of the full lesson with audio & captions"
          >
            {isExporting ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(243, 232, 255, 0.3)',
                    borderTopColor: '#f3e8ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Exporting 720p...</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '15px' }}>📥</span>
                <span>Download MP4</span>
              </>
            )}
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
