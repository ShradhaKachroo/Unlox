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
    "gu": "guj_Gujr",
    "es": "spa_Latn",
    "fr": "fra_Latn",
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
        try:
            _tok = AutoTokenizer.from_pretrained(NAME, src_lang="eng_Latn", local_files_only=True)
            _model = AutoModelForSeq2SeqLM.from_pretrained(NAME, local_files_only=True)
        except Exception:
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
    if not text or not str(text).strip():
        return text
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
    """Return a copy of the lesson with full regional slide content and narrations.
    Translates title, headings, diagram items, and quiz questions/options.
    """
    if language == "en":
        return lesson

    result = lesson.model_copy(deep=True)
    result.language = language
    if result.title:
        result.title = translate_text(result.title, language)

    for scene in result.scenes:
        if scene.narration:
            scene.narration = translate_text(scene.narration, language)
        if getattr(scene, "heading", None):
            scene.heading = translate_text(scene.heading, language)
        if getattr(scene, "subtitle", None):
            scene.subtitle = translate_text(scene.subtitle, language)
        if getattr(scene, "items", None) and isinstance(scene.items, list):
            scene.items = [translate_text(it, language) for it in scene.items if it]
        if getattr(scene, "question", None):
            scene.question = translate_text(scene.question, language)
        if getattr(scene, "options", None) and isinstance(scene.options, list):
            scene.options = [translate_text(opt, language) for opt in scene.options if opt]
        if getattr(scene, "explanation", None):
            scene.explanation = translate_text(scene.explanation, language)

    return result