"""
check_levels.py  – Phase 2 test.
Generates 'Python list' at beginner and intermediate, prints all headings,
code snippets and diagram items. Fails if >40% of headings match or any code
string is identical across levels.
"""
import json
import urllib.request

URL = "http://127.0.0.1:8000/generate"
TOPIC = "Python list"


def call(level: str) -> dict:
    body = json.dumps({
        "topic": TOPIC,
        "level": level,
        "language": "en",
        "target_seconds": 60,
        "local_context": False,
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


print("Calling beginner...")
b = call("beginner")
print("Calling intermediate...")
i = call("intermediate")

beg_lesson = b["lesson"]
int_lesson = i["lesson"]


def extract(lesson):
    headings = [s["heading"] for s in lesson["scenes"]]
    codes = [s.get("code", "") for s in lesson["scenes"] if s.get("code")]
    items = [str(s.get("items", [])) for s in lesson["scenes"] if s.get("items")]
    return headings, codes, items


bh, bc, bi = extract(beg_lesson)
ih, ic, ii = extract(int_lesson)

print("\n=== BEGINNER ===")
print("Headings:", bh)
print("Code snippets:", bc)
print("Diagram items:", bi)

print("\n=== INTERMEDIATE ===")
print("Headings:", ih)
print("Code snippets:", ic)
print("Diagram items:", ii)

# ── Checks ────────────────────────────────────────────────────────────────────
bh_set = set(h.lower() for h in bh)
ih_set = set(h.lower() for h in ih)
common = bh_set & ih_set
match_ratio = len(common) / max(len(bh_set | ih_set), 1)

print(f"\nHeading overlap: {len(common)}/{len(bh_set | ih_set)} = {match_ratio:.0%}")
if match_ratio > 0.40:
    print("❌ FAIL: >40% of headings are identical across levels!")
else:
    print("✅ PASS: headings differ sufficiently across levels")

identical_code = set(bc) & set(ic)
if identical_code:
    print(f"❌ FAIL: identical code strings across levels: {identical_code}")
else:
    print("✅ PASS: no identical code strings across levels")

print(f"\nLesson IDs  beginner={b['lesson_id']}  intermediate={i['lesson_id']}")
