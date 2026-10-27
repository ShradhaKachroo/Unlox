import ast
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

SceneType = Literal["title_card", "diagram", "code_walkthrough"]


class Scene(BaseModel):
    type: SceneType
    heading: str = Field(min_length=1, max_length=80)
    narration: str = Field(min_length=10, max_length=300)
    code: Optional[str] = None
    highlight_lines: Optional[list[int]] = None
    items: Optional[list[str]] = None

    @model_validator(mode="after")
    def check_scene(self):
        if self.type == "code_walkthrough":
            if not self.code:
                raise ValueError("code_walkthrough needs code")
            n = len(self.code.splitlines())
            if n > 8:
                raise ValueError("code too long (max 8 lines)")
            try:
                ast.parse(self.code)
            except SyntaxError:
                raise ValueError(
                    "code has a Python syntax error: use double quotes "
                    "around text that contains an apostrophe"
                )
            if not self.highlight_lines or any(
                line < 1 or line > n for line in self.highlight_lines
            ):
                raise ValueError("highlight_lines out of range")
        if self.type == "diagram":
            if not self.items or not (3 <= len(self.items) <= 5):
                raise ValueError("diagram needs 3-5 items")
            too_long = [i for i in self.items if len(i) > 30]
            if too_long:
                raise ValueError(
                    f"diagram item too long (max 30 chars): {too_long[0]!r}"
                )
        return self


class Lesson(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    scenes: list[Scene] = Field(min_length=3, max_length=6)

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