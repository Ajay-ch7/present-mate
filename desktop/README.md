# PresentMate Desktop Overlay

A standalone Electron application that runs alongside Microsoft PowerPoint in slideshow mode and displays a real-time AI coaching overlay. No Office.js or PowerPoint Add-ins required.

---

## Architecture

```
desktop/
├── main.js          ← Electron main process (overlay window, slideshow detection, bridge)
├── preload.js       ← IPC bridge (contextBridge)
├── renderer/
│   ├── index.html   ← Overlay UI markup
│   ├── overlay.css  ← Glassmorphism design
│   └── overlay.js   ← Capture loop, speech, AI display
├── bridge/
│   ├── bridge.py    ← Python OCR + backend proxy (stdin/stdout JSON)
│   └── requirements.txt
└── assets/          ← App icons
```

The FastAPI backend at `localhost:8000` handles AI analysis via Gemini. The Electron app talks to it through the Python bridge.

---

## Prerequisites

### 1. Node.js & npm
```
https://nodejs.org  (v18+)
```

### 2. Python 3.10+ in PATH
```
python --version
```

### 3. Tesseract OCR (for screen text extraction)
```powershell
# Option A — Chocolatey (recommended)
choco install tesseract

# Option B — Manual installer
# https://github.com/UB-Mannheim/tesseract/wiki
# After install, add to PATH: C:\Program Files\Tesseract-OCR
```

### 4. Python bridge dependencies
```powershell
cd desktop\bridge
pip install -r requirements.txt
```

### 5. PresentMate backend running
```powershell
cd backend
..\.venv\Scripts\python -m uvicorn main:app --reload --port 8000
```

---

## Quick Start

```powershell
# 1. Install Electron dependencies
cd desktop
npm install

# 2. Launch the overlay app
npm start
```

### What happens:
1. Electron starts, overlay window is hidden
2. Every 1.5 seconds it checks if PowerPoint slideshow is active
3. Open PowerPoint → press **F5** → slideshow detected → overlay appears
4. Speak during your presentation — the overlay shows:
   - 🟢 **"On Track"** — your speech matches the slide
   - 🔴 **"Off Track"** — you are talking about a different topic
   - 🟡 **"Missing Content"** — you skip key slide points
5. Exit slideshow (**Esc**) → overlay auto-hides

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PRESENTMATE_BACKEND` env | `http://localhost:8000` | FastAPI backend URL |

Set via system env or prefix the npm command:
```powershell
$env:PRESENTMATE_BACKEND="http://myserver:8000"; npm start
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Overlay doesn't appear | Make sure PowerPoint slideshow is full-screen (F5) |
| OCR returns garbage | Ensure Tesseract is in PATH: `tesseract --version` |
| "Backend not reachable" | Start backend: `uvicorn main:app --reload --port 8000` |
| Speech not working | Microphone permission required by Windows — check Settings → Privacy → Microphone |
