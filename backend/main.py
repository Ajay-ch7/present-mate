from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from db.database import get_db, init_db_indexes, close_db

from routes import auth, presentations, sessions, overlay

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB indexes asynchronously on startup
    await init_db_indexes()
    yield
    # Gracefully close connections on shutdown
    await close_db()

app = FastAPI(title="PresentMate Backend", lifespan=lifespan)

# Compress responses larger than 2KB to reduce network latency
app.add_middleware(GZipMiddleware, minimum_size=2000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Updated backend routing configuration
# Enhanced CORS and middleware setup for improved security
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(presentations.router, prefix="/presentations", tags=["Presentations"])
app.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
app.include_router(overlay.router, prefix="/overlay", tags=["Overlay"])

@app.get("/")
async def root():
    return {"message": "PresentMate API is running!"}

