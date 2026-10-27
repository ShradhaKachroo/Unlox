import json
from schema import parse_lesson

FALLBACK = {
    "title": "How a Python loop works",
    "level": "beginner",
    "language": "en",
    "scenes": [
        {
            "type": "title_card",
            "heading": "How does a Python loop work?",
            "narration": "A loop repeats an instruction for each value in a sequence.",
        },
        {
            "type": "code_walkthrough",
            "heading": "Step 1: Read the code",
            "code": "for i in range(3):\n    print(i)",
            "highlight_lines": [1],
            "narration": "Range of three gives three values: zero, one and two.",
        },
        {
            "type": "diagram",
            "heading": "Step 2: Watch each iteration",
            "items": ["i = 0", "i = 1", "i = 2"],
            "narration": "Each pass takes the next value, then runs print i.",
        },
    ],
}


def get_fallback_lesson():
    return parse_lesson(json.dumps(FALLBACK))