import type { Lesson } from '../types/lesson';
import { validateLesson } from '../types/validate';

/**
 * Loads lesson JSON and matches it with timing JSON (per scene: start, duration, audio, caption).
 * Scene i in the lesson matches scene i in the timing.
 */
export async function fetchLessonWithTiming(lang = 'en'): Promise<Lesson> {
  // 1. Fetch lesson JSON
  let lessonRes = await fetch(`/sample/lesson_${lang}.json`);
  if (!lessonRes.ok && lang !== 'en') {
    lessonRes = await fetch('/sample/lesson_en.json');
  }
  if (!lessonRes.ok) {
    throw new Error(`Failed to fetch lesson JSON for [${lang}]`);
  }
  const lessonData = await lessonRes.json();

  // 2. Fetch timing JSON for this language ONLY (don't fall back across languages
  //    as that would apply English audio URLs to non-English narrations)
  let timingData: unknown = null;
  try {
    const timingRes = await fetch(`/sample/timing_${lang}.json`);
    if (timingRes.ok) {
      timingData = await timingRes.json();
    }
  } catch {
    // Timing file is optional; graceful fallback with no audio
  }

  // 3. Merge timing into lesson scenes: scene i matches scene i
  const timingObj = timingData as { scenes?: Array<{ scene?: number; duration?: number; audio?: string; caption?: string; start?: number }> } | null;
  if (timingObj && Array.isArray(timingObj.scenes) && Array.isArray(lessonData.scenes)) {
    lessonData.scenes = lessonData.scenes.map((scene: Record<string, unknown>, idx: number) => {
      const tInfo = timingObj.scenes?.[idx] || timingObj.scenes?.find((s) => s.scene === idx);
      if (tInfo) {
        return {
          ...scene,
          duration_ms: typeof tInfo.duration === 'number' ? Math.round(tInfo.duration * 1000) : scene.duration_ms,
          // Only apply audio_url if the timing has an actual audio file
          ...(tInfo.audio ? { audio_url: `/sample/${tInfo.audio}` } : {}),
          caption: tInfo.caption || scene.caption || scene.narration,
        };
      }
      return scene;
    });
  }

  // 4. Validate and sanitize
  const validated = validateLesson(lessonData);
  if (!validated.ok || !validated.lesson) {
    throw new Error(`Invalid lesson structure: ${(validated.errors || []).join(', ')}`);
  }
  return validated.lesson;
}
