import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import type { Lesson, Scene } from '../types/lesson';
import {
  getTimelineState,
  getTotalDuration,
  getSceneStartTime,
} from './timeline';

declare global {
  interface Window {
    renderAt?: (tMs: number) => void;
  }
}

export interface UsePlayerResult {
  T: number;
  isPlaying: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  audioBlocked: boolean;
  unblockAudio: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  replay: () => void;
  seek: (tMs: number) => void;
  sceneIndex: number;
  localT: number;
  sceneDuration: number;
  totalDuration: number;
  currentScene: Scene | undefined;
  isPause: boolean;
  progress: number;
}

export function usePlayer(lesson: Lesson, autoPlay = false, speed = 1): UsePlayerResult {
  const [T, setT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioBlockedRef = useRef(false);

  const totalDuration = getTotalDuration(lesson);
  const timeline = getTimelineState(lesson, T);
  const currentScene = lesson.scenes[timeline.sceneIndex];

  // Ref holders to keep RAF loop synchronous with latest state without teardowns
  const isPlayingRef = useRef(isPlaying);
  const tRef = useRef(T);
  const totalDurationRef = useRef(totalDuration);
  const lessonRef = useRef(lesson);
  const isMutedRef = useRef(isMuted);
  const speedRef = useRef(speed);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    tRef.current = T;
  }, [T]);

  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  useEffect(() => {
    lessonRef.current = lesson;
  }, [lesson]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    audioBlockedRef.current = audioBlocked;
  }, [audioBlocked]);

  useEffect(() => {
    speedRef.current = speed;
    audioMapRef.current.forEach((audio) => {
      audio.playbackRate = speed;
      audio.preservesPitch = true;
    });
  }, [speed]);

  // Preloaded audio elements map per scene index
  const audioMapRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const activeSceneIndexRef = useRef<number>(timeline.sceneIndex);
  const lastRafTimeRef = useRef<number | null>(null);

  // Initialize and preload all scene audio tracks
  useEffect(() => {
    const audioMap = audioMapRef.current;

    // Teardown previous audios
    audioMap.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    audioMap.clear();

    if (typeof window === 'undefined') return;

    lesson.scenes.forEach((scene, idx) => {
      if (scene.audio_url) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = scene.audio_url;
        audio.volume = 1.0;
        audio.muted = isMutedRef.current;
        audio.playbackRate = speedRef.current;
        audio.preservesPitch = true;
        audioMap.set(idx, audio);
      }
    });

    return () => {
      audioMap.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioMap.clear();
    };
  }, [lesson]);

  // Helper to pause all scene audios
  const pauseAllAudio = useCallback(() => {
    audioMapRef.current.forEach((audio) => {
      if (!audio.paused) {
        audio.pause();
      }
    });
  }, []);

  // Helper to play audio for a specific scene at an offset
  const playAudioForScene = useCallback((sceneIdx: number, offsetSec = 0) => {
    // Pause other scenes
    audioMapRef.current.forEach((audio, idx) => {
      if (idx !== sceneIdx && !audio.paused) {
        audio.pause();
      }
    });

    activeSceneIndexRef.current = sceneIdx;
    const audio = audioMapRef.current.get(sceneIdx);
    if (!audio) return;

    audio.muted = isMutedRef.current;
    audio.playbackRate = speedRef.current;
    audio.preservesPitch = true;

    if (Number.isFinite(offsetSec) && offsetSec >= 0) {
      if (audio.readyState >= 1) {
        try {
          if (Math.abs(audio.currentTime - offsetSec) > 0.08) {
            audio.currentTime = offsetSec;
          }
        } catch {
          // ignore seek error
        }
      } else {
        const onLoaded = () => {
          try {
            audio.currentTime = offsetSec;
          } catch {
            // ignore
          }
          audio.removeEventListener('loadedmetadata', onLoaded);
        };
        audio.addEventListener('loadedmetadata', onLoaded);
      }
    }

    if (isPlayingRef.current) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAudioBlocked(false);
          })
          .catch((err) => {
            if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
              console.warn('[Blu Audio] Playback prevented by browser policy or interrupt:', err.name);
              setAudioBlocked(true);
            }
          });
      }
    }
  }, []);

  // Master Clock: requestAnimationFrame loop with audio-locked time
  useEffect(() => {
    if (!isPlaying) {
      lastRafTimeRef.current = null;
      pauseAllAudio();
      return;
    }

    let animationFrameId: number;
    lastRafTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      const lastTime = lastRafTimeRef.current ?? now;
      const delta = Math.max(0, now - lastTime) * speedRef.current;
      lastRafTimeRef.current = now;

      const currentT = tRef.current;
      const currentLesson = lessonRef.current;
      const maxDuration = totalDurationRef.current;

      const state = getTimelineState(currentLesson, currentT);
      const scene = currentLesson.scenes[state.sceneIndex];
      const audio = audioMapRef.current.get(state.sceneIndex);

      let nextT = currentT + delta;

      // When audio is actively playing for current scene, lock nextT to audio.currentTime
      if (
        audio &&
        !audio.paused &&
        !audio.seeking &&
        audio.readyState >= 2
      ) {
        const audioSceneT = audio.currentTime * 1000;
        if (audioSceneT < scene.duration_ms) {
          nextT = state.sceneStartTime + audioSceneT;
        }
      }

      // Check if end of lesson reached
      if (nextT >= maxDuration) {
        setT(maxDuration);
        tRef.current = maxDuration;
        setIsPlaying(false);
        isPlayingRef.current = false;
        pauseAllAudio();
        if (typeof window !== 'undefined') {
          (window as any).__lessonDone = true;
        }
        return;
      }

      // Check if scene transition occurred
      const nextState = getTimelineState(currentLesson, nextT);
      if (nextState.sceneIndex !== state.sceneIndex) {
        // Advance to next scene's audio track
        playAudioForScene(nextState.sceneIndex, nextState.localT / 1000);
      } else if (
        audio &&
        audio.paused &&
        !audio.ended &&
        isPlayingRef.current &&
        !audioBlockedRef.current
      ) {
        // Resume audio if it was temporarily paused or ready
        const maxAudioMs = audio.duration ? audio.duration * 1000 : scene.duration_ms;
        if (nextState.localT < maxAudioMs) {
          audio.play().catch(() => {});
        }
      }

      setT(nextT);
      tRef.current = nextT;
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, pauseAllAudio, playAudioForScene]);


  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    pauseAllAudio();
  }, [pauseAllAudio]);

  const play = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as any).__lessonDone = false;
    }
    if (tRef.current >= totalDurationRef.current) {
      tRef.current = 0;
      setT(0);
    }
    lastRafTimeRef.current = performance.now();
    setIsPlaying(true);
    isPlayingRef.current = true;
    setAudioBlocked(false);

    const state = getTimelineState(lessonRef.current, tRef.current);
    playAudioForScene(state.sceneIndex, state.localT / 1000);
  }, [playAudioForScene]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const seek = useCallback((targetT: number) => {
    const clamped = Math.max(0, Math.min(targetT, totalDurationRef.current));
    tRef.current = clamped;
    setT(clamped);

    const state = getTimelineState(lessonRef.current, clamped);
    playAudioForScene(state.sceneIndex, state.localT / 1000);
  }, [playAudioForScene]);

  const next = useCallback(() => {
    const currentT = tRef.current;
    const state = getTimelineState(lessonRef.current, currentT);
    const scenes = lessonRef.current.scenes;

    if (state.sceneIndex < scenes.length - 1) {
      const nextStartTime = getSceneStartTime(lessonRef.current, state.sceneIndex + 1);
      seek(nextStartTime);
    } else {
      seek(totalDurationRef.current);
      pause();
    }
  }, [seek, pause]);

  const prev = useCallback(() => {
    const currentT = tRef.current;
    const state = getTimelineState(lessonRef.current, currentT);

    // If more than 1 second into the scene, restart current scene; else jump to previous scene
    if (state.localT > 1000 || state.sceneIndex === 0) {
      seek(state.sceneStartTime);
    } else {
      const prevStartTime = getSceneStartTime(lessonRef.current, state.sceneIndex - 1);
      seek(prevStartTime);
    }
  }, [seek]);

  const replay = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      audioMapRef.current.forEach((audio) => {
        audio.muted = nextMuted;
      });
      return nextMuted;
    });
  }, []);

  const unblockAudio = useCallback(() => {
    setAudioBlocked(false);
    play();
  }, [play]);

  // Window.renderAt(tMs): synchronous deterministic rendering for Playwright
  useEffect(() => {
    window.renderAt = (tMs: number) => {
      flushSync(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        pauseAllAudio();

        const clamped = Math.max(0, Math.min(tMs, totalDurationRef.current));
        tRef.current = clamped;
        setT(clamped);

        const state = getTimelineState(lessonRef.current, clamped);
        const audio = audioMapRef.current.get(state.sceneIndex);
        if (audio) {
          try {
            audio.currentTime = state.localT / 1000;
          } catch {
            // Ignore in headless
          }
        }
      });
    };

    return () => {
      delete window.renderAt;
    };
  }, [pauseAllAudio]);

  const progress = totalDuration > 0 ? Math.min(1, Math.max(0, T / totalDuration)) : 0;

  return {
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
    sceneIndex: timeline.sceneIndex,
    localT: timeline.localT,
    sceneDuration: timeline.sceneDuration,
    totalDuration,
    currentScene,
    isPause: timeline.isPause,
    progress,
  };
}
