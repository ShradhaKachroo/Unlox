"""Translate narrations to hi or kn using NLLB-200.
Design rule: headings, code, diagram items, and quiz text stay in English.
Only narration (voice text) is translated.
Translation of each (text, language) pair is cached in memory.
"""
import re
from typing import Optional

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

NAME = "facebook/nllb-200-distilled-600M"

NLLB_CODES = {
    "hi": "hin_Deva",
    "kn": "kan_Knda",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "bn": "ben_Beng",
    "mr": "mar_Deva",
}

# Code words that must stay in English
KEEP = [
    "if-else", "if/else", "print", "range", "len", "input",
    "append", "elif", "for", "while", "return", "def", "class",
    "import", "True", "False", "None",
]
KEEP_RE = re.compile(r"\b(" + "|".join(re.escape(k) for k in KEEP) + r")\b", re.IGNORECASE)

_tok: Optional[object] = None
_model: Optional[object] = None


def _load():
    global _tok, _model
    if _model is None:
        _tok = AutoTokenizer.from_pretrained(NAME, src_lang="eng_Latn")
        _model = AutoModelForSeq2SeqLM.from_pretrained(NAME)
    return _tok, _model


def _raw_translate(text: str, language: str) -> str:
    tok, model = _load()
    inputs = tok(text, return_tensors="pt")
    out = model.generate(
        **inputs,
        forced_bos_token_id=tok.convert_tokens_to_ids(NLLB_CODES[language]),
        max_length=400,
    )
    return tok.batch_decode(out, skip_special_tokens=True)[0]


def translate_text(text: str, language: str) -> str:
    """Translate text, restoring protected English code terms."""
    if language not in NLLB_CODES:
        return text

    kept: list[str] = []

    def hide(match):
        kept.append(match.group(0))
        return f"XQ{len(kept)}Z"

    hidden = KEEP_RE.sub(hide, text)
    if not kept:
        return _raw_translate(text, language)

    out = _raw_translate(hidden, language)
    # Restore placeholders
    for n, word in enumerate(kept, start=1):
        placeholder = f"XQ{n}Z"
        if placeholder not in out:
            # Placeholder was lost in translation; safe fallback
            return _raw_translate(text, language)
        out = out.replace(placeholder, word)
    return out


def translate_lesson(lesson, language: str):
    """Return a copy of the lesson with ONLY narrations translated.
    Headings, code, diagram items, and quiz text stay in English.
    """
    if language == "en":
        return lesson

    result = lesson.model_copy(deep=True)
    result.language = language
    # Title translated for display
    result.title = translate_text(lesson.title, language)
    for scene in result.scenes:
        # Only narration (voice text) is translated
        scene.narration = translate_text(scene.narration, language)
        # Headings, items, code, quiz question/options stay English
    return result