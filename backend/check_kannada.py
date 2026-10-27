import time

import soundfile as sf
import torch
from transformers import AutoTokenizer, VitsModel

from fallback import get_fallback_lesson
from translate import translate_lesson

NAME = "facebook/mms-tts-kan"
tok = AutoTokenizer.from_pretrained(NAME)
model = VitsModel.from_pretrained(NAME)

lesson = translate_lesson(get_fallback_lesson(), "kn")

for i, scene in enumerate(lesson.scenes):
    start = time.time()
    inputs = tok(scene.narration, return_tensors="pt")
    with torch.no_grad():
        wave = model(**inputs).waveform[0].numpy()
    sr = model.config.sampling_rate
    sf.write(f"out/kn_test_{i}.wav", wave, sr)
    print(f"scene {i}: audio {len(wave) / sr:.1f}s, generated in {time.time() - start:.1f}s")
    print("   ", scene.narration)