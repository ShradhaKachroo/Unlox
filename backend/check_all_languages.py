import time

from fallback import get_fallback_lesson
from translate import translate_lesson
from tts import build_timing

base = get_fallback_lesson()

for lang in ["en", "hi", "kn"]:
    start = time.time()
    lesson = translate_lesson(base, lang)
    timing = build_timing(lesson, lang)
    print(f"{lang}: {timing['total_seconds']}s of video, built in {time.time() - start:.1f}s")