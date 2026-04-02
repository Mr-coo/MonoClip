from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile

from app.services.whisper_service import transcribe_video
from app.utils.formatter import format_to_json

router = APIRouter()

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        result = transcribe_video(tmp_path)

        return format_to_json(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))