from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

NAME = "facebook/nllb-200-distilled-600M"

# our language code -> NLLB code
NLLB_CODES = {
    "hi": "hin_Deva",
    "kn": "kan_Knda",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "bn": "ben_Beng",
    "mr": "mar_Deva",
}

_tok = None
_model = None


def _load():
    global _tok, _model
    if _model is None:
        _tok = AutoTokenizer.from_pretrained(NAME, src_lang="eng_Latn")
        _model = AutoModelForSeq2SeqLM.from_pretrained(NAME)
    return _tok, _model


def translate_text(text, language):
    tok, model = _load()
    inputs = tok(text, return_tensors="pt")
    out = model.generate(
        **inputs,
        forced_bos_token_id=tok.convert_tokens_to_ids(NLLB_CODES[language]),
        max_new_tokens=200,
    )
    return tok.batch_decode(out, skip_special_tokens=True)[0]


def _is_plain_words(text):
    """Items like 'i = 0' or 'print(x)' are code, so keep them in English."""
    return not any(ch in text for ch in "=()[]_:{}0123456789")


def translate_lesson(lesson, language):
    """Returns a copy of the lesson with headings, narration and plain-word
    diagram items translated. Code and code-like items stay in English."""
    if language == "en":
        return lesson
    result = lesson.model_copy(deep=True)
    result.language = language
    result.title = translate_text(lesson.title, language)
    for scene in result.scenes:
        scene.heading = translate_text(scene.heading, language)
        scene.narration = translate_text(scene.narration, language)
        if scene.items:
            scene.items = [
                translate_text(i, language) if _is_plain_words(i) else i
                for i in scene.items
            ]
    return result