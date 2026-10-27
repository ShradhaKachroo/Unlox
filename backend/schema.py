import ast
import json
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

SceneType = Literal["title_card", "diagram", "code_walkthrough", "quiz"]
MoodType = Literal["happy", "thinking", "excited", "curious"]


def get_topic_quiz_defaults(context: str) -> tuple[str, list[str], str]:
    """Provide realistic, high-quality quiz options based on context instead of generic placeholders."""
    c_lower = (context or "").lower()
    if any(k in c_lower for k in ("loop", "for", "while", "iteration", "range")):
        return (
            "What sequence of numbers does range(3) produce in Python?",
            [
                "0, 1, and 2",
                "1, 2, and 3",
                "0, 1, 2, and 3",
            ],
            "In Python, range(3) starts at 0 by default and produces 3 numbers, stopping before 3 (0, 1, 2).",
        )
    elif any(k in c_lower for k in ("search", "binary", "sort", "algorithm", "divide")):
        return (
            "What crucial condition must an array satisfy before using binary search?",
            [
                "The elements must be sorted in order",
                "The array must contain only positive integers",
                "The array length must be an even number",
            ],
            "Binary search relies on sorted order to discard half the search space at each comparison.",
        )
    elif any(k in c_lower for k in ("variable", "memory", "pointer", "assign")):
        return (
            "What happens in memory when you assign a variable in Python?",
            [
                "A named reference is created that points to the value in memory",
                "The entire operating system memory is cleared and reset",
                "The value is permanently converted into binary machine code",
            ],
            "Variables in Python act as names or references that point to objects allocated in memory.",
        )
    elif any(k in c_lower for k in ("recursion", "recursive", "stack", "call stack")):
        return (
            "What prevents a recursive function from running infinitely?",
            [
                "A base case that terminates repetition without calling itself",
                "A while loop placed at the very top of the function",
                "The computer automatically stops it after exactly ten iterations",
            ],
            "Every recursive function requires a base case to stop execution and unwind the call stack.",
        )
    else:
        topic_name = context[:60].strip() or "this topic"
        return (
            f"What is the key takeaway when applying {topic_name}?",
            [
                "It enables writing cleaner, more predictable, and structured code",
                "It eliminates the need for underlying computer hardware",
                "It only works when running Python in debug mode",
            ],
            f"Mastering {topic_name} gives you precise control over program structure and execution.",
        )


class Scene(BaseModel):
    id: Optional[str] = None
    type: SceneType
    heading: str = Field(default="Key Concept", min_length=1, max_length=100)
    narration: str = Field(default="Let's explore this step in detail to understand how it works.", min_length=5, max_length=700)
    code: Optional[str] = None
    highlight_lines: Optional[list[int]] = None
    items: Optional[list] = None
    question: Optional[str] = Field(default=None, max_length=140)
    options: Optional[list] = None
    correct_index: Optional[int] = 0
    answer_idx: Optional[int] = 0
    explanation: Optional[str] = Field(default=None, max_length=180)
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
        if isinstance(v, dict):
            if "options" in v and isinstance(v["options"], list):
                v = v["options"]
            else:
                v = list(v.values())
        if isinstance(v, str):
            parts = [p.strip() for p in v.split(",") if p.strip()]
            if len(parts) < 2:
                parts = [p.strip() for p in v.splitlines() if p.strip()]
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
            def_q, def_opts, def_exp = get_topic_quiz_defaults(self.heading or self.question or "Python Programming")

            if not self.question or len(self.question.strip()) < 5:
                self.question = def_q
            self.question = self.question[:140].strip()

            # Clean and sanitize options (strip dictionaries or strings, max 120 chars)
            cleaned_opts: list[str] = []
            if self.options and isinstance(self.options, list):
                for opt in self.options:
                    if isinstance(opt, dict):
                        opt_str = str(opt.get("text") or opt.get("option") or opt.get("value") or "").strip()
                    else:
                        opt_str = str(opt).strip()
                    # Discard generic placeholder strings like "Option 1"
                    if opt_str and not any(p in opt_str.lower() for p in ["option 1", "option 2", "option 3"]):
                        cleaned_opts.append(opt_str[:120])

            if len(cleaned_opts) < 3:
                cleaned_opts = list(def_opts)

            if len(cleaned_opts) > 4:
                cleaned_opts = cleaned_opts[:4]

            self.options = cleaned_opts

            # 0-based valid correct_index
            idx = self.correct_index if self.correct_index is not None else self.answer_idx
            if idx is None or not (0 <= idx < len(self.options)):
                idx = 0
            self.correct_index = idx
            self.answer_idx = idx

            if not self.explanation or len(self.explanation.strip()) < 5:
                self.explanation = def_exp
            self.explanation = self.explanation[:180].strip()

            # The narration reads the question aloud
            self.narration = self.question

        return self


class Lesson(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=100)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    language: str = "en"
    scenes: list[Scene] = Field(min_length=2, max_length=12)  # model_validator caps output at 10

    @model_validator(mode="after")
    def check_lesson(self):
        # Guarantee first scene is title_card
        non_quiz = [s for s in self.scenes if s.type != "quiz"]
        quiz_scenes = [s for s in self.scenes if s.type == "quiz"]

        if not quiz_scenes:
            def_q, def_opts, def_exp = get_topic_quiz_defaults(self.title)
            quiz = Scene(
                type="quiz",
                heading="Knowledge Check",
                question=def_q,
                options=def_opts,
                correct_index=0,
                answer_idx=0,
                explanation=def_exp,
                narration=def_q,
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