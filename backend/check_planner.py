import sys

from planner import plan_lesson

topic = sys.argv[1] if len(sys.argv) > 1 else "Python for loop"
lesson, source = plan_lesson(topic, "beginner")

print("\nSource:", source)
print("Title:", lesson.title)
for s in lesson.scenes:
    print("-", s.type, "|", s.heading)
    if s.code:
        print("   code:", repr(s.code))
    if s.items:
        print("   items:", s.items)