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

export function usePlayer(lesson: Lesson, autoPlay = false): UsePlayerResult {
  const [T, setT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const totalDuration = getTotalDuration(lesson);
  const timeline = getTimelineState(lesson, T);
  const currentScene = lesson.scenes[timeline.sceneIndex];

  // Ref holders to keep RAF loop synchronous with latest state without teardowns
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const tRef = useRef(T);
  tRef.current = T;

  const totalDurationRef = useRef(totalDuration);
  totalDurationRef.current = totalDuration;

  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const lastRafTimeRef = useRef<number | null>(null);

  // Initialize persistent audio element
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update audio source when scene changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const audioUrl = currentScene?.audio_url;
    if (audioUrl && audioUrl !== currentAudioUrlRef.current) {
      currentAudioUrlRef.current = audioUrl;
      audio.src = audioUrl;
      audio.currentTime = timeline.localT / 1000;
      if (isPlayingRef.current) {
        audio.play().catch(() => {
          // Graceful fallback for offline or blocked autoplay
        });
      }
    } else if (!audioUrl && currentAudioUrlRef.current) {
      currentAudioUrlRef.current = null;
      audio.pause();
      audio.src = '';
    }
  }, [currentScene?.id, currentScene?.audio_url, timeline.localT]);

  // Master Clock: requestAnimationFrame loop with performance.now deltas
  useEffect(() => {
    if (!isPlaying) {
      lastRafTimeRef.current = null;
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }

    let animationFrameId: number;
    lastRafTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      const lastTime = lastRafTimeRef.current ?? now;
      const delta = Math.max(0, now - lastTime);
      lastRafTimeRef.current = now;

      const currentT = tRef.current;
      const currentLesson = lessonRef.current;
      const maxDuration = totalDurationRef.current;

      const state = getTimelineState(currentLesson, currentT);
      const scene = currentLesson.scenes[state.sceneIndex];
      const audio = audioRef.current;

      let nextT = currentT + delta;

      // Sync with audio if audio is actively playing for current scene
      if (
        scene?.audio_url &&
        audio &&
        !audio.paused &&
        audio.readyState >= 2 &&
        !state.isPause
      ) {
        const audioSceneT = audio.currentTime * 1000;
        if (audioSceneT < scene.duration_ms) {
          nextT = state.sceneStartTime + audioSceneT;
        }
      }

      if (nextT >= maxDuration) {
        setT(maxDuration);
        tRef.current = maxDuration;
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (audio) {
          audio.pause();
        }
        return;
      }

      setT(nextT);
      tRef.current = nextT;
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const play = useCallback(() => {
    if (tRef.current >= totalDurationRef.current) {
      tRef.current = 0;
      setT(0);
    }
    lastRafTimeRef.current = performance.now();
    setIsPlaying(true);
    isPlayingRef.current = true;

    const audio = audioRef.current;
    const state = getTimelineState(lessonRef.current, tRef.current);
    const scene = lessonRef.current.scenes[state.sceneIndex];
    if (audio && scene?.audio_url && !state.isPause) {
      audio.currentTime = state.localT / 1000;
      audio.play().catch(() => {});
    }
  }, []);

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

    const audio = audioRef.current;
    const state = getTimelineState(lessonRef.current, clamped);
    const scene = lessonRef.current.scenes[state.sceneIndex];
    if (audio && scene?.audio_url) {
      audio.currentTime = state.localT / 1000;
    }
  }, []);

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

  // Window.renderAt(tMs): synchronous deterministic rendering for Playwright
  useEffect(() => {
    window.renderAt = (tMs: number) => {
      flushSync(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        const clamped = Math.max(0, Math.min(tMs, totalDurationRef.current));
        tRef.current = clamped;
        setT(clamped);

        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          const state = getTimelineState(lessonRef.current, clamped);
          audio.currentTime = state.localT / 1000;
        }
      });
    };

    return () => {
      delete window.renderAt;
    };
  }, []);

  const progress = totalDuration > 0 ? Math.min(1, Math.max(0, T / totalDuration)) : 0;

  return {
    T,
    isPlaying,
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
