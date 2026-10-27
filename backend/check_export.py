from export import export_audio_and_srt

for lang in ["en", "hi", "kn"]:
    wav, srt, seconds = export_audio_and_srt(lang)
    print(f"{lang}: {seconds:.2f}s -> {wav}")
    print(f"    {srt}")