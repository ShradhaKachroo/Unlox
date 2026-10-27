import time
from typing import Optional

from ollama import chat
from pydantic import ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 3

# ── Prompt version (keep in sync with api.py PROMPT_VERSION) ─────────────────
PROMPT_VERSION = 4

# ── Words-per-second (calibrated for 0.85x speech rate) ───────────────────────
WORDS_PER_SEC = {"en": 1.75, "hi": 1.75, "kn": 1.75}
PAUSE_PER_SCENE = 0.6  # seconds gap after each scene's audio

# ── Level rules ───────────────────────────────────────────────────────────────
LEVEL_RULES = {
    "beginner": (
        "TARGET LEVEL: BEGINNER\n"
        "Scene order (flexible, use as many as needed): "
        "title_card → analogy diagram → simplest code (≤3 lines) → step-by-step trace diagram "
        "→ common mistake code → another diagram showing why → summary code → review diagram → quiz.\n"
        "- Start with an everyday analogy to build intuition before any code.\n"
        "- Define every term the first time you use it; assume zero prior knowledge.\n"
        "- Code snippets: at most 3 lines of simple Python each.\n"
        "- One single idea per scene, no compound explanations.\n"
        "- Use friendly, encouraging tone.\n"
    ),
    "intermediate": (
        "TARGET LEVEL: INTERMEDIATE\n"
        "Scene order (flexible, use as many as needed): "
        "title_card → realistic code (≤6 lines) → how-it-works diagram → deep dive code → "
        "edge-case diagram → mistake-and-fix code → performance tip diagram → advanced pattern code → quiz.\n"
        "- Assume the learner already knows variables, loops, and functions.\n"
        "- Skip elementary definitions; move straight to the interesting behaviour.\n"
        "- Code: up to 6 lines per scene showing realistic patterns.\n"
        "- Cover edge cases or Pythonic best practices explicitly.\n"
        "- Tone: collegial, peer-to-peer.\n"
    ),
    "advanced": (
        "TARGET LEVEL: ADVANCED\n"
        "Scene order (flexible, use as many as needed): "
        "title_card → production pattern code (≤8 lines) → internal architecture / memory diagram → "
        "algorithmic trade-offs & time complexity → high-throughput edge case code → optimization breakdown diagram → quiz.\n"
        "- Assume deep knowledge of standard library, OOP, and data structures.\n"
        "- Focus on runtime performance, memory layout, CPython internals, async/concurrency, and Big-O limits.\n"
        "- Code: production-grade patterns (type hints, context managers, generators, concurrency).\n"
        "- Tone: expert, technical, high-rigor engineering insight.\n"
    ),
}

# ── Simpler rules (override when simpler=True) ────────────────────────────────
SIMPLER_RULES = (
    "EXTRA SIMPLIFICATION MODE:\n"
    "- Use beginner vocabulary even if the level is intermediate.\n"
    "- Every sentence must <30 words.\n"
    "- One idea per scene, no exceptions.\n"
    "- Open with a real-life analogy (not code) in the very first teaching scene.\n"
    "- Include one step-by-step diagram scene.\n"
    "- Use different wording and phrasing compared to a previous attempt.\n"
)


def _count_words(text: str) -> int:
    return len(text.split())


def _count_lesson_words(lesson: Lesson) -> int:
    return sum(_count_words(s.narration) for s in lesson.scenes)


def compute_scene_count(target_seconds: int) -> int:
    """Teaching scenes + 1 quiz.
    Scaled for target duration:
    - 30-45s: 3 scenes (~15s each)
    - 46-75s: 4 scenes (~18s each)
    - 76-105s: 5 scenes (~20s each)
    - 106-135s (2 min): 6 scenes (~20s each)
    - >135s: 7 scenes
    """
    if target_seconds <= 45:
        return 3   # 2 teaching + quiz
    elif target_seconds <= 75:
        return 4   # 3 teaching + quiz
    elif target_seconds <= 105:
        return 5   # 4 teaching + quiz
    elif target_seconds <= 135:
        return 6   # 5 teaching + quiz
    else:
        return 7   # 6 teaching + quiz



