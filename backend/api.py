import os
import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from planner import plan_lesson
from translate import translate_lesson
from tts import HERE, SUPPORTED, build_timing

app = FastAPI(title="Blu Visual Teacher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUT_DIR = os.path.join(HERE, "out")
os.makedirs(OUT_DIR, exist_ok=True)
app.mount("/audio", StaticFiles(directory=OUT_DIR), name="audio")


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=100)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    target_seconds: int = Field(default=60, ge=30, le=90)  # used later


@app.get("/health")
def health():
    return {"ok": True, "languages": SUPPORTED}


@app.post("/generate")
def generate(req: GenerateRequest):
    if req.language not in SUPPORTED:
        raise HTTPException(400, f"language must be one of {SUPPORTED}")

    seconds = {}

    t = time.time()
    lesson, source = plan_lesson(req.topic, req.level)
    seconds["plan"] = round(time.time() - t, 1)

    t = time.time()
    translated = translate_lesson(lesson, req.language)
    seconds["translate"] = round(time.time() - t, 1)

    t = time.time()
    timing = build_timing(translated, req.language)
    seconds["voice"] = round(time.time() - t, 1)

    return {
        "source": source,  # "llm" or "fallback"
        "lesson": translated.model_dump(),
        "timing": timing,
        "audio_base_url": "/audio",
        "stage_seconds": seconds,
    }