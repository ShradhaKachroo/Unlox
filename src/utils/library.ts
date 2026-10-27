import type { Lesson } from '../types/lesson';

export interface LibraryEntry {
  id: string;
  topic: string;
  title: string;
  language: string;
  level: string;
  duration_seconds: number;
  scene_count: number;
  saved_at: string;
  lesson: Lesson;
}

const KEY = 'unlox_library_v1';

export function getLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToLibrary(lesson: Lesson, durationSeconds: number): LibraryEntry {
  const library = getLibrary();
  const entry: LibraryEntry = {
    id: lesson.id ?? `lesson-${Date.now()}`,
    topic: lesson.title,
    title: lesson.title,
    language: lesson.language ?? 'en',
    level: lesson.level ?? 'beginner',
    duration_seconds: Math.round(durationSeconds),
    scene_count: lesson.scenes?.length ?? 0,
    saved_at: new Date().toISOString(),
    lesson,
  };
  const filtered = library.filter((e) => e.id !== entry.id);
  filtered.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 50)));
  return entry;
}

export function deleteFromLibrary(id: string) {
  const library = getLibrary().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(library));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
