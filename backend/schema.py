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


def derive_meaningful_items(heading: str, narration: str) -> list[str]:
    """Extract informative conceptual items from narration and heading instead of generic placeholders."""
    import re
    clean_narration = re.sub(r"^[-*•\d.)\s]+", "", (narration or "").strip())
    raw_segments = re.split(r"(?:[.;!?]|\band\s+then\b|\bfirst\b|\bnext\b|\bfinally\b|\balso\b)", clean_narration, flags=re.IGNORECASE)
    segments = [
        re.sub(r"^[-–—:,]\s*", "", s.strip())
        for s in raw_segments
        if len(s.strip()) > 8 and not re.match(r"^(step\s*\d*|done|ok|start|finish|next)$", s.strip(), re.IGNORECASE)
    ]
    if len(segments) >= 2:
        res = []
        for seg in segments[:4]:
            s_clean = seg[0].upper() + seg[1:]
            res.append(s_clean[:80])
        return res

    clean_heading = re.sub(r"['\"()]", "", heading or "Key Concept").strip()
    return [
        f"Core Principle: {clean_heading[:45]}",
        "Key Mechanism: How the components interact",
        "Real-World Value: Practical application in daily life",
    ]


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

    @field_validator("question", mode="before")
    @classmethod
    def coerce_question(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip()[:140]

    @field_validator("explanation", mode="before")
    @classmethod
    def coerce_explanation(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip()[:180]

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

    @model_validator(mode="before")
    @classmethod
    def extract_scene_fields(cls, data):
        if not isinstance(data, dict):
            return data

        scene_type = str(data.get("type", "")).lower()

        # 1. If 'narration' is missing or generic, salvage from explanation or caption
        raw_narration = str(data.get("narration") or "").strip()
        if not raw_narration or raw_narration == "Let's explore this step in detail to understand how it works.":
            if "quiz" not in scene_type and data.get("explanation"):
                data["narration"] = str(data["explanation"]).strip()
            elif data.get("description"):
                data["narration"] = str(data["description"]).strip()
            elif data.get("script"):
                data["narration"] = str(data["script"]).strip()
            elif data.get("caption") and not any(k in str(data.get("caption")) for k in ("def ", "class ", "import ", "=", "print", "\n")):
                data["narration"] = str(data["caption"]).strip()

        # 2. If 'code' is missing but 'caption' has code, salvage it
        if "code" in scene_type and (not data.get("code") or not str(data.get("code")).strip()):
            caption = str(data.get("caption") or "")
            if any(k in caption for k in ("\n", "def ", "class ", "import ", "=", "print", "for ", "while ")):
                data["code"] = caption
            elif data.get("explanation") and any(k in str(data.get("explanation")) for k in ("\n", "def ", "print(")):
                data["code"] = data["explanation"]

        # 3. If 'heading' is missing or generic, salvage from question or title
        raw_heading = str(data.get("heading") or "").strip()
        if not raw_heading or raw_heading == "Key Concept":
            if data.get("question") and "quiz" not in scene_type:
                data["heading"] = str(data["question"])[:80].strip()

        return data

    @model_validator(mode="after")
    def check_scene(self):
        if self.type == "code_walkthrough":
            if not self.code or not self.code.strip():
                self.type = "diagram"
                if not self.items:
                    self.items = [self.heading, "Core Concept", "Key Takeaway"]
            else:
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
            import re
            is_placeholder = (
                not self.items
                or all(re.match(r"^(step\s*\d*|done|start|finish|next|iteration\s*\d*)$", str(it).strip(), re.IGNORECASE) for it in self.items)
            )
            if is_placeholder:
                self.items = derive_meaningful_items(self.heading or "", self.narration or "")
            if len(self.items) > 5:
                self.items = self.items[:5]
            while len(self.items) < 2:
                self.items.append("Key Concept")
            self.items = [str(i)[:80] for i in self.items]

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

    @field_validator("title", mode="before")
    @classmethod
    def coerce_title(cls, v):
        if not v or not str(v).strip():
            return "Visual Coding Lesson"
        return str(v).strip()[:100]

    @field_validator("level", mode="before")
    @classmethod
    def normalize_level(cls, v):
        if not isinstance(v, str):
            return "beginner"
        v = v.lower().strip()
        if "adv" in v:
            return "advanced"
        if "inter" in v or "med" in v:
            return "intermediate"
        return "beginner"

    @field_validator("scenes", mode="before")
    @classmethod
    def coerce_scenes(cls, v):
        if not isinstance(v, list) or len(v) == 0:
            return []
        return v

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

        # Guarantee every scene has distinct, slide-specific narration according to its visual content
        seen_narrations = set()
        for idx, s in enumerate(self.scenes):
            if s.type == "quiz":
                if s.question:
                    s.narration = s.question
                continue

            cleaned_narr = (s.narration or "").strip()
            is_generic = (
                not cleaned_narr
                or "let's explore this step in detail" in cleaned_narr.lower()
                or cleaned_narr in seen_narrations
                or len(cleaned_narr) < 15
            )

            if is_generic:
                # Dynamically generate slide-accurate narration based on this scene's heading & content
                heading_text = s.heading if s.heading and s.heading != "Key Concept" else f"Step {idx + 1}"
                if s.type == "title_card":
                    s.narration = f"Welcome to this lesson exploring {self.title or heading_text}. Today we break down the core mechanics, practical patterns, and how it executes step by step."
                elif s.type == "code_walkthrough":
                    clean_code = (s.code or "").strip()
                    first_line = clean_code.splitlines()[0] if clean_code else "the implementation"
                    s.narration = f"Here in {heading_text}, examine how Python executes this block. Focusing on {first_line}, notice how the values and control flow advance sequentially."
                elif s.type == "diagram":
                    steps_summary = " followed by ".join(s.items[:3]) if s.items else "each sequential phase"
                    s.narration = f"Looking at {heading_text}, observe the architectural flow progressing through {steps_summary}."
                else:
                    s.narration = f"In this section on {heading_text}, we focus on how the underlying program state changes during execution."

            seen_narrations.add(s.narration)

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

    import re
    # Clean trailing commas: ,] -> ] and ,} -> }
    cleaned = re.sub(r",\s*([\]}])", r"\1", raw)

    try:
        data = json.loads(cleaned, strict=False)
    except Exception:
        try:
            data = json.loads(raw, strict=False)
        except Exception:
            import ast
            try:
                data = ast.literal_eval(raw)
            except Exception:
                data = json.loads(raw)

    return Lesson.model_validate(data)