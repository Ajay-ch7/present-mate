import os
import json
import asyncio
import re
from google import genai
from google.genai import types
from schemas.presentation import SlideSummary

# ─── Model Fallback Chain ─────────────────────────────────────────────────────
# When one model's free-tier quota is exhausted, automatically try the next one.
# These model names are verified available via the API (April 2026).
# Each model has its own per-model free-tier quota, so cycling helps.
MODEL_FALLBACK_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
]

# Track which model index to start from (skip known-exhausted models)
_current_model_idx = 0



async def transcribe_audio_chunk(audio_base64: str) -> str:
    """
    Transcribes a base64-encoded audio chunk (WAV format) using Google's free Speech Recognition API.
    This replaces Gemini for STT because it behaves true to real-time dictation engines.
    """
    import base64
    import io
    import speech_recognition as sr

    try:
        audio_data = base64.b64decode(audio_base64)
        file_obj = io.BytesIO(audio_data)
        
        recognizer = sr.Recognizer()
        with sr.AudioFile(file_obj) as source:
            audio = recognizer.record(source)
            text = recognizer.recognize_google(audio)
            return text
    except sr.UnknownValueError:
        return ""  # No speech detected
    except sr.RequestError as e:
        return f"__ERROR__ Speech Recognition request failed: {e}"
    except Exception as e:
        error_msg = f"Error in transcribe_audio_chunk: {e}"
        print(error_msg)
        return f"__ERROR__ {error_msg}"


def _get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    return genai.Client(api_key=api_key)


def _extract_retry_delay(error_msg: str) -> float:
    """Extract the retry delay from a 429 error message, default 5s."""
    match = re.search(r'retryDelay.*?(\d+)', str(error_msg))
    if match:
        return min(float(match.group(1)), 15)  # Cap at 15s to avoid long waits
    return 5.0


async def _generate_with_fallback(contents, response_mime_type="application/json"):
    """
    Try generating content with each model in the fallback chain.
    On 429 (quota exhausted), move to the next model. If all models fail,
    do a single retry on the last model after the suggested delay.
    """
    global _current_model_idx
    client = _get_client()
    last_error = None

    # Try each model starting from the current preferred one
    for offset in range(len(MODEL_FALLBACK_CHAIN)):
        idx = (_current_model_idx + offset) % len(MODEL_FALLBACK_CHAIN)
        model = MODEL_FALLBACK_CHAIN[idx]

        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type=response_mime_type,
                ),
            )
            # Success! Promote this model to be tried first next time.
            if idx != _current_model_idx:
                print(f"[AI] Switched preferred model to {model} (was {MODEL_FALLBACK_CHAIN[_current_model_idx]})")
                _current_model_idx = idx
            return response

        except Exception as e:
            error_str = str(e)
            last_error = e
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                print(f"[AI] Model {model} rate-limited, trying next fallback...")
                continue
            else:
                # Non-rate-limit error — don't try other models
                raise

    # All models exhausted. Try one more time after a short wait.
    delay = _extract_retry_delay(str(last_error))
    print(f"[AI] All models rate-limited. Waiting {delay}s before final retry...")
    await asyncio.sleep(delay)

    model = MODEL_FALLBACK_CHAIN[_current_model_idx]
    # This will raise if it fails again — caller handles it
    return await client.aio.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type=response_mime_type,
        ),
    )


