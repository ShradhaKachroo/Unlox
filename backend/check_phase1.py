"""
check_phase1.py – Phase 1 test.
Calls /generate for 'Python loop' at beginner and intermediate.
Prints both lesson_ids (must differ), cache flags, and first audio_url.
"""
import json
import urllib.request

URL = "http://127.0.0.1:8000/generate"


def call(level: str) -> dict:
    body = json.dumps({
        "topic": "Python loop",
        "level": level,
        "language": "en",
        "target_seconds": 60,
        "local_context": False,
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


print("Generating beginner...")
b = call("beginner")
print("Generating intermediate...")
i = call("intermediate")

bid = b["lesson_id"]
iid = i["lesson_id"]

print(f"\nbeginner   lesson_id = {bid}")
print(f"intermediate lesson_id = {iid}")

if bid == iid:
    print("❌ FAIL: lesson_ids are identical — cache key bug")
else:
    print("✅ PASS: lesson_ids differ")

# First audio URLs
b_url = b["lesson"]["scenes"][0].get("audio_url", "N/A")
i_url = i["lesson"]["scenes"][0].get("audio_url", "N/A")
print(f"\nbeginner   first audio_url = {b_url}")
print(f"intermediate first audio_url = {i_url}")

print(f"\nbeginner   cache = {b.get('cache')}")
print(f"intermediate cache = {i.get('cache')}")
print(f"\nbeginner   voices = {b.get('voices')}")
print(f"intermediate voices = {i.get('voices')}")
