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


def build_timing(lesson, language="en", voice="female", out_dir="out"):
    """Audio first: each scene lasts as long as its voice plus a pause."""
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)

    scenes = []
    t = 0.0
    for i, scene in enumerate(lesson.scenes):
        wav = os.path.join(out_path, f"scene_{i}_{language}.wav")
        seconds = make_audio(scene.narration, wav, language=language, voice_gender=voice)
        duration = seconds + PAUSE
        scenes.append({
            "scene": i,
            "audio": f"scene_{i}_{language}.wav",
            "audio_seconds": round(seconds, 2),
            "start": round(t, 2),
            "duration": round(duration, 2),
            "caption": scene.narration,
        })
        t += duration

    timing = {"language": language, "voice": voice, "total_seconds": round(t, 2), "scenes": scenes}
    with open(os.path.join(out_path, f"timing_{language}.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)
    return timing