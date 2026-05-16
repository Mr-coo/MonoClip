from __future__ import annotations

import os
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove


# Lightweight ONNX model — good balance of speed and quality on CPU.
DEFAULT_MODEL = "u2netp"


@lru_cache(maxsize=2)
def get_session(model_name: str = DEFAULT_MODEL) -> Any:
    return new_session(model_name)


def remove_image_bg(input_path: str, output_path: str | None = None) -> str:
    """Strip the background from a still image. Always writes RGBA PNG."""
    if output_path is None:
        output_path = str(Path(input_path).with_suffix(".bgremoved.png"))

    with Image.open(input_path) as img:
        rgba = remove(img.convert("RGBA"), session=get_session())
    rgba.save(output_path, "PNG")
    return output_path


def remove_video_bg(
    input_path: str,
    output_path: str | None = None,
    progress: Any = None,
) -> str:
    """
    Strip the background from a video frame-by-frame.

    Output is WebM/VP9 with `yuva420p` so the alpha channel survives — playable
    inside Chromium-based WebViews (which the editor uses).
    """
    if output_path is None:
        output_path = str(Path(input_path).with_suffix(".bgremoved.webm"))

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {input_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if width <= 0 or height <= 0:
        cap.release()
        raise RuntimeError("Video has invalid dimensions.")

    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-pix_fmt", "rgba",
        "-s", f"{width}x{height}",
        "-r", f"{fps}",
        "-i", "-",
        "-c:v", "libvpx-vp9",
        "-pix_fmt", "yuva420p",
        "-b:v", "0",
        "-crf", "32",
        "-row-mt", "1",
        "-deadline", "realtime",
        "-cpu-used", "5",
        "-an",
        output_path,
    ]

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )

    session = get_session()
    processed = 0
    try:
        while True:
            ok, frame_bgr = cap.read()
            if not ok:
                break

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            pil = Image.fromarray(frame_rgb).convert("RGBA")
            cut = remove(pil, session=session).convert("RGBA")
            buf = np.array(cut, dtype=np.uint8).tobytes()

            assert proc.stdin is not None
            proc.stdin.write(buf)

            processed += 1
            if progress is not None and total > 0:
                try:
                    progress(processed, total)
                except Exception:
                    pass
    finally:
        cap.release()
        if proc.stdin:
            try:
                proc.stdin.close()
            except BrokenPipeError:
                pass
        rc = proc.wait()
        if rc != 0:
            stderr = proc.stderr.read().decode("utf-8", errors="replace") if proc.stderr else ""
            if os.path.exists(output_path):
                os.remove(output_path)
            raise RuntimeError(f"ffmpeg failed (rc={rc}): {stderr.strip()}")

    return output_path
