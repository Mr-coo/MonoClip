from functools import lru_cache
from typing import Any

from transformers import MarianMTModel, MarianTokenizer

# Whisper sometimes reports legacy / alternate language codes that don't match
# the codes Helsinki-NLP uses in their model names. Normalize a few here.
_LANG_ALIAS: dict[str, str] = {
    "in": "id",       # Whisper's Indonesian
    "iw": "he",       # legacy Hebrew
    "jw": "jv",       # legacy Javanese
    "zh-cn": "zh",
    "zh-tw": "zh",
}

# Languages we expose to the UI as translation targets. Each must have a
# matching Helsinki-NLP/opus-mt-en-<code> AND opus-mt-<code>-en model on HF,
# which is true for these.
SUPPORTED_TARGETS: list[dict[str, str]] = [
    {"code": "en", "name": "English"},
    {"code": "id", "name": "Indonesian"},
    {"code": "fr", "name": "French"},
    {"code": "es", "name": "Spanish"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "nl", "name": "Dutch"},
    {"code": "ru", "name": "Russian"},
    {"code": "ar", "name": "Arabic"},
    {"code": "zh", "name": "Chinese"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"},
]


def normalize_lang(code: str) -> str:
    c = code.strip().lower()
    return _LANG_ALIAS.get(c, c)


@lru_cache(maxsize=4)
def _load(model_name: str) -> tuple[Any, Any]:
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    model.eval()
    return tokenizer, model


def _try_load(src: str, tgt: str) -> tuple[Any, Any] | None:
    name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
    try:
        return _load(name)
    except Exception:
        return None


def translate_texts(texts: list[str], source_lang: str, target_lang: str) -> list[str]:
    """
    Translate a batch of strings. If a direct opus-mt-<src>-<tgt> model isn't
    available on HF, fall back to a two-hop translation through English.
    """
    src = normalize_lang(source_lang)
    tgt = normalize_lang(target_lang)

    if src == tgt or not texts:
        return list(texts)

    direct = _try_load(src, tgt)
    if direct is not None:
        return _run(direct, texts)

    # Two-hop via English.
    if src != "en" and tgt != "en":
        a = _try_load(src, "en")
        b = _try_load("en", tgt)
        if a is not None and b is not None:
            return _run(b, _run(a, texts))

    raise RuntimeError(
        f"No Helsinki-NLP translation model available for {src} → {tgt}."
    )


def _run(pair: tuple[Any, Any], texts: list[str]) -> list[str]:
    tokenizer, model = pair
    # Preserve empty entries so segment indices line up.
    nonempty_idx = [i for i, t in enumerate(texts) if t.strip()]
    if not nonempty_idx:
        return list(texts)

    inputs = tokenizer(
        [texts[i] for i in nonempty_idx],
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
    )
    output = model.generate(**inputs, max_new_tokens=512, num_beams=2)
    decoded = tokenizer.batch_decode(output, skip_special_tokens=True)

    result = list(texts)
    for i, translated in zip(nonempty_idx, decoded):
        result[i] = translated
    return result
