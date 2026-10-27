import json
import os
import subprocess
import tempfile
import time

import numpy as np
import soundfile as sf
from playwright.sync_api import sync_playwright

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


def _launch_browser(p):
    """Launches Playwright Chromium with fallback to installed local chrome."""
    try:
        return p.chromium.launch(headless=True)
    except Exception:
        local_app = os.environ.get("LOCALAPPDATA", "")
        for sub in [
            ("chromium-1223", "chrome-win64", "chrome.exe"),
            ("chromium-1217", "chrome-win64", "chrome.exe"),
        ]:
            exe = os.path.join(local_app, "ms-playwright", *sub)
            if os.path.exists(exe):
                return p.chromium.launch(executable_path=exe, headless=True)
        raise


def export_mp4(language, player_url="http://localhost:5173", out_dir="out"):
    """Records the player with Playwright (headless Chromium, 1280x720) in capture mode
    and combines the video with lesson_<lang>.wav using FFmpeg into an H.264 + AAC MP4.
    Video length is set to total_seconds from the timing file (-t).
    Returns (mp4_path, srt_path, wav_path, total_seconds, stage_seconds)."""
    out_path = os.path.join(HERE, out_dir)
    timing_file = os.path.join(out_path, f"timing_{language}.json")
    if not os.path.exists(timing_file):
        raise FileNotFoundError(f"Missing timing file: {timing_file}")

    with open(timing_file, encoding="utf-8") as f:
        timing = json.load(f)

    total_seconds = float(timing["total_seconds"])

    # Ensure audio and SRT exist
    wav_path = os.path.join(out_path, f"lesson_{language}.wav")
    srt_path = os.path.join(out_path, f"captions_{language}.srt")
    if not os.path.exists(wav_path) or not os.path.exists(srt_path):
        wav_path, srt_path, _ = export_audio_and_srt(language, out_dir=out_dir)

    mp4_path = os.path.join(out_path, f"lesson_{language}.mp4")

    t_start = time.time()
    stage_seconds = {}

    with tempfile.TemporaryDirectory() as temp_dir:
        t_capture = time.time()
        with sync_playwright() as p:
            browser = _launch_browser(p)
            context = browser.new_context(
                viewport={"width": 1280, "height": 720},
                record_video_dir=temp_dir,
                record_video_size={"width": 1280, "height": 720},
            )
            page = context.new_page()
            url = f"{player_url.rstrip('/')}/?capture=1&lang={language}"
            try:
                page.goto(url)
            except Exception as e:
                browser.close()
                raise RuntimeError(
                    f"Could not reach player at {url}. Ensure frontend dev server is running."
                ) from e

            # In capture mode the page autoplays muted and sets window.__lessonDone = true
            # Allow a larger buffer for page load and playback (total_seconds + 60 s)
            timeout_ms = int((total_seconds + 60) * 1000)
            try:
                page.wait_for_function(
                    "() => window.__lessonDone === true",
                    timeout=timeout_ms,
                )
            except Exception as e:
                # Provide clearer message if player never signals completion
                browser.close()
                raise TimeoutError(
                    f"Capture timed out after {timeout_ms / 1000}s waiting for window.__lessonDone at {url}. "
                    "Ensure the frontend dev server is running and the page is in capture mode."
                ) from e

            time.sleep(0.3)
            video_ref = page.video
            page.close()
            context.close()
            raw_video_path = video_ref.path() if video_ref else None
            browser.close()

        stage_seconds["capture"] = round(time.time() - t_capture, 1)

        if not raw_video_path or not os.path.exists(raw_video_path):
            raise RuntimeError("Playwright did not produce recorded video file")

        t_merge = time.time()
        cmd = [
            "ffmpeg",
            "-y",
            "-i", raw_video_path,
            "-i", wav_path,
            "-t", str(total_seconds),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            mp4_path,
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg failed to create MP4: {res.stderr}")
        stage_seconds["ffmpeg"] = round(time.time() - t_merge, 1)

    stage_seconds["total"] = round(time.time() - t_start, 1)
    print(
        f"[export] capture: {stage_seconds['capture']}s | ffmpeg: {stage_seconds['ffmpeg']}s | total: {stage_seconds['total']}s -> {mp4_path}"
    )
    return mp4_path, srt_path, wav_path, total_seconds, stage_seconds