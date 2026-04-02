def format_to_json(result):
    output = {
        "language": result["language"],
        "segments": []
    }

    for i, seg in enumerate(result["segments"], 1):
        output["segments"].append({
            "id": i,
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"].strip()
        })

    return output