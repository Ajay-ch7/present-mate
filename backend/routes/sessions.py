from fastapi import APIRouter, HTTPException, Depends
from db.database import get_db
from datetime import datetime
from bson.objectid import ObjectId
from schemas.session import SessionCreate
from pydantic import BaseModel
from services.ai_service import generate_qa_hint
import time
from typing import Dict, Any, Optional

router = APIRouter()

# ─── In-Memory Cache Store ───────────────────────────────────────────────────
# Shields MongoDB Atlas from rapid polling (PowerPoint Add-in polls every 2s)
# and avoids repeated full-document lookups for static presentation slides.

class SessionMemoryStore:
    def __init__(self, ttl_seconds: int = 7200):  # 2 hours active TTL
        self.ttl = ttl_seconds
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._presentation_slides: Dict[str, Dict[str, Any]] = {}

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        entry = self._sessions.get(session_id)
        if entry:
            if time.time() < entry["expires_at"]:
                return entry["data"]
            else:
                del self._sessions[session_id]
        return None

    def set_session(self, session_id: str, data: Dict[str, Any]):
        # Keep cache bounded
        if len(self._sessions) > 2000:
            # Purge oldest expired or arbitrary first item
            now = time.time()
            expired_keys = [k for k, v in self._sessions.items() if v["expires_at"] <= now]
            for k in expired_keys[:200]:
                self._sessions.pop(k, None)
            if len(self._sessions) > 2000:
                self._sessions.pop(next(iter(self._sessions)), None)

        self._sessions[session_id] = {
            "data": data,
            "expires_at": time.time() + self.ttl
        }

    def update_session(self, session_id: str, updates: Dict[str, Any]):
        entry = self._sessions.get(session_id)
        if entry:
            entry["data"].update(updates)
            entry["expires_at"] = time.time() + self.ttl

    def remove_session(self, session_id: str):
        self._sessions.pop(session_id, None)

    def get_presentation_slides(self, presentation_id: str) -> Optional[Dict[str, Any]]:
        return self._presentation_slides.get(presentation_id)

    def set_presentation_slides(self, presentation_id: str, total_slides: int, slides: list):
        if len(self._presentation_slides) > 500:
            self._presentation_slides.pop(next(iter(self._presentation_slides)), None)
        slide_map = {s["slide_number"]: s for s in slides if "slide_number" in s}
        self._presentation_slides[presentation_id] = {
            "total_slides": total_slides,
            "slides": slide_map
        }

_store = SessionMemoryStore()


@router.post("/start")
async def start_session(session: SessionCreate, db = Depends(get_db)):
    # Verify presentation exists (projecting only id and slides/total_slides for cache)
    presentation = await db.presentations.find_one(
        {"_id": ObjectId(session.presentation_id)},
        {"total_slides": 1, "slides": 1}
    )
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
        
    session_doc = {
        "user_id": session.user_id,
        "presentation_id": session.presentation_id,
        "started_at": datetime.utcnow(),
        "status": "active",
        "extension_connected": False,
        "current_slide": 1,
        "last_question": None,
        "last_response": None,
    }
    
    result = await db.sessions.insert_one(session_doc)
    session_id_str = str(result.inserted_id)
    session_doc["_id"] = session_id_str

    # Warm in-memory caches
    _store.set_session(session_id_str, session_doc)
    _store.set_presentation_slides(
        session.presentation_id,
        presentation.get("total_slides", len(presentation.get("slides", []))),
        presentation.get("slides", [])
    )

    return {"message": "Session started", "session_id": session_id_str}

@router.post("/{id}/end")
async def end_session(id: str, db = Depends(get_db)):
    _store.remove_session(id)
    result = await db.sessions.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "ended"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session ended"}

@router.get("/{id}")
async def get_session(id: str, db = Depends(get_db)):
    cached = _store.get_session(id)
    if cached:
        return cached

    session = await db.sessions.find_one({"_id": ObjectId(id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session["_id"] = str(session["_id"])
    _store.set_session(id, session)
    return session

@router.post("/{id}/slide")
async def update_current_slide(id: str, slide_number: int, db = Depends(get_db)):
    # Update cache immediately for sub-millisecond read access
    _store.update_session(id, {"current_slide": slide_number})

    await db.sessions.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"current_slide": slide_number}}
    )
    return {"message": "Current slide updated", "slide_number": slide_number}

