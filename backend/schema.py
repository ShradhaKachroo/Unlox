import ast
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

SceneType = Literal["title_card", "diagram", "code_walkthrough"]
MoodType = Literal["happy", "thinking", "excited", "curious"]


class Scene(BaseModel):
    id: Optional[str] = None
    type: SceneType
    heading: str = Field(min_length=1, max_length=100)
    narration: str = Field(min_length=5, max_length=1000)
    code: Optional[str] = None
    highlight_lines: Optional[list[int]] = None
    items: Optional[list] = None
    mood: Optional[MoodType] = "happy"
    duration_ms: Optional[int] = None
    audio_url: Optional[str] = None
    caption: Optional[str] = None

    @field_validator("items", mode="before")
    @classmethod
    def coerce_items(cls, v):
        """LLM sometimes returns items as a plain string or comma-separated list."""
        if isinstance(v, str):
            parts = [p.strip() for p in v.split(",") if p.strip()]
            if len(parts) < 2:
                parts = v.split()
            return parts
        return v

    @model_validator(mode="after")
    def check_scene(self):
        if self.type == "code_walkthrough":
            if not self.code or not self.code.strip():
                if self.items and len(self.items) >= 2:
                    self.type = "diagram"
                else:
                    safe_h = self.heading.replace('"', "'")
                    self.code = f"# {safe_h}\nprint(\"{safe_h}\")"
            lines = self.code.splitlines()
            if len(lines) > 12:
                self.code = "\n".join(lines[:12])
            n = len(self.code.splitlines())

            # Auto-clamp highlight_lines to valid 1-based range
            if self.highlight_lines:
                self.highlight_lines = [
                    max(1, min(line, max(1, n))) for line in self.highlight_lines
                ]
            else:
                self.highlight_lines = [1]

        if self.type == "diagram":
            if not self.items:
                self.items = ["Step 1", "Step 2", "Done"]
            if len(self.items) > 5:
                self.items = self.items[:5]
            while len(self.items) < 2:
                self.items.append("Complete")
            self.items = [str(i)[:40] for i in self.items]

        return self


class Lesson(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=100)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    scenes: list[Scene] = Field(min_length=2, max_length=10)

    @model_validator(mode="after")
    def check_lesson(self):
        # Guarantee first scene is title_card
        if self.scenes and self.scenes[0].type != "title_card":
            self.scenes[0].type = "title_card"

        # Auto-differentiate duplicate code snippets so validation doesn't reject
        seen = set()
        for idx, s in enumerate(self.scenes):
            if s.code:
                if s.code in seen:
                    s.code = s.code + f"\n# Step {idx + 1}"
                seen.add(s.code)

        return self


def parse_lesson(raw_json: str) -> Lesson:
    """Raises pydantic.ValidationError if the JSON is bad. Callers fall back."""
    return Lesson.model_validate_json(raw_json)