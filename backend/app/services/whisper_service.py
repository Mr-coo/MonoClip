from functools import lru_cache
from typing import Any

import whisper


DEFAULT_MODEL_NAME = "tiny"


@lru_cache(maxsize=1)
def get_whisper_model(model_name: str = DEFAULT_MODEL_NAME) -> Any:
    return whisper.load_model(model_name)


def transcribe_media(file_path: str, model_name: str = DEFAULT_MODEL_NAME) -> dict[str, Any]:
    model = get_whisper_model(model_name)
    result = model.transcribe(file_path, fp16=False)
    return dict(result)