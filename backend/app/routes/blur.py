import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from app.core.deps import get_current_user
from app.models.schema import BBox, BlurResponse, TrackFrame
from app.services.blur_service import track_and_blur

router = APIRouter(tags=["blur"])

SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
SUPPORTED_SHAPES = {"rect", "circle"}
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB

# Map of filename → absolute path for blurred output files
_blurred_files: dict[str, str] = {}


@router.get(
    "/blur/file/{filename}",
    summary="Download blurred video",
    description="Serves the blurred output video produced by POST /blur. The URL is returned in the `output_video_path` field of the blur response.",
)
async def download_blurred_file(filename: str) -> FileResponse:
    if filename not in _blurred_files:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    path = _blurred_files[filename]
    if not os.path.exists(path):
        _blurred_files.pop(filename, None)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File has expired.")
    return FileResponse(path, media_type="video/mp4", filename=filename)


@router.post(
    "/blur",
    response_model=BlurResponse,
    dependencies=[Depends(get_current_user)],
    summary="Blur and track an object in a video",
    description=(
        "Upload a video and specify the selection (x, y, w, h in source pixels) around the object to blur. "
        "Set `shape` to 'rect' for a rectangular blur or 'circle' for an elliptical blur inscribed in the box. "
        "The selection is tracked with CSRT and the blur follows the object as it moves. "
        "Returns per-frame tracking data and a URL to download the blurred output video via GET /blur/file/{filename}. "
        "Max file size: 200 MB."
    ),
)
async def blur_object(
    file: UploadFile = File(...),
    x: int = Form(..., ge=0),
    y: int = Form(..., ge=0),
    w: int = Form(..., gt=0),
    h: int = Form(..., gt=0),
    shape: str = Form("rect"),
    blur_strength: float = Form(0.3, gt=0, le=1),
) -> BlurResponse:

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

    if shape not in SUPPORTED_SHAPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported shape '{shape}'. Use 'rect' or 'circle'.",
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

        temp_output_path = str(Path(temp_file_path).with_suffix(".blurred.mp4"))

        result = await run_in_threadpool(
            track_and_blur,
            temp_file_path,
            (x, y, w, h),
            shape,
            blur_strength,
            temp_output_path,
        )

        output_filename = Path(result.output_video_path).name
        _blurred_files[output_filename] = result.output_video_path

        response = BlurResponse(
            output_video_path=f"/blur/file/{output_filename}",
            frames=[
                TrackFrame(
                    frame_index=item["frame_index"],
                    timestamp=item["timestamp"],
                    bbox=BBox(**item["bbox"]),
                    success=item["tracking_success"],
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
            detail=f"Failed to blur media: {exc}",
        ) from exc

    finally:
        await file.close()

        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if temp_output_path and temp_output_path not in _blurred_files.values() and os.path.exists(temp_output_path):
            os.remove(temp_output_path)
