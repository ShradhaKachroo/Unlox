import json
import os

import numpy as np
import soundfile as sf

from tts import HERE


def _srt_time(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def export_audio_and_srt(language, out_dir="out"):
    """Joins the scene audio into one WAV (each scene padded to its duration)
    and writes an .srt caption file. Returns (wav_path, srt_path, seconds)."""
    out_path = os.path.join(HERE, out_dir)
    with open(os.path.join(out_path, f"timing_{language}.json"), encoding="utf-8") as f:
        timing = json.load(f)

    pieces = []
    srt_lines = []
    sample_rate = None
    for n, scene in enumerate(timing["scenes"], start=1):
        data, rate = sf.read(os.path.join(out_path, scene["audio"]))
        sample_rate = sample_rate or rate
        target = int(round(scene["duration"] * rate))
        if len(data) < target:
            data = np.concatenate([data, np.zeros(target - len(data))])
        else:
            data = data[:target]
        pieces.append(data)

        start = scene["start"]
        end = start + scene["audio_seconds"]
        srt_lines += [str(n), f"{_srt_time(start)} --> {_srt_time(end)}", scene["caption"], ""]

    wav_path = os.path.join(out_path, f"lesson_{language}.wav")
    srt_path = os.path.join(out_path, f"captions_{language}.srt")
    audio = np.concatenate(pieces)
    sf.write(wav_path, audio, sample_rate)
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    return wav_path, srt_path, len(audio) / sample_rate