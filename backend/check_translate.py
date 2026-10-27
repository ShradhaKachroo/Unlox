import time

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

NAME = "facebook/nllb-200-distilled-600M"
tok = AutoTokenizer.from_pretrained(NAME, src_lang="eng_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(NAME)

text = "A loop repeats an instruction for each value in a sequence."

for code in ["hin_Deva", "kan_Knda"]:
    start = time.time()
    inputs = tok(text, return_tensors="pt")
    out = model.generate(
        **inputs,
        forced_bos_token_id=tok.convert_tokens_to_ids(code),
        max_new_tokens=100,
    )
    print(code, "->", tok.batch_decode(out, skip_special_tokens=True)[0])
    print(f"   {time.time() - start:.1f}s")