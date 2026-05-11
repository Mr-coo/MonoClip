from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2


@dataclass
class TrackingResult:
    output_video_path: str
    frames: list[dict[str, Any]]


def _create_tracker() -> Any:
    if hasattr(cv2, "legacy") and hasattr(cv2.legacy, "TrackerCSRT_create"):
        return cv2.legacy.TrackerCSRT_create()
    if hasattr(cv2, "TrackerCSRT_create"):
        return cv2.TrackerCSRT_create()
    raise RuntimeError("OpenCV tracker CSRT tidak tersedia di environment ini.")


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def _safe_crop_box(frame_width: int, frame_height: int, bbox: tuple[int, int, int, int], zoom_factor: float) -> tuple[int, int, int, int]:
    x, y, w, h = bbox

    # Crop a frame-relative region so zoom_factor=2 always means 2× magnification,
    # independent of bbox size. Clamped to at least the bbox dimensions.
    crop_w = max(w, int(frame_width / zoom_factor))
    crop_h = max(h, int(frame_height / zoom_factor))

    center_x = x + w // 2
    center_y = y + h // 2

    left = center_x - crop_w // 2
    top = center_y - crop_h // 2

    left = _clamp(left, 0, max(0, frame_width - crop_w))
    top = _clamp(top, 0, max(0, frame_height - crop_h))

    crop_w = min(crop_w, frame_width)
    crop_h = min(crop_h, frame_height)

    return left, top, crop_w, crop_h


def track_and_zoom(
    video_path: str,
    initial_bbox: tuple[int, int, int, int],
    zoom_factor: float = 1.5,
    output_path: str | None = None,
    smoothing_alpha: float = 0.7,
) -> TrackingResult:

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Video tidak bisa dibuka.")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
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
        output_path = str(Path(video_path).with_suffix(".tracked.mp4"))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    if not writer.isOpened():
        cap.release()
        raise RuntimeError("VideoWriter tidak bisa dibuat.")

    frames: list[dict[str, Any]] = []
    frame_index = 0

    last_bbox = (x, y, w, h)

    smooth_bbox = (x, y, w, h)

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

        crop_left, crop_top, crop_w, crop_h = _safe_crop_box(
            frame_width,
            frame_height,
            (bx, by, bw, bh),
            zoom_factor,
        )

        crop = frame[crop_top:crop_top + crop_h, crop_left:crop_left + crop_w]

        zoomed = cv2.resize(crop, (frame_width, frame_height), interpolation=cv2.INTER_CUBIC)

        writer.write(zoomed)

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

    cap.release()
    writer.release()

    return TrackingResult(
        output_video_path=output_path,
        frames=frames,
    )