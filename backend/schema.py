import ast
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

SceneType = Literal["title_card", "diagram", "code_walkthrough"]
MoodType = Literal["happy", "thinking", "excited", "curious"]


class Scene(BaseModel):
    id: Optional[str] = None
    type: SceneType
    heading: str = Field(min_length=1, max_length=80)
    narration: str = Field(min_length=10, max_length=600)
    code: Optional[str] = None
    highlight_lines: Optional[list[int]] = None
    items: Optional[list[str]] = None
    mood: Optional[MoodType] = "happy"
    duration_ms: Optional[int] = None
    audio_url: Optional[str] = None
    caption: Optional[str] = None

    @model_validator(mode="after")
    def check_scene(self):
        if self.type == "code_walkthrough":
            if not self.code:
                raise ValueError("code_walkthrough needs code")
            n = len(self.code.splitlines())
            if n > 15:
                raise ValueError("code too long (max 15 lines)")
            try:
                ast.parse(self.code)
            except SyntaxError:
                raise ValueError(
                    "code has a Python syntax error: use double quotes "
                    "around text that contains an apostrophe"
                )
            # Auto-clamp highlight_lines to valid range instead of rejecting
            if self.highlight_lines:
                self.highlight_lines = [
                    max(1, min(line, n)) for line in self.highlight_lines
                ]
            else:
                self.highlight_lines = [1]
        if self.type == "diagram":
            if not self.items or not (2 <= len(self.items) <= 6):
                raise ValueError("diagram needs 2-6 items")
            too_long = [i for i in self.items if len(i) > 40]
            if too_long:
                raise ValueError(
                    f"diagram item too long (max 40 chars): {too_long[0]!r}"
                )
        return self


class Lesson(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=80)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    scenes: list[Scene] = Field(min_length=3, max_length=12)

    @model_validator(mode="after")
    def check_lesson(self):
        if self.scenes[0].type != "title_card":
            raise ValueError("first scene must be a title_card")
        codes = [s.code for s in self.scenes if s.code]
        if len(codes) != len(set(codes)):
            raise ValueError("two scenes repeat the same code")
        return self


def parse_lesson(raw_json: str) -> Lesson:
    """Raises pydantic.ValidationError if the JSON is bad. Callers fall back."""
    return Lesson.model_validate_json(raw_json)