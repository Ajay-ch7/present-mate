# PresentMate 

PresentMate is a full-stack real-time AI presentation assistant.

## Features Implemented in Phase 1
- Full Project Scaffolding
- Next.js 14 Frontend (Landing, Login, Dashboard, Upload, Presentation Details)
- FastAPI Python Backend (Authentication, File Upload, Text Extraction)
- MongoDB Integration
- PDF & PPTX Text Extraction
- OpenAI Integration for Summaries & Q&A Hints
- Chrome Extension Manifest V3 Base Scaffold

## Setup & Run Instructions

### Prerequisites
- Node.js & npm
- Python 3.9+
- MongoDB running locally or a MongoDB Atlas URI
- OpenAI API Key

### Backend Setup
1. `cd backend`
2. Activate Virtual Environment:
   - Windows: `.\venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
   *(If venv is missing, run: `python -m venv venv` and install requirements with `pip install fastapi uvicorn motor openai pdfminer.six python-multipart pydantic-settings python-pptx`)*
3. Rename `.env.example` to `.env` and fill in `OPENAI_API_KEY` and `MONGO_URI` (defaults to localhost).
4. Run server: `uvicorn main:app --reload` (Runs on http://localhost:8000)

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Check `src/services/api.ts` to ensure `NEXT_PUBLIC_API_URL` points to `http://localhost:8000`
4. Run server: `npm run dev` (Runs on http://localhost:3000)

### Extension Setup (For Phase 2 Preparations)
1. Go to `chrome://extensions/`
2. Enable "Developer Mode" (top right toggle)
3. Click "Load unpacked" and select the `extension/` folder
4. Pin the extension for easy access.

## Future Improvements
- Add proper JWT security and password hashing.
- Enhance robust error handling on large PDF/PPT files.
- Move OpenAI calls to background worker queue (e.g. Celery) for scalability instead of simple FastAPI BackgroundTasks.
- Build Semantic Search using embeddings (Phase 3).
