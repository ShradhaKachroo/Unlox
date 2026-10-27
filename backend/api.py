import os
import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import json
from typing import Optional

from export import export_audio_and_srt, export_mp4
from fallback import get_fallback_lesson
from planner import plan_lesson
from schema import Lesson
from translate import translate_lesson
from tts import HERE, SUPPORTED, build_timing

app = FastAPI(title="Blu Visual Teacher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUT_DIR = os.path.join(HERE, "out")
os.makedirs(OUT_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=OUT_DIR), name="audio")

# Base URL the frontend uses to fetch audio files from this backend
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

CACHE_FILE = os.path.join(OUT_DIR, "lesson_cache.json")
_cache: dict = {}


def _get_cache() -> dict:
    global _cache
    if not _cache and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _cache = json.load(f)
        except Exception:
            _cache = {}
    return _cache


def _persist_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[cache] failed to write: {e}")


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=100)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    target_seconds: Optional[int] = None
    target_length_seconds: Optional[int] = None
    voice: Literal["female", "male"] = "female"
    local_context: bool = True


class RevoiceRequest(BaseModel):
    lesson_id: str
    lang: str = "en"
    voice: Literal["female", "male"] = "female"


class ExportRequest(BaseModel):
    language: str = "en"
    player_url: str = "http://localhost:5173"


@app.get("/health")
def health():
    return {"ok": True, "languages": SUPPORTED}


@app.post("/generate")
def generate(req: GenerateRequest):
    if req.language not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    target_sec = req.target_length_seconds or req.target_seconds or 60
    cache = _get_cache()
    cache_key = f"{req.topic.strip().lower()}:{req.level}:{req.language}:{target_sec}:{req.local_context}"

    if cache_key in cache:
        print(f"[generate] cache hit for topic '{req.topic}' [{req.language}]")
        return cache[cache_key]

    seconds = {}

    # Check if base English plan exists in cache to skip Ollama
    plan_key = f"plan:{req.topic.strip().lower()}:{req.level}:{target_sec}:{req.local_context}"
    if plan_key in cache:
        print(f"[generate] plan cache hit for '{req.topic}'")
        lesson = Lesson.model_validate(cache[plan_key])
        source = "cached_plan"
        seconds["plan"] = 0.0
    else:
        t = time.time()
        lesson, source = plan_lesson(
            req.topic,
            level=req.level,
            local_context=req.local_context,
            target_seconds=target_sec,
        )
        seconds["plan"] = round(time.time() - t, 1)
        cache[plan_key] = lesson.model_dump()

    t = time.time()
    translated = translate_lesson(lesson, req.language)
    seconds["translate"] = round(time.time() - t, 1)

    t = time.time()
    timing = build_timing(translated, req.language)
    seconds["voice"] = round(time.time() - t, 1)

    # Automatically generate full WAV and SRT for export/captions
    try:
        export_audio_and_srt(req.language)
    except Exception as e:
        print(f"[export_audio_and_srt] warning: {e}")

    # Build rich lesson structure matching frontend Lesson schema
    lesson_dict = translated.model_dump()
    lesson_id = f"{req.topic.lower().replace(' ', '-')}-{int(time.time())}"
    lesson_dict["id"] = lesson_id

    for i, s in enumerate(lesson_dict["scenes"]):
        t_scene = timing["scenes"][i]
        s["id"] = f"scene-{i}"
        s["duration_ms"] = int(round(t_scene["duration"] * 1000))
        s["audio_url"] = f"{BACKEND_URL}/audio/{t_scene['audio']}"
        s["caption"] = t_scene.get("caption") or s.get("narration")
        if not s.get("mood"):
            s["mood"] = "happy" if i == 0 else "thinking"

    total_stage_time = round(sum(seconds.values()), 1)
    print(
        f"[generate] plan: {seconds['plan']}s | translate: {seconds['translate']}s | voice: {seconds['voice']}s | total: {total_stage_time}s | total_video: {timing['total_seconds']}s"
    )

    response = {
        **lesson_dict,
        "source": source,
        "lesson": lesson_dict,
        "timing": timing,
        "audio_base_url": "/audio",
        "stage_seconds": seconds,
    }

    cache[cache_key] = response
    cache[lesson_id] = response
    _persist_cache()

    return response


@app.post("/revoice")
def revoice(req: RevoiceRequest):
    if req.lang not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    cache = _get_cache()
    cached = cache.get(req.lesson_id)
    if not cached:
        base_lesson = get_fallback_lesson()
    else:
        base_lesson = Lesson.model_validate(cached.get("lesson") or cached)

    translated = translate_lesson(base_lesson, req.lang)
    timing = build_timing(translated, req.lang)
    try:
        export_audio_and_srt(req.lang)
    except Exception as e:
        print(f"[revoice] export_audio_and_srt warning: {e}")

    revoiced_dict = translated.model_dump()
    revoiced_dict["id"] = req.lesson_id

    for i, s in enumerate(revoiced_dict["scenes"]):
        t_scene = timing["scenes"][i]
        s["id"] = f"scene-{i}"
        s["duration_ms"] = int(round(t_scene["duration"] * 1000))
        s["audio_url"] = f"{BACKEND_URL}/audio/{t_scene['audio']}"
        s["caption"] = t_scene.get("caption") or s.get("narration")

    response = {
        **revoiced_dict,
        "source": "revoiced",
        "lesson": revoiced_dict,
        "timing": timing,
        "audio_base_url": "/audio",
    }

    cache[f"{req.lesson_id}_{req.lang}"] = response
    _persist_cache()
    return response


@app.post("/export")
def export(req: ExportRequest):
    if req.language not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    try:
        mp4_path, srt_path, wav_path, total_seconds, stage_seconds = export_mp4(
            req.language, player_url=req.player_url
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except TimeoutError as e:
        raise HTTPException(504, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")

    return {
        "ok": True,
        "language": req.language,
        "mp4": os.path.basename(mp4_path),
        "mp4_url": f"/audio/{os.path.basename(mp4_path)}",
        "srt": os.path.basename(srt_path),
        "srt_url": f"/audio/{os.path.basename(srt_path)}",
        "wav": os.path.basename(wav_path),
        "wav_url": f"/audio/{os.path.basename(wav_path)}",
        "total_seconds": total_seconds,
        "stage_seconds": stage_seconds,
    }