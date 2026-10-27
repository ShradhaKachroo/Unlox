import time

from ollama import chat
from pydantic import ValidationError

from fallback import get_fallback_lesson
from schema import Lesson, parse_lesson

MODEL = "phi3.5"
MAX_ATTEMPTS = 6

def get_system_prompt(target_seconds=60, local_context=False):
    if target_seconds >= 120:
        num_scenes = "8 to 10"
    elif target_seconds >= 90:
        num_scenes = "6 to 7"
    else:
        num_scenes = "4 to 5"
    narration_guidance = (
        "4 to 5 clear, engaging sentences (50 to 70 words per scene) to teach thoroughly at a comfortable speaking pace. "
        "Each scene should explain one concept in detail with examples."
        if target_seconds >= 120
        else (
            "3 to 4 clear, engaging sentences (35 to 55 words per scene) to teach thoroughly at a comfortable speaking pace."
            if target_seconds >= 90
            else "2 to 3 sentences in plain English for a beginner."
        )
    )
    context_guidance = (
        "\n- Include one relatable local real-world analogy scene (e.g., cricket over with 6 balls, making chai steps, or train tickets) to anchor the programming concept."
        if local_context
        else ""
    )

    return f"""You write structured coding and conceptual lessons as JSON for a video engine.
Rules:
- {num_scenes} scenes in total. Scene 1 must be a title_card.
- Followed by alternating code_walkthrough and diagram scenes that teach step by step.
- code_walkthrough: real, correct Python code in 'code' (max 10 lines) and 'highlight_lines' (1‑based line numbers that exist). Never repeat identical code in two scenes.
- diagram: 2 to 4 items, each max 5 words, showing the concrete steps in order. Concrete values or steps, not vague words.
- narration: {narration_guidance}
- mood: set 'mood' on each scene to one of: 'happy', 'thinking', 'excited', 'curious'.{context_guidance}
- Teach one idea at a time and build step by step.
"""


def plan_lesson(topic, level="beginner", local_context=False, target_seconds=60):
    """Returns (lesson, source). source is 'llm' or 'fallback'."""
    system_prompt = get_system_prompt(target_seconds, local_context)
    user_prompt = f"Topic: {topic}. Level: {level}. Target length: {target_seconds} seconds."
    if local_context:
        user_prompt += " Ground the explanation using relatable everyday Indian examples (like cricket, chai, or trains)."

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
                           "Keep code to 10 lines or fewer, highlight_lines must reference lines that exist "
                           "in the code, and each diagram needs 2 to 4 items of max 5 words each.",
            })
        except Exception as e:
            print(f"[planner] attempt {attempt} failed: {e}")
            break  # Ollama itself is down, so retrying will not help

    print("[planner] using fallback lesson")
    return get_fallback_lesson(), "fallback"