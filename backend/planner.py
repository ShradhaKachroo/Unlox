import time

from ollama import chat
from pydantic import ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 4

SYSTEM = """You write short lessons as JSON for a video engine.
Rules:
- 4 scenes. Scene 1 is title_card. Then code_walkthrough and diagram scenes.
- code_walkthrough: real, correct code in 'code' (max 4 lines) and 'highlight_lines' (1-based line numbers that exist).
- diagram: 3 to 4 items, each max 4 words, showing the steps in order. Items must be concrete values or steps, not vague words.
-Example diagram items for if/else: ["Check condition", "True: run action", "False: skip it"]
- narration: 1 or 2 short sentences in plain English for a beginner. No typos.
- Teach one idea at a time and build step by step.

Example diagram items for a for loop: ["i = 0", "i = 1", "i = 2"]
Example code_walkthrough code: "for i in range(3):\\n    print(i)" with highlight_lines [1]"""


def plan_lesson(topic, level="beginner"):
    """Returns (lesson, source). source is 'llm' or 'fallback'."""
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Topic: {topic}. Level: {level}."},
    ]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        start = time.time()
        try:
            r = chat(
                model=MODEL,
                messages=messages,
                format=Lesson.model_json_schema(),
                options={"temperature": 0.3},
            )
            lesson = parse_lesson(r.message.content)
            lesson.level = level
            print(f"[planner] attempt {attempt} accepted in {time.time() - start:.1f}s")
            return lesson, "llm"
        except ValidationError as e:
            msg = e.errors()[0]["msg"]
            print(f"[planner] attempt {attempt} rejected: {msg}")
            messages.append({"role": "assistant", "content": r.message.content})
            messages.append({
                "role": "user",
                "content": f"That was rejected: {msg}. Fix it and return the full lesson again. "
                           "Keep code to 4 lines or fewer and each diagram item to 4 short words.",
            })
        except Exception as e:
            print(f"[planner] attempt {attempt} failed: {e}")
            break  # Ollama itself is down, so retrying will not help

    print("[planner] using fallback lesson")
    return get_fallback_lesson(), "fallback"