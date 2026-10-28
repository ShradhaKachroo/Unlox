import time
from typing import Literal, Optional

from ollama import chat
from pydantic import BaseModel, Field, ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 3

# ── Prompt version (keep in sync with api.py PROMPT_VERSION) ─────────────────
PROMPT_VERSION = 7

def is_coding_topic(topic: str) -> bool:
    import re
    t = topic.lower().strip()
    coding_terms = (
        "python", "javascript", "typescript", "java", "c++", "cpp", "c#", "golang", "rust",
        "html", "css", "sql", "bash", "shell", "coding", "code", "programming", "program",
        "software", "developer", "function", "variable", "loop", "array", "pointer",
        "algorithm", "dsa", "class", "async", "thread", "recursion", "stack", "queue",
        "tree", "graph", "object oriented", "oop", "decorator", "generator", "data structure",
        "syntax", "compiler", "git", "api", "backend", "frontend", "database", "query",
        "debug", "terminal", "script", "json", "rest api", "docker", "kubernetes"
    )
    for term in coding_terms:
        if re.search(rf"\b{re.escape(term)}\b", t):
            return True
    return False

class PlanScene(BaseModel):
    type: Literal["title_card", "diagram", "code_walkthrough", "quiz"]
    heading: str = Field(description="Clear, distinct title for this specific slide")
    narration: str = Field(min_length=15, description="Full spoken teaching explanation for this specific slide. Must directly explain the slide's visual content. NEVER duplicate narrations.")
    code: Optional[str] = Field(default=None, description="Python code snippet if this is a code_walkthrough slide")
    highlight_lines: Optional[list[int]] = Field(default=None, description="1-based lines of code to highlight")
    items: Optional[list[str]] = Field(default=None, description="List of step strings if this is a diagram slide")
    question: Optional[str] = Field(default=None, description="Conceptual question if this is a quiz slide")
    options: Optional[list[str]] = Field(default=None, description="Multiple choice options for quiz slide")
    correct_index: Optional[int] = Field(default=0, description="0-based index of correct option")
    explanation: Optional[str] = Field(default=None, description="Brief explanation why the answer is correct")
    mood: Optional[Literal["happy", "thinking", "excited", "curious"]] = "happy"

class PlanLesson(BaseModel):
    title: str = Field(description="Title of the lesson")
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    scenes: list[PlanScene] = Field(description="Ordered list of visual lesson scenes ending with a quiz")

# ── Words-per-second (calibrated for 0.85x speech rate) ───────────────────────
WORDS_PER_SEC = {"en": 1.75, "hi": 1.75, "kn": 1.75}
PAUSE_PER_SCENE = 0.6  # seconds gap after each scene's audio

