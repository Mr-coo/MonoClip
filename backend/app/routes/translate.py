from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.models.schema import CaptionSegment, TranscriptionResponse
from app.services.translation_service import (
    SUPPORTED_TARGETS,
    translate_texts,
)


router = APIRouter(prefix="/caption", tags=["caption"])


class TranslateRequest(BaseModel):
    source_lang: str = Field(..., description="Source language code, e.g. 'en' or 'id'.")
    target_lang: str = Field(..., description="Target language code, e.g. 'fr'.")
    segments: list[CaptionSegment]


@router.get(
    "/translate/languages",
    summary="List supported translation target languages",
)
def list_languages() -> dict[str, list[dict[str, str]]]:
    return {"targets": SUPPORTED_TARGETS}


@router.post(
    "/translate",
    response_model=TranscriptionResponse,
    summary="Translate caption segments into another language",
    description=(
        "Translates each segment's text using Helsinki-NLP/opus-mt-<src>-<tgt> "
        "(falling back to a two-hop translation via English if no direct model is available). "
        "Timestamps and segment IDs are preserved; only the text field is replaced."
    ),
)
async def translate_caption(payload: TranslateRequest) -> TranscriptionResponse:
    if not payload.segments:
        return TranscriptionResponse(language=payload.target_lang, segments=[])

    texts = [seg.text for seg in payload.segments]
    try:
        translated = await run_in_threadpool(
            translate_texts, texts, payload.source_lang, payload.target_lang
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {exc}",
        ) from exc

    return TranscriptionResponse(
        language=payload.target_lang,
        segments=[
            CaptionSegment(
                id=seg.id,
                start=seg.start,
                end=seg.end,
                text=new_text,
            )
            for seg, new_text in zip(payload.segments, translated)
        ],
    )
