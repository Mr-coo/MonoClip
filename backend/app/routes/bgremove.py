import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.bgremove_service import remove_image_bg, remove_video_bg


router = APIRouter(prefix="/bgremove", tags=["bgremove"])

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
MAX_FILE_SIZE = 300 * 1024 * 1024  # 300 MB

# filename → absolute path. Kept on disk until next restart.
_bgremoved_files: dict[str, str] = {}


class BgRemoveResponse(BaseModel):
    output_path: str
    media_kind: str  # "img" | "video"
    filename: str


@router.get(
    "/file/{filename}",
    summary="Download background-removed media",
)
async def download_file(filename: str) -> FileResponse:
    if filename not in _bgremoved_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    path = _bgremoved_files[filename]
    if not os.path.exists(path):
        _bgremoved_files.pop(filename, None)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File has expired.")
    suffix = Path(path).suffix.lower()
    media_type = "image/png" if suffix == ".png" else "video/webm"
    return FileResponse(path, media_type=media_type, filename=filename)


@router.post(
    "",
    response_model=BgRemoveResponse,
    summary="Remove background from an image or video",
    description=(
        "Upload an image (PNG/JPG/WebP) or a video (MP4/MOV/MKV/AVI/WebM). "
        "Returns a URL to download the processed file via GET /bgremove/file/{filename}. "
        "Images are returned as RGBA PNG. Videos are returned as VP9 WebM with `yuva420p` "
        "(transparent alpha channel preserved). Max file size: 300 MB."
    ),
)
async def remove_background(file: UploadFile = File(...)) -> BgRemoveResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix in IMAGE_EXT:
        media_kind = "img"
    elif suffix in VIDEO_EXT:
        media_kind = "video"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'.",
        )

    temp_input: str | None = None
    output_path: str | None = None

    try:
        size = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File too large (max 300 MB).",
                    )
                tf.write(chunk)
            temp_input = tf.name

        if media_kind == "img":
            output_path = await run_in_threadpool(remove_image_bg, temp_input)
        else:
            output_path = await run_in_threadpool(remove_video_bg, temp_input)

        filename = Path(output_path).name
        _bgremoved_files[filename] = output_path

        return BgRemoveResponse(
            output_path=f"/bgremove/file/{filename}",
            media_kind=media_kind,
            filename=filename,
        )

    except HTTPException:
        raise
    except Exception as exc:
        if output_path and os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove background: {exc}",
        ) from exc
    finally:
        await file.close()
        if temp_input and os.path.exists(temp_input):
            try:
                os.remove(temp_input)
            except OSError:
                pass
