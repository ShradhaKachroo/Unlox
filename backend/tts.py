import json
import os

import soundfile as sf
import torch
from kokoro_onnx import Kokoro
from transformers import AutoTokenizer, VitsModel

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "models", "voices-v1.0.bin")

PAUSE = 0.5  # seconds of silence after each scene

# Mature, professional adult educator voices (replacing child-like hf_alpha)
VOICE_PRESETS = {
    "en": {
        "female": ("af_heart", "en-us"),  # Warm, articulate adult educator voice
        "male": ("am_adam", "en-us"),     # Rich, clear adult male narrator
    },
    "hi": {
        "female": ("hf_beta", "hi"),      # Mature Indian female voice
        "male": ("hm_omega", "hi"),       # Resonant Indian male voice
    },
}

MMS_MAP = {
    "kn": "facebook/mms-tts-kan",
}

SUPPORTED = list(VOICE_PRESETS) + list(MMS_MAP)

_kokoro = None
_mms = {}


def _get_kokoro():
    global _kokoro
    if _kokoro is None:
        _kokoro = Kokoro(MODEL, VOICES)
    return _kokoro


def _get_mms(language):
    if language not in _mms:
        name = MMS_MAP[language]
        _mms[language] = (AutoTokenizer.from_pretrained(name), VitsModel.from_pretrained(name))
    return _mms[language]


def make_audio(text, path, language="en", voice_gender="female"):
    """Writes a WAV file with adult natural teacher voice and returns its length in seconds."""
    if language in VOICE_PRESETS:
        gender_preset = VOICE_PRESETS[language]
        voice_id, lang_code = gender_preset.get(voice_gender, gender_preset.get("female"))
        samples, sr = _get_kokoro().create(text, voice=voice_id, speed=1.0, lang=lang_code)
    elif language in MMS_MAP:
        tok, model = _get_mms(language)
        torch.manual_seed(0)  # same text -> same audio length
        with torch.no_grad():
            samples = model(**tok(text, return_tensors="pt")).waveform[0].numpy()
        sr = model.config.sampling_rate
    else:
        raise ValueError(f"unsupported language: {language}")

    sf.write(path, samples, sr)
    return len(samples) / sr


def build_timing(lesson, language="en", voice="female", target_seconds: int = None, out_dir="out"):
    """Audio first with smart duration pacing to match requested lesson target_seconds.
    Guarantees every scene has ample time for voice narration, visual absorption,
    and interactive quiz solving.
    """
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)

    raw_scenes = []
    for i, scene in enumerate(lesson.scenes):
        wav = os.path.join(out_path, f"scene_{i}_{language}.wav")
        seconds = make_audio(scene.narration, wav, language=language, voice_gender=voice)
        raw_scenes.append({
            "scene": i,
            "audio": f"scene_{i}_{language}.wav",
            "audio_seconds": round(seconds, 2),
            "caption": scene.narration,
            "type": getattr(scene, "type", ""),
        })

    n = len(raw_scenes)
    # Every scene requires at least audio_seconds + 0.8s buffer
    min_durations = [s["audio_seconds"] + 0.8 for s in raw_scenes]
    if raw_scenes and raw_scenes[-1]["type"] == "quiz" and (target_seconds or 0) >= 100:
        min_durations[-1] = max(min_durations[-1], 16.0)

    total_min = sum(min_durations)

    durations = list(min_durations)
    if target_seconds and target_seconds > total_min and n > 0:
        extra = float(target_seconds - total_min)
        # Distribute remaining extra time across all scenes for visual comprehension
        per_scene = extra / n
        for i in range(n):
            durations[i] += per_scene

    scenes = []
    t = 0.0
    for i, s in enumerate(raw_scenes):
        dur = round(durations[i], 2)
        scenes.append({
            "scene": s["scene"],
            "audio": s["audio"],
            "audio_seconds": s["audio_seconds"],
            "start": round(t, 2),
            "duration": dur,
            "caption": s["caption"],
        })
        t += dur

    timing = {"language": language, "voice": voice, "total_seconds": round(t, 2), "scenes": scenes}
    with open(os.path.join(out_path, f"timing_{language}.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)
    return timing