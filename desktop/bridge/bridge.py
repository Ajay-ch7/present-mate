#!/usr/bin/env python3
"""
PresentMate Desktop Bridge
--------------------------
Reads JSON commands from stdin, responds with JSON to stdout.
Electron main process spawns this as a child process.

Commands:
  { "type": "ocr",       "image": "<base64 data URL>" }
  { "type": "summarize", "slide_text": "..." }
  { "type": "analyze",   "slide_text": "...", "transcript": "..." }
"""

import sys
import json
import base64
import io
import os
import requests

BACKEND_URL = os.environ.get("PRESENTMATE_BACKEND", "http://localhost:8000")


def respond(payload: dict):
    """Write a JSON response line to stdout (read by Electron)."""
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def do_ocr(base64_image: str) -> str:
    """Run pytesseract OCR on a base64-encoded screenshot."""
    try:
        import pytesseract
        from PIL import Image

        if "," in base64_image:
            base64_image = base64_image.split(",", 1)[1]

        img_bytes = base64.b64decode(base64_image)
        img = Image.open(io.BytesIO(img_bytes))

        # Crop to center 70% width × 80% height to focus on slide content
        w, h = img.size
        margin_x = int(w * 0.15)
        margin_y = int(h * 0.10)
        img = img.crop((margin_x, margin_y, w - margin_x, h - margin_y))

        # Upscale for better OCR accuracy
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)

        text = pytesseract.image_to_string(img, lang="eng", config="--psm 6")
        lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 3]
        return " ".join(lines)
    except ImportError:
        return "(pytesseract not installed — OCR unavailable)"
    except Exception as e:
        return f"(OCR error: {e})"


def do_vision_summarize(base64_image: str) -> dict:
    """Call FastAPI /overlay/vision_summarize and return slide summary + OCR text."""
    try:
        if "," in base64_image:
            base64_image = base64_image.split(",", 1)[1]

        resp = requests.post(
            f"{BACKEND_URL}/overlay/vision_summarize",
            json={"image_base64": base64_image},
            timeout=90,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {
            "summary": "Backend is not reachable. Make sure the PresentMate server is running.",
            "key_points": [],
            "raw_text": "",
        }
    except Exception as e:
        return {
            "summary": f"Vision error: {e}",
            "key_points": [],
            "raw_text": "",
        }


def do_analyze(slide_text: str, transcript: str) -> dict:
    """Call FastAPI /overlay/analyze and return the coaching result."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/overlay/analyze",
            json={"slide_text": slide_text, "transcript": transcript},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {
            "status": "no_speech",
            "suggestion": "Backend is not reachable. Make sure the PresentMate server is running.",
            "confidence": 0.0,
        }
    except Exception as e:
        return {
            "status": "no_speech",
            "suggestion": f"Analysis error: {e}",
            "confidence": 0.0,
        }


def main():
    """Main event loop — read commands from stdin line by line."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            cmd = json.loads(line)
        except json.JSONDecodeError:
            respond({"type": "error", "message": "Invalid JSON"})
            continue

        cmd_type = cmd.get("type")

        if cmd_type == "vision_summarize":
            data = do_vision_summarize(cmd.get("image", ""))
            respond({"type": "vision_result", "data": data})

        elif cmd_type == "analyze":
            data = do_analyze(
                slide_text=cmd.get("slide_text", ""),
                transcript=cmd.get("transcript", ""),
            )
            respond({"type": "analyze_result", "data": data})

        else:
            respond({"type": "error", "message": f"Unknown command: {cmd_type}"})


if __name__ == "__main__":
    main()
