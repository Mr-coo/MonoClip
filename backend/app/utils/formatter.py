from typing import Any


def format_to_json(result: dict[str, Any]) -> dict[str, Any]:
    segments_raw = result.get("segments", [])

    output = {
        "language": str(result.get("language", "unknown")),
        "segments": [],
    }

    for i, seg in enumerate(segments_raw):
        output["segments"].append(
            {
                "id": i,
                "start": float(seg.get("start", 0.0)),
                "end": float(seg.get("end", 0.0)),
                "text": str(seg.get("text", "")).strip(),
            }
        )

    return output