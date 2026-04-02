import whisper

model = whisper.load_model("medium")

def transcribe_video (file_path: str):
    result = model.transcribe(file_path)
    return result