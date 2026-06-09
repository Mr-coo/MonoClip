from pydantic import BaseModel, Field

class CaptionSegment(BaseModel):
	id: int = Field(..., ge=0)
	start: float = Field(..., ge=0)
	end: float = Field(..., ge=0)
	text: str


class TranscriptionResponse(BaseModel):
	language: str
	segments: list[CaptionSegment]

class BBox(BaseModel):
    x: int = Field(..., ge=0)
    y: int = Field(..., ge=0)
    w: int = Field(..., gt=0)
    h: int = Field(..., gt=0)


class TrackFrame(BaseModel):
    frame_index: int = Field(..., ge=0)
    timestamp: float = Field(..., ge=0)
    bbox: BBox
    success: bool


class TrackingResponse(BaseModel):
    output_video_path: str
    frames: list[TrackFrame]


# Blur reuses the per-frame tracking shape (TrackFrame): each frame carries the
# bbox of the region that was blurred plus whether the tracker held that frame.
class BlurResponse(BaseModel):
    output_video_path: str
    frames: list[TrackFrame]