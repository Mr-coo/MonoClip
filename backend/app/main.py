from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.filter_badword import router as filter_badword_router
from app.routes.transcribe import router as transcribe_router
from app.routes.tracking import router as tracking_router
from app.services.whisper_service import get_whisper_model


app = FastAPI(
	title="MonoClip API",
	description="Backend service for media transcription using Whisper.",
	version="1.0.0",
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


@app.on_event("startup")
def load_models_on_startup() -> None:
	get_whisper_model()