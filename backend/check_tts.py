from fallback import get_fallback_lesson
from tts import build_timing

lesson = get_fallback_lesson()
timing = build_timing(lesson, "en")
for s in timing["scenes"]:
    print(s["scene"], s["start"], s["duration"])
print("Total:", timing["total_seconds"], "seconds")