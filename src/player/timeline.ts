import type { Lesson } from '../types/lesson';

export const PAUSE_BETWEEN_SCENES_MS = 0;

export interface TimelineState {
  sceneIndex: number;
  localT: number; // ms within current scene (clamped to sceneDuration during pause)
  sceneDuration: number;
  totalDuration: number;
  isPause: boolean;
  sceneStartTime: number;
}

/**
 * Calculates the start time of a specific scene index in global ms.
 */
export function getSceneStartTime(lesson: Lesson, targetIndex: number): number {
  if (!lesson.scenes || lesson.scenes.length === 0) return 0;
  const clampedTarget = Math.max(0, Math.min(targetIndex, lesson.scenes.length - 1));

  let t = 0;
  for (let i = 0; i < clampedTarget; i++) {
    t += (lesson.scenes[i]?.duration_ms ?? 0) + PAUSE_BETWEEN_SCENES_MS;
  }
  return t;
}

/**
 * Calculates total lesson duration including pauses between scenes.
 */
export function getTotalDuration(lesson: Lesson): number {
  if (!lesson.scenes || lesson.scenes.length === 0) return 0;
  let total = 0;
  const n = lesson.scenes.length;
  for (let i = 0; i < n; i++) {
    total += lesson.scenes[i]?.duration_ms ?? 0;
    if (i < n - 1) {
      total += PAUSE_BETWEEN_SCENES_MS;
    }
  }
  return total;
}

/**
 * Pure helper: Given lesson + global time T (ms),
 * returns { sceneIndex, localT, sceneDuration, totalDuration }.
 * Includes 400ms pause between scenes where localT stays at sceneDuration.
 */
export function getTimelineState(lesson: Lesson, T: number): TimelineState {
  const totalDuration = getTotalDuration(lesson);
  const scenes = lesson.scenes || [];

  if (scenes.length === 0) {
    return {
      sceneIndex: 0,
      localT: 0,
      sceneDuration: 0,
      totalDuration: 0,
      isPause: false,
      sceneStartTime: 0,
    };
  }

  const clampedT = Math.max(0, Math.min(T, totalDuration));

  let accumulated = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const duration = scene.duration_ms;
    const sceneStart = accumulated;
    const sceneEnd = sceneStart + duration;
    const hasNext = i < scenes.length - 1;
    const pauseEnd = sceneEnd + (hasNext ? PAUSE_BETWEEN_SCENES_MS : 0);

    // If within active duration or in the pause before next scene, or if this is the final scene
    if (clampedT < pauseEnd || !hasNext) {
      const isPause = clampedT >= sceneEnd;
      const localT = isPause ? duration : Math.max(0, clampedT - sceneStart);

      return {
        sceneIndex: i,
        localT,
        sceneDuration: duration,
        totalDuration,
        isPause,
        sceneStartTime: sceneStart,
      };
    }

    accumulated = pauseEnd;
  }

  // Fallback to last scene end
  const lastIndex = scenes.length - 1;
  const lastDuration = scenes[lastIndex].duration_ms;
  return {
    sceneIndex: lastIndex,
    localT: lastDuration,
    sceneDuration: lastDuration,
    totalDuration,
    isPause: false,
    sceneStartTime: getSceneStartTime(lesson, lastIndex),
  };
}
