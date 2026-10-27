import React, { useEffect, useState } from 'react';
import type { Lesson } from '../types/lesson';
import { usePlayer } from './usePlayer';
import { Stage } from './Stage';
import { SceneRenderer } from './SceneRenderer';
import { CaptionBar } from './CaptionBar';
import { ProgressBar } from './ProgressBar';
import { Controls } from './Controls';
import { DebugOverlay } from './DebugOverlay';
import { SettingsModal } from './SettingsModal';
import { useSettings } from '../context/useSettings';
import { Blu } from '../mascot/Blu';
import { getAnchor } from '../mascot/anchors';
import { apiRevoiceLesson, apiGetVoices } from '../api/lessonApi';
import { getSceneStartTime } from './timeline';
import { getFontFamilyForLanguage, LANGUAGE_LABELS } from '../utils/fonts';
import { getInitialQuality, type QualityMode } from '../utils/quality';

interface PlayerShellProps {
  lesson: Lesson;
  onBackToInput?: () => void;
  statusBadge?: string;
  onLessonChange?: (lesson: Lesson) => void;
}

export const PlayerShell: React.FC<PlayerShellProps> = ({
  lesson,
  onBackToInput,
  statusBadge,
  onLessonChange,
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [revoiceStatus, setRevoiceStatus] = useState<string | null>(null);
  const [revoiceError, setRevoiceError] = useState<string | null>(null);
  const [readyToast, setReadyToast] = useState<string | null>(null);
  const [voiceStatuses, setVoiceStatuses] = useState<Record<string, string>>(() => {
    return (lesson as any).voices || { [lesson.language]: 'ready' };
  });
  const [quality] = useState<QualityMode>(getInitialQuality);
  const { settings } = useSettings();

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
  } = usePlayer(lesson, false, settings.speed); // Passes speed setting to audio playbackRate

  // Auto-pause when a quiz scene becomes the active scene
  const pausedForQuizRef = React.useRef<number>(-1);
  useEffect(() => {
    if (
      currentScene?.type === 'quiz' &&
      isPlaying &&
      pausedForQuizRef.current !== sceneIndex
    ) {
      pausedForQuizRef.current = sceneIndex;
      pause();
    }
  }, [currentScene?.type, sceneIndex, isPlaying, pause]);

  // Background voice readiness polling
  useEffect(() => {
    if (!lesson.id || lesson.id.startsWith('sample')) return;

    let timer: any;
    let isCancelled = false;

    const poll = async () => {
      try {
        const data = await apiGetVoices(lesson.id);
        if (isCancelled) return;

        setVoiceStatuses((prev) => {
          const next = { ...prev, ...data.voices };
          // Check if any language just became ready that wasn't before
          for (const [code, status] of Object.entries(data.voices)) {
            if (status === 'ready' && prev[code] !== 'ready' && code !== lesson.language) {
              const label = LANGUAGE_LABELS[code]?.name || code.toUpperCase();
              setReadyToast(`🇮🇳 ${label} voice is ready! You can switch anytime.`);
              setTimeout(() => setReadyToast(null), 4000);
            }
          }
          return next;
        });

        // Continue polling until both Hindi and Kannada are ready (or failed)
        const allSettled = ['en', 'hi', 'kn'].every((l) =>
          data.voices[l] === 'ready' || data.voices[l] === 'failed'
        );
        if (!allSettled && !isCancelled) {
          timer = setTimeout(poll, 2500);
        }
      } catch {
        if (!isCancelled) {
          timer = setTimeout(poll, 4000);
        }
      }
    };

    timer = setTimeout(poll, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [lesson.id, lesson.language]);

  const handleLanguageChange = async (newLang: string) => {
    if (newLang === lesson.language) return;

    const targetLangLabel = LANGUAGE_LABELS[newLang]?.name || newLang.toUpperCase();
    const isReady = voiceStatuses[newLang] === 'ready';
    setRevoiceStatus(isReady ? `Switching to ${targetLangLabel}...` : `Synthesizing ${targetLangLabel} voice...`);
    setRevoiceError(null);

    const wasPlayingBefore = isPlaying;
    if (isPlaying) {
      pause();
    }

    try {
      const revoiced = await apiRevoiceLesson({
        lesson_id: lesson.id,
        lang: newLang,
        voice: settings.voice,
      });

      setVoiceStatuses((prev) => ({ ...prev, [newLang]: 'ready' }));

      // Keep same scene index and relative position
      const currentRelPos = sceneDuration > 0 ? localT / sceneDuration : 0;
      const targetScene = revoiced.scenes[sceneIndex] || revoiced.scenes[0];
      const targetLocalT = Math.round(currentRelPos * targetScene.duration_ms);
      const targetGlobalT = getSceneStartTime(revoiced, sceneIndex) + targetLocalT;

      if (onLessonChange) {
        onLessonChange(revoiced);
      }
      setTimeout(() => {
        seek(targetGlobalT);
        // Play as soon as we get the voice if user was playing
        if (wasPlayingBefore) {
          play();
        }
      }, 80);

      setRevoiceStatus(null);
    } catch (err) {
      setRevoiceStatus(null);
      setRevoiceError(`Could not revoice: ${(err as Error).message}`);
    }
  };

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
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        setShowSettings((prev) => !prev);
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
        fontFamily: getFontFamilyForLanguage(lesson.language, settings.dyslexia),
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

          <button
            id="btn-header-settings"
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Learner Preferences & Dyslexia Mode (P)"
          >
            <span>⚙️</span>
            <span>{settings.speed}x</span>
          </button>
        </div>
      </header>

      {/* Fallback Notice Banner */}
      {(lesson.source === 'fallback' || lesson.error) && (
        <div
          id="fallback-warning-banner"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        >
          <span>⚠️</span>
          <span>
            {lesson.error || 'Running in offline fallback mode (LLM returned verified fallback lesson).'}
          </span>
        </div>
      )}
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
        {/* Voice Ready Toast */}
        {readyToast && (
          <div
            id="voice-ready-toast"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
              border: '1.5px solid #34d399',
              borderRadius: '30px',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(52, 211, 153, 0.35)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: '16px' }}>✨</span>
            <span>{readyToast}</span>
          </div>
        )}

        {/* Revoice Loading Toast */}
        {revoiceStatus && (
          <div
            id="revoice-loading-toast"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1.5px solid #0284c7',
              borderRadius: '30px',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(2, 132, 199, 0.3)',
              backdropFilter: 'blur(10px)',
              color: '#38bdf8',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: '16px' }}>🎙️</span>
            <span>{revoiceStatus}</span>
          </div>
        )}

        {/* Revoice Error Toast */}
        {revoiceError && (
          <div
            id="revoice-error-toast"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              background: 'rgba(24, 15, 15, 0.95)',
              border: '1.5px solid #ef4444',
              borderRadius: '30px',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span>⚠️ {revoiceError}</span>
            <button
              onClick={() => setRevoiceError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                marginLeft: '6px',
              }}
            >
              ✕
            </button>
          </div>
        )}

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

          {/* Teacher Mascot Blu (toggled via Settings, pure function of time) */}
          {settings.showBlu && currentScene && (
            <Blu
              scene={currentScene}
              t={localT}
              duration={sceneDuration}
              mood={currentScene.mood}
              anchor={getAnchor(currentScene, localT, sceneDuration)}
            />
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
            currentLanguage={lesson.language}
            isRevoicing={!!revoiceStatus}
            voiceStatuses={voiceStatuses}
            onPlay={play}
            onPause={pause}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrev={prev}
            onReplay={replay}
            onToggleMute={toggleMute}
            onOpenSettings={() => setShowSettings(true)}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </footer>

      {/* Learner Preferences Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
