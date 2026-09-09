from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from db.database import get_db
from datetime import datetime
import shutil
import os
import asyncio
from bson.objectid import ObjectId
from pydantic import BaseModel
from typing import List

from services.pdf_parser import extract_text_from_pdf
from services.ppt_parser import extract_text_from_pptx
from services.ai_service import generate_slide_summary
#presentmate



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

async def process_presentation(file_path: str, presentation_id: str, content_type: str):
    db = await get_db()
    
    print(f"Starting processing for {presentation_id}")
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {"$set": {"processing_status": "processing"}}
    )
    
    raw_slides = []
    if content_type == "application/pdf":
        raw_slides = extract_text_from_pdf(file_path)
    else:
        raw_slides = extract_text_from_pptx(file_path)
        
    total_slides = len(raw_slides)
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {"$set": {"total_slides": total_slides}}
    )
    
    processed_slides = []
    for i, text in enumerate(raw_slides):
        slide_num = i + 1
        summary = await generate_slide_summary(slide_num, text)
        processed_slides.append({
            "slide_number": summary.slide_number,
            "raw_text": summary.raw_text,
            "summary": summary.summary,
            "key_points": summary.key_points,
            "likely_questions": summary.likely_questions
        })
        
        # Incremental save
        await db.presentations.update_one(
            {"_id": ObjectId(presentation_id)},
            {"$set": {"slides": processed_slides}}
        )
        
    await db.presentations.update_one(
        {"_id": ObjectId(presentation_id)},
        {"$set": {"processing_status": "ready"}}
    )
    print(f"Finished processing {presentation_id}")

@router.post("/upload")
async def upload_presentation(user_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...), db = Depends(get_db)):
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]:
         raise HTTPException(status_code=400, detail="Only PDF and PPTX files are supported")
    
    file_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

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
    cursor = db.presentations.find({"user_id": user_id})
    presentations = await cursor.to_list(length=100)
    for p in presentations:
        p["_id"] = str(p["_id"])
    return presentations

@router.get("/{id}")
async def get_presentation(id: str, db = Depends(get_db)):
    from bson.objectid import ObjectId
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
        processed_slides = []
        for i, text in enumerate(raw_slides):
            slide_num = i + 1
            summary = await generate_slide_summary(slide_num, text)
            processed_slides.append(
                {
                    "slide_number": summary.slide_number,
                    "raw_text": summary.raw_text,
                    "summary": summary.summary,
                    "key_points": summary.key_points,
                    "likely_questions": summary.likely_questions,
                }
            )
            await db.presentations.update_one(
                {"_id": ObjectId(presentation_id_str)},
                {"$set": {"slides": processed_slides}},
            )
        await db.presentations.update_one(
            {"_id": ObjectId(presentation_id_str)},
            {"$set": {"processing_status": "ready"}},
        )
        print(f"[addin] Finished processing presentation {presentation_id_str}")

    background_tasks.add_task(process_addin_presentation)

    return {"message": "Presentation received", "presentation_id": presentation_id_str}
