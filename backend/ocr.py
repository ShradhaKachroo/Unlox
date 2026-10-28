"""Offline OCR engine using rapidocr-onnxruntime.
Extracts text and detects study topics from uploaded images/notes offline.
"""
import io
import re
from typing import Optional
from PIL import Image
import numpy as np

_engine: Optional[object] = None


def get_ocr_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def extract_text_from_image(image_bytes: bytes) -> dict:
    """Extract text from raw image bytes 100% offline.
    Returns:
        {
            "text": str,
            "lines": list[str],
            "topic": str
        }
    """
    engine = get_ocr_engine()
    
    # Open image with PIL and convert to RGB numpy array
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(pil_img)

    # RapidOCR returns: (result_list, elapse_list)
    # result_list format: [ [box, text, score], ... ]
    results, _ = engine(img_np)

    if not results:
        return {
            "text": "",
            "lines": [],
            "topic": "Scanned Document"
        }

    lines = []
    for item in results:
        # item is [box, text, score]
        if len(item) >= 2:
            txt = str(item[1]).strip()
            if txt:
                lines.append(txt)

    full_text = "\n".join(lines)

    # Detect a concise topic from the first prominent lines
    topic = "Scanned Topic"
    for line in lines:
        cleaned = re.sub(r"^[#\*\-\d\.\:\s]+", "", line).strip()
        if 3 <= len(cleaned) <= 60 and not cleaned.isdigit():
            topic = cleaned
            break

    return {
        "text": full_text,
        "lines": lines,
        "topic": topic
    }
