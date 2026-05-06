from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.filter_badword import router as filter_badword_router
from app.routes.transcribe import router as transcribe_router
from app.routes.tracking import router as tracking_router


TAGS_METADATA = [
    {
        "name": "transcription",
        "description": "Upload a video or audio file and get back timestamped caption segments using OpenAI Whisper.",
    },
    {
        "name": "caption",
        "description": "Post-process caption segments — currently supports profanity filtering (ID + EN word lists).",
    },
    {
        "name": "tracking",
        "description": "Track an object in a video using CSRT and apply auto-zoom. Returns a downloadable tracked video.",
    },
]

app = FastAPI(
    title="MonoClip API",
    description="Backend service for MonoClip — AI transcription, caption filtering, and object tracking.",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=False,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(transcribe_router)
app.include_router(filter_badword_router)
app.include_router(tracking_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}