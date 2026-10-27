import os

from fallback import get_fallback_lesson

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, "..", "public", "sample", "lesson_en.json")

lesson = get_fallback_lesson()
os.makedirs(os.path.dirname(DEST), exist_ok=True)
with open(DEST, "w", encoding="utf-8") as f:
    f.write(lesson.model_dump_json(indent=2))

print("Wrote", os.path.abspath(DEST))