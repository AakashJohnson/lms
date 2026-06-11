import argparse
import json
import os
import sys
from faster_whisper import WhisperModel


def main():
    parser = argparse.ArgumentParser(description="Transcribe a WAV file using faster-whisper.")
    parser.add_argument("--input", required=True)
    args = parser.parse_args()

    model_size = os.getenv("WHISPER_MODEL", "large-v3-turbo")
    device = os.getenv("WHISPER_DEVICE", "auto")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "default")
    
    # If device is cpu, int8 is faster and lighter
    if device == "cpu" and compute_type == "default":
        compute_type = "int8"
    elif device == "auto" and compute_type == "default":
        compute_type = "auto"

    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    # Transcribe the audio
    segments, info = model.transcribe(args.input, beam_size=5, language=None)

    transcript_segments = []
    text_chunks = []
    
    for segment in segments:
        text_chunks.append(segment.text)
        transcript_segments.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })

    full_text = " ".join(text_chunks).strip()

    result = {
        "success": True,
        "text": full_text,
        "segments": transcript_segments,
        "language": info.language,
        "language_probability": info.language_probability,
        "duration": info.duration
    }
    
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
