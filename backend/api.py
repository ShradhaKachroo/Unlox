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
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from ocr import extract_text_from_image
from planner import plan_lesson
from pydantic import BaseModel, Field, field_validator
from schema import Lesson
from translate import translate_lesson, translate_text
from tts import HERE, SUPPORTED, build_timing

# ── Prompt version: bump whenever planner prompt changes ──────────────────────
PROMPT_VERSION = 7  # Phase 7: monotonic progression between distinct concepts & anti-repeat audio loop fix

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
    """translate_lesson with full regional slide translation (headings, items, quiz)."""
    if language == "en":
        return lesson
    result = lesson.model_copy(deep=True)
    result.language = language
    if result.title:
        result.title = _cached_translate_text(lesson.title, language)
    for scene in result.scenes:
        if scene.narration:
            scene.narration = _cached_translate_text(scene.narration, language)
        if getattr(scene, "heading", None):
            scene.heading = _cached_translate_text(scene.heading, language)
        if getattr(scene, "subtitle", None):
            scene.subtitle = _cached_translate_text(scene.subtitle, language)
        if getattr(scene, "items", None) and isinstance(scene.items, list):
            scene.items = [_cached_translate_text(it, language) for it in scene.items if it]
        if getattr(scene, "question", None):
            scene.question = _cached_translate_text(scene.question, language)
        if getattr(scene, "options", None) and isinstance(scene.options, list):
            scene.options = [_cached_translate_text(opt, language) for opt in scene.options if opt]
        if getattr(scene, "explanation", None):
            scene.explanation = _cached_translate_text(scene.explanation, language)
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


class OcrPayload(BaseModel):
    image_base64: Optional[str] = None

