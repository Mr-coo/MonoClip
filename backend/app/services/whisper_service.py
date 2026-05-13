from functools import lru_cache
from typing import Any

import whisper


DEFAULT_MODEL_NAME = "medium"


@lru_cache(maxsize=1)
def get_whisper_model(model_name: str = DEFAULT_MODEL_NAME) -> Any:
    return whisper.load_model(model_name)


def transcribe_media(file_path: str, model_name: str = DEFAULT_MODEL_NAME) -> dict[str, Any]:
    audio = whisper.load_audio(file_path)
    if audio.shape[0] == 0:
        raise ValueError("No audio detected in the file.")

    model = get_whisper_model(model_name)
    result = model.transcribe(
        file_path,
        fp16=False,
        beam_size=1,
        best_of=1,
        condition_on_previous_text=False,
    )
    return dict(result)