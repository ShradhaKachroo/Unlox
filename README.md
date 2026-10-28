# Blu Visual Teacher (Unlox)

Offline educational video generator and interactive lesson studio. Transforms coding and conceptual topics into smooth animated, narrated visual walkthroughs with an interactive mascot, execution memory diagrams, tactile sound effects, and multilingual support.

> 📖 **Full Architectural & Engineering Documentation**: See [docs/PROJECT_DOCUMENTATION.md](file:///c:/Users/Asus/Unlox/docs/PROJECT_DOCUMENTATION.md) for complete component breakdowns, API references, schemas, and setup instructions.


## Offline Fonts & Typography

All fonts are bundled locally via npm packages with zero CDN or external network requests:
- **Latin & General**: `@fontsource/noto-sans` (SIL Open Font License / Apache)
- **Code & Numbers**: `@fontsource/jetbrains-mono` (Apache 2.0)
- **Dyslexia-Friendly Mode**: `@fontsource/opendyslexic` (SIL Open Font License, Version 1.1 / OFL-1.1)
- **Regional Indian Scripts**:
  - Hindi & Marathi: `@fontsource/noto-sans-devanagari`
  - Kannada: `@fontsource/noto-sans-kannada`
  - Tamil: `@fontsource/noto-sans-tamil`
  - Telugu: `@fontsource/noto-sans-telugu`
  - Bengali: `@fontsource/noto-sans-bengali`

---

## Lesson JSON Contract (Backend Teammate API Specification)

### 1. Scene Types & Properties

Every scene is a data object rendered deterministically as a pure function of time $t$:

```typescript
type SceneMood = 'happy' | 'thinking' | 'excited' | 'curious';

interface BaseScene {
  id: string;               // Unique scene identifier
  heading: string;          // On-screen header
  narration: string;        // Text spoken by the narrator
  caption?: string;         // Translated caption (defaults to narration)
  duration_ms: number;      // Exact scene duration in milliseconds
  audio_url?: string;       // Path to audio file (e.g. /sample/scene_0_en.wav)
  mood?: SceneMood;         // Mascot expression: happy | thinking | excited | curious
  mouth?: number[];         // Normalized mouth openness values (0..1), 1 value per 40ms step
}

interface TitleCardScene extends BaseScene {
  type: 'title_card';
  subtitle?: string;
}

interface CodeWalkthroughScene extends BaseScene {
  type: 'code_walkthrough';
  code: string;
  highlight_lines: number[]; // 1-based line numbers for progression steps
  language_label?: string;   // e.g. "Python"
  trace?: Array<{ line: number; vars: Record<string, string | number> }>;
}

interface DiagramScene extends BaseScene {
  type: 'diagram';
  items: string[];
  arrows?: Array<{ from: number; to: number; label?: string }>;
}
```

### 2. Backend API Endpoints

#### POST `/generate`
Creates a new lesson from a topic and parameters.
- **Request Body**:
  ```json
  {
    "topic": "Python For Loops",
    "level": "beginner",
    "language": "en",
    "target_length_seconds": 45,
    "voice": "female",
    "local_context": true
  }
  ```
- **Response**: Full Lesson JSON with matched scene durations and audio URLs.

#### POST `/revoice`
Re-narrates an existing lesson in another language or voice without re-planning the scenes.
- **Request Body**:
  ```json
  {
    "lesson_id": "python-for-loops-001",
    "lang": "kn",
    "voice": "female"
  }
  ```
- **Response**: Same lesson structure with translated captions, updated audio URLs, duration adjustments, and mouth openness arrays.

---

## Getting Started

Install dependencies:
```bash
npm install
```

Start the offline development server:
```bash
npm run dev
```

Build production bundle:
```bash
npm run build
```

Run linter:
```bash
npm run lint
```
