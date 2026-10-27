import ast
import json
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

SceneType = Literal["title_card", "diagram", "code_walkthrough", "quiz"]
MoodType = Literal["happy", "thinking", "excited", "curious"]


class Scene(BaseModel):
    id: Optional[str] = None
    type: SceneType
    heading: str = Field(min_length=1, max_length=100)
    narration: str = Field(min_length=5, max_length=700)
    code: Optional[str] = None
    highlight_lines: Optional[list[int]] = None
    items: Optional[list] = None
    question: Optional[str] = Field(default=None, max_length=120)
    options: Optional[list] = None
    correct_index: Optional[int] = 0
    answer_idx: Optional[int] = 0
    explanation: Optional[str] = Field(default=None, max_length=150)
    mood: Optional[MoodType] = "happy"
    duration_ms: Optional[int] = None
    audio_url: Optional[str] = None
    caption: Optional[str] = None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v):
        if not isinstance(v, str):
            return "diagram"
        v = v.lower().strip()
        if "quiz" in v or "question" in v or "test" in v or "mcq" in v:
            return "quiz"
        if "title" in v or "intro" in v or "welcome" in v or "card" in v:
            return "title_card"
        if "code" in v or "walkthrough" in v or "snippet" in v or "python" in v:
            return "code_walkthrough"
        return "diagram"

    @field_validator("mood", mode="before")
    @classmethod
    def normalize_mood(cls, v):
        if not isinstance(v, str) or v.lower() not in ("happy", "thinking", "excited", "curious"):
            return "happy"
        return v.lower()

    @field_validator("heading", mode="before")
    @classmethod
    def coerce_heading(cls, v):
        if not v or not str(v).strip():
            return "Key Concept"
        return str(v).strip()[:100]

    @field_validator("narration", mode="before")
    @classmethod
    def coerce_narration(cls, v):
        if not v or not str(v).strip():
            return "Let's explore this step in detail to understand how it works."
        s = str(v).strip()
        return s[:700] if len(s) >= 5 else s + " Let's learn."

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

    @field_validator("options", mode="before")
    @classmethod
    def coerce_options(cls, v):
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

        elif self.type == "diagram":
            if not self.items:
                self.items = ["Step 1", "Step 2", "Done"]
            if len(self.items) > 5:
                self.items = self.items[:5]
            while len(self.items) < 2:
                self.items.append("Complete")
            self.items = [str(i)[:40] for i in self.items]

        elif self.type == "quiz":
            if not self.question:
                self.question = self.heading[:120]
            if len(self.question) > 120:
                self.question = self.question[:120]

            if not self.options or len(self.options) < 3:
                self.options = ["A) Option 1", "B) Option 2", "C) Option 3"]
            if len(self.options) > 4:
                self.options = self.options[:4]
            self.options = [str(opt)[:60] for opt in self.options]

            # 0-based valid correct_index
            idx = self.correct_index if self.correct_index is not None else self.answer_idx
            if idx is None or not (0 <= idx < len(self.options)):
                idx = 0
            self.correct_index = idx
            self.answer_idx = idx

            if not self.explanation:
                self.explanation = "Great job! This tests your understanding of the core idea."
            if len(self.explanation) > 150:
                self.explanation = self.explanation[:150]

            # The narration reads the question aloud
            self.narration = self.question

        return self


class Lesson(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=100)
    level: Literal["beginner", "intermediate"] = "beginner"
    language: str = "en"
    scenes: list[Scene] = Field(min_length=2, max_length=12)  # model_validator caps output at 10

    @model_validator(mode="after")
    def check_lesson(self):
        # Guarantee first scene is title_card
        non_quiz = [s for s in self.scenes if s.type != "quiz"]
        quiz_scenes = [s for s in self.scenes if s.type == "quiz"]

        if not quiz_scenes:
            quiz = Scene(
                type="quiz",
                heading="Knowledge Check",
                question=f"What is the core idea of {self.title[:80]}?",
                options=["A) Option 1", "B) Option 2", "C) Option 3"],
                correct_index=0,
                answer_idx=0,
                explanation="This checks your understanding of the core concept.",
                narration=f"What is the core idea of {self.title[:80]}?",
            )
        else:
            quiz = quiz_scenes[-1]
            if quiz.question:
                quiz.narration = quiz.question

        if non_quiz and non_quiz[0].type != "title_card":
            non_quiz[0].type = "title_card"

        # Allow up to 10 scenes total (up to 9 non-quiz + 1 quiz at the end)
        self.scenes = non_quiz[:9] + [quiz]

        # Auto-differentiate duplicate code snippets so validation doesn't reject
        seen = set()
        for idx, s in enumerate(self.scenes):
            if s.code:
                if s.code in seen:
                    s.code = s.code + f"\n# Step {idx + 1}"
                seen.add(s.code)

        return self


def parse_lesson(raw_json: str) -> Lesson:
    """Robustly parse JSON, stripping markdown code fences or conversational text."""
    raw = raw_json.strip()
    # Strip markdown fences if present
    if "```" in raw:
        lines = raw.splitlines()
        cleaned = []
        inside = False
        for line in lines:
            if line.strip().startswith("```"):
                inside = not inside
                continue
            cleaned.append(line)
        raw = "\n".join(cleaned).strip()

    # Extract JSON substring between the first { and the last }
    first_brace = raw.find("{")
    last_brace = raw.rfind("}")
    if first_brace != -1 and last_brace != -1:
        raw = raw[first_brace : last_brace + 1]

    # Try standard json load first
    try:
        data = json.loads(raw)
    except Exception:
        import re
        # Clean trailing commas: ,] -> ] and ,} -> }
        cleaned = re.sub(r",\s*([\]}])", r"\1", raw)
        data = json.loads(cleaned)

    return Lesson.model_validate(data)