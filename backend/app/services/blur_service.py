from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import cv2
import numpy as np

# Reuse the tracker + H.264 re-encode infra so blur stays consistent with the
# zoom-tracking pipeline (same CSRT tracker, same WebView2-friendly output).
from app.services.tracking_service import _clamp, _create_tracker, _reencode_h264

BlurShape = Literal["rect", "circle"]


@dataclass
class BlurResult:
    output_video_path: str
    frames: list[dict[str, Any]]


def _blur_kernel(region_w: int, region_h: int, strength: float) -> int:
    """Odd Gaussian kernel size scaled to the region so a given strength blurs
    consistently regardless of how large the selected area is."""
    base = min(region_w, region_h)
    k = max(3, min(int(base * strength), 199))
    if k % 2 == 0:
        k += 1
    return k


def _clamp_box_to_frame(
    frame_width: int, frame_height: int, bbox: tuple[int, int, int, int]
) -> tuple[int, int, int, int]:
    x, y, w, h = bbox
    x = _clamp(x, 0, max(0, frame_width - 1))
    y = _clamp(y, 0, max(0, frame_height - 1))
    w = _clamp(w, 1, frame_width - x)
    h = _clamp(h, 1, frame_height - y)
    return x, y, w, h


def _apply_blur(
    frame: np.ndarray,
    bbox: tuple[int, int, int, int],
    shape: BlurShape,
    strength: float,
) -> None:
    """Blur the region of `frame` covered by `bbox`, in place.

    For ``shape="circle"`` only the inscribed ellipse of the bbox is blurred so
    the censored area follows a circular selection drawn on the frame.
    """
    x, y, w, h = bbox
    if w <= 0 or h <= 0:
        return

    # roi is a view into frame; writing to it updates the frame directly.
    roi = frame[y:y + h, x:x + w]
    k = _blur_kernel(w, h, strength)
    blurred = cv2.GaussianBlur(roi, (k, k), 0)

    if shape == "circle":
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(mask, (w // 2, h // 2), (w // 2, h // 2), 0, 0, 360, 255, -1)
        roi[mask > 0] = blurred[mask > 0]
    else:
        roi[:] = blurred


def track_and_blur(
    video_path: str,
    initial_bbox: tuple[int, int, int, int],
    shape: BlurShape = "rect",
    blur_strength: float = 0.3,
    output_path: str | None = None,
    smoothing_alpha: float = 0.7,
) -> BlurResult:
    """Track the object inside `initial_bbox` with CSRT and blur it on every
    frame, following it as it moves. Returns per-frame bbox data plus the path
    to the re-encoded H.264 output video."""

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Video tidak bisa dibuka.")

    raw_fps = cap.get(cv2.CAP_PROP_FPS)
    fps = raw_fps if raw_fps > 0 else 30.0
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    ok, frame = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError("Frame pertama tidak bisa dibaca.")

    x, y, w, h = initial_bbox

    tracker = _create_tracker()
    tracker.init(frame, (x, y, w, h))

    if output_path is None:
        output_path = str(Path(video_path).with_suffix(".blurred.mp4"))

    raw_path = output_path + ".raw.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(raw_path, fourcc, fps, (frame_width, frame_height))
    if not writer.isOpened():
        cap.release()
        raise RuntimeError("VideoWriter tidak bisa dibuat.")

    frames: list[dict[str, Any]] = []
    frame_index = 0

    last_bbox = (x, y, w, h)
    smooth_bbox = (x, y, w, h)

    try:
        while True:
            if frame_index > 0:
                ok, frame = cap.read()
                if not ok:
                    break
                success, raw_bbox = tracker.update(frame)
                if success:
                    bx, by, bw, bh = [int(v) for v in raw_bbox]
                    last_bbox = (bx, by, bw, bh)
                else:
                    bx, by, bw, bh = last_bbox
            else:
                # Frame 0 was used to init the tracker; use the initial bbox directly.
                success = True
                bx, by, bw, bh = x, y, w, h

            sx, sy, sw, sh = smooth_bbox
            bx = int(smoothing_alpha * bx + (1 - smoothing_alpha) * sx)
            by = int(smoothing_alpha * by + (1 - smoothing_alpha) * sy)
            bw = int(smoothing_alpha * bw + (1 - smoothing_alpha) * sw)
            bh = int(smoothing_alpha * bh + (1 - smoothing_alpha) * sh)

            smooth_bbox = (bx, by, bw, bh)

            clamped = _clamp_box_to_frame(frame_width, frame_height, (bx, by, bw, bh))
            _apply_blur(frame, clamped, shape, blur_strength)

            writer.write(frame)

            frames.append(
                {
                    "frame_index": frame_index,
                    "timestamp": frame_index / fps,
                    "bbox": {
                        "x": bx,
                        "y": by,
                        "w": bw,
                        "h": bh,
                    },
                    "tracking_success": success,
                }
            )

            frame_index += 1
    finally:
        cap.release()
        writer.release()

    try:
        _reencode_h264(raw_path, output_path)
    finally:
        if os.path.exists(raw_path):
            os.remove(raw_path)

    return BlurResult(
        output_video_path=output_path,
        frames=frames,
    )
