export type Level = 'beginner' | 'intermediate';

export type SceneMood = 'happy' | 'thinking' | 'excited' | 'curious';

export interface BaseScene {
  id: string;
  heading: string;
  narration: string;
  caption?: string; // translated on-screen text in the lesson's language; falls back to narration
  duration_ms: number; // set by the backend from audio length; frontend never hard-codes it
  audio_url?: string;
  mood?: SceneMood;
  mouth?: number[]; // 0..1 openness values, 40ms per step
}

export interface TitleCardScene extends BaseScene {
  type: 'title_card';
  subtitle?: string;
}

export interface DiagramArrow {
  from: number;
  to: number;
  label?: string;
}

export interface DiagramScene extends BaseScene {
  type: 'diagram';
  items: string[];
  arrows?: DiagramArrow[];
}

export interface CodeWalkthroughScene extends BaseScene {
  type: 'code_walkthrough';
  code: string;
  highlight_lines: number[]; // 1-based line number for each progression step
  language_label?: string;
  trace?: Array<{ line: number; vars: Record<string, string | number> }>;
}

export type Scene = TitleCardScene | DiagramScene | CodeWalkthroughScene;

export interface Lesson {
  id: string;
  title: string;
  level: Level;
  language: string;
  scenes: Scene[];
}

export interface LessonTimingScene {
  scene: number;
  audio?: string;
  audio_seconds?: number;
  start: number;
  duration: number;
  caption?: string;
  cues?: unknown;
}

export interface LessonTiming {
  language: string;
  total_seconds: number;
  scenes: LessonTimingScene[];
  cues?: unknown;
}

export interface ValidationResult {
  ok: boolean;
  lesson?: Lesson;
  errors?: string[];
}
