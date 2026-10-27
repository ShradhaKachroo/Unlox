import json
import urllib.request

body = json.dumps({"topic": "Python if else", "level": "beginner", "language": "hi"}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8000/generate",
    data=body,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=300) as r:
    data = json.load(r)

print("source:", data["source"])
print("stage seconds:", data["stage_seconds"])
print("total video:", data["timing"]["total_seconds"], "s")
for s in data["lesson"]["scenes"]:
    print("-", s["heading"])