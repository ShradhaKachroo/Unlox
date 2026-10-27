import React from 'react';
import { useSettings, type PlaybackSpeed, type VoiceGender } from '../context/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    setSpeed,
    setVoice,
    setDyslexia,
    increaseCaptionSize,
    decreaseCaptionSize,
    setShowBlu,
    resetSettings,
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        id="settings-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)',
          border: '1.5px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.2)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⚙️</span>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
              Learner Preferences
            </h3>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              color: '#94a3b8',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: 'pointer',
            }}
            title="Close Settings"
          >
            ✕
          </button>
        </div>

        {/* 1. Playback Speed */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Playback Speed
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                id={`btn-speed-${sp}`}
                onClick={() => setSpeed(sp)}
                style={{
                  padding: '9px 0',
                  borderRadius: '10px',
                  background: settings.speed === sp ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(30, 41, 59, 0.6)',
                  border: settings.speed === sp ? '1.5px solid #38bdf8' : '1px solid rgba(71, 85, 105, 0.4)',
                  color: settings.speed === sp ? '#ffffff' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: settings.speed === sp ? '0 0 15px rgba(56, 189, 248, 0.4)' : undefined,
                }}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        {/* 2. Voice Gender Preference */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Narration Voice
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {(['female', 'male'] as VoiceGender[]).map((v) => (
              <button
                key={v}
                id={`btn-voice-${v}`}
                onClick={() => setVoice(v)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: settings.voice === v ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' : 'rgba(30, 41, 59, 0.6)',
                  border: settings.voice === v ? '1.5px solid #c084fc' : '1px solid rgba(71, 85, 105, 0.4)',
                  color: settings.voice === v ? '#ffffff' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: settings.voice === v ? '0 0 15px rgba(192, 132, 252, 0.4)' : undefined,
                }}
              >
                <span>{v === 'female' ? '👩' : '👨'}</span>
                <span>{v === 'female' ? 'Female Voice' : 'Male Voice'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Dyslexia-Friendly Mode Toggle */}
        <div
          style={{
            background: settings.dyslexia ? 'rgba(234, 179, 8, 0.12)' : 'rgba(30, 41, 59, 0.5)',
            border: settings.dyslexia ? '1.5px solid rgba(234, 179, 8, 0.45)' : '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '17px' }}>📖</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: settings.dyslexia ? '#fde047' : '#f8fafc' }}>
                Dyslexia-Friendly Mode
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
              OpenDyslexic font, high-contrast cream captions, expanded spacing & reduced motion.
            </div>
          </div>
          <button
            id="toggle-dyslexia"
            type="button"
            onClick={() => setDyslexia(!settings.dyslexia)}
            style={{
              width: '52px',
              height: '30px',
              borderRadius: '15px',
              background: settings.dyslexia ? '#eab308' : '#334155',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            title="Toggle Dyslexia Mode"
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: '3px',
                left: settings.dyslexia ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* 4. Caption Text Size (A- / A+) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
              Caption Text Size
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Current: <strong style={{ color: '#38bdf8' }}>{settings.captionSize.toUpperCase()}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="btn-caption-decrease"
              onClick={decreaseCaptionSize}
              disabled={settings.captionSize === 'normal'}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                color: settings.captionSize === 'normal' ? '#64748b' : '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: settings.captionSize === 'normal' ? 'not-allowed' : 'pointer',
              }}
              title="Decrease text size"
            >
              A-
            </button>
            <button
              id="btn-caption-increase"
              onClick={increaseCaptionSize}
              disabled={settings.captionSize === 'xlarge'}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                color: settings.captionSize === 'xlarge' ? '#64748b' : '#ffffff',
                fontWeight: 700,
                fontSize: '15px',
                cursor: settings.captionSize === 'xlarge' ? 'not-allowed' : 'pointer',
              }}
              title="Increase text size"
            >
              A+
            </button>
          </div>
        </div>

        {/* 5. Show Blu Teacher Mascot Toggle */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>👨‍🏫</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                Show Teacher Mascot "Blu"
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Hand-drawn animated SVG guide explaining concepts
              </div>
            </div>
          </div>
          <button
            id="toggle-show-blu"
            type="button"
            onClick={() => setShowBlu(!settings.showBlu)}
            style={{
              width: '52px',
              height: '30px',
              borderRadius: '15px',
              background: settings.showBlu ? '#0284c7' : '#334155',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
            title="Toggle Blu Mascot"
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: '3px',
                left: settings.showBlu ? '25px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
          </button>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <button
            onClick={resetSettings}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Reset Defaults
          </button>
          <button
            id="btn-done-settings"
            onClick={onClose}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
