import type { Lesson, Scene, ValidationResult, DiagramArrow } from './lesson';

export function validateLesson(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Lesson data must be a non-null object'] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    errors.push('Lesson "id" is required and must be a non-empty string');
  }

  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    errors.push('Lesson "title" is required and must be a non-empty string');
  }

  if (obj.level !== 'beginner' && obj.level !== 'intermediate') {
    errors.push('Lesson "level" must be either "beginner" or "intermediate"');
  }

  if (typeof obj.language !== 'string' || !obj.language.trim()) {
    errors.push('Lesson "language" is required and must be a string code (e.g. "en", "hi")');
  }

  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    errors.push('Lesson "scenes" must be a non-empty array of scenes');
  }

  const validatedScenes: Scene[] = [];

  if (Array.isArray(obj.scenes)) {
    obj.scenes.forEach((sceneItem, idx) => {
      const prefix = `Scene [${idx}]`;
      if (!sceneItem || typeof sceneItem !== 'object' || Array.isArray(sceneItem)) {
        errors.push(`${prefix} must be an object`);
        return;
      }

      const s = sceneItem as Record<string, unknown>;

      if (typeof s.id !== 'string' || !s.id.trim()) {
        errors.push(`${prefix}: "id" is required`);
      }

      if (typeof s.heading !== 'string') {
        errors.push(`${prefix}: "heading" is required`);
      }

      if (typeof s.narration !== 'string') {
        errors.push(`${prefix}: "narration" is required`);
      }

      if (typeof s.duration_ms !== 'number' || isNaN(s.duration_ms) || s.duration_ms <= 0) {
        errors.push(`${prefix}: "duration_ms" must be a positive number`);
      }

      if (s.audio_url !== undefined && typeof s.audio_url !== 'string') {
        errors.push(`${prefix}: "audio_url" if present must be a string`);
      }

      const caption = typeof s.caption === 'string' && s.caption.trim().length > 0
        ? s.caption
        : (typeof s.narration === 'string' ? s.narration : '');

      const base = {
        id: String(s.id || `scene-${idx}`),
        heading: String(s.heading || ''),
        narration: String(s.narration || ''),
        caption,
        duration_ms: Number(s.duration_ms || 6000),
        audio_url: typeof s.audio_url === 'string' ? s.audio_url : undefined,
      };

      if (s.type === 'title_card') {
        if (s.subtitle !== undefined && typeof s.subtitle !== 'string') {
          errors.push(`${prefix}: "subtitle" must be a string`);
        }
        validatedScenes.push({
          ...base,
          type: 'title_card',
          subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
        });
      } else if (s.type === 'diagram') {
        if (!Array.isArray(s.items) || s.items.length === 0 || !s.items.every(it => typeof it === 'string')) {
          errors.push(`${prefix}: "items" must be a non-empty array of strings`);
        }
        let arrows: DiagramArrow[] | undefined = undefined;
        if (s.arrows !== undefined) {
          if (!Array.isArray(s.arrows)) {
            errors.push(`${prefix}: "arrows" if provided must be an array`);
          } else {
            arrows = [];
            for (let aIdx = 0; aIdx < s.arrows.length; aIdx++) {
              const a = s.arrows[aIdx];
              if (Array.isArray(a) && a.length >= 2 && typeof a[0] === 'number' && typeof a[1] === 'number') {
                arrows.push({ from: a[0], to: a[1] });
              } else if (a && typeof a === 'object' && typeof (a as { from?: unknown }).from === 'number' && typeof (a as { to?: unknown }).to === 'number') {
                arrows.push({
                  from: (a as { from: number }).from,
                  to: (a as { to: number }).to,
                  label: typeof (a as { label?: unknown }).label === 'string' ? (a as { label: string }).label : undefined,
                });
              } else {
                errors.push(`${prefix}: arrow at index ${aIdx} is invalid`);
              }
            }
          }
        }
        validatedScenes.push({
          ...base,
          type: 'diagram',
          items: Array.isArray(s.items) ? s.items.map(String) : [],
          arrows,
        });
      } else if (s.type === 'code_walkthrough') {
        if (typeof s.code !== 'string') {
          errors.push(`${prefix}: "code" must be a string`);
        }
        if (!Array.isArray(s.highlight_lines) || !s.highlight_lines.every(l => typeof l === 'number')) {
          errors.push(`${prefix}: "highlight_lines" must be an array of line numbers`);
        }
        if (s.language_label !== undefined && typeof s.language_label !== 'string') {
          errors.push(`${prefix}: "language_label" must be a string`);
        }
        validatedScenes.push({
          ...base,
          type: 'code_walkthrough',
          code: String(s.code || ''),
          highlight_lines: Array.isArray(s.highlight_lines) ? s.highlight_lines.map(Number) : [],
          language_label: typeof s.language_label === 'string' ? s.language_label : 'Python',
        });
      } else {
        errors.push(`${prefix}: Unknown scene type "${String(s.type)}"`);
      }
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const validatedLesson: Lesson = {
    id: String(obj.id),
    title: String(obj.title),
    level: obj.level as 'beginner' | 'intermediate',
    language: String(obj.language),
    scenes: validatedScenes,
  };

  return { ok: true, lesson: validatedLesson };
}