def compute_word_budget(target_seconds: int, picked_language: str = "en",
                        budget_factor: float = 1.0,
                        scene_count: Optional[int] = None) -> int:
    """English word budget sized for picked_language's TTS speed.
    budget = (target_seconds - PAUSE_PER_SCENE × scene_count) × wps × factor
    """
    if scene_count is None:
        scene_count = compute_scene_count(target_seconds)
    else:
        scene_count = max(3, min(10, scene_count))
    wps = WORDS_PER_SEC.get(picked_language, WORDS_PER_SEC["en"])
    available_seconds = target_seconds - PAUSE_PER_SCENE * scene_count
    return int(round(max(0, available_seconds) * wps * budget_factor))


def get_system_prompt(
    level: str = "beginner",
    target_seconds: int = 60,
    picked_language: str = "en",
    budget_factor: float = 1.0,
    local_context: bool = False,
    simpler: bool = False,
    previous_question: Optional[str] = None,
    scene_count: Optional[int] = None,
) -> tuple[str, int, int]:
    """Returns (system_prompt, scene_count, word_budget)."""
    if scene_count is None:
        scene_count = compute_scene_count(target_seconds)
    else:
        scene_count = max(3, min(10, scene_count))
    word_budget = compute_word_budget(target_seconds, picked_language, budget_factor, scene_count=scene_count)
    words_per_scene = max(25, int(round(word_budget / scene_count)))

    level_rule = LEVEL_RULES.get(level, LEVEL_RULES["beginner"])
    simpler_rule = SIMPLER_RULES if simpler else ""
    context_rule = (
        "\n- Anchor the concept using a relatable everyday Indian analogy "
        "(cricket, chai, or trains) in the introduction."
        if local_context else ""
    )
    prev_q_rule = (
        f"\n- The quiz question MUST be different from this previous question: \"{previous_question}\""
        if previous_question else ""
    )

    narration_hint = (
        f"Write 3 to 5 clear, thorough sentences per scene narration (target {words_per_scene - 5} to {words_per_scene + 5} words per scene, totaling ~{word_budget} words). "
        "Explain step-by-step with practical intuition, clear logic, and code walkthrough details so the learner has time to absorb the visual animations."
    )

    prompt = f"""You write structured coding explainer lessons as JSON for an animated video engine.
Output exactly {scene_count} scenes total (including the quiz as the last scene).

{level_rule}
{simpler_rule}
Rules:
- Exactly {scene_count} scenes. The LAST scene MUST be type "quiz".
- "title_card": scene 1 only. Has heading + 1-sentence hook narration.{context_rule}
- "code_walkthrough": Python code (max {"3" if level == "beginner" else "6"} lines) in "code".
  Use "highlight_lines" (1-based list). Use double quotes for strings.
- "diagram": MUST have "items" array with 2–4 concrete step strings.
- "quiz" (LAST scene only): {{
    "question": one clear conceptual question, max 120 chars,
    "options": exactly 3–4 realistic, distinct choices (1 correct, 2–3 plausible distractors), 10–100 chars each. NEVER use generic placeholder text like 'Option 1',
    "correct_index": valid 0-based integer matching the correct option,
    "explanation": 1 concise sentence explaining why the correct answer is right, max 150 chars,
    "narration": reads the question aloud (same as question text)
  }}{prev_q_rule}
- "narration": {narration_hint}
- "mood": one of "happy" | "thinking" | "excited" | "curious"

JSON Schema:
{{
  "title": "...",
  "level": "{level}",
  "language": "en",
  "scenes": [
    {{
      "type": "title_card",
      "heading": "...",
      "narration": "...",
      "mood": "happy"
    }},
    {{
      "type": "code_walkthrough",
      "heading": "...",
      "code": "...",
      "highlight_lines": [1],
      "narration": "...",
      "mood": "curious"
    }},
    {{
      "type": "diagram",
      "heading": "...",
      "items": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
      "narration": "...",
      "mood": "thinking"
    }},
    {{
      "type": "quiz",
      "heading": "Knowledge Check",
      "question": "What does range(3) produce?",
      "options": ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3"],
      "correct_index": 0,
      "explanation": "range(3) starts at 0 and stops before 3.",
      "narration": "What does range(3) produce?",
      "mood": "excited"
    }}
  ]
}}
"""
    return prompt, scene_count, word_budget


