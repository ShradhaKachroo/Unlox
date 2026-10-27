import time

from ollama import chat
from pydantic import ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 4

SYSTEM_PROMPT = """You write structured coding explainer lessons as JSON for an animated video engine.
You must output a 4 to 6 scene lesson that teaches the topic step-by-step with rapid visual cuts.

Rules:
- 4 to 6 scenes total.
- Scene 1: MUST be type "title_card" with an engaging heading and a 1-sentence hook narration.
- Followed by alternating "code_walkthrough" and "diagram" scenes:
  * "code_walkthrough": Python code (max 8 lines) in "code", and 1-based "highlight_lines" (e.g. [1] or [2, 3]). Always use double quotes for strings.
  * "diagram": MUST have "items" array with 2 to 4 concrete step strings (e.g. ["Initialize i=0", "Check i < 3", "Print value"]).
- "narration": 1 to 2 clear, punchy sentences per scene (20 to 35 words). Keep it engaging at a natural speaking pace.
- "mood": one of "happy", "thinking", "excited", "curious" for each scene.

Format must match this JSON structure:
{
  "title": "Topic Title",
  "level": "beginner",
  "language": "en",
  "scenes": [
    {
      "type": "title_card",
      "heading": "Big Question or Title",
      "narration": "Welcome! Today we will learn...",
      "mood": "happy"
    },
    {
      "type": "code_walkthrough",
      "heading": "Step 1: Setup",
      "code": "numbers = [1, 2, 3]\\nfor n in numbers:\\n    print(n)",
      "highlight_lines": [1],
      "narration": "First, we create our list and prepare to loop.",
      "mood": "curious"
    },
    {
      "type": "diagram",
      "heading": "Step 2: How It Executes",
      "items": ["Read 1 -> Print 1", "Read 2 -> Print 2", "Read 3 -> Print 3"],
      "narration": "Notice how each element moves through one by one.",
      "mood": "thinking"
    }
  ]
}
"""


def plan_lesson(topic: str, level: str = "beginner", local_context: bool = False, target_seconds: int = 45):
    """Generates a 4-6 scene lesson with rapid visual cuts and clear narration.
    Returns (lesson, source). source is 'llm' or 'fallback'.
    """
    user_prompt = f"Create an engaging visual lesson for topic: '{topic}'. Level: {level}. Target length: {target_seconds} seconds (4 to 6 punchy scenes)."
    if local_context:
        user_prompt += " Use a relatable everyday Indian analogy (like cricket, chai, or trains) to introduce the concept."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
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
                "content": f"Fix schema error: {msg}. Return valid JSON with 4 to 6 scenes. Diagrams must have 'items' array with 2-4 strings.",
            })
        except Exception as e:
            print(f"[planner] attempt {attempt} failed: {e}")
            break

    print("[planner] using fallback verified lesson")
    return get_fallback_lesson(), "fallback"