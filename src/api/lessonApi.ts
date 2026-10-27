import type { Lesson, Level } from '../types/lesson';
import { validateLesson } from '../types/validate';
import { fetchLessonWithTiming } from '../utils/loader';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// In-memory cache for fast language switching without refetching
const lessonCache = new Map<string, Lesson>();

export interface GenerateParams {
  topic: string;
  level: Level;
  language: string;
  target_length_seconds: number;
  voice: 'female' | 'male';
  local_context: boolean;
}

export interface RevoiceParams {
  lesson_id: string;
  lang: string;
  voice: 'female' | 'male';
}

/**
 * Generate a new lesson from topic & options.
 */
export async function apiGenerateLesson(params: GenerateParams): Promise<Lesson> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const validated = validateLesson(data);
      if (validated.ok && validated.lesson) {
        const cacheKey = `${validated.lesson.id}_${params.language}_${params.voice}`;
        lessonCache.set(cacheKey, validated.lesson);
        return validated.lesson;
      }
    }
    throw new Error(`Server returned status ${res.status}`);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Revoice an existing lesson in another language/voice.
 * If backend fails or is offline, falls back to local sample files.
 */
export async function apiRevoiceLesson(params: RevoiceParams): Promise<Lesson> {
  const cacheKey = `${params.lesson_id}_${params.lang}_${params.voice}`;
  if (lessonCache.has(cacheKey)) {
    return lessonCache.get(cacheKey)!;
  }

  // 1. Attempt backend POST /revoice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE_URL}/revoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: params.lesson_id,
        lang: params.lang,
        voice: params.voice,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const validated = validateLesson(data);
      if (validated.ok && validated.lesson) {
        lessonCache.set(cacheKey, validated.lesson);
        return validated.lesson;
      }
    }
  } catch {
    // Backend offline / timed out: proceed to local sample fallback
  }

  // 2. Offline verified sample fallback: /sample/lesson_{lang}.json + timing_{lang}.json
  try {
    const fallbackLesson = await fetchLessonWithTiming(params.lang);
    lessonCache.set(cacheKey, fallbackLesson);
    return fallbackLesson;
  } catch (err) {
    throw new Error(`No translation available for ${params.lang.toUpperCase()}: ${(err as Error).message}`);
  }
}

/**
 * Clear the in-memory cache if needed.
 */
export function clearLessonCache(): void {
  lessonCache.clear();
}
