import argparse
import json
import os
import sys
import wave

import riva.client


def main():
    parser = argparse.ArgumentParser(description="Transcribe a 16kHz mono WAV file using NVIDIA Riva ASR.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--server", default=os.getenv("NVIDIA_ASR_SERVER", "grpc.nvcf.nvidia.com:443"))
    parser.add_argument("--function-id", default=os.getenv("NVIDIA_ASR_FUNCTION_ID", "b702f636-f60c-4a3d-a6f4-f3568c13bd7d"))
    parser.add_argument("--language-code", default=os.getenv("NVIDIA_ASR_LANGUAGE", "en"))
    args = parser.parse_args()

    api_key = os.getenv("NVIDIA_API_KEY", "")
    if not api_key:
        raise RuntimeError("NVIDIA_API_KEY is not configured")

    with wave.open(args.input, "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        audio = wav_file.readframes(wav_file.getnframes())

    auth = riva.client.Auth(
        uri=args.server,
        use_ssl=True,
        metadata_args=[
            ["function-id", args.function_id],
            ["authorization", f"Bearer {api_key}"],
        ],
    )
    asr = riva.client.ASRService(auth)
    config = riva.client.RecognitionConfig(
        encoding=riva.client.AudioEncoding.LINEAR_PCM,
        sample_rate_hertz=sample_rate,
        language_code=args.language_code,
        max_alternatives=1,
        enable_automatic_punctuation=True,
    )

    response = asr.offline_recognize(audio, config)
    chunks = []
    for result in response.results:
        if result.alternatives:
            chunks.append(result.alternatives[0].transcript.strip())

    print(json.dumps({"success": True, "text": " ".join(filter(None, chunks))}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
