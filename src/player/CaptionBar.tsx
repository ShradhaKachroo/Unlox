import React from 'react';
import { getFontFamilyForLanguage } from '../utils/fonts';
import { useSettings } from '../context/useSettings';

interface CaptionBarProps {
  caption: string;
  language: string;
  isPause?: boolean;
}

export const CaptionBar: React.FC<CaptionBarProps> = ({
  caption,
  language,
  isPause,
}) => {
  const { settings } = useSettings();
  const { dyslexia, captionSize } = settings;

  const fontFamily = getFontFamilyForLanguage(language, dyslexia);

  // Font size mapping based on settings
  const fontSizeMap = {
    normal: dyslexia ? '20px' : '18px',
    large: dyslexia ? '24px' : '22px',
    xlarge: dyslexia ? '28px' : '26px',
  };
  const fontSize = fontSizeMap[captionSize] || fontSizeMap.normal;

  return (
    <div
      id="caption-container"
      className="caption-container"
      style={{
        width: '100%',
        padding: dyslexia ? '18px 28px' : '14px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: dyslexia
          ? '#fffdf5' // Warm cream panel for dyslexia mode
          : 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(8, 12, 22, 0.98) 100%)',
        borderTop: dyslexia
          ? '2px solid #e5dec9'
          : '1px solid rgba(51, 65, 85, 0.5)',
        boxShadow: dyslexia
          ? '0 -4px 20px rgba(0, 0, 0, 0.15)'
          : undefined,
        backdropFilter: dyslexia ? undefined : 'blur(12px)',
        minHeight: dyslexia ? '78px' : '68px',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Caption Icon Indicator */}
        <div
          className="caption-icon"
          style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: dyslexia ? '#e2d7ba' : 'rgba(56, 189, 248, 0.15)',
            border: dyslexia ? '1px solid #c9bda0' : '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dyslexia ? '#473c26' : '#38bdf8',
            fontSize: '17px',
          }}
          title="On-screen translated caption"
        >
          💬
        </div>

        {/* Caption Text with Noto/OpenDyslexic font */}
        <div
          id="caption-text"
          className="caption-text"
          style={{
            flex: 1,
            fontFamily,
            fontSize,
            lineHeight: dyslexia ? 1.7 : 1.45,
            letterSpacing: dyslexia ? '0.05em' : '0.01em',
            wordSpacing: dyslexia ? '0.16em' : 'normal',
            fontStyle: 'normal',
            fontWeight: dyslexia ? 600 : 500,
            color: dyslexia ? '#0f172a' : '#f8fafc', // High contrast dark text for cream background
            textAlign: 'left',
            textShadow: dyslexia ? 'none' : '0 2px 4px rgba(0,0,0,0.6)',
          }}
        >
          {caption || '...'}
          {isPause && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '12px',
                color: dyslexia ? '#64748b' : '#94a3b8',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: dyslexia ? 'rgba(0,0,0,0.06)' : 'rgba(148, 163, 184, 0.15)',
              }}
            >
              (Interlude)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
