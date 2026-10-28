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
import { apiRevoiceLesson, apiGetVoices, apiExportLesson, apiGenerateLesson, triggerFileDownload, API_BASE_URL } from '../api/lessonApi';
import { VictoryModal } from '../components/VictoryModal';
import { AskBluBot } from '../components/AskBluBot';
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
  const isCapture = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('capture') === '1';

  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [revoiceStatus, setRevoiceStatus] = useState<string | null>(null);
  const [revoiceError, setRevoiceError] = useState<string | null>(null);
  const [readyToast, setReadyToast] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedSrtUrl, setExportedSrtUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isSimplerLoading, setIsSimplerLoading] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [voiceStatuses, setVoiceStatuses] = useState<Record<string, string>>(() => {
    return (lesson as any).voices || { [lesson.language]: 'ready' };
  });
  const [quality] = useState<QualityMode>(getInitialQuality);
  const { settings } = useSettings();
  const [showBot, setShowBot] = useState(false);

  const handleExplainSimpler = async () => {
    if (isSimplerLoading) return;
    try {
      setIsSimplerLoading(true);
      setRevoiceStatus('Regenerating lesson with intuitive analogies...');
      const simplerLesson = await apiGenerateLesson({
        topic: lesson.title,
        level: 'beginner',
        language: lesson.language,
        target_seconds: Math.min(90, Math.round(totalDuration / 1000) || 90),
        voice: settings.voice,
        local_context: true,
        simpler: true,
      });
      if (onLessonChange) {
        onLessonChange(simplerLesson);
      }
      setReadyToast('✨ Simplified lesson ready with real-world analogies!');
      setTimeout(() => setReadyToast(null), 4000);
    } catch (err) {
      console.error('Failed to simplify:', err);
      setRevoiceError('Failed to generate simpler lesson.');
    } finally {
      setIsSimplerLoading(false);
      setRevoiceStatus(null);
    }
  };


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
  } = usePlayer(lesson, isCapture, settings.speed); // AutoPlay in headless capture mode

  // Auto-pause when a quiz scene becomes the active scene (skip during automated capture)
  const pausedForQuizRef = React.useRef<number>(-1);
  useEffect(() => {
    if (
      !isCapture &&
      currentScene?.type === 'quiz' &&
      isPlaying &&
      pausedForQuizRef.current !== sceneIndex
    ) {
      pausedForQuizRef.current = sceneIndex;
      pause();
    }
  }, [currentScene?.type, sceneIndex, isPlaying, pause, isCapture]);

  // Pre-load video URL if sample or already exported
  useEffect(() => {
    if ((lesson.id === 'sample' || !lesson.id || lesson.id.startsWith('sample')) && lesson.language === 'en') {
      setExportedVideoUrl(`${API_BASE_URL}/audio/sample/lesson_sample_en.mp4`);
      setExportedSrtUrl(`${API_BASE_URL}/audio/sample/captions_sample_en.srt`);
    } else {
      setExportedVideoUrl(null);
      setExportedSrtUrl(null);
    }
  }, [lesson.id, lesson.language]);

  // MP4 Export & On-Site Video Handler
  const handleExportMP4 = async () => {
    if (exportedVideoUrl) {
      setShowVideoModal(true);
      return;
    }
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportError(null);
      setExportMessage('Combining rendered 720p scenes, voice-over & captions with FFmpeg...');
      const res = await apiExportLesson(lesson.id || 'sample', lesson.language);
      const fullVideoUrl = res.mp4_url.startsWith('http')
        ? res.mp4_url
        : `${API_BASE_URL}${res.mp4_url.startsWith('/') ? '' : '/'}${res.mp4_url}`;
      setExportedVideoUrl(fullVideoUrl);
      if (res.srt_url) {
        const fullSrt = res.srt_url.startsWith('http')
          ? res.srt_url
          : `${API_BASE_URL}${res.srt_url.startsWith('/') ? '' : '/'}${res.srt_url}`;
        setExportedSrtUrl(fullSrt);
      }
      setShowVideoModal(true);
      setExportMessage('Video ready! Displaying directly on website...');
      const downloadPath = res.download_url || res.mp4_url;
      const cleanTitle = (lesson.title || 'lesson').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filename = `${cleanTitle}_${lesson.language}.mp4`;
      triggerFileDownload(downloadPath, filename);
      setTimeout(() => {
        setIsExporting(false);
        setExportMessage(null);
      }, 3500);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError((err as Error).message);
      setIsExporting(false);
    }
  };

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

        // Continue polling until all queued background voices are ready (or failed)
        const voiceValues = Object.values(data.voices);
        const allSettled = voiceValues.length > 0 && voiceValues.every((s) => s === 'ready' || s === 'failed');
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
  const isLessonFinished = !isCapture && totalDuration > 0 && T >= totalDuration - 250 && !isPlaying;

  useEffect(() => {
    if (isLessonFinished && !showVictoryModal) {
      setShowVictoryModal(true);
    }
  }, [isLessonFinished, showVictoryModal]);

  // Headless 1280x720 capture view for Playwright & FFmpeg export
  if (isCapture) {
    return (
      <div
        id="capture-root"
        style={{
          width: 1280,
          height: 720,
          position: 'relative',
          overflow: 'hidden',
          background: '#0B0F19',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Stage>
          {currentScene && (
            <SceneRenderer
              scene={currentScene}
              t={localT}
              duration={sceneDuration}
              quality="high"
            />
          )}
          {currentScene && (
            <Blu
              scene={currentScene}
              t={localT}
              duration={sceneDuration}
              mood={currentScene.mood || 'happy'}
              anchor={getAnchor(currentScene, localT, sceneDuration)}
            />
          )}
        </Stage>
        {currentScene && (
          <CaptionBar
            caption={currentScene.caption || currentScene.narration || ''}
            language={lesson.language}
            isPause={false}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        background: 'var(--bg-gradient, radial-gradient(ellipse at 50% -10%, #e0f2fe 0%, #f0f6fc 45%, #f8fafc 100%))',
        color: 'var(--text-main, #0f172a)',
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
          background: 'var(--navbar-bg, rgba(255, 255, 255, 0.94))',
          borderBottom: '1px solid var(--panel-border, #e2e8f0)',
          backdropFilter: 'blur(10px)',
          zIndex: 20,
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        }}
      >

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {onBackToInput && (
            <button
              id="btn-back-input"
              className="control-btn"
              onClick={onBackToInput}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0284c7',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
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
                  color: 'var(--text-main, #0f172a)',
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
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: '#0284c7',
                  border: '1px solid rgba(2, 132, 199, 0.22)',
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
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
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
                      ? 'rgba(2, 132, 199, 0.12)'
                      : '#f1f5f9'
                    : '#fef2f2',
                  color: currentScene?.audio_url
                    ? isPlaying && !isMuted
                      ? '#0284c7'
                      : '#64748b'
                    : '#ef4444',
                  border: `1px solid ${currentScene?.audio_url ? '#cbd5e1' : '#fecaca'}`,
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
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Scene {currentSceneNumber}/{sceneCount}:</span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>
              {currentScene?.heading || 'Intro'}
            </span>
          </div>

          <div
            style={{
              padding: '3px 8px',
              borderRadius: '9999px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              fontWeight: 700,
              color: '#0284c7',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            {Math.round(localT / 1000)}s / {Math.round(sceneDuration / 1000)}s
          </div>

          {/* Explain Simpler Adaptive Action */}
          <button
            id="btn-explain-simpler"
            onClick={handleExplainSimpler}
            disabled={isSimplerLoading}
            style={{
              background: '#f0fdf4',
              border: '1px solid #a7f3d0',
              color: '#059669',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isSimplerLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
            title="Re-narrate this concept with everyday analogies and intuitive real-world examples"
          >
            <span>💡</span>
            <span>{isSimplerLoading ? 'Simplifying...' : 'Explain Simpler'}</span>
          </button>

          {/* Ask Blu AI Q&A Bot Button */}
          <button
            id="btn-player-ask-blu"
            onClick={() => setShowBot((prev) => !prev)}
            style={{
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              color: '#0284c7',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
            title="Ask Blu AI Tutor any question about this slide or topic (Powered by Phi-3.5)"
          >
            <span>🤖</span>
            <span>Ask Blu</span>
          </button>

          <button
            id="btn-header-settings"
            onClick={() => setShowSettings(true)}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
            title="Learner Preferences & Dyslexia Mode (P)"
          >
            <span>⚙️</span>
            <span>{settings.speed}x</span>
          </button>

        </div>
      </header>

      {/* Subtle Offline / Fallback Notice Chip */}
      {lesson.error && (
        <div
          id="fallback-warning-banner"
          style={{
            width: '100%',
            background: 'rgba(30, 41, 59, 0.9)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <span>💡</span>
          <span>{lesson.error}</span>
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
          {/* End of Lesson Download & Celebration Card */}
          {isLessonFinished && (
            <div
              id="overlay-lesson-finished"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(6, 10, 20, 0.9)',
                backdropFilter: 'blur(12px)',
                zIndex: 60,
                padding: '24px',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(20, 16, 45, 0.99) 100%)',
                  border: '2px solid rgba(168, 85, 247, 0.6)',
                  borderRadius: '24px',
                  padding: '36px 44px',
                  color: '#ffffff',
                  boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 50px rgba(168, 85, 247, 0.35)',
                  maxWidth: '560px',
                  width: '100%',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '18px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.6)',
                  }}
                >
                  🎉
                </div>

                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Lesson Completed!
                  </div>
                  <div style={{ fontSize: '15px', color: '#cbd5e1', marginTop: '6px', fontWeight: 600 }}>
                    {lesson.title} ({langInfo.name})
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                    {exportedVideoUrl
                      ? 'Your 720p HD MP4 video with complete voice-over & captions is ready to play and download.'
                      : 'Generate a 720p HD MP4 video with complete voice-over and captions.'}
                  </div>
                </div>

                {/* Direct On-Site Video Player if available */}
                {exportedVideoUrl ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '2px solid rgba(168, 85, 247, 0.7)',
                        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(168, 85, 247, 0.3)',
                        background: '#000000',
                      }}
                    >
                      <video
                        id="celebration-exported-video"
                        src={exportedVideoUrl}
                        controls
                        autoPlay
                        playsInline
                        style={{
                          width: '100%',
                          maxHeight: '300px',
                          display: 'block',
                          background: '#000000',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button
                        id="btn-save-video-computer"
                        onClick={() => {
                          const cleanTitle = (lesson.title || 'lesson').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                          triggerFileDownload(exportedVideoUrl, `${cleanTitle}_${lesson.language}.mp4`);
                        }}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                          border: '1.5px solid #c084fc',
                          borderRadius: '12px',
                          padding: '12px 18px',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)',
                        }}
                      >
                        <span>💾</span>
                        <span>Download MP4 File</span>
                      </button>
                      {exportedSrtUrl && (
                        <button
                          id="btn-download-srt-finish"
                          onClick={() => {
                            const cleanTitle = (lesson.title || 'lesson').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                            triggerFileDownload(exportedSrtUrl, `${cleanTitle}_${lesson.language}.srt`);
                          }}
                          style={{
                            background: 'rgba(30, 41, 59, 0.85)',
                            border: '1px solid rgba(71, 85, 105, 0.6)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: '#cbd5e1',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          title="Download synchronized subtitles (.srt)"
                        >
                          <span>📝</span>
                          <span>Subtitles (.SRT)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Primary Generate & Download Button */
                  <button
                    id="btn-download-mp4-finish"
                    onClick={handleExportMP4}
                    disabled={isExporting}
                    style={{
                      width: '100%',
                      background: isExporting
                        ? 'rgba(168, 85, 247, 0.3)'
                        : 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                      border: '1.5px solid #c084fc',
                      borderRadius: '14px',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: isExporting ? 'wait' : 'pointer',
                      boxShadow: '0 8px 24px rgba(147, 51, 234, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isExporting ? (
                      <>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderTopColor: '#ffffff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        <span>Generating 720p Video...</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '18px' }}>🎬</span>
                        <span>Generate & Watch 720p Video</span>
                      </>
                    )}
                  </button>
                )}

                {exportMessage && (
                  <div style={{ fontSize: '12px', color: '#d8b4fe', fontStyle: 'italic' }}>
                    {exportMessage}
                  </div>
                )}
                {exportError && (
                  <div style={{ fontSize: '12px', color: '#f87171' }}>
                    ⚠️ {exportError}
                  </div>
                )}

                {/* Secondary Actions */}
                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '4px' }}>
                  <button
                    id="btn-replay-finish"
                    onClick={replay}
                    style={{
                      flex: 1,
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(71, 85, 105, 0.6)',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      color: '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    ↺ Replay Lesson
                  </button>
                  {onBackToInput && (
                    <button
                      id="btn-back-finish"
                      onClick={onBackToInput}
                      style={{
                        flex: 1,
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(71, 85, 105, 0.6)',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        color: '#cbd5e1',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      ← Explore Topics
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Stage>

        {/* Floating Export Status Banner */}
        {isExporting && (
          <div
            id="export-progress-banner"
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 110,
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
              border: '1.5px solid #c084fc',
              borderRadius: '30px',
              padding: '12px 26px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(168, 85, 247, 0.4)',
              backdropFilter: 'blur(10px)',
              color: '#f3e8ff',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(243, 232, 255, 0.3)',
                borderTopColor: '#f3e8ff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>{exportMessage || 'Rendering 720p scenes, voice-over & captions...'}</span>
          </div>
        )}

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
            onExportMP4={handleExportMP4}
            isExporting={isExporting}
          />
        </div>
      </footer>

      {/* Learner Preferences Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* On-Site 720p Video Player Modal */}
      {showVideoModal && exportedVideoUrl && (
        <div
          id="video-player-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(3, 7, 18, 0.92)',
            backdropFilter: 'blur(14px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVideoModal(false);
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(24, 18, 54, 0.99) 100%)',
              border: '2px solid rgba(168, 85, 247, 0.7)',
              borderRadius: '24px',
              padding: '26px 30px',
              maxWidth: '840px',
              width: '100%',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(168, 85, 247, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎬</span>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    {lesson.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#c084fc', fontWeight: 600, marginTop: '2px' }}>
                    Playable 720p HD Video • Full Voice-Over & Captions ({langInfo.name})
                  </div>
                </div>
              </div>
              <button
                id="btn-close-video-modal"
                onClick={() => setShowVideoModal(false)}
                style={{
                  background: 'rgba(51, 65, 85, 0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close Video"
              >
                ✕
              </button>
            </div>

            {/* Embedded HTML5 Video Player */}
            <div
              style={{
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#000000',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.9)',
              }}
            >
              <video
                id="modal-exported-video"
                src={exportedVideoUrl}
                controls
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '440px',
                  display: 'block',
                  background: '#000000',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  id="btn-modal-save-mp4"
                  onClick={() => {
                    const cleanTitle = (lesson.title || 'lesson').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                    triggerFileDownload(exportedVideoUrl, `${cleanTitle}_${lesson.language}.mp4`);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                    border: '1.5px solid #c084fc',
                    borderRadius: '10px',
                    padding: '11px 22px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(147, 51, 234, 0.4)',
                  }}
                >
                  <span>💾</span>
                  <span>Save MP4 to Computer</span>
                </button>
                {exportedSrtUrl && (
                  <button
                    id="btn-modal-download-srt"
                    onClick={() => {
                      const cleanTitle = (lesson.title || 'lesson').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                      triggerFileDownload(exportedSrtUrl, `${cleanTitle}_${lesson.language}.srt`);
                    }}
                    style={{
                      background: 'rgba(30, 41, 59, 0.85)',
                      border: '1px solid rgba(71, 85, 105, 0.6)',
                      borderRadius: '10px',
                      padding: '11px 18px',
                      color: '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Download synchronized subtitles (.srt)"
                  >
                    <span>📝</span>
                    <span>Subtitles (.SRT)</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Interactive Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Lesson Mastery Modal */}
      {showVictoryModal && (
        <VictoryModal
          lesson={lesson}
          onClose={() => setShowVictoryModal(false)}
          onReplay={() => {
            setShowVictoryModal(false);
            replay();
          }}
          onExportMP4={handleExportMP4}
          onRevoice={handleLanguageChange}
          onBackToInput={onBackToInput}
        />
      )}

      {/* Interactive AI Companion Q&A Bot (Powered by Real Phi-3.5) */}
      <AskBluBot
        currentTopic={lesson.title}
        currentSceneHeading={currentScene?.heading}
        currentSceneNarration={currentScene?.narration}
        language={lesson.language}
        isOpen={showBot}
        onToggle={() => setShowBot((prev) => !prev)}
      />
    </div>
  );
};

