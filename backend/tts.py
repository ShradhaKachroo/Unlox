import json
import os
import warnings
from typing import Callable, Optional

warnings.filterwarnings("ignore", category=FutureWarning)

import numpy as np
import soundfile as sf
import torch
from kokoro_onnx import Kokoro
from transformers import AutoTokenizer, VitsModel

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "models", "voices-v1.0.bin")

# Speech speed & scene pacing (lower speed = speaks slower, duration increases)
SPEECH_SPEED = 0.85
# Pause between audio end and scene transition (gives learner breathing room)
PAUSE = 0.8  # seconds

VOICE_PRESETS = {
    "en": {
        "female": ("af_heart", "en-us"),
        "male": ("am_adam", "en-us"),
    },
    "hi": {
        "female": ("hf_beta", "hi"),
        "male": ("hm_omega", "hi"),
    },
    "es": {
        "female": ("ef_dora", "es"),
        "male": ("em_alex", "es"),
    },
    "fr": {
        "female": ("ff_siwis", "fr-fr"),
        "male": ("ff_siwis", "fr-fr"),
    },
}

MMS_MAP = {
    "kn": "facebook/mms-tts-kan",
    "ta": "facebook/mms-tts-tam",
    "te": "facebook/mms-tts-tel",
    "bn": "facebook/mms-tts-ben",
    "mr": "facebook/mms-tts-mar",
    "gu": "facebook/mms-tts-guj",
}

SUPPORTED = list(VOICE_PRESETS) + list(MMS_MAP)

# Words-per-second calibrated for speech rate (0.85x)
WORDS_PER_SEC = {
    "en": 1.95,
    "hi": 1.95,
    "es": 1.90,
    "fr": 1.85,
    "kn": 1.40,
    "ta": 1.40,
    "te": 1.40,
    "bn": 1.45,
    "mr": 1.50,
    "gu": 1.45,
}

_kokoro = None
_mms: dict = {}


def _get_kokoro():
    global _kokoro
    if _kokoro is None:
        _kokoro = Kokoro(MODEL, VOICES)
    return _kokoro


def _get_mms(language):
    if language not in _mms:
        name = MMS_MAP[language]
        _mms[language] = (
            AutoTokenizer.from_pretrained(name),
            VitsModel.from_pretrained(name),
        )
    return _mms[language]


def make_audio(
    text: str,
    path: str,
    language: str = "en",
    voice_gender: str = "female",
    speed: float = SPEECH_SPEED,
) -> float:
    """Synthesise text to WAV, trim silence, return duration in seconds."""
    if language in VOICE_PRESETS:
        gender_preset = VOICE_PRESETS[language]
        voice_id, lang_code = gender_preset.get(voice_gender, gender_preset["female"])
        samples, sr = _get_kokoro().create(text, voice=voice_id, speed=speed, lang=lang_code)
    elif language in MMS_MAP:
        try:
            tok, model = _get_mms(language)
            torch.manual_seed(0)
            with torch.no_grad():
                samples = model(**tok(text, return_tensors="pt"), speaking_rate=speed).waveform[0].numpy()
            sr = model.config.sampling_rate
        except Exception as e:
            print(f"[tts] MMS voice synthesis error for {language}: {e}, falling back to Kokoro voice")
            samples, sr = _get_kokoro().create(text, voice="af_heart", speed=speed, lang="en-us")
    else:
        # Graceful fallback for any unknown language
        print(f"[tts] language {language} not directly in presets; using default Kokoro voice")
        samples, sr = _get_kokoro().create(text, voice="af_heart", speed=speed, lang="en-us")

    # Trim leading/trailing silence (amplitude < 0.01)
    abs_samples = np.abs(samples)
    mask = abs_samples > 0.01
    if np.any(mask):
        indices = np.where(mask)[0]
        samples = samples[indices[0]: indices[-1] + 1]

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sf.write(path, samples, sr)
    return len(samples) / sr


