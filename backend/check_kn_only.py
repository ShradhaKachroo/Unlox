import time

from fallback import get_fallback_lesson
from translate import translate_lesson
from tts import build_timing

start = time.time()
lesson = translate_lesson(get_fallback_lesson(), "kn")
timing = build_timing(lesson, "kn")
print(f"kn: {timing['total_seconds']}s of video, built in {time.time() - start:.1f}s")