# ── Level rules ───────────────────────────────────────────────────────────────
LEVEL_RULES = {
    "beginner": (
        "TARGET LEVEL: BEGINNER\n"
        "Tone: natural, engaging, intuitive, and encouraging.\n"
        "- Explain naturally using everyday language, real-world analogies, and clear visual steps.\n"
        "- DO NOT force computer programming code unless the topic is specifically about software coding. For topics like shapes, geometry, science, math, or general concepts, use visual 'diagram' scenes (with 2-4 descriptive item bullets) to explain properties, comparisons, and intuitive facts.\n"
        "- If and only if the topic is specifically about computer programming, keep code ultra-simple (≤3 lines).\n"
        "- Define every term the first time you use it; assume zero prior knowledge.\n"
        "- One single clear idea per scene.\n"
    ),
    "intermediate": (
        "TARGET LEVEL: INTERMEDIATE\n"
        "- Realistic patterns, practical trade-offs, and clear visual breakdowns.\n"
        "- If coding: show realistic code (≤6 lines), edge cases, and standard best practices.\n"
        "- If non-coding: explore deeper mechanics, relationships, and problem-solving diagrams.\n"
        "- Tone: collegial, peer-to-peer.\n"
    ),
    "advanced": (
        "TARGET LEVEL: ADVANCED\n"
        "- High-rigor analysis, architectural trade-offs, deep system or mathematical mechanics.\n"
        "- If coding: runtime internals, memory layout, concurrency, and production patterns.\n"
        "- If non-coding: formal principles, advanced classifications, and edge-case proofs.\n"
        "- Tone: expert, technical, engineering insight.\n"
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
    is_coding: bool = False,
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
        "Explain step-by-step with practical intuition, clear logic, and visual clarity so the learner has time to absorb the visual animations."
    )

    if is_coding:
        code_instruction = (
            '- "code_walkthrough": Python code (max 3 lines for beginner, 6 lines for intermediate/advanced) in "code". '
            'Use "highlight_lines" (1-based list). Use double quotes for strings.'
        )
        middle_scenes_example = """    {
      "type": "diagram",
      "heading": "Visual Concept Overview",
      "items": ["Point 1: Key intuition", "Point 2: Core pattern", "Point 3: Real-world analogy"],
      "narration": "Let's first visualize the foundational concept before looking at syntax.",
      "mood": "thinking"
    },
    {
      "type": "code_walkthrough",
      "heading": "Code Implementation",
      "code": "x = [1, 2, 3]\\nprint(len(x))",
      "highlight_lines": [1],
      "narration": "Here is the concise implementation showing how the elements work together.",
      "mood": "curious"
    },"""
    else:
        code_instruction = (
            'CRITICAL NON-CODING TOPIC RULE:\n'
            '- This topic is a general educational concept, NOT computer programming. DO NOT use "code_walkthrough" scenes and DO NOT include any code or programming syntax.\n'
            '- Use visual "diagram" scenes (with 2–4 descriptive bullet items) to explain definitions, visual properties, shapes, and everyday examples naturally.'
        )
        middle_scenes_example = """    {
      "type": "diagram",
      "heading": "Visual Characteristics & Properties",
      "items": ["Defining feature: How to identify it", "Key visual rule: Boundaries, sides, or symmetry", "Everyday comparison: Familiar real-world counterpart"],
      "narration": "Notice the defining visual characteristics that distinguish this form from others.",
      "mood": "thinking"
    },
    {
      "type": "diagram",
      "heading": "Everyday Real-World Examples",
      "items": ["Where we see it in daily life", "Practical purpose and natural occurrence", "How to easily spot and recognize it"],
      "narration": "In the world around us, we encounter this everywhere from natural patterns to everyday objects.",
      "mood": "curious"
    },"""

    prompt = f"""You write structured visual explainer lessons as JSON for an animated classroom learning player.
Output exactly {scene_count} scenes total (including the quiz as the last scene).

{level_rule}
{simpler_rule}
Rules:
- Exactly {scene_count} scenes. The LAST scene MUST be type "quiz".
- "title_card": scene 1 only. Has heading + 1-sentence hook narration.{context_rule}
{code_instruction}
- "diagram": MUST have "items" array with 2–4 concrete visual points or steps.
- "quiz" (LAST scene only): {{
    "question": one clear conceptual question, max 120 chars,
    "options": exactly 3–4 realistic, distinct choices (1 correct, 2–3 plausible distractors), 10–100 chars each. NEVER use generic placeholder text like 'Option 1',
    "correct_index": valid 0-based integer matching the correct option,
    "explanation": 1 concise sentence explaining why the correct answer is right, max 150 chars,
    "narration": reads the question aloud (same as question text)
  }}{prev_q_rule}
- "narration": REQUIRED for EVERY scene. Each scene MUST have UNIQUE, original teaching sentences directly describing the visual diagram steps or concept shown on that specific slide. NEVER repeat narrations across scenes. {narration_hint}
- PROGRESSION RULE: Each scene MUST advance to a completely new, distinct aspect or stage of the topic. DO NOT dwell on or repeat the same concept across multiple slides. Scene 1 hooks the learner -> Scene 2 introduces the fundamental concept -> Scene 3 moves forward to distinct variations or deeper mechanics -> Scene 4 explores everyday real-world examples -> Quiz tests mastery. Every slide MUST move forward to the next concept!
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
{middle_scenes_example}
    {{
      "type": "quiz",
      "heading": "Knowledge Check",
      "question": "What is the key takeaway?",
      "options": ["Option A", "Option B", "Option C"],
      "correct_index": 0,
      "explanation": "Option A is correct.",
      "narration": "What is the key takeaway?",
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
    is_coding = is_coding_topic(topic)

    system_prompt, scene_count, word_budget = get_system_prompt(
        level=level,
        target_seconds=target_seconds,
        picked_language=picked_language,
        budget_factor=budget_factor,
        local_context=local_context,
        simpler=simpler,
        previous_question=previous_question,
        scene_count=scene_count,
        is_coding=is_coding,
    )

    words_per_scene = max(25, int(round(word_budget / scene_count)))

    explanation_style = (
        "explaining step-by-step with practical intuition, clear logic, diagrams, and clean code."
        if is_coding else
        "explaining naturally with intuitive real-world examples, visual diagrams, and clear concepts (NO programming code needed)."
    )

    user_prompt = (
        f"Create an engaging visual lesson for topic: '{topic}'. Level: {level}. "
        f"Target duration is {target_seconds} seconds (~{target_seconds // 60}m {target_seconds % 60}s). "
        f"Output exactly {scene_count} scenes total (the last scene must be a quiz). "
        f"Write thorough, informative narration (~{words_per_scene} words per scene, totaling ~{word_budget} words across the lesson) "
        f"{explanation_style}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    lesson = None
    source = "fallback"

    for attempt in range(1, MAX_ATTEMPTS + 1):
        start = time.time()
        r = None
        try:
            r = chat(
                model=MODEL,
                messages=messages,
                format=PlanLesson.model_json_schema(),
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

            # Guarantee: if topic is not about computer programming, sanitize any code into diagram scenes
            if not is_coding:
                for sc in lesson.scenes:
                    if sc.type == "code_walkthrough":
                        sc.type = "diagram"
                        if not sc.items or len(sc.items) < 2:
                            clean_items = []
                            if sc.heading:
                                clean_items.append(f"Concept: {sc.heading}")
                            narration_sents = [s.strip() for s in sc.narration.split(".") if len(s.strip()) > 8]
                            if narration_sents:
                                clean_items.extend(narration_sents[:2])
                            while len(clean_items) < 3:
                                clean_items.append(f"Visual insight for {topic}")
                            sc.items = clean_items[:4]
                        sc.code = None
                        sc.highlight_lines = None

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
            if r is not None and hasattr(r, 'message') and r.message.content:
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