def _sentence_chunks(text: str, audio_seconds: float, start: float) -> list[dict]:
    """Split narration into per-sentence caption chunks timed by character share."""
    import re
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if not sentences:
        return [{"text": text, "start": round(start, 3), "end": round(start + audio_seconds, 3)}]
    total_chars = sum(len(s) for s in sentences)
    chunks = []
    t = start
    for s in sentences:
        share = len(s) / total_chars if total_chars else 1 / len(sentences)
        dur = audio_seconds * share
        chunks.append({"text": s, "start": round(t, 3), "end": round(t + dur, 3)})
        t += dur
    return chunks


def build_timing(
    lesson,
    language: str = "en",
    voice: str = "female",
    file_prefix: str = None,
    out_dir: str = "out",
    scene_lang_suffix: str = None,
    audio_url_fn: Optional[Callable[[int], str]] = None,
    audio_filename_fn: Optional[Callable[[int], str]] = None,
    speed: float = SPEECH_SPEED,
    pause: float = PAUSE,
    target_seconds: Optional[int] = None,
) -> dict:
    """Generate audio for each scene, return timing dict.

    Audio files: out/<out_dir>/scene_<i>_<lang>.wav or custom filename.
    Each scene duration accommodates audio + pause + target pacing dwell time.
    """
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)

    lang_sfx = scene_lang_suffix or language
    prefix = file_prefix or language
    num_scenes = len(lesson.scenes)

    raw_scenes_data = []
    print(f"\n🎙️ [TTS] Synthesizing speech ({language.upper()} / {voice}) for {num_scenes} scenes...")
    for i, scene in enumerate(lesson.scenes):
        audio_name = audio_filename_fn(i) if audio_filename_fn else f"scene_{i}_{lang_sfx}.wav"
        wav = os.path.join(out_path, audio_name)
        audio_seconds = make_audio(scene.narration, wav, language=language, voice_gender=voice, speed=speed)
        raw_duration = round(audio_seconds + pause, 3)
        raw_scenes_data.append((i, scene, audio_name, audio_seconds, raw_duration))

    raw_total = sum(d for _, _, _, _, d in raw_scenes_data)
    extra_per_scene = 0.0
    if target_seconds and target_seconds > raw_total and num_scenes > 0:
        extra_per_scene = round((target_seconds - raw_total) / num_scenes, 3)
        print(f"   ⏱️ [TTS] Pacing alignment: adding {extra_per_scene:.2f}s visual dwell per scene to reach {target_seconds}s target")

    scenes_timing = []
    t = 0.0
    for i, scene, audio_name, audio_seconds, raw_duration in raw_scenes_data:
        duration = round(raw_duration + extra_per_scene, 3)
        scene_title = (getattr(scene, "heading", None) or f"Scene {i}")[:40]
        print(f"   • Scene {i} [{scene.type}]: '{scene_title}' -> audio {audio_seconds:.2f}s (scene display duration: {duration:.2f}s)")

        audio_url = (
            audio_url_fn(i) if audio_url_fn
            else f"/audio/{prefix}/{audio_name}"
        )

        chunks = _sentence_chunks(scene.narration, audio_seconds, t)
        scenes_timing.append({
            "scene": i,
            "audio": audio_name,
            "audio_url": audio_url,
            "audio_seconds": round(audio_seconds, 3),
            "start": round(t, 3),
            "duration": duration,
            "caption": scene.narration,
            "caption_chunks": chunks,
        })
        t += duration

    total = round(t, 3)
    print(f"⏱️ [TTS] Synthesis complete! Total Lesson Duration: {total:.2f}s across {len(scenes_timing)} scenes")
    timing = {
        "language": language,
        "voice": voice,
        "total_seconds": total,
        "scenes": scenes_timing,
        "file_prefix": prefix,
    }

    if total > 150:
        timing["warning"] = f"Total {total}s exceeds target."

    # Write timing JSON files
    timing_path = os.path.join(out_path, f"timing_{prefix}_{lang_sfx}.json")
    with open(timing_path, "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)
    # Direct timing.json for modular folder layout
    with open(os.path.join(out_path, "timing.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)
    # Legacy alias
    with open(os.path.join(out_path, f"timing_{language}.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)

    return timing