@app.post("/ocr")
async def ocr_endpoint(file: Optional[UploadFile] = File(None), payload: Optional[OcrPayload] = None):
    """Extract text and detected topic from image offline using rapidocr."""
    try:
        import base64
        contents = None
        if file is not None:
            contents = await file.read()
        elif payload and payload.image_base64:
            b64_str = payload.image_base64
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            contents = base64.b64decode(b64_str)

        if not contents:
            raise HTTPException(status_code=400, detail="No image provided (send file or image_base64)")

        res = extract_text_from_image(contents)
        return {
            "ok": True,
            "text": res["text"],
            "lines": res["lines"],
            "topic": res["topic"],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ocr] error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


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

    # Allow 30–180s; default 90s (supports longer multi-slide lessons)
    target_sec = max(30, min(180, req.target_seconds or req.target_length_seconds or 90))
    req_scene_count = max(3, min(10, req.scene_count)) if req.scene_count else None

    plan_key = _plan_cache_key(req.topic, req.level, target_sec, req.simpler, req_scene_count)
    lesson_id = _lesson_id(plan_key)

    cache = _get_cache()
    seconds: dict = {}

    target_lang = req.language if req.language in SUPPORTED else "en"

    print("\n" + "╔" + "═" * 70 + "╗")
    print(f"║ 🚀 [WORKFLOW] NEW LESSON GENERATION PIPELINE INITIATED")
    print(f"║    • Topic:         '{req.topic}'")
    print(f"║    • Level:         {req.level.upper()}")
    print(f"║    • Language:      {target_lang.upper()} | Voice: {req.voice}")
    print(f"║    • Target Length: {target_sec}s ({req_scene_count or 'auto'} scenes)")
    print(f"║    • Lesson ID:     {lesson_id}")
    print("╚" + "═" * 70 + "╝")

    # ── 1. Plan (English, cached) ─────────────────────────────────────────────
    plan_hit = plan_key in cache
    print(f"\n🧠 [WORKFLOW] [Step 1/4] Planning English Master Lesson...")
    if plan_hit:
        print(f"   ⚡ Plan Cache HIT for '{req.topic}' [{req.level.upper()}] (0.0s)")
        lesson_en = Lesson.model_validate(cache[plan_key])
        source = "llm"
        seconds["plan"] = 0.0
        print(f"   📦 [WORKFLOW] Loaded cached master lesson '{lesson_en.title}' ({len(lesson_en.scenes)} scenes)")
    else:
        t = time.time()
        lesson_en, source = plan_lesson(
            req.topic,
            level=req.level,
            local_context=req.local_context,
            target_seconds=target_sec,
            picked_language=target_lang,
            simpler=req.simpler,
            previous_question=req.previous_question,
            scene_count=req_scene_count,
        )
        seconds["plan"] = round(time.time() - t, 1)
        if source != "fallback":
            cache[plan_key] = lesson_en.model_dump()
            _persist_cache()
        print(f"   ✓ [Step 1/4] Master lesson plan created in {seconds['plan']}s")

    # Save canonical master lesson in out/lessons/<lesson_id>/
    lesson_root = _lesson_dir(lesson_id)
    with open(os.path.join(lesson_root, "lesson_master.json"), "w", encoding="utf-8") as f:
        json.dump(lesson_en.model_dump(), f, indent=2, ensure_ascii=False)

    # ── 2. Generate voice in user's SELECTED language for immediate playback ───
    if target_lang != "en":
        print(f"\n🌐 [WORKFLOW] [Step 2/4] Translating lesson content into '{target_lang}'...")
        target_lesson = _cached_translate_lesson(lesson_en, target_lang)
        print(f"   ✓ [Step 2/4] Translated title: '{target_lesson.title}'")
    else:
        print(f"\n🌐 [WORKFLOW] [Step 2/4] Language is English (no translation needed)")
        target_lesson = lesson_en

    target_voice_key = _voice_cache_key(lesson_id, target_lang)
    target_voice_hit = target_voice_key in cache and cache[target_voice_key].get("status") == "ready"
    target_lang_file = os.path.join(OUT_DIR, "lessons", lesson_id, target_lang, "lesson.json")

    print(f"\n🎙️ [WORKFLOW] [Step 3/4] Synthesizing speech audio & generating timing alignment...")
    if os.path.exists(target_lang_file) and target_voice_hit:
        with open(target_lang_file, "r", encoding="utf-8") as f:
            target_lesson_dict = json.load(f)
        target_timing = cache[target_voice_key]["timing"]
        seconds["voice"] = 0.0
        print(f"   ⚡ Voice Cache HIT for '{req.topic}' [{target_lang.upper()}] (0.0s)")
    else:
        t = time.time()
        target_timing, target_lesson_dict = _generate_lang_voice(lesson_id, target_lesson, target_lang, req.voice)
        seconds["voice"] = round(time.time() - t, 1)
        cache[target_voice_key] = {"status": "ready", "timing": target_timing, "lesson": target_lesson_dict}
        _persist_cache()
        print(f"   ✓ [Step 3/4] Audio synthesized in {seconds['voice']}s (Total duration: {target_timing['total_seconds']}s)")

    print(f"\n💾 [WORKFLOW] [Step 4/4] Saved lesson bundle to disk:")
    print(f"   • lesson.json:   out/lessons/{lesson_id}/{target_lang}/lesson.json")
    print(f"   • timing.json:   out/lessons/{lesson_id}/{target_lang}/timing.json")
    print(f"   • manifest.json: out/lessons/{lesson_id}/manifest.json")

    total_stage = round(sum(seconds.values()), 1)
    print("\n" + "╔" + "═" * 70 + "╗")
    print(f"║ 🎉 [WORKFLOW COMPLETE] LESSON READY IN {total_stage}s!")
    print(f"║    • Lesson ID:      {lesson_id}")
    print(f"║    • Title:          '{target_lesson_dict.get('title')}'")
    print(f"║    • Total Duration: {target_timing['total_seconds']}s")
    print(f"║    • Total Scenes:   {len(target_lesson_dict.get('scenes', []))}")
    print(f"║    • Audio Voice:    {target_lang.upper()} ({req.voice})")
    print("╚" + "═" * 70 + "╝")

    print(f"   📄 [WORKFLOW] Saved lesson bundle: out/lessons/{lesson_id}/{target_lang}/lesson.json\n")

    # ── 3. Background queue: Queue in English only (if user selected non-English) ──
    bg_langs = ["en"] if target_lang != "en" else []
    pending_to_enqueue = []
    voices_status: dict[str, str] = {target_lang: "ready"}

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
        "lesson": target_lesson_dict,
        **target_lesson_dict,   # flattened for legacy players
        "timing": {target_lang: target_timing},
        "voices": voices_status,
        "stage_seconds": seconds,
        "cache": {"plan_hit": plan_hit, "voice_hit": target_voice_hit},
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


