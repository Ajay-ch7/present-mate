from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import get_db

from routes import auth, presentations, sessions, overlay

app = FastAPI(title="PresentMate Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(presentations.router, prefix="/presentations", tags=["Presentations"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(overlay.router, prefix="/overlay", tags=["Overlay"])

@app.get("/")
async def root():
    return {"message": "PresentMate API is running!"}
