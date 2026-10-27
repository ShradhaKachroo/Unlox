from fallback import get_fallback_lesson
from translate import translate_lesson
from tts import build_timing

lesson = get_fallback_lesson()
hi = translate_lesson(lesson, "hi")
timing = build_timing(hi, "hi")

for s in timing["scenes"]:
    print(s["scene"], s["start"], s["duration"], s["caption"])
print("Total:", timing["total_seconds"], "seconds")