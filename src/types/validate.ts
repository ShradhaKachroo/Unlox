import type { Lesson, Scene, ValidationResult, DiagramArrow } from './lesson';

/**
 * Hand-written runtime validator and sanitizer.
 * Guarantees that valid lesson structures are produced even when a weak LLM
 * omits optional fields (e.g. missing id, missing duration_ms, nulls).
 */
export function validateLesson(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Lesson data must be a non-null JSON object'] };
  }

  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === 'string' && obj.id.trim()
    ? obj.id.trim()
    : `lesson-${Math.random().toString(36).substring(2, 9)}`;

  const title = typeof obj.title === 'string' && obj.title.trim()
    ? obj.title.trim()
    : 'Visual Lesson';

  const level = obj.level === 'intermediate' ? 'intermediate' : 'beginner';
  const language = typeof obj.language === 'string' && obj.language.trim()
    ? obj.language.trim().toLowerCase()
    : 'en';

  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    return { ok: false, errors: ['Lesson must contain a non-empty array of scenes'] };
  }

  const validatedScenes: Scene[] = [];

  obj.scenes.forEach((sceneItem, idx) => {
    if (!sceneItem || typeof sceneItem !== 'object' || Array.isArray(sceneItem)) {
      // Create safe placeholder title_card instead of crashing
      validatedScenes.push({
        id: `scene-${idx}`,
        type: 'title_card',
        heading: `Scene ${idx + 1}`,
        narration: '',
        caption: '',
        duration_ms: 6000,
      });
      return;
    }

    const s = sceneItem as Record<string, unknown>;

    const sceneId = typeof s.id === 'string' && s.id.trim()
      ? s.id.trim()
      : `scene-${idx + 1}`;

    const heading = typeof s.heading === 'string' ? s.heading : `Step ${idx + 1}`;
    const narration = typeof s.narration === 'string' ? s.narration : '';
    const caption = typeof s.caption === 'string' && s.caption.trim().length > 0
      ? s.caption.trim()
      : narration;

    const duration_ms = typeof s.duration_ms === 'number' && !isNaN(s.duration_ms) && s.duration_ms > 0
      ? s.duration_ms
      : 6500;

    const audio_url = typeof s.audio_url === 'string' && s.audio_url.trim() ? s.audio_url.trim() : undefined;

    let mood: 'happy' | 'thinking' | 'excited' | 'curious' | undefined = undefined;
    if (s.mood === 'happy' || s.mood === 'thinking' || s.mood === 'excited' || s.mood === 'curious') {
      mood = s.mood;
    }

    let mouth: number[] | undefined = undefined;
    if (Array.isArray(s.mouth)) {
      mouth = s.mouth
        .slice(0, 5000)
        .map((v) => {
          const num = typeof v === 'number' ? v : Number(v);
          return isNaN(num) ? 0 : Math.max(0, Math.min(1, num));
        });
    }

    const base = {
      id: sceneId,
      heading,
      narration,
      caption,
      duration_ms,
      audio_url,
      mood,
      mouth,
    };

    const type = typeof s.type === 'string' ? s.type : 'title_card';

    if (type === 'title_card') {
      validatedScenes.push({
        ...base,
        type: 'title_card',
        subtitle: typeof s.subtitle === 'string' ? s.subtitle : undefined,
      });
    } else if (type === 'code_walkthrough') {
      const code = typeof s.code === 'string' ? s.code : '';
      let highlight_lines: number[] = [1];
      if (Array.isArray(s.highlight_lines)) {
        highlight_lines = s.highlight_lines
          .map((n) => Number(n))
          .filter((n) => !isNaN(n) && n > 0);
        if (highlight_lines.length === 0) highlight_lines = [1];
      }

      let trace: Array<{ line: number; vars: Record<string, string | number> }> | undefined = undefined;
      if (Array.isArray(s.trace)) {
        trace = s.trace.map((tr) => {
          const trObj = tr as Record<string, unknown> | null;
          return {
            line: Number(trObj?.line || 1),
            vars: (trObj?.vars && typeof trObj.vars === 'object' ? trObj.vars : {}) as Record<string, string | number>,
          };
        });
      }

      validatedScenes.push({
        ...base,
        type: 'code_walkthrough',
        code,
        highlight_lines,
        language_label: typeof s.language_label === 'string' ? s.language_label : 'Python',
        trace,
      });
    } else if (type === 'diagram') {
      let items: string[] = [];
      if (Array.isArray(s.items)) {
        items = s.items.map((it) => (it != null ? String(it) : '')).filter(Boolean);
      }
      if (items.length === 0) {
        items = ['Step 1', 'Step 2', 'Step 3'];
      }

      let arrows: DiagramArrow[] | undefined = undefined;
      if (Array.isArray(s.arrows)) {
        arrows = [];
        for (let aIdx = 0; aIdx < s.arrows.length; aIdx++) {
          const a = s.arrows[aIdx];
          if (Array.isArray(a) && a.length >= 2) {
            arrows.push({ from: Number(a[0]), to: Number(a[1]) });
          } else if (a && typeof a === 'object') {
            const from = Number((a as { from?: unknown }).from);
            const to = Number((a as { to?: unknown }).to);
            if (!isNaN(from) && !isNaN(to)) {
              arrows.push({
                from,
                to,
                label: typeof (a as { label?: unknown }).label === 'string' ? String((a as { label: string }).label) : undefined,
              });
            }
          }
        }
      }

      validatedScenes.push({
        ...base,
        type: 'diagram',
        items,
        arrows,
      });
    } else if (type === 'quiz') {
      const question = typeof s.question === 'string' && s.question.trim() ? s.question.trim() : heading;
      let options: string[] = [];
      if (Array.isArray(s.options)) {
        options = s.options.map((opt) => (opt != null ? String(opt).trim() : '')).filter(Boolean);
      }
      if (options.length < 2) {
        options = ['Option A: Correct answer', 'Option B: Alternate choice', 'Option C: Another choice'];
      }
      const answer_idx = typeof s.answer_idx === 'number' && s.answer_idx >= 0 && s.answer_idx < options.length
        ? s.answer_idx
        : 0;
      const explanation = typeof s.explanation === 'string' ? s.explanation.trim() : undefined;

      validatedScenes.push({
        ...base,
        type: 'quiz',
        question,
        options,
        answer_idx,
        explanation,
      });
    } else {
      // Fallback for unknown scene types
      validatedScenes.push({
        ...base,
        type: 'title_card',
        subtitle: `[${type}] ${narration}`,
      });
    }
  });

  const validatedLesson: Lesson = {
    id,
    title,
    level,
    language,
    scenes: validatedScenes,
  };

  return { ok: true, lesson: validatedLesson };
}
