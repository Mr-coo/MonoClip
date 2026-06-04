from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.core.deps import get_current_user

from app.routes.auth import router as auth_router
from app.routes.bgremove import router as bgremove_router
from app.routes.filter_badword import router as filter_badword_router
from app.routes.transcribe import router as transcribe_router
from app.routes.tracking import router as tracking_router
from app.routes.translate import router as translate_router
from app.core.config import get_settings
from app.services.whisper_service import get_whisper_model


@asynccontextmanager
async def lifespan(_: FastAPI):
    await run_in_threadpool(get_whisper_model)
    yield


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
    {
        "name": "bgremove",
        "description": "AI background removal for images (RGBA PNG) and videos (VP9 WebM with alpha) using rembg / U2Net.",
    },
    {
        "name": "auth",
        "description": "User accounts — email/password register & login plus Google/GitHub OAuth, issuing JWT access tokens.",
    },
]

app = FastAPI(
    title="MonoClip API",
    description="Backend service for MonoClip — AI transcription, caption filtering, and object tracking.",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=get_settings().CORS_ALLOW_ORIGINS,
	allow_credentials=False,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Every feature endpoint requires a valid access token. The auth router stays
# public (register/login/OAuth), and tracking/bgremove guard only their POST
# handlers so their file-download GETs (fetched by the Rust downloader, which
# can't send a bearer header) remain reachable.
_auth_required = [Depends(get_current_user)]

app.include_router(auth_router)
app.include_router(transcribe_router, dependencies=_auth_required)
app.include_router(filter_badword_router, dependencies=_auth_required)
app.include_router(translate_router, dependencies=_auth_required)
app.include_router(tracking_router)
app.include_router(bgremove_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}