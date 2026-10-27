import json
from pydantic import ValidationError
from schema import parse_lesson

good = {
    "title": "t",
    "scenes": [
        {"type": "title_card", "heading": "h", "narration": "Hello there learners"},
        {"type": "code_walkthrough", "heading": "h", "narration": "Hello there learners",
         "code": "for i in range(3):\n    print(i)", "highlight_lines": [1]},
        {"type": "diagram", "heading": "h", "narration": "Hello there learners",
         "items": ["i = 0", "i = 1", "i = 2"]},
    ],
}

bad_highlight = json.loads(json.dumps(good))
bad_highlight["scenes"][1]["highlight_lines"] = [5]

bad_first = json.loads(json.dumps(good))
bad_first["scenes"][0]["type"] = "diagram"

for name, data in [("good", good), ("bad highlight", bad_highlight), ("bad first scene", bad_first)]:
    try:
        parse_lesson(json.dumps(data))
        print(f"{name}: accepted")
    except ValidationError as e:
        print(f"{name}: rejected -> {e.errors()[0]['msg']}")