def plan_lesson(
    topic: str,
    level: str = "beginner",
    local_context: bool = False,
    target_seconds: int = 60,
    picked_language: str = "en",
    budget_factor: float = 1.0,
    simpler: bool = False,
    previous_question: Optional[str] = None,
    scene_count: Optional[int] = None,
):
    """Plan a lesson in English. Returns (lesson, source).
    source is 'llm' or 'fallback'.
    """
    system_prompt, scene_count, word_budget = get_system_prompt(
        level=level,
        target_seconds=target_seconds,
        picked_language=picked_language,
        budget_factor=budget_factor,
        local_context=local_context,
        simpler=simpler,
        previous_question=previous_question,
        scene_count=scene_count,
    )

    words_per_scene = max(25, int(round(word_budget / scene_count)))
    user_prompt = (
        f"Create an engaging visual lesson for topic: '{topic}'. Level: {level}. "
        f"Target duration is {target_seconds} seconds (~{target_seconds // 60}m {target_seconds % 60}s). "
        f"Output exactly {scene_count} scenes total (the last scene must be a quiz). "
        f"Write thorough, informative narration (~{words_per_scene} words per scene, totaling ~{word_budget} words across the lesson) "
        "explaining step-by-step with practical intuition, clear logic, diagrams, and clean Python code."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    lesson = None
    source = "fallback"

    for attempt in range(1, MAX_ATTEMPTS + 1):
        start = time.time()
        try:
            r = chat(
                model=MODEL,
                messages=messages,
                format=Lesson.model_json_schema(),
                options={
                    "temperature": 0.35,
                    "repeat_penalty": 1.15,
                    "repeat_last_n": 64,
                    "num_ctx": 4096,
                    "num_thread": 8,
                    "keep_alive": "10m",
                },
            )
            lesson = parse_lesson(r.message.content)
            lesson.level = level
            actual_words = _count_lesson_words(lesson)
            elapsed = round(time.time() - start, 1)

            # Accept valid lesson immediately — audio duration dictates scene length.
            # Only retry if output is essentially empty (< 15 words across all scenes).
            if actual_words < 15 and attempt < MAX_ATTEMPTS:
                print(f"[planner] attempt {attempt} narration too short ({actual_words} words); retrying")
                messages.append({"role": "assistant", "content": r.message.content})
                messages.append({"role": "user", "content": "Please write 2 to 3 complete teaching sentences for each scene."})
                continue

            print(
                f"[planner] attempt {attempt} accepted in {elapsed}s "
                f"({len(lesson.scenes)} scenes, {actual_words} words)"
            )
            return lesson, "llm"

        except ValidationError as e:
            msg = e.errors()[0]["msg"]
            print(f"[planner] attempt {attempt} schema error: {msg}")
            if 'r' in dir():
                messages.append({"role": "assistant", "content": r.message.content})
                messages.append({
                    "role": "user",
                    "content": (
                        f"Fix schema error: {msg}. "
                        "Diagrams must have 'items' list with 2–4 strings. "
                        "Last scene must be 'quiz' with 'options', 'correct_index', 'explanation'."
                    ),
                })
        except Exception as e:
            print(f"[planner] attempt {attempt} failed: {e}")
            if attempt < MAX_ATTEMPTS:
                messages.append({
                    "role": "user",
                    "content": f"Generate a valid JSON lesson for '{topic}' matching the JSON Schema.",
                })
                continue

    print(f"[planner] all attempts failed, generating verified lesson for '{topic}'")
    return get_fallback_lesson(topic=topic, level=level, target_seconds=target_seconds), "fallback"