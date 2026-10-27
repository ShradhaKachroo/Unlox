from fallback import get_fallback_lesson

lesson = get_fallback_lesson()
print(lesson.title, "-", len(lesson.scenes), "scenes")