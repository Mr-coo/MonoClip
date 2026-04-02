from pydantic import BaseModel, Field


class CaptionSegment(BaseModel):
	id: int = Field(..., ge=0)
	start: float = Field(..., ge=0)
	end: float = Field(..., ge=0)
	text: str


class TranscriptionResponse(BaseModel):
	language: str
	segments: list[CaptionSegment]
