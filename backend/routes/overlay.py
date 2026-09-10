from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ai_service import analyze_presentation_context, summarize_slide_text, vision_summarize_slide, transcribe_audio_chunk


router = APIRouter()


class AnalyzeRequest(BaseModel):
    slide_text: str
    transcript: str
    session_id: str | None = None


class SummarizeRequest(BaseModel):
    slide_text: str

class TranscribeRequest(BaseModel):
    audio_base64: str

@router.post("/transcribe")
async def transcribe_speech(request: TranscribeRequest):
    """
    Receives base64 encoded webm audio chunk from the desktop client.
    Returns the recognized speech or error.
    """
    text = await transcribe_audio_chunk(request.audio_base64)
    if text.startswith("__ERROR__"):
        return {"text": "", "error": text[10:]}
    return {"text": text}


@router.get("/ping")
async def ping():
    """Health check for the desktop overlay app."""
    return {"status": "ok", "service": "PresentMate Overlay Bridge"}


@router.post("/summarize")
async def summarize_overlay(request: SummarizeRequest):
    """
    Receives OCR-extracted slide text and returns a concise summary + key points.
    Called automatically when slide content changes.
    """
    if not request.slide_text.strip():
        raise HTTPException(status_code=400, detail="slide_text cannot be empty.")

    result = await summarize_slide_text(slide_text=request.slide_text)
    return result


@router.post("/analyze")
async def analyze_overlay(request: AnalyzeRequest):
    """
    Receives OCR-extracted slide text and the live speech transcript.
    Returns an AI coaching suggestion with on/off-track status.
    """
    cleaned_transcript = request.transcript.strip()
    cleaned_slide_text = request.slide_text.strip()

    if not cleaned_slide_text and not cleaned_transcript:
        raise HTTPException(status_code=400, detail="Both slide_text and transcript cannot be empty.")

    # Fast-path for silence to avoid unnecessary AI round-trip latency
    if not cleaned_transcript:
        return {
            "status": "no_speech",
            "suggestion": "Listening to your presentation...",
            "confidence": 1.0,
        }

    result = await analyze_presentation_context(
        slide_text=cleaned_slide_text,
        transcript=cleaned_transcript,
    )
    return result



class VisionRequest(BaseModel):
    image_base64: str          # raw base64 (no data-URL prefix)
    mime_type: str = "image/jpeg"

@router.post("/vision_summarize")
async def vision_summarize_overlay(request: VisionRequest):
    """
    Accepts a base64-encoded screenshot of the current slide.
    Uses Gemini Vision to read the slide text and return a summary + key points.
    No Tesseract / pytesseract required.
    """
    if not request.image_base64.strip():
        raise HTTPException(status_code=400, detail="image_base64 cannot be empty.")

    result = await vision_summarize_slide(
        image_base64=request.image_base64,
        mime_type=request.mime_type,
    )
    return result