async def vision_summarize_slide(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    """
    Uses Gemini Vision to read a screenshot of the current slide and return:
      - raw_text: OCR-equivalent text extracted from the slide
      - summary:  plain-language summary of the slide
      - key_points: 2-4 bullet points covering the main ideas
    No Tesseract required — fully handled by Gemini's vision model.
    """
    import base64

    prompt = """You are an AI assistant helping a live presenter.
Look at this screenshot of a presentation slide and extract the following in strict JSON:
{
    "raw_text": "All readable text you can see on the slide, verbatim.",
    "summary": "A 2-3 sentence plain-language summary of what this slide is about.",
    "key_points": ["key point 1", "key point 2", "key point 3"]
}
CRITICAL INSTRUCTION: If the screenshot shows the PowerPoint application home screen (e.g. 'Good afternoon', recent files), a software menu, a file explorer, or a mostly blank/black screen rather than an actual presentation slide currently being presented, YOU MUST set `summary` exactly to "Waiting for presentation to start..." and set `key_points` to [].
Respond ONLY with the JSON object, no markdown fences."""

    try:
        image_part = types.Part.from_bytes(
            data=base64.b64decode(image_base64),
            mime_type=mime_type,
        )

        response = await _generate_with_fallback([image_part, prompt])

        data = json.loads(response.text)
        return {
            "raw_text":   data.get("raw_text",   ""),
            "summary":    data.get("summary",    ""),
            "key_points": data.get("key_points", []),
        }
    except Exception as e:
        print(f"Error in vision_summarize_slide: {e}")
        return {
            "raw_text":   "",
            "summary":    "",
            "key_points": [],
        }


async def generate_slide_summary(slide_number: int, text: str) -> SlideSummary:
    """
    Calls Gemini to generate summary, key points, and likely questions for a given slide text.
    """
    prompt = f"""
    You are an AI assistant helping a presenter. Given the text from a presentation slide, extract the following:
    1. A concise 2-4 line summary.
    2. 3-5 key talking points.
    3. 2-4 likely questions the audience might ask about this slide.
    
    Slide Text: "{text}"
    
    Respond in strict JSON payload matching this format:
    {{
        "summary": "...",
        "key_points": ["...", "..."],
        "likely_questions": ["...", "..."]
    }}
    """
    
    try:
        response = await _generate_with_fallback(prompt)
        
        result_content = response.text
        data = json.loads(result_content)
        
        return SlideSummary(
            slide_number=slide_number,
            raw_text=text,
            summary=data.get("summary", ""),
            key_points=data.get("key_points", []),
            likely_questions=data.get("likely_questions", [])
        )
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return SlideSummary(
            slide_number=slide_number,
            raw_text=text,
            summary="Failed to generate summary.",
            key_points=[],
            likely_questions=[]
        )

async def generate_qa_hint(question: str, slide_context: dict) -> dict:
    """
    Generates a concise hint for a live audience question based on the slide context.
    """
    prompt = f"""
    You are an AI assistant helping a presenter answer a live audience question. 
    You have context about the current slide being displayed.
    
    Current Slide Summary: {slide_context.get('summary')}
    Current Slide Key Points: {slide_context.get('key_points')}
    
    Audience Question: "{question}"
    
    Provide:
    1. A concise, correct answer hint (1-2 sentences). NOT a fully scripted response.
    2. 3 brief talking points to support the answer.
    
    Respond in strict JSON payload matching this format:
    {{
        "answer_hint": "...",
        "talking_points": ["...", "..."]
    }}
    """
    
    try:
        response = await _generate_with_fallback(prompt)
        
        result_content = response.text
        data = json.loads(result_content)
        
        return {
            "answer_hint": data.get("answer_hint", ""),
            "talking_points": data.get("talking_points", [])
        }
    except Exception as e:
        print(f"Error calling Gemini API for QA: {e}")
        return {
            "answer_hint": "Could not generate hint for this question.",
            "talking_points": []
        }


async def summarize_slide_text(slide_text: str) -> dict:
    """
    Quickly summarizes slide OCR text into a plain-language summary and key bullet points.
    Used by the desktop overlay to show what the current slide is about.
    """
    prompt = f"""
You are an AI assistant helping a live presenter understand their current slide at a glance.

Slide Content (extracted via OCR):
\"\"\"
{slide_text}
\"\"\"

Produce a brief, helpful summary in plain language and 2–4 key bullet points.
Respond in strict JSON:
{{
    "summary": "2-3 sentence plain-language summary of what this slide covers.",
    "key_points": ["point 1", "point 2", "point 3"]
}}
"""
    try:
        response = await _generate_with_fallback(prompt)
        data = json.loads(response.text)
        return {
            "summary": data.get("summary", ""),
            "key_points": data.get("key_points", []),
        }
    except Exception as e:
        print(f"Error in summarize_slide_text: {e}")
        return {
            "summary": "Could not summarize slide content.",
            "key_points": [],
        }


async def analyze_presentation_context(slide_text: str, transcript: str) -> dict:
    """
    Real-time coaching: compare OCR-extracted slide text with the speaker's live transcript.
    Returns on_track/off_track/missing_content status with a coaching suggestion.
    """
    prompt = f"""
    You are a real-time AI presentation coach and assistant. You observe what a speaker is saying during a live slideshow.

    Current Slide Content:
    \"\"\"
    {slide_text or "(No slide text detected)"}
    \"\"\"

    What the Speaker Just Said:
    \"\"\"
    {transcript or "(No speech detected yet)"}
    \"\"\"

    Analyze the speech:
    1. If the speaker is asking a question or responding to a question, provide a concise, correct answer to that question based on the slide context or general knowledge. Put the answer in the "suggestion" field.
    2. Otherwise, analyze the alignment between the slide content and the speech, and provide a direct coaching tip.

    Respond in strict JSON:
    {{
        "status": "on_track" | "off_track" | "missing_content" | "no_speech",
        "suggestion": "A concise answer to the question OR a coaching tip (max 2 sentences).",
        "confidence": 0.0
    }}

    Status rules:
    - "on_track": Speech aligns with the slide, or you are answering a relevant question.
    - "off_track": Speech is about a completely different topic.
    - "missing_content": Speech skips important key points on the slide.
    - "no_speech": No meaningful speech detected.
    """

    try:
        response = await _generate_with_fallback(prompt)

        data = json.loads(response.text)
        return {
            "status": data.get("status", "no_speech"),
            "suggestion": data.get("suggestion", ""),
            "confidence": float(data.get("confidence", 0.0)),
        }
    except Exception as e:
        error_str = str(e)
        print(f"Error in analyze_presentation_context: {e}")
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {
                "status": "no_speech",
                "suggestion": "⚠️ AI quota temporarily exhausted. Retrying automatically...",
                "confidence": 0.0,
            }
        return {
            "status": "no_speech",
            "suggestion": "Could not analyze content at this time.",
            "confidence": 0.0,
        }

