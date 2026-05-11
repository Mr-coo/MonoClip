import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.models.schema import TranscriptionResponse
from app.services.whisper_service import transcribe_media
from app.utils.formatter import format_to_json

router = APIRouter(tags=["transcription"])

SUPPORTED_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".mkv",
    ".avi",
    ".webm",
    ".mp3",
    ".wav",
    ".m4a",
    ".flac",
}


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribe audio/video to captions",
    description=(
        "Upload a media file (video or audio). "
        "Returns timestamped caption segments detected by Whisper medium. "
        f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
    ),
)
async def transcribe(file: UploadFile = File(...)) -> TranscriptionResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'.",
        )

    temp_file_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            while chunk := await file.read(1024 * 1024):
                temp_file.write(chunk)
            temp_file_path = temp_file.name

        result = await run_in_threadpool(transcribe_media, temp_file_path)
        formatted_result = format_to_json(result)
        return TranscriptionResponse(**formatted_result)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe media: {exc}",
        ) from exc
    finally:
        await file.close()
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)