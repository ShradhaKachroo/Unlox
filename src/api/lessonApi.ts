import type { Lesson, Level } from '../types/lesson';
import { validateLesson } from '../types/validate';
import { fetchLessonWithTiming } from '../utils/loader';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// In-memory cache for fast language switching without refetching
const lessonCache = new Map<string, Lesson>();

export interface GenerateParams {
  topic: string;
  level: Level;
  language: string;
  target_seconds?: number;
  target_length_seconds?: number;
  scene_count?: number;
  voice: 'female' | 'male';
  local_context: boolean;
  generate_all_voices?: boolean;
}

export interface RevoiceParams {
  lesson_id: string;
  lang: string;
  voice: 'female' | 'male';
}

export interface VoicesStatusResponse {
  voices: Record<string, 'ready' | 'generating' | 'pending' | 'available' | 'failed'>;
  timing?: Record<string, any>;
}

/**
 * Generate a new lesson from topic & options.
 */
export async function apiGenerateLesson(params: GenerateParams): Promise<Lesson> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s (3min) timeout for CPU generation

  try {
    const res = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        generate_all_voices: true,
      }),
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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s for local NLLB + TTS

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
      throw new Error(`Invalid lesson structure returned: ${(validated.errors || []).join(', ')}`);
    } else {
      const errText = await res.text().catch(() => '');
      throw new Error(`Revoice failed (${res.status}): ${errText}`);
    }
  } catch (err) {
    // Only fallback to sample lesson if the active lesson was already a sample
    if (params.lesson_id.startsWith('sample')) {
      try {
        const fallbackLesson = await fetchLessonWithTiming(params.lang);
        fallbackLesson.source = 'fallback';
        fallbackLesson.error = `Revoice error: ${(err as Error).message}. Displaying sample lesson for ${params.lang.toUpperCase()}.`;
        lessonCache.set(cacheKey, fallbackLesson);
        return fallbackLesson;
      } catch {
        throw err;
      }
    }
    // For user generated lessons, preserve the lesson and throw the error so the UI can report it
    throw err;
  }
}

/**
 * Fetch a generated lesson by its deterministic ID and language.
 */
export async function apiGetLesson(lesson_id: string, lang = 'en'): Promise<Lesson> {
  const cacheKey = `${lesson_id}_${lang}`;
  if (lessonCache.has(cacheKey)) {
    return lessonCache.get(cacheKey)!;
  }

  const res = await fetch(`${API_BASE_URL}/lesson/${lesson_id}/${lang}`);
  if (!res.ok) {
    throw new Error(`Failed to load lesson ${lesson_id} [${lang}]: server returned ${res.status}`);
  }
  const data = await res.json();
  const validated = validateLesson(data);
  if (validated.ok && validated.lesson) {
    lessonCache.set(cacheKey, validated.lesson);
    return validated.lesson;
  }
  throw new Error(`Invalid lesson structure: ${(validated.errors || []).join(', ')}`);
}

/**
 * Clear the in-memory cache if needed.
 */
export function clearLessonCache(): void {
  lessonCache.clear();
}

/**
 * Fetch available/ready voice statuses for a lesson.
 */
export async function apiGetVoices(lessonId: string): Promise<VoicesStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/lesson/${lessonId}/voices`);
  if (!res.ok) {
    throw new Error(`Failed to fetch voices for ${lessonId}: status ${res.status}`);
  }
  return await res.json();
}

export interface ExportResponse {
  ok: boolean;
  language: string;
  mp4_url: string;
  download_url?: string;
  srt_url?: string;
  wav_url?: string;
  total_seconds: number;
  stage_seconds?: Record<string, number>;
}

/**
 * Trigger backend MP4 export (combines rendered scenes, voice-over, captions into 720p MP4)
 */
export async function apiExportLesson(lessonId: string, language = 'en'): Promise<ExportResponse> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';
  const controller = new AbortController();
  // Video recording runs for duration of lesson; set generous timeout (5 minutes)
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: lessonId,
        language: language,
        player_url: currentOrigin,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Export failed (${res.status}): ${errText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Programmatically trigger browser file download for a URL
 */
export function triggerFileDownload(url: string, filename?: string): void {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const a = document.createElement('a');
  a.href = fullUrl;
  if (filename) {
    a.download = filename;
  }
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

