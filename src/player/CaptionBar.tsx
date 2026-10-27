import React from 'react';
import { getFontFamilyForLanguage } from '../utils/fonts';

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
  const fontFamily = getFontFamilyForLanguage(language);

  return (
    <div
      id="caption-container"
      className="caption-container"
      style={{
        width: '100%',
        padding: '14px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(8, 12, 22, 0.98) 100%)',
        borderTop: '1px solid rgba(51, 65, 85, 0.5)',
        backdropFilter: 'blur(12px)',
        minHeight: '68px',
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
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: '16px',
          }}
          title="On-screen translated caption"
        >
          💬
        </div>

        {/* Caption Text with Noto font specified by language */}
        <div
          id="caption-text"
          className="caption-text"
          style={{
            flex: 1,
            fontFamily,
            fontSize: '18px',
            lineHeight: 1.45,
            fontWeight: 500,
            color: '#f8fafc',
            textAlign: 'left',
            textShadow: '0 2px 4px rgba(0,0,0,0.6)',
            letterSpacing: '0.01em',
          }}
        >
          {caption || '...'}
          {isPause && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '12px',
                color: '#94a3b8',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(148, 163, 184, 0.15)',
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
