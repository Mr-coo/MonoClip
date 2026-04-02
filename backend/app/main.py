from fastapi import FastAPI
from app.routes.transcribe import router as transcribe_router

app = FastAPI(title="MonoClip API")
app.include_router(transcribe_router)