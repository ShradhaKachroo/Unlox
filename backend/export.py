"""
export.py  – join scene WAVs into a full lesson WAV+SRT; record MP4 via Playwright+FFmpeg.
Updated for Phase 1: audio lives in out/<lesson_id>/, timing_prefix = <lesson_id>_<lang>.
"""
import json
import os
import subprocess
import tempfile
import time

import numpy as np
import soundfile as sf
from playwright.sync_api import sync_playwright

from tts import HERE


import urllib.request


def _find_active_player_url(candidate: str = None) -> str:
    """Probe candidate URLs and return the first one serving HTTP 200."""
    candidates = [candidate] if candidate else []
    candidates += [
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
    ]
    for c in candidates:
        if not c:
            continue
        try:
            req = urllib.request.Request(c.rstrip("/"), headers={"User-Agent": "export-probe"})
            with urllib.request.urlopen(req, timeout=1.0) as res:
                if res.status == 200:
                    return c.rstrip("/")
        except Exception:
            continue
    return candidate or "http://localhost:5174"


def _srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def export_audio_and_srt(
    language: str,
    out_dir: str = "out",
    timing_prefix: str = None,
) -> tuple[str, str, float]:
    """Joins scene audio into one WAV (each scene padded to its duration)
    and writes an .srt caption file.
    Returns (wav_path, srt_path, duration_seconds).
    """
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)
    prefix = timing_prefix or language
    lesson_id_part = prefix.split("_")[0] if "_" in prefix else ""

    # Find timing file
    candidates = [
        os.path.join(out_path, f"timing_{prefix}.json"),
        os.path.join(out_path, "timing.json"),
        os.path.join(out_path, f"timing_{language}.json"),
        os.path.join(HERE, "out", "lessons", lesson_id_part, language, "timing.json") if lesson_id_part else None,
        os.path.join(HERE, "out", "lessons", lesson_id_part, language, "audio", "timing.json") if lesson_id_part else None,
        os.path.join(HERE, "out", f"timing_{language}.json"),
        os.path.join(HERE, "..", "public", "sample", f"timing_{language}.json"),
    ]
    timing_file = next((c for c in candidates if c and os.path.exists(c)), None)
    if not timing_file:
        raise FileNotFoundError(f"No timing file found for prefix={prefix}")

    with open(timing_file, encoding="utf-8") as f:
        timing = json.load(f)

    pieces = []
    srt_lines = []
    sample_rate = None

    for n, scene in enumerate(timing["scenes"], start=1):
        raw_audio = scene.get("audio") or f"scene_{n-1}_{language}.wav"
        base_audio = os.path.basename(raw_audio) if raw_audio else f"scene_{n-1}.wav"
        candidates = [
            os.path.join(out_path, raw_audio) if raw_audio else None,
            os.path.join(out_path, base_audio),
            os.path.join(out_path, f"scene_{n-1}_{language}.wav"),
            os.path.join(os.path.dirname(timing_file), "audio", base_audio),
            os.path.join(HERE, "out", "lessons", lesson_id_part, language, "audio", base_audio),
            os.path.join(HERE, "out", lesson_id_part, f"scene_{n-1}_{language}.wav"),
            os.path.join(HERE, "..", "public", "sample", base_audio),
        ]
        wav_path = next((c for c in candidates if c and os.path.exists(c)), None)
        if wav_path:
            try:
                data, rate = sf.read(wav_path)
                sample_rate = sample_rate or rate
            except Exception:
                rate = sample_rate or 24000
                data = np.zeros(int(round(scene["duration"] * rate)))
        else:
            rate = sample_rate or 24000
            data = np.zeros(int(round(scene["duration"] * rate)))

        target = int(round(scene["duration"] * rate))
        if len(data) < target:
            data = np.concatenate([data, np.zeros(target - len(data))])
        else:
            data = data[:target]
        pieces.append(data)

        # SRT: each sentence chunk as a separate entry if available
        chunks = scene.get("caption_chunks")
        if chunks:
            for ci, chunk in enumerate(chunks):
                srt_lines += [
                    str(n * 100 + ci),
                    f"{_srt_time(chunk['start'])} --> {_srt_time(chunk['end'])}",
                    chunk["text"],
                    "",
                ]
        else:
            start = scene["start"]
            end = start + scene.get("audio_seconds", scene["duration"])
            srt_lines += [str(n), f"{_srt_time(start)} --> {_srt_time(end)}", scene["caption"], ""]

    audio = np.concatenate(pieces)
    wav_out = os.path.join(out_path, f"lesson_{prefix}.wav")
    srt_out = os.path.join(out_path, f"captions_{prefix}.srt")
    sf.write(wav_out, audio, sample_rate)
    with open(srt_out, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    return wav_out, srt_out, len(audio) / sample_rate


def _launch_browser(p):
    """Launch headless Chromium, fallback to installed local binary."""
    args = [
        "--autoplay-policy=no-user-gesture-required",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
    ]
    try:
        return p.chromium.launch(headless=True, args=args)
    except Exception:
        local_app = os.environ.get("LOCALAPPDATA", "")
        for sub in [
            ("chromium-1223", "chrome-win64", "chrome.exe"),
            ("chromium-1217", "chrome-win64", "chrome.exe"),
        ]:
            exe = os.path.join(local_app, "ms-playwright", *sub)
            if os.path.exists(exe):
                return p.chromium.launch(executable_path=exe, headless=True, args=args)
        raise


def export_mp4(
    language: str,
    player_url: str = "http://localhost:5174",
    out_dir: str = "out",
    timing_prefix: str = None,
    lesson_id: str = None,
) -> tuple[str, str, str, float, dict]:
    """Record the capture page with Playwright (1280×720) and mux with FFmpeg.
    Returns (mp4_path, srt_path, wav_path, total_seconds, stage_seconds).
    """
    out_path = os.path.join(HERE, out_dir)
    os.makedirs(out_path, exist_ok=True)
    prefix = timing_prefix or language
    lid = lesson_id or (prefix.split("_")[0] if "_" in prefix else "")

    candidates = [
        os.path.join(out_path, f"timing_{prefix}.json"),
        os.path.join(out_path, "timing.json"),
        os.path.join(HERE, "out", "lessons", lid, language, "timing.json") if lid else None,
        os.path.join(HERE, "out", "lessons", lid, language, "audio", "timing.json") if lid else None,
        os.path.join(out_path, f"timing_{language}.json"),
        os.path.join(HERE, "out", f"timing_{language}.json"),
        os.path.join(HERE, "..", "public", "sample", f"timing_{language}.json"),
    ]
    timing_file = next((c for c in candidates if c and os.path.exists(c)), None)
    if not timing_file:
        raise FileNotFoundError(f"Missing timing file for prefix={prefix}")

    with open(timing_file, encoding="utf-8") as f:
        timing = json.load(f)
    total_seconds = float(timing["total_seconds"])

    # Ensure audio+SRT exist
    wav_path = os.path.join(out_path, f"lesson_{prefix}.wav")
    srt_path = os.path.join(out_path, f"captions_{prefix}.srt")
    if not os.path.exists(wav_path) or not os.path.exists(srt_path):
        wav_path, srt_path, _ = export_audio_and_srt(language, out_dir=out_dir, timing_prefix=prefix)

    mp4_path = os.path.join(out_path, f"lesson_{prefix}.mp4")
    t_start = time.time()
    stage_seconds: dict = {}

    active_player = _find_active_player_url(player_url)

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
            url = f"{active_player}/?capture=1&lang={language}&lesson_id={lid}"
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                browser.close()
                raise RuntimeError(
                    f"Could not reach player at {url}. Ensure frontend dev server is running."
                ) from e

            timeout_ms = int((total_seconds + 60) * 1000)
            try:
                page.wait_for_function(
                    "() => window.__lessonDone === true",
                    timeout=timeout_ms,
                )
            except Exception as e:
                browser.close()
                raise TimeoutError(
                    f"Capture timed out after {timeout_ms / 1000}s waiting for window.__lessonDone at {url}. "
                    "Ensure the frontend is running and the page is in capture mode."
                ) from e

            time.sleep(0.5)
            video_ref = page.video
            page.close()
            context.close()
            raw_video_path = video_ref.path() if video_ref else None
            browser.close()

        stage_seconds["capture"] = round(time.time() - t_capture, 1)

        if not raw_video_path or not os.path.exists(raw_video_path):
            raise RuntimeError("Playwright did not produce a recorded video file")

        t_merge = time.time()
        cmd = [
            "ffmpeg", "-y",
            "-i", raw_video_path,
            "-i", wav_path,
            "-t", str(total_seconds),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            mp4_path,
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {res.stderr[-800:]}")
        stage_seconds["ffmpeg"] = round(time.time() - t_merge, 1)

    stage_seconds["total"] = round(time.time() - t_start, 1)
    print(
        f"[export] capture: {stage_seconds['capture']}s | ffmpeg: {stage_seconds['ffmpeg']}s"
        f" | total: {stage_seconds['total']}s -> {mp4_path}"
    )
    return mp4_path, srt_path, wav_path, total_seconds, stage_seconds