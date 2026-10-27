import hashlib
import json
import os
import queue
import threading
import time
import warnings
from typing import Literal, Optional

warnings.filterwarnings("ignore", category=FutureWarning)

from export import export_audio_and_srt, export_mp4
from fallback import get_fallback_lesson
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from planner import plan_lesson
from pydantic import BaseModel, Field, field_validator
from schema import Lesson
from translate import translate_lesson, translate_text
from tts import HERE, SUPPORTED, build_timing

# ── Prompt version: bump whenever planner prompt changes ──────────────────────
PROMPT_VERSION = 4  # Phase 1-3 unified prompt with LEVEL_RULES + WORDS_PER_SEC

# ── Paths ────────────────────────────────────────────────────────────────────
OUT_DIR = os.path.join(HERE, "out")
os.makedirs(OUT_DIR, exist_ok=True)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

CACHE_FILE = os.path.join(OUT_DIR, "lesson_cache.json")
_cache: dict = {}

# ── Translation cache: (text, language) -> translated text ───────────────────
_trans_cache: dict[tuple[str, str], str] = {}


def _cached_translate_text(text: str, language: str) -> str:
    key = (text, language)
    if key not in _trans_cache:
        _trans_cache[key] = translate_text(text, language)
    return _trans_cache[key]


def _cached_translate_lesson(lesson: Lesson, language: str) -> Lesson:
    """translate_lesson but each narration is cached individually."""
    if language == "en":
        return lesson
    result = lesson.model_copy(deep=True)
    result.language = language
    result.title = _cached_translate_text(lesson.title, language)
    for scene in result.scenes:
        scene.narration = _cached_translate_text(scene.narration, language)
        # headings and items stay English (same slides for all languages)
    return result


# ── Cache helpers ─────────────────────────────────────────────────────────────
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


# ── Key & ID helpers ──────────────────────────────────────────────────────────
def _plan_cache_key(topic: str, level: str, target_seconds: int, simpler: bool, scene_count: Optional[int] = None) -> str:
    """Unique key for the English plan (shared across languages)."""
    raw = f"{topic.strip().lower()}|{level}|{target_seconds}|{scene_count or ''}|{simpler}|v{PROMPT_VERSION}"
    return "plan:" + hashlib.sha256(raw.encode()).hexdigest()[:16]


def _lesson_id(plan_cache_key: str) -> str:
    """Deterministic lesson id = short hash of plan cache key."""
    return hashlib.sha256(plan_cache_key.encode()).hexdigest()[:12]


def _voice_cache_key(lesson_id: str, language: str) -> str:
    return f"voice:{lesson_id}:{language}"


def _lesson_dir(lesson_id: str) -> str:
    d = os.path.join(OUT_DIR, "lessons", lesson_id)
    os.makedirs(d, exist_ok=True)
    return d


def _lang_dir(lesson_id: str, lang: str) -> str:
    d = os.path.join(OUT_DIR, "lessons", lesson_id, lang)
    os.makedirs(d, exist_ok=True)
    return d


def _lang_audio_dir(lesson_id: str, lang: str) -> str:
    d = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "audio")
    os.makedirs(d, exist_ok=True)
    return d


def _lesson_audio_dir(lesson_id: str) -> str:
    # Legacy flat output folder for backward compatibility
    d = os.path.join(OUT_DIR, lesson_id)
    os.makedirs(d, exist_ok=True)
    return d


def _audio_url(lesson_id: str, scene_i: int, lang: str) -> str:
    return f"{BACKEND_URL}/audio/{lesson_id}/{lang}/scene_{scene_i}.wav"


