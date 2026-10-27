import React, { useEffect } from 'react';
import type { Lesson } from '../types/lesson';
import { usePlayer } from './usePlayer';
import { Stage } from './Stage';
import { SceneRenderer } from './SceneRenderer';
import { CaptionBar } from './CaptionBar';
import { ProgressBar } from './ProgressBar';
import { Controls } from './Controls';
import { getFontFamilyForLanguage, LANGUAGE_LABELS } from '../utils/fonts';

interface PlayerShellProps {
  lesson: Lesson;
  onBackToInput?: () => void;
  statusBadge?: string;
}

export const PlayerShell: React.FC<PlayerShellProps> = ({
  lesson,
  onBackToInput,
  statusBadge,
}) => {
  const {
    T,
    isPlaying,
    play,
    pause,
    togglePlay,
    next,
    prev,
    replay,
    seek,
    sceneIndex,
    localT,
    sceneDuration,
    totalDuration,
    currentScene,
    isPause,
  } = usePlayer(lesson, true); // Auto-start playback

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        replay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, next, prev, replay]);

  const sceneCount = lesson.scenes.length;
  const currentSceneNumber = sceneIndex + 1;
  const langInfo = LANGUAGE_LABELS[lesson.language] || { name: lesson.language, nativeName: lesson.language };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        background: '#040711',
        color: '#f8fafc',
        fontFamily: getFontFamilyForLanguage(lesson.language),
        overflow: 'hidden',
      }}
    >
      {/* Top Header Bar */}
      <header
        className="player-header"
        style={{
          height: '60px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10, 15, 29, 0.95)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          backdropFilter: 'blur(10px)',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {onBackToInput && (
            <button
              id="btn-back-input"
              className="control-btn"
              onClick={onBackToInput}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
              title="Return to lesson creator"
            >
              <span>←</span>
              <span>New</span>
            </button>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                className="player-header-title"
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {lesson.title}
              </span>
              <span
                className="player-header-badge"
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(2, 132, 199, 0.2)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {langInfo.name} ({langInfo.nativeName})
              </span>
              {statusBadge && (
                <span
                  className="player-header-badge"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusBadge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Step heading & Scene indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div
            id="step-heading"
            className="player-header-scene"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Scene {currentSceneNumber}/{sceneCount}:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>
              {currentScene?.heading || 'Intro'}
            </span>
          </div>

          <div
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              background: '#1e293b',
              border: '1px solid #334155',
              fontSize: '11px',
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            {Math.round(localT / 1000)}s / {Math.round(sceneDuration / 1000)}s
          </div>
        </div>
      </header>

      {/* Main 16:9 Viewport Stage Area */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Stage>
          {currentScene ? (
            <SceneRenderer
              scene={currentScene}
              t={localT}
              duration={sceneDuration}
            />
          ) : (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>
              No scene available.
            </div>
          )}
        </Stage>
      </main>

      {/* Bottom Footer Shell (Caption Bar + Progress + Controls) */}
      <footer
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8, 12, 22, 0.95)',
          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          zIndex: 20,
        }}
      >
        {/* Caption Bar with Regional Noto Font */}
        <CaptionBar
          caption={currentScene?.caption || currentScene?.narration || ''}
          language={lesson.language}
          isPause={isPause}
        />

        {/* Progress & Controls Panel */}
        <div
          style={{
            padding: '12px 24px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Global Progress Bar */}
          <ProgressBar
            lesson={lesson}
            T={T}
            totalDuration={totalDuration}
            onSeek={seek}
          />

          {/* Player Action Controls */}
          <Controls
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrev={prev}
            onReplay={replay}
          />
        </div>
      </footer>
    </div>
  );
};
