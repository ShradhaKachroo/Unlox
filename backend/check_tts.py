import json
import os

import soundfile as sf
import torch
from kokoro_onnx import Kokoro
from transformers import AutoTokenizer, VitsModel

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(HERE, "models", "voices-v1.0.bin")

PAUSE = 0.6  # seconds of silence after each scene

# Kokoro languages: our code -> (voice, kokoro language)
KOKORO_MAP = {
    "en": ("hf_alpha", "en-us"),
    "hi": ("hf_alpha", "hi"),
}

# MMS-TTS languages: our code -> Hugging Face model
MMS_MAP = {
    "kn": "facebook/mms-tts-kan",
}

SUPPORTED = list(KOKORO_MAP) + list(MMS_MAP)

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


def make_audio(text, path, language="en"):
    """Writes a WAV file and returns its length in seconds."""
    if language in KOKORO_MAP:
        voice, lang = KOKORO_MAP[language]
        samples, sr = _get_kokoro().create(text, voice=voice, speed=1.0, lang=lang)
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


def build_timing(lesson, language="en", out_dir="out"):
    """Audio first: each scene lasts as long as its voice plus a pause."""
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)

    scenes = []
    t = 0.0
    for i, scene in enumerate(lesson.scenes):
        wav = os.path.join(out_path, f"scene_{i}_{language}.wav")
        seconds = make_audio(scene.narration, wav, language)
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

    timing = {"language": language, "total_seconds": round(t, 2), "scenes": scenes}
    with open(os.path.join(out_path, f"timing_{language}.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)
    return timing