def _save_lesson_bundle(lesson_id: str, lesson_obj: Lesson, lang: str, timing: dict, voice: str) -> dict:
    """Build localized lesson dictionary, save to out/lessons/<lesson_id>/<lang>/lesson.json and update manifest."""
    lang_path = _lang_dir(lesson_id, lang)
    lesson_dict = lesson_obj.model_dump()
    lesson_dict["id"] = lesson_id
    lesson_dict["language"] = lang
    lesson_dict["voice"] = voice

    for i, s in enumerate(lesson_dict["scenes"]):
        t_scene = timing["scenes"][i]
        s["id"] = f"scene-{i}"
        s["duration_ms"] = int(round(t_scene["duration"] * 1000))
        s["audio_url"] = t_scene["audio_url"]
        s["caption"] = t_scene.get("caption") or s.get("narration", "")
        if not s.get("mood"):
            s["mood"] = "happy" if i == 0 else "thinking"

    # Save localized lesson.json
    with open(os.path.join(lang_path, "lesson.json"), "w", encoding="utf-8") as f:
        json.dump(lesson_dict, f, indent=2, ensure_ascii=False)

    # Update manifest.json
    manifest_file = os.path.join(_lesson_dir(lesson_id), "manifest.json")
    manifest = {}
    if os.path.exists(manifest_file):
        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}
    manifest["id"] = lesson_id
    manifest["title"] = lesson_obj.title
    manifest["level"] = lesson_obj.level
    manifest.setdefault("languages", {})[lang] = {
        "status": "ready",
        "voice": voice,
        "total_seconds": timing.get("total_seconds", 0),
        "updated_at": time.time(),
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    return lesson_dict


def _generate_lang_voice(lesson_id: str, lesson_lang: Lesson, lang: str, voice: str) -> tuple[dict, dict]:
    """Generate audio files into dedicated language folder out/lessons/<lesson_id>/<lang>/audio/ and legacy dir."""
    _lang_audio_dir(lesson_id, lang)
    modular_audio_out = os.path.join("out", "lessons", lesson_id, lang, "audio")

    timing = build_timing(
        lesson_lang,
        lang,
        voice=voice,
        file_prefix=lesson_id,
        out_dir=modular_audio_out,
        scene_lang_suffix=lang,
        audio_url_fn=lambda i: _audio_url(lesson_id, i, lang),
        audio_filename_fn=lambda i: f"scene_{i}.wav",
    )

    # Save timing.json at language root
    with open(os.path.join(OUT_DIR, "lessons", lesson_id, lang, "timing.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)

    # Save full localized lesson dict
    lesson_dict = _save_lesson_bundle(lesson_id, lesson_lang, lang, timing, voice)

    # Backward compatibility: mirror WAVs and timing into out/<lesson_id>/
    legacy_dir = _lesson_audio_dir(lesson_id)
    for i in range(len(lesson_lang.scenes)):
        src = os.path.join(HERE, modular_audio_out, f"scene_{i}.wav")
        dst = os.path.join(legacy_dir, f"scene_{i}_{lang}.wav")
        if os.path.exists(src) and not os.path.exists(dst):
            try:
                import shutil
                shutil.copyfile(src, dst)
            except Exception:
                pass
    with open(os.path.join(legacy_dir, f"timing_{lesson_id}_{lang}.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)

    try:
        export_audio_and_srt(lang, out_dir=os.path.join("out", lesson_id),
                             timing_prefix=f"{lesson_id}_{lang}")
    except Exception as e:
        print(f"[export_audio_and_srt] warning: {e}")

    return timing, lesson_dict


# ── Background voice-generation queue ────────────────────────────────────────
_bg_queue: queue.Queue = queue.Queue()
_bg_thread: Optional[threading.Thread] = None
_bg_lock = threading.Lock()
_bg_current_lesson_id: Optional[str] = None  # cancel old jobs on new /generate


def _bg_worker():
    while True:
        item = _bg_queue.get()
        if item is None:
            break
        lesson_id, lesson_en, language, voice = item
        with _bg_lock:
            global _bg_current_lesson_id
            if _bg_current_lesson_id != lesson_id:
                # A newer generate arrived; skip this one
                _bg_queue.task_done()
                continue
        try:
            t0 = time.time()
            # Mark language as generating
            _get_cache()[_voice_cache_key(lesson_id, language)] = {"status": "generating"}
            _persist_cache()
            print(f"[background] starting {language} generation for {lesson_id}...")

            try:
                translated = _cached_translate_lesson(lesson_en, language)
            except Exception as e:
                _get_cache()[_voice_cache_key(lesson_id, language)] = {
                    "status": "failed", "error": str(e),
                }
                _persist_cache()
                print(f"[background] {language} translate failed: {e}")
                _bg_queue.task_done()
                continue

            timing, lesson_dict = _generate_lang_voice(lesson_id, translated, language, voice)

            entry = _get_cache()[_voice_cache_key(lesson_id, language)] = {
                "status": "ready",
                "timing": timing,
                "lesson": lesson_dict,
            }
            _persist_cache()
            print(f"[background] {language} ready in {time.time() - t0:.1f}s (folder: out/lessons/{lesson_id}/{language}/)")
        except Exception as e:
            _get_cache()[_voice_cache_key(lesson_id, language)] = {
                "status": "failed", "error": str(e),
            }
            _persist_cache()
            print(f"[background] {language} failed: {e}")
        finally:
            _bg_queue.task_done()


def _ensure_bg_thread():
    global _bg_thread
    if _bg_thread is None or not _bg_thread.is_alive():
        _bg_thread = threading.Thread(target=_bg_worker, daemon=True)
        _bg_thread.start()


def _enqueue_bg(lesson_id: str, lesson_en: Lesson, languages: list[str], voice: str):
    global _bg_current_lesson_id
    with _bg_lock:
        _bg_current_lesson_id = lesson_id
    # Drain old items
    while not _bg_queue.empty():
        try:
            _bg_queue.get_nowait()
            _bg_queue.task_done()
        except queue.Empty:
            break
    for lang in languages:
        _get_cache()[_voice_cache_key(lesson_id, lang)] = {"status": "pending"}
        _bg_queue.put((lesson_id, lesson_en, lang, voice))
    _persist_cache()


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="Blu Visual Teacher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_media_type(filename: str) -> str:
    if filename.endswith(".mp4"):
        return "video/mp4"
    if filename.endswith(".srt"):
        return "text/plain"
    if filename.endswith(".json"):
        return "application/json"
    return "audio/wav"


# Serve audio & media with no-store so browsers never reuse old files
@app.get("/audio/{lesson_id}/{lang}/{filename}")
def serve_lang_audio(lesson_id: str, lang: str, filename: str):
    paths = [
        os.path.join(OUT_DIR, "lessons", lesson_id, lang, "audio", filename),
        os.path.join(OUT_DIR, "lessons", lesson_id, lang, filename),
        os.path.join(OUT_DIR, lesson_id, filename),
    ]
    for p in paths:
        if os.path.exists(p):
            resp = FileResponse(p, media_type=_get_media_type(filename))
            resp.headers["Cache-Control"] = "no-store"
            return resp
    raise HTTPException(404, f"Media not found: {lesson_id}/{lang}/{filename}")


@app.get("/audio/{lesson_id}/{filename}")
def serve_audio(lesson_id: str, filename: str):
    # 1. Direct file in out/<lesson_id>/<filename>
    legacy_path = os.path.join(OUT_DIR, lesson_id, filename)
    if os.path.exists(legacy_path):
        resp = FileResponse(legacy_path, media_type=_get_media_type(filename))
        resp.headers["Cache-Control"] = "no-store"
        return resp

    # 2. Search inside out/lessons/<lesson_id>/
    lesson_root = os.path.join(OUT_DIR, "lessons", lesson_id)
    if os.path.exists(lesson_root):
        for root, _, files in os.walk(lesson_root):
            if filename in files:
                resp = FileResponse(os.path.join(root, filename), media_type=_get_media_type(filename))
                resp.headers["Cache-Control"] = "no-store"
                return resp

    raise HTTPException(404, f"Media not found: {lesson_id}/{filename}")


@app.get("/health")
def health():
    return {"ok": True, "languages": SUPPORTED}


@app.post("/clear_cache")
def clear_cache():
    global _cache, _trans_cache
    _cache.clear()
    _trans_cache.clear()
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        f.write("{}\n")
    return {"ok": True, "message": "Cache cleared"}


# ── Request models ─────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=100)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    language: str = "en"
    target_seconds: Optional[int] = None        # 30–120
    target_length_seconds: Optional[int] = None  # legacy alias
    scene_count: Optional[int] = None           # 3–10 scenes
    voice: Literal["female", "male"] = "female"
    local_context: bool = True
    simpler: bool = False
    previous_question: Optional[str] = None
    generate_all_voices: bool = True  # Automatically generate Hindi then Kannada after English

    @field_validator("level", mode="before")
    @classmethod
    def normalize_level(cls, v):
        if not isinstance(v, str):
            return "beginner"
        v = v.lower().strip()
        if "adv" in v:
            return "advanced"
        if "inter" in v or "med" in v:
            return "intermediate"
        return "beginner"


class RevoiceRequest(BaseModel):
    lesson_id: str
    lang: str
    voice: Literal["female", "male"] = "female"


class ExportRequest(BaseModel):
    lesson_id: str
    language: str = "en"
    player_url: str = "http://localhost:5173"


# ── /generate ─────────────────────────────────────────────────────────────────
@app.post("/generate")
def generate(req: GenerateRequest):
    if req.language not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    # Allow 30–120s; default 90s so videos are comfortably ~1 min
    target_sec = max(30, min(120, req.target_seconds or req.target_length_seconds or 90))
    req_scene_count = max(3, min(10, req.scene_count)) if req.scene_count else None

    plan_key = _plan_cache_key(req.topic, req.level, target_sec, req.simpler, req_scene_count)
    lesson_id = _lesson_id(plan_key)

    cache = _get_cache()
    seconds: dict = {}

    # ── 1. Plan (English, cached) ─────────────────────────────────────────────
    plan_hit = plan_key in cache
    if plan_hit:
        print(f"[generate] plan cache hit for '{req.topic}' [{req.level}]")
        lesson_en = Lesson.model_validate(cache[plan_key])
        source = "llm"
        seconds["plan"] = 0.0
    else:
        t = time.time()
        lesson_en, source = plan_lesson(
            req.topic,
            level=req.level,
            local_context=req.local_context,
            target_seconds=target_sec,
            simpler=req.simpler,
            previous_question=req.previous_question,
            scene_count=req_scene_count,
        )
        seconds["plan"] = round(time.time() - t, 1)
        if source != "fallback":
            cache[plan_key] = lesson_en.model_dump()
            _persist_cache()

    # Save canonical master lesson in out/lessons/<lesson_id>/
    lesson_root = _lesson_dir(lesson_id)
    with open(os.path.join(lesson_root, "lesson_master.json"), "w", encoding="utf-8") as f:
        json.dump(lesson_en.model_dump(), f, indent=2, ensure_ascii=False)

    # ── 2. English voice is ALWAYS generated first for immediate playback ─────
    en_voice_key = _voice_cache_key(lesson_id, "en")
    en_voice_hit = en_voice_key in cache and cache[en_voice_key].get("status") == "ready"
    en_lang_file = os.path.join(OUT_DIR, "lessons", lesson_id, "en", "lesson.json")

    if os.path.exists(en_lang_file) and en_voice_hit:
        with open(en_lang_file, "r", encoding="utf-8") as f:
            en_lesson_dict = json.load(f)
        en_timing = cache[en_voice_key]["timing"]
        seconds["voice"] = 0.0
        print(f"[generate] English voice cache hit for '{req.topic}'")
    else:
        t = time.time()
        en_timing, en_lesson_dict = _generate_lang_voice(lesson_id, lesson_en, "en", req.voice)
        seconds["voice"] = round(time.time() - t, 1)
        cache[en_voice_key] = {"status": "ready", "timing": en_timing, "lesson": en_lesson_dict}
        _persist_cache()

    total_stage = round(sum(seconds.values()), 1)
    print(
        f"[generate] plan: {seconds['plan']}s | en voice: {seconds.get('voice', 0)}s | total: {total_stage}s"
        f" | video: {en_timing['total_seconds']}s"
    )

    # ── 3. Background queue: Hindi first, then Kannada ─────────────────────────
    # The user can play English right away while Hindi and Kannada generate in sequence
    bg_langs = ["hi", "kn"]
    pending_to_enqueue = []
    voices_status: dict[str, str] = {"en": "ready"}

    for lang in bg_langs:
        lang_file = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "lesson.json")
        vk = _voice_cache_key(lesson_id, lang)
        if os.path.exists(lang_file) or cache.get(vk, {}).get("status") == "ready":
            voices_status[lang] = "ready"
        elif req.generate_all_voices:
            voices_status[lang] = "pending"
            pending_to_enqueue.append(lang)
            cache[vk] = {"status": "pending"}
        else:
            voices_status[lang] = "available"

    if req.generate_all_voices and pending_to_enqueue:
        _persist_cache()
        _ensure_bg_thread()
        _enqueue_bg(lesson_id, lesson_en, pending_to_enqueue, req.voice)

    response = {
        "lesson_id": lesson_id,
        "source": source,
        "error": "Model validation failed; running verified fallback lesson" if source == "fallback" else None,
        "lesson": en_lesson_dict,
        **en_lesson_dict,   # flattened for legacy players
        "timing": {"en": en_timing},
        "voices": voices_status,
        "stage_seconds": seconds,
        "cache": {"plan_hit": plan_hit, "voice_hit": en_voice_hit},
    }
    return response


# ── POST /revoice (Instant or on-demand language switching) ───────────────────
@app.post("/revoice")
def revoice(req: RevoiceRequest):
    if req.lang not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    # 1. Check if already generated and saved in lesson folder
    lang_lesson_file = os.path.join(OUT_DIR, "lessons", req.lesson_id, req.lang, "lesson.json")
    if os.path.exists(lang_lesson_file):
        try:
            with open(lang_lesson_file, "r", encoding="utf-8") as f:
                lesson_dict = json.load(f)
            print(f"[revoice] instant switch from disk folder: {req.lesson_id} [{req.lang}]")
            return lesson_dict
        except Exception as e:
            print(f"[revoice] error loading {lang_lesson_file}: {e}")

    # 2. Check memory cache
    cache = _get_cache()
    vk = _voice_cache_key(req.lesson_id, req.lang)
    if cache.get(vk, {}).get("status") == "ready" and "lesson" in cache[vk]:
        print(f"[revoice] instant switch from memory: {req.lesson_id} [{req.lang}]")
        return cache[vk]["lesson"]

    # 3. If currently pending or generating in background, wait cleanly for it to complete
    status = cache.get(vk, {}).get("status")
    if status in ("pending", "generating"):
        print(f"[revoice] waiting for background worker to complete {req.lang} for {req.lesson_id}...")
        for _ in range(120):  # up to 60s
            time.sleep(0.5)
            if os.path.exists(lang_lesson_file):
                try:
                    with open(lang_lesson_file, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    pass
            cache = _get_cache()
            if cache.get(vk, {}).get("status") == "ready" and "lesson" in cache[vk]:
                return cache[vk]["lesson"]
            if cache.get(vk, {}).get("status") == "failed":
                raise HTTPException(500, f"Background voice synthesis failed for {req.lang}")

    # 4. Retrieve English master lesson
    master_file = os.path.join(OUT_DIR, "lessons", req.lesson_id, "lesson_master.json")
    lesson_en = None
    if os.path.exists(master_file):
        try:
            with open(master_file, "r", encoding="utf-8") as f:
                lesson_en = Lesson.model_validate(json.load(f))
        except Exception as e:
            print(f"[revoice] error reading master lesson: {e}")

    if lesson_en is None:
        # Fallback search in cache
        for k, v in cache.items():
            if isinstance(v, dict) and v.get("title") and v.get("scenes"):
                if _lesson_id(k) == req.lesson_id:
                    lesson_en = Lesson.model_validate(v)
                    break

    if lesson_en is None:
        raise HTTPException(404, f"Lesson {req.lesson_id} not found to revoice")

    # 5. Generate on-demand if not already generating
    print(f"[revoice] generating {req.lang} audio on demand for {req.lesson_id}...")
    if req.lang == "en":
        lesson_lang = lesson_en
    else:
        lesson_lang = _cached_translate_lesson(lesson_en, req.lang)

    timing, lesson_dict = _generate_lang_voice(req.lesson_id, lesson_lang, req.lang, req.voice)
    cache[vk] = {"status": "ready", "timing": timing, "lesson": lesson_dict}
    _persist_cache()
    return lesson_dict


# ── GET /lesson/{lesson_id}/voices ────────────────────────────────────────────
@app.get("/lesson/{lesson_id}/voices")
def get_voices(lesson_id: str):
    cache = _get_cache()
    voices = {}
    timing = {}
    for lang in SUPPORTED:
        # Check disk first
        lang_file = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "lesson.json")
        timing_file = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "timing.json")
        vk = _voice_cache_key(lesson_id, lang)
        entry = cache.get(vk, {})

        if os.path.exists(lang_file) and os.path.exists(timing_file):
            voices[lang] = "ready"
            try:
                with open(timing_file, "r", encoding="utf-8") as f:
                    timing[lang] = json.load(f)
            except Exception:
                pass
        else:
            status = entry.get("status", "available")
            voices[lang] = status
            if status == "ready" and "timing" in entry:
                timing[lang] = entry["timing"]
    return {"voices": voices, "timing": timing}


# ── GET /lesson/{lesson_id} & /lesson/{lesson_id}/{lang} ──────────────────────
@app.get("/lesson/{lesson_id}")
@app.get("/lesson/{lesson_id}/{lang}")
def get_lesson(lesson_id: str, lang: str = "en"):
    if lang not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")
    if lesson_id == "sample" or lesson_id.startswith("sample"):
        sample_file = os.path.join(HERE, "..", "public", "sample", f"lesson_{lang}.json")
        if os.path.exists(sample_file):
            with open(sample_file, "r", encoding="utf-8") as f:
                return json.load(f)
    lang_lesson_file = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "lesson.json")
    if os.path.exists(lang_lesson_file):
        with open(lang_lesson_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return revoice(RevoiceRequest(lesson_id=lesson_id, lang=lang))


# ── POST /export & GET /download ──────────────────────────────────────────────
@app.post("/export")
def export(req: ExportRequest):
    if req.language not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    # Handle sample lesson fallback
    if req.lesson_id == "sample" or req.lesson_id.startswith("sample"):
        sample_dir = os.path.join(OUT_DIR, "sample")
        os.makedirs(sample_dir, exist_ok=True)
        pub_sample = os.path.join(HERE, "..", "public", "sample")
        if os.path.exists(pub_sample):
            import shutil
            for f in os.listdir(pub_sample):
                src_f = os.path.join(pub_sample, f)
                dst_f = os.path.join(sample_dir, f)
                if not os.path.exists(dst_f):
                    try:
                        shutil.copyfile(src_f, dst_f)
                    except Exception:
                        pass
        is_ready = True
    else:
        # Check if voice is ready (on disk or in cache)
        lang_file = os.path.join(OUT_DIR, "lessons", req.lesson_id, req.language, "lesson.json")
        cache = _get_cache()
        vk = _voice_cache_key(req.lesson_id, req.language)
        is_ready = os.path.exists(lang_file) or (cache.get(vk, {}).get("status") == "ready")

    if not is_ready:
        raise HTTPException(404, f"Voice for {req.language} not ready yet")

    audio_subdir = os.path.join("out", req.lesson_id)
    timing_prefix = f"{req.lesson_id}_{req.language}" if not req.lesson_id.startswith("sample") else "sample_en"
    try:
        mp4_path, srt_path, wav_path, total_seconds, stage_seconds = export_mp4(
            req.language,
            player_url=req.player_url,
            out_dir=audio_subdir,
            timing_prefix=timing_prefix,
            lesson_id=req.lesson_id,
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except TimeoutError as e:
        raise HTTPException(504, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Export failed: {e}")

    # Also copy exported mp4 to modular folder out/lessons/<lesson_id>/<lang>/video.mp4
    try:
        mod_video_path = os.path.join(OUT_DIR, "lessons", req.lesson_id, req.language, "video.mp4")
        import shutil
        shutil.copyfile(mp4_path, mod_video_path)
    except Exception:
        pass

    rel = lambda p: f"/audio/{req.lesson_id}/{os.path.basename(p)}"
    return {
        "ok": True,
        "language": req.language,
        "mp4_url": rel(mp4_path),
        "download_url": f"/download/{req.lesson_id}/{req.language}",
        "srt_url": rel(srt_path),
        "wav_url": rel(wav_path),
        "total_seconds": total_seconds,
        "stage_seconds": stage_seconds,
    }


@app.get("/download/{lesson_id}/{lang}")
def download_video(lesson_id: str, lang: str = "en"):
    candidates = [
        os.path.join(OUT_DIR, "lessons", lesson_id, lang, "video.mp4"),
        os.path.join(OUT_DIR, lesson_id, f"lesson_{lesson_id}_{lang}.mp4"),
        os.path.join(OUT_DIR, lesson_id, f"lesson_{lang}.mp4"),
        os.path.join(OUT_DIR, "sample", "lesson_sample_en.mp4"),
    ]
    for p in candidates:
        if os.path.exists(p):
            title = "lesson"
            meta_file = os.path.join(OUT_DIR, "lessons", lesson_id, lang, "lesson.json")
            if os.path.exists(meta_file):
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        t = data.get("title", "")
                        if t:
                            title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in t.lower()).strip("_")
                except Exception:
                    pass
            filename = f"{title}_{lang}.mp4"
            return FileResponse(
                p,
                media_type="video/mp4",
                filename=filename,
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
    raise HTTPException(404, f"Exported MP4 video not found for {lesson_id} ({lang}). Please export first.")