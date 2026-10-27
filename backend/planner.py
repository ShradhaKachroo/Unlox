import time

from ollama import chat
from pydantic import ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 4


def get_system_prompt(target_seconds: int = 45, local_context: bool = False):
    if target_seconds >= 100:
        num_scenes = "8 to 10"
        narration_rule = "18 to 28 words per scene (1 to 2 punchy sentences) to keep rapid visual cuts throughout the 2-minute explainer."
    else:
        num_scenes = "5 to 6"
        narration_rule = "15 to 25 words per scene (1 to 2 clear sentences) for a quick 45-second animated explainer."

    context_rule = (
        "\n- Anchor the concept using a relatable everyday Indian analogy (cricket, chai, or trains) in the introduction."
        if local_context
        else ""
    )

    return f"""You write structured coding explainer lessons as JSON for an animated video engine.
You must output a {num_scenes} scene lesson with rapid visual cuts and an interactive quiz at the end.

Rules:
- Exactly {num_scenes} scenes in total.
- Scene 1: MUST be type "title_card" with an engaging heading and a 1-sentence hook narration.{context_rule}
- Middle scenes: alternate between "code_walkthrough" and "diagram" to teach step by step:
  * "code_walkthrough": Python code (max 8 lines) in "code", and 1-based "highlight_lines" (e.g. [1] or [2, 3]). Use double quotes for strings.
  * "diagram": MUST have "items" array with 2 to 4 concrete step strings (e.g. ["Step 1: Init", "Step 2: Loop", "Step 3: End"]).
- Final scene: MUST be type "quiz" testing the student's understanding. Include:
  * "question": concise conceptual question
  * "options": list of 3 choices (e.g. ["A) ...", "B) ...", "C) ..."])
  * "answer_idx": 0, 1, or 2 (0-based index of correct option)
  * "explanation": 1 sentence explaining why
- "narration": {narration_rule}
- "mood": one of "happy", "thinking", "excited", "curious" for each scene.

JSON Schema format:
{{
  "title": "Topic Title",
  "level": "beginner",
  "language": "en",
  "scenes": [
    {{
      "type": "title_card",
      "heading": "How Binary Search Works",
      "narration": "Welcome! Today we will master binary search to find items in sorted data instantly.",
      "mood": "happy"
    }},
    {{
      "type": "code_walkthrough",
      "heading": "Step 1: Sorted Array Setup",
      "code": "arr = [10, 20, 30, 40, 50]\\ntarget = 30",
      "highlight_lines": [1],
      "narration": "First, we start with a sorted array and define the target value we want to find.",
      "mood": "curious"
    }},
    {{
      "type": "diagram",
      "heading": "Step 2: Divide and Conquer",
      "items": ["Find midpoint", "Compare with target", "Halve the search space"],
      "narration": "We check the middle element. If it matches, we are done; otherwise, we eliminate half the list.",
      "mood": "thinking"
    }},
    {{
      "type": "quiz",
      "heading": "Knowledge Check",
      "question": "What requirement must an array meet before applying binary search?",
      "options": ["A) It must be sorted", "B) It must contain only integers", "C) It must have an even length"],
      "answer_idx": 0,
      "explanation": "Binary search requires sorted elements so we can reliably eliminate half the array each step.",
      "narration": "Quick question! What must be true about the array before we can perform a binary search?",
      "mood": "excited"
    }}
  ]
}}
"""


def plan_lesson(topic: str, level: str = "beginner", local_context: bool = False, target_seconds: int = 45):
    """Generates a structured visual lesson with rapid cuts and an end quiz.
    Supports 45s (5-6 scenes) or 2-minute (8-10 scenes) mode.
    Returns (lesson, source). source is 'llm' or 'fallback'.
    """
    system_prompt = get_system_prompt(target_seconds, local_context)
    user_prompt = f"Create an engaging visual lesson for topic: '{topic}'. Level: {level}. Target length: {target_seconds} seconds."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    for attempt in range(1, MAX_ATTEMPTS + 1):
        start = time.time()
        try:
            r = chat(
                model=MODEL,
                messages=messages,
                format=Lesson.model_json_schema(),
                options={"temperature": 0.2},
            )
            lesson = parse_lesson(r.message.content)
            lesson.level = level
            print(f"[planner] attempt {attempt} accepted in {time.time() - start:.1f}s ({len(lesson.scenes)} scenes)")
            return lesson, "llm"
        except ValidationError as e:
            msg = e.errors()[0]["msg"]
            print(f"[planner] attempt {attempt} rejected: {msg}")
            messages.append({"role": "assistant", "content": r.message.content})
            messages.append({
                "role": "user",
                "content": f"Fix schema error: {msg}. Diagrams must have 'items' list with 2-4 strings. Final scene should be a 'quiz' with 'options' and 'answer_idx'.",
            })
        except Exception as e:
            print(f"[planner] attempt {attempt} failed: {e}")
            break

    print("[planner] using fallback verified lesson")
    return get_fallback_lesson(), "fallback"