@router.get("/{id}/hints/current-slide")
async def get_current_slide_hints(id: str, db = Depends(get_db)):
    # Check session cache first
    session = _store.get_session(id)
    if not session:
        session = await db.sessions.find_one({"_id": ObjectId(id)})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session["_id"] = str(session["_id"])
        _store.set_session(id, session)
        
    presentation_id = session.get("presentation_id")
    current_slide_num = session.get("current_slide", 1)

    # Check presentation slides cache
    pres_cache = _store.get_presentation_slides(presentation_id)
    if not pres_cache:
        presentation = await db.presentations.find_one(
            {"_id": ObjectId(presentation_id)},
            {"total_slides": 1, "slides": 1}
        )
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")
        
        slides = presentation.get("slides", [])
        total_slides = presentation.get("total_slides", len(slides))
        _store.set_presentation_slides(presentation_id, total_slides, slides)
        pres_cache = _store.get_presentation_slides(presentation_id)
    
    slide_details = pres_cache["slides"].get(current_slide_num)
    if not slide_details:
        return {"message": "No hints available for this slide"}
        
    return {
        "slide_number": current_slide_num,
        "total_slides": pres_cache.get("total_slides", 1),
        "summary": slide_details.get("summary"),
        "key_points": slide_details.get("key_points")
    }

class QuestionRequest(BaseModel):
    questionText: str

@router.post("/{id}/question")
async def process_live_question(id: str, request: QuestionRequest, db = Depends(get_db)):
    session = _store.get_session(id)
    if not session:
        session = await db.sessions.find_one({"_id": ObjectId(id)})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session["_id"] = str(session["_id"])
        _store.set_session(id, session)

    presentation_id = session.get("presentation_id")
    current_slide_num = session.get("current_slide", 1)

    pres_cache = _store.get_presentation_slides(presentation_id)
    if not pres_cache:
        presentation = await db.presentations.find_one(
            {"_id": ObjectId(presentation_id)},
            {"total_slides": 1, "slides": 1}
        )
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")
        slides = presentation.get("slides", [])
        total_slides = presentation.get("total_slides", len(slides))
        _store.set_presentation_slides(presentation_id, total_slides, slides)
        pres_cache = _store.get_presentation_slides(presentation_id)

    slide_details = pres_cache["slides"].get(current_slide_num) if pres_cache else None
    if not slide_details:
        slide_details = {"summary": "Unknown context.", "key_points": []}
    
    # Generate hint
    hint = await generate_qa_hint(request.questionText, slide_details)
    
    # Update cache immediately for polling clients
    _store.update_session(id, {
        "last_question": request.questionText,
        "last_response": hint
    })

    # Persist in session state
    await db.sessions.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "last_question": request.questionText,
            "last_response": hint
        }}
    )
    
    return {
        "question": request.questionText,
        "hint": hint
    }

# ─── Add-in: latest response polling ─────────────────────────────────────────

@router.get("/{id}/latest-response")
async def get_latest_response(id: str, db = Depends(get_db)):
    """
    Called by the PowerPoint Add-in (polling every 2s) to retrieve the most
    recent audience question and AI-generated answer hint captured by the
    Chrome Extension through the /question endpoint.
    Serves directly from memory cache to avoid DB bottleneck.
    """
    cached = _store.get_session(id)
    if cached is not None:
        return {
            "question": cached.get("last_question"),
            "hint": cached.get("last_response"),
        }

    # Fallback to MongoDB with tight projection if cache missed
    session = await db.sessions.find_one(
        {"_id": ObjectId(id)},
        {"last_question": 1, "last_response": 1, "current_slide": 1, "presentation_id": 1, "status": 1}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["_id"] = str(session["_id"])
    _store.set_session(id, session)

    return {
        "question": session.get("last_question"),
        "hint": session.get("last_response"),
    }

