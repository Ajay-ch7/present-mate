from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from db.database import get_db
from datetime import datetime
import os
import uuid
import asyncio
from bson.objectid import ObjectId
from pydantic import BaseModel
from typing import List

from services.pdf_parser import extract_text_from_pdf
from services.ppt_parser import extract_text_from_pptx
from services.ai_service import generate_slide_summary

router = APIRouter()

# ─── Add-in models ────────────────────────────────────────────────────────────

class AddinSlideInput(BaseModel):
    slide_number: int
    text: str

class AddinPresentationRequest(BaseModel):
    user_id: str
    title: str
    slides: List[AddinSlideInput]

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum concurrent Gemini AI requests per presentation to maximize throughput while avoiding rate limits
MAX_CONCURRENT_AI_TASKS = 5

async def _save_upload_file(upload_file: UploadFile, destination_path: str) -> None:
    """Save an uploaded file asynchronously without blocking the event loop."""
    def _write():
        with open(destination_path, "wb") as buffer:
            while chunk := upload_file.file.read(1024 * 1024):  # 1MB chunks
                buffer.write(chunk)
    await asyncio.to_thread(_write)

async def _process_slides_concurrently(raw_slides: List[str]) -> List[dict]:
    """Process all slides with bounded concurrency, preserving slide order."""
    sem = asyncio.Semaphore(MAX_CONCURRENT_AI_TASKS)

    async def _summarize_single(slide_num: int, text: str) -> dict:
        async with sem:
            summary = await generate_slide_summary(slide_num, text)
            return {
                "slide_number": summary.slide_number,
                "raw_text": summary.raw_text,
                "summary": summary.summary,
                "key_points": summary.key_points,
                "likely_questions": summary.likely_questions,
            }

    tasks = [_summarize_single(i + 1, text) for i, text in enumerate(raw_slides)]
    return await asyncio.gather(*tasks)

async def process_presentation(file_path: str, presentation_id: str, content_type: str):
    db = await get_db()
    
    print(f"Starting processing for {presentation_id}")
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {"$set": {"processing_status": "processing"}}
    )
    
    # Run CPU-bound text extraction in worker thread so event loop remains non-blocking
    if content_type == "application/pdf":
        raw_slides = await asyncio.to_thread(extract_text_from_pdf, file_path)
    else:
        raw_slides = await asyncio.to_thread(extract_text_from_pptx, file_path)
        
    total_slides = len(raw_slides)
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {"$set": {"total_slides": total_slides}}
    )
    
    # Process slides concurrently with controlled parallelism
    processed_slides = await _process_slides_concurrently(raw_slides)
    
    # Single batch update eliminates O(N^2) DB round-trips
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {
            "$set": {
                "slides": processed_slides,
                "processing_status": "ready",
            }
        }
    )
    print(f"Finished processing {presentation_id}")

@router.post("/upload")
async def upload_presentation(user_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...), db = Depends(get_db)):
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]:
         raise HTTPException(status_code=400, detail="Only PDF and PPTX files are supported")
    
    # Use collision-resistant filename
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Asynchronous file save
    await _save_upload_file(file, file_path)

    presentation_doc = {
        "user_id": user_id,
        "title": file.filename,
        "file_name": file.filename,
        "file_type": file.content_type,
        "upload_date": datetime.utcnow(),
        "processing_status": "uploaded",
        "total_slides": 0,
        "slides": []
    }
    
    result = await db.presentations.insert_one(presentation_doc)
    presentation_id_str = str(result.inserted_id)
    
    # Trigger processing asynchronously
    background_tasks.add_task(process_presentation, file_path, presentation_id_str, file.content_type)
    
    return {"message": "File uploaded", "presentation_id": presentation_id_str}

@router.get("/")
async def list_presentations(user_id: str, db = Depends(get_db)):
    # Project out slides to save bandwidth and reduce latency on dashboard
    cursor = db.presentations.find({"user_id": user_id}, {"slides": 0})
    presentations = await cursor.to_list(length=100)
    for p in presentations:
        p["_id"] = str(p["_id"])
    return presentations

@router.get("/{id}")
async def get_presentation(id: str, db = Depends(get_db)):
    presentation = await db.presentations.find_one({"_id": ObjectId(id)})
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    presentation["_id"] = str(presentation["_id"])
    return presentation

# ─── Add-in endpoint ──────────────────────────────────────────────────────────

@router.post("/from-addin")
async def create_presentation_from_addin(
    payload: AddinPresentationRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
    """
    Accept raw slide text extracted via Office.js and process it with AI.
    The add-in calls this instead of uploading a file.
    """
    presentation_doc = {
        "user_id": payload.user_id,
        "title": payload.title,
        "file_name": None,
        "file_type": "addin",
        "upload_date": datetime.utcnow(),
        "processing_status": "uploaded",
        "total_slides": len(payload.slides),
        "slides": [],
        "source": "powerpoint_addin",
    }

    result = await db.presentations.insert_one(presentation_doc)
    presentation_id_str = str(result.inserted_id)

    # Build raw_slides list in the same format as the file-based parsers
    raw_slides = [s.text for s in sorted(payload.slides, key=lambda x: x.slide_number)]

    async def process_addin_presentation():
        await db.presentations.update_one(
            {"_id": ObjectId(presentation_id_str)},
            {"$set": {"processing_status": "processing"}},
        )
        # Concurrent processing with bounded Semaphore
        processed_slides = await _process_slides_concurrently(raw_slides)
        await db.presentations.update_one(
            {"_id": ObjectId(presentation_id_str)},
            {
                "$set": {
                    "slides": processed_slides,
                    "processing_status": "ready",
                }
            },
        )
        print(f"[addin] Finished processing presentation {presentation_id_str}")

    background_tasks.add_task(process_addin_presentation)

    return {"message": "Presentation received", "presentation_id": presentation_id_str}

