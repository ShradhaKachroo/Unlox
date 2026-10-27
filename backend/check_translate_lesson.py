import time

from fallback import get_fallback_lesson
from translate import translate_lesson

lesson = get_fallback_lesson()
for lang in ["hi", "kn"]:
    start = time.time()
    t = translate_lesson(lesson, lang)
    print(f"\n{lang} ({time.time() - start:.1f}s)")
    print("title:", t.title)
    for s in t.scenes:
        print("-", s.heading)
        print("  ", s.narration)
        if s.items:
            print("   items:", s.items)
        if s.code:
            print("   code:", repr(s.code))