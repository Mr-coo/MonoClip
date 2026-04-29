import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.models.schema import BBox, TrackFrame, TrackingResponse
from app.services.tracking_service import track_and_zoom

router = APIRouter(tags=["tracking"])

SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB


@router.post("/track", response_model=TrackingResponse)
async def track_object(
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    w: int = Form(...),
    h: int = Form(...),
    zoom_factor: float = Form(1.5),
) -> TrackingResponse:

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
    temp_output_path: str | None = None

    try:
        size = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File terlalu besar (max 200MB).",
                    )
                temp_file.write(chunk)

            temp_file_path = temp_file.name

        temp_output_path = str(Path(temp_file_path).with_suffix(".tracked.mp4"))

        result = await run_in_threadpool(
            track_and_zoom,
            temp_file_path,
            (x, y, w, h),
            zoom_factor,
            temp_output_path,
        )

        response = TrackingResponse(
            output_video_path=result.output_video_path,
            frames=[
                TrackFrame(
                    frame_index=item["frame_index"],
                    timestamp=item["timestamp"],
                    bbox=BBox(**item["bbox"]),
                    success=item["success"],
                )
                for item in result.frames
            ],
        )

        return response

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track media: {exc}",
        ) from exc

    finally:
        await file.close()

        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

        # if temp_output_path and os.path.exists(temp_output_path):
        #     os.remove(temp_output_path)