# ── POST /ask (Interactive AI Q&A Bot powered by real Ollama phi3.5 model) ───
class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    topic: Optional[str] = None
    scene_heading: Optional[str] = None
    scene_narration: Optional[str] = None
    language: Optional[str] = "en"
    history: Optional[list[ChatHistoryMessage]] = None


@app.post("/ask")
def ask_question(req: AskRequest):
    """Answer learner questions conversationally using real local LLM (Ollama phi3.5)."""
    import ollama
    from planner import MODEL as OLLAMA_MODEL

    # Construct pedagogical system prompt
    context_lines = []
    if req.topic:
        context_lines.append(f"- Current Lesson Topic: {req.topic}")
    if req.scene_heading:
        context_lines.append(f"- Current Slide/Concept: {req.scene_heading}")
    if req.scene_narration:
        context_lines.append(f"- Current Explanation: {req.scene_narration}")
    context_block = "\n".join(context_lines) if context_lines else "- General Visual Learning & Programming"

    lang_instruction = ""
    if req.language and req.language != "en":
        lang_instruction = f"\n- If requested or appropriate, provide bilingual support or key terms in {req.language}."

    system_prompt = (
        "You are Blu, a warm, friendly, encouraging, and brilliant AI learning companion and coding tutor. "
        "Your goal is to answer the student's question clearly, conversationally, and pedagogically.\n\n"
        f"Learning Context:\n{context_block}\n\n"
        "Guidelines:\n"
        "1. Answer conversationally in 2 to 4 concise, crystal-clear paragraphs or bullet points.\n"
        "2. Ground abstract ideas in intuitive, real-world analogies (e.g. cricket, chai, postal mail, everyday objects).\n"
        "3. If code is requested or relevant, provide short (max 4-5 lines), clean, idiomatic code with brief inline comments.\n"
        "4. Tone: warm, engaging, patient, and encouraging.\n"
        "5. Be direct, helpful, and concise without unnecessary corporate jargon."
        f"{lang_instruction}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        for m in req.history[-6:]:
            messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.question})

    try:
        t0 = time.time()
        client = ollama.Client(host="http://127.0.0.1:11434", timeout=45)
        r = client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            options={
                "temperature": 0.6,
                "num_ctx": 2048,
                "num_predict": 250,
                "keep_alive": "10m",
            },
        )
        answer = r.message.content.strip()
        elapsed = round(time.time() - t0, 2)
        print(f"[ask] answered '{req.question[:30]}...' via {OLLAMA_MODEL} in {elapsed}s")
        return {
            "ok": True,
            "answer": answer,
            "model": OLLAMA_MODEL,
            "source": "ollama",
            "elapsed_seconds": elapsed,
        }
    except Exception as e:
        print(f"[ask] ollama chat error: {e}, using pedagogical fallback")
        topic_str = req.topic or "this topic"
        fallback_ans = (
            f"Here is a quick intuition for **{topic_str}**:\n\n"
            f"Think of this step-by-step: in programming and computer science, "
            f"every big concept is just simple building blocks put together.\n\n"
            f"- **Core Idea**: Look at what goes in as input, and what gets produced as output.\n"
            f"- **Next Step**: Try testing a simple case or tracing it with a small example to see the pattern clearly!\n\n"
            f"*(Offline AI tutor active. Details: {str(e)})*"
        )
        return {
            "ok": True,
            "answer": fallback_ans,
            "model": "fallback_tutor",
            "source": "fallback",
            "error": str(e),
        }