import React, { useEffect, useState } from 'react';
import type { Lesson } from '../types/lesson';
import { usePlayer } from './usePlayer';
import { Stage } from './Stage';
import { SceneRenderer } from './SceneRenderer';
import { CaptionBar } from './CaptionBar';
import { ProgressBar } from './ProgressBar';
import { Controls } from './Controls';
import { DebugOverlay } from './DebugOverlay';
import { getFontFamilyForLanguage, LANGUAGE_LABELS } from '../utils/fonts';
import { getInitialQuality, type QualityMode } from '../utils/quality';

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
  const [showDebug, setShowDebug] = useState(false);
  const [quality] = useState<QualityMode>(getInitialQuality);

  const {
    T,
    isPlaying,
    isMuted,
    toggleMute,
    audioBlocked,
    unblockAudio,
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
  } = usePlayer(lesson, false); // Default to paused so user click guarantees audio playback permission

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
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, next, prev, replay, toggleMute]);

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
        position: 'relative',
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
              {/* Voice Track Indicator Badge */}
              <span
                id="voice-badge"
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: currentScene?.audio_url
                    ? isPlaying && !isMuted
                      ? 'rgba(56, 189, 248, 0.25)'
                      : 'rgba(148, 163, 184, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  color: currentScene?.audio_url
                    ? isPlaying && !isMuted
                      ? '#38bdf8'
                      : '#94a3b8'
                    : '#f87171',
                  border: `1px solid ${currentScene?.audio_url ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={currentScene?.audio_url ? `Audio source: ${currentScene.audio_url}` : 'No audio file'}
              >
                <span>{currentScene?.audio_url ? (isMuted ? '🔇' : isPlaying ? '🎙️' : '🔈') : '⚠️'}</span>
                <span>{currentScene?.audio_url ? (isPlaying && !isMuted ? 'Voice Playing' : 'Voice Ready') : 'No Audio'}</span>
              </span>
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
              quality={quality}
            />
          ) : (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '100px' }}>
              No scene available.
            </div>
          )}

          {/* Initial Play Overlay: Provides direct user gesture for 100% audio permission */}
          {!isPlaying && T === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(4, 7, 17, 0.55)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
              }}
            >
              <button
                id="btn-start-lesson"
                onClick={play}
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)',
                  border: '2px solid #38bdf8',
                  borderRadius: '24px',
                  padding: '24px 44px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 50px rgba(56, 189, 248, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'transform 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    color: '#ffffff',
                    boxShadow: '0 0 25px rgba(56, 189, 248, 0.6)',
                  }}
                >
                  ▶
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Start Lesson
                  </div>
                  <div style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 600, marginTop: '4px' }}>
                    🎙️ Full narration & audio ready • Click to Play
                  </div>
                </div>
              </button>
            </div>
          )}
        </Stage>

        {/* Autoplay Browser Policy Fallback Banner */}
        {audioBlocked && (
          <div
            id="banner-unblock-audio"
            onClick={unblockAudio}
            style={{
              position: 'absolute',
              top: '20px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '9999px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(2, 132, 199, 0.7)',
              border: '2px solid #38bdf8',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px' }}>🔊</span>
            <span>Audio paused by browser policy. Click here to enable voiceover!</span>
          </div>
        )}

        <DebugOverlay
          visible={showDebug}
          T={T}
          sceneIndex={sceneIndex}
          localT={localT}
          sceneDuration={sceneDuration}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          isPause={isPause}
          quality={quality}
        />
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
            isMuted={isMuted}
            onPlay={play}
            onPause={pause}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrev={prev}
            onReplay={replay}
            onToggleMute={toggleMute}
          />
        </div>
      </footer>
    </div>
  );
};
