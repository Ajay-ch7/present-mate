/* ─── overlay.js — PresentMate Renderer Logic ────────────────────────────── */

const BACKEND_URL = 'http://localhost:8000';
const CAPTURE_INTERVAL_MS = 1500;    // screen capture validation interval
const ANALYZE_INTERVAL_MS = 8000;    // AI coaching analysis every 8s
const TRANSCRIPT_MAX_WORDS = 60;     // keep rolling transcript window

// ─── State ───────────────────────────────────────────────────────────────────
let currentSlideText = '';
let transcriptBuffer = [];
let isOverlayVisible = false;
let isMicActive = false;
let speechRecognition = null;
let captureTimer = null; // Unused but kept for cleanly overwriting stopCapture below
let analyzeTimer = null;
let lastSlideSummary = '';

let currentSessionId = null;
let activePresentationData = null;
let currentSlideIndex = 0;
let lastManualInteraction = 0; // Timestamp for manual navigation hijack protection

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const statusBadge         = document.getElementById('status-badge');
const statusText          = document.getElementById('status-text');
const iconCheck           = document.getElementById('icon-check');
const iconAlert           = document.getElementById('icon-alert');
const iconInfo            = document.getElementById('icon-info');

const summaryPanel        = document.getElementById('summary-panel');
const summaryTextEl       = document.getElementById('summary-text');
const keyPointsContainer  = document.getElementById('key-points-container');
const keyPointsList       = document.getElementById('key-points-list');
const dismissSummaryBtn   = document.getElementById('dismiss-summary-btn');
const stopSessionBtn      = document.getElementById('stop-session-btn');
const prevSlideBtn        = document.getElementById('prev-slide-btn');
const nextSlideBtn        = document.getElementById('next-slide-btn');
const slideIndicator      = document.getElementById('slide-indicator');

const sessionSetupPanel   = document.getElementById('session-setup-panel');
const sessionIdInput      = document.getElementById('session-id-input');
const connectSessionBtn   = document.getElementById('connect-session-btn');
const sessionErrorMsg     = document.getElementById('session-error-msg');

const suggestionPanel     = document.getElementById('suggestion-panel');
const suggestionTextEl    = document.getElementById('suggestion-text');
const confidenceFill      = document.getElementById('confidence-fill');
const confidenceLabel     = document.getElementById('confidence-label');
const dismissBtn          = document.getElementById('dismiss-btn');

const transcriptPanel     = document.getElementById('transcript-panel');
const transcriptTextEl    = document.getElementById('transcript-text');
const micDot              = document.getElementById('mic-dot');
const listenBtn           = document.getElementById('listen-btn');
const stopBtn             = document.getElementById('stop-btn');

const branding            = document.getElementById('branding');

// ─── Mouse pass-through: use mousemove + elementFromPoint ────────────────────
// With setIgnoreMouseEvents(true, { forward: true }), mousemove events still
// reach the renderer even when click-through is active. We use this to detect
// when the cursor is over an interactive panel and toggle interactivity.
const INTERACTIVE_PANELS = [summaryPanel, suggestionPanel, transcriptPanel, sessionSetupPanel];
let _overPanel = false;

document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const onPanel = INTERACTIVE_PANELS.some((p) => p.contains(el));

  if (onPanel && !_overPanel) {
    _overPanel = true;
    window.electronAPI.setIgnoreMouse(false);
  } else if (!onPanel && _overPanel) {
    _overPanel = false;
    window.electronAPI.setIgnoreMouse(true);
  }
});

// ─── IPC Lifecycle ────────────────────────────────────────────────────────────
window.electronAPI.onOverlayShow(() => {
  isOverlayVisible = true;
  showAllPanels();
  startCapture();
  startAnalyzeLoop();
  // Do NOT auto-start mic — user must press Listen
});

window.electronAPI.onOverlayHide(() => {
  isOverlayVisible = false;
  hideAllPanels();
  stopCapture();
  stopSpeech();
  stopAnalyzeLoop();
});

window.electronAPI.onBridgeResponse((msg) => {
  if (msg.type === 'analyze_result') {
    renderAnalysisResult(msg.data);
  }
});

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function show(el) {
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('visible'));
}
function hide(el) {
  el.classList.remove('visible');
  el.classList.add('hidden');
}

function showAllPanels() {
  show(statusBadge);
  show(transcriptPanel);
  show(branding);
  
  if (currentSessionId) {
    show(summaryPanel);
    hide(sessionSetupPanel);
  } else {
    show(sessionSetupPanel);
    hide(summaryPanel);
  }
  setStatus('ready');
}

function hideAllPanels() {
  hide(statusBadge);
  hide(suggestionPanel);
  hide(summaryPanel);
  hide(sessionSetupPanel);
  hide(transcriptPanel);
  hide(branding);
}

function setStatus(state) {
  statusBadge.classList.remove('on-track', 'off-track', 'missing');
  iconCheck.style.display = 'none';
  iconAlert.style.display = 'none';
  iconInfo.style.display  = 'none';

  switch (state) {
    case 'on_track':
      statusText.textContent = 'On Track';
      iconCheck.style.display = 'block';
      statusBadge.classList.add('on-track');
      break;
    case 'off_track':
      statusText.textContent = 'Off Track';
      iconAlert.style.display = 'block';
      statusBadge.classList.add('off-track');
      break;
    case 'missing_content':
      statusText.textContent = 'Missing Content';
      iconInfo.style.display = 'block';
      statusBadge.classList.add('missing');
      break;
    case 'no_speech':
      statusText.textContent = 'No Speech';
      iconInfo.style.display = 'block';
      break;
    case 'listening':
      statusText.textContent = 'Listening…';
      iconCheck.style.display = 'block';
      statusBadge.classList.add('on-track');
      break;
    case 'ready':
    default:
      statusText.textContent = 'Ready';
      iconCheck.style.display = 'block';
      break;
  }
}

function renderSlideSummary() {
  if (!activePresentationData || !activePresentationData.slides || activePresentationData.slides.length === 0) return;
  
  const slides = activePresentationData.slides;
  if (currentSlideIndex < 0) currentSlideIndex = 0;
  if (currentSlideIndex >= slides.length) currentSlideIndex = slides.length - 1;
  
  const slideData = slides[currentSlideIndex];
  
  // Set currentSlideText for AI Coaching context
  currentSlideText = slideData.raw_text || '';
  
  slideIndicator.textContent = `Slide ${slideData.slide_number} / ${activePresentationData.total_slides}`;
  
  prevSlideBtn.disabled = (currentSlideIndex === 0);
  nextSlideBtn.disabled = (currentSlideIndex === slides.length - 1);

  const summary = slideData.summary;
  const key_points = slideData.key_points || [];

  if (!summary || summary === 'Failed to generate summary.') {
    summaryTextEl.textContent = 'Waiting for summary...';
    keyPointsContainer.style.display = 'none';
    lastSlideSummary = '';
    return;
  }

  // Always show summary panel if we have data
  show(summaryPanel);

  if (summary === lastSlideSummary) {
    return;
  }
  lastSlideSummary = summary;

  summaryTextEl.classList.remove('animating');
  void summaryTextEl.offsetWidth;
  summaryTextEl.textContent = summary;
  summaryTextEl.classList.add('animating');

  if (key_points && key_points.length > 0) {
    keyPointsList.innerHTML = '';
    key_points.forEach((pt) => {
      const li = document.createElement('li');
      li.textContent = pt;
      keyPointsList.appendChild(li);
    });
    keyPointsContainer.style.display = 'block';
  } else {
    keyPointsContainer.style.display = 'none';
  }

  show(summaryPanel);
}

// ─── AI Coach Rendering ───────────────────────────────────────────────────────
function renderAnalysisResult(data) {
  if (!data) return;
  const { status, suggestion, confidence } = data;

  setStatus(status);

  if (!suggestion) {
    // No suggestion at all — keep last suggestion visible
    return;
  }

  suggestionTextEl.classList.remove('animating');
  void suggestionTextEl.offsetWidth;
  suggestionTextEl.textContent = suggestion;
  suggestionTextEl.classList.add('animating');

  const pct = Math.round((confidence || 0) * 100);
  confidenceFill.style.width = pct + '%';
  confidenceLabel.textContent = pct + '%';

  show(suggestionPanel);
}

// ─── Dismiss Buttons ──────────────────────────────────────────────────────────
dismissBtn.addEventListener('click', () => hide(suggestionPanel));
dismissSummaryBtn.addEventListener('click', () => hide(summaryPanel));

// ─── Listen / Stop Mic Buttons ────────────────────────────────────────────────
listenBtn.addEventListener('click', () => {
  startSpeech();
});
stopBtn.addEventListener('click', () => {
  stopSpeech();
});

// ─── Session Management ───────────────────────────────────────────────────────
let sessionSyncTimer = null;

async function syncSessionSlide() {
  if (!currentSessionId || !activePresentationData) return;
  
  // Hijack Protection: If user manually clicked a button in the last 5 seconds,
  // do NOT sync DOWN from the backend. This gives the backend time to catch up
  // with our manual POSTs!
  if (Date.now() - lastManualInteraction < 5000) return;

  try {
    const res = await fetch(`${BACKEND_URL}/sessions/${currentSessionId}`);
    if (res.ok) {
      const data = await res.json();
      const backendSlideNum = data.current_slide || 1;
      const newIndex = activePresentationData.slides.findIndex(s => s.slide_number === backendSlideNum);
      if (newIndex !== -1 && newIndex !== currentSlideIndex) {
        currentSlideIndex = newIndex;
        renderSlideSummary();
      }
    }
  } catch (e) {
    // ignore
  }
}

async function pushSlideUpdate(slideNum) {
  if (!currentSessionId) return;
  try {
    await fetch(`${BACKEND_URL}/sessions/${currentSessionId}/slide?slide_number=${slideNum}`, {
      method: 'POST'
    });
  } catch (err) {
    // silently fail
  }
}

connectSessionBtn.addEventListener('click', async () => {
  const sid = sessionIdInput.value.trim();
  if (!sid) return;
  
  sessionErrorMsg.textContent = 'Connecting...';
  connectSessionBtn.disabled = true;

  try {
    const res = await fetch(`${BACKEND_URL}/sessions/${sid}`);
    if (!res.ok) throw new Error('Session not found or invalid');
    const sessionDoc = await res.json();
    const pid = sessionDoc.presentation_id;
    
    if (!pid) throw new Error('No presentation bound to this session');
    
    const pRes = await fetch(`${BACKEND_URL}/presentations/${pid}`);
    if (!pRes.ok) throw new Error('Failed to load presentation slides');
    
    activePresentationData = await pRes.json();
    currentSessionId = sid;
    
    // Default to the current slide of the session
    const backendSlideNum = sessionDoc.current_slide || 1;
    currentSlideIndex = activePresentationData.slides.findIndex(s => s.slide_number === backendSlideNum);
    if (currentSlideIndex === -1) currentSlideIndex = 0;
    
    hide(sessionSetupPanel);
    sessionErrorMsg.textContent = '';
    renderSlideSummary();
    
    if (sessionSyncTimer) clearInterval(sessionSyncTimer);
    sessionSyncTimer = setInterval(syncSessionSlide, 1500);
    
  } catch (err) {
    sessionErrorMsg.textContent = err.message;
  } finally {
    connectSessionBtn.disabled = false;
  }
});

stopSessionBtn.addEventListener('click', () => {
  currentSessionId = null;
  activePresentationData = null;
  lastSlideSummary = '';
  currentSlideText = '';
  currentSlideIndex = 0;
  
  if (sessionSyncTimer) clearInterval(sessionSyncTimer);
  sessionSyncTimer = null;
  
  sessionIdInput.value = '';
  hide(summaryPanel);
  show(sessionSetupPanel);
});

prevSlideBtn.addEventListener('click', () => {
  if (currentSlideIndex > 0) {
    lastManualInteraction = Date.now();
    currentSlideIndex--;
    renderSlideSummary();
    const newSlideNum = activePresentationData.slides[currentSlideIndex].slide_number;
    pushSlideUpdate(newSlideNum);
  }
});

nextSlideBtn.addEventListener('click', () => {
  if (activePresentationData && currentSlideIndex < activePresentationData.slides.length - 1) {
    lastManualInteraction = Date.now();
    currentSlideIndex++;
    renderSlideSummary();
    const newSlideNum = activePresentationData.slides[currentSlideIndex].slide_number;
    pushSlideUpdate(newSlideNum);
  }
});

function startCapture() {
  // Deprecated, no-op
}
function stopCapture() {
  // Deprecated, no-op
}

// ─── AI Coaching Analysis Loop ────────────────────────────────────────────────
let _analysisInFlight = false;
let _lastAnalysisTime = 0;
const ANALYSIS_COOLDOWN_MS = 12000; // Minimum 12s between analysis calls to save quota

async function runAnalysis() {
  if (!isMicActive) return; // Only analyze when mic is on
  if (_analysisInFlight) return; // Prevent overlapping calls

  // Throttle: don't call more often than the cooldown period
  const elapsed = Date.now() - _lastAnalysisTime;
  if (elapsed < ANALYSIS_COOLDOWN_MS) return;

  const transcript = transcriptBuffer.slice(-TRANSCRIPT_MAX_WORDS).join(' ');
  if (!transcript.trim() && !currentSlideText.trim()) return;

  _analysisInFlight = true;
  _lastAnalysisTime = Date.now();
  try {
    const res = await fetch(`${BACKEND_URL}/overlay/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide_text: currentSlideText,
        transcript: transcript,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      renderAnalysisResult(data);
    } else {
      console.error('[Analysis] HTTP', res.status, await res.text());
    }
  } catch (err) {
    console.error('[Analysis fetch error]', err);
  } finally {
    _analysisInFlight = false;
  }
}

function startAnalyzeLoop() {
  analyzeTimer = setInterval(runAnalysis, ANALYZE_INTERVAL_MS);
}
function stopAnalyzeLoop() {
  clearInterval(analyzeTimer);
  analyzeTimer = null;
}

// ─── Web Speech API ───────────────────────────────────────────────────────────
// ─── Native AudioContext Speech API (Google Dictation via Backend) ────────────
let audioStream = null;
let audioContext = null;
let audioProcessor = null;
let audioInput = null;
let pcmData = [];
let recordingIntervalId = null;

async function startSpeech() {
  if (isMicActive) return;

  // ── Clear previous session data so old transcript doesn't persist ──
  transcriptBuffer = [];
  transcriptTextEl.textContent = 'Listening (Dictation active)...';

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    isMicActive = true;
    micDot.style.animationPlayState = 'running';
    micDot.style.background = 'var(--teal)';
    listenBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    setStatus('listening');

    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    audioInput = audioContext.createMediaStreamSource(audioStream);
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    audioProcessor.onaudioprocess = function (e) {
      if (!isMicActive) return;
      const channelData = e.inputBuffer.getChannelData(0);
      pcmData.push(new Float32Array(channelData));
    };

    const dummyGain = audioContext.createGain();
    dummyGain.gain.value = 0;

    audioInput.connect(audioProcessor);
    audioProcessor.connect(dummyGain);
    dummyGain.connect(audioContext.destination);

    // Process chunk every 3 seconds
    recordingIntervalId = setInterval(processAudioChunk, 3500);

  } catch (err) {
    console.error('[Speech start error]', err);
    transcriptTextEl.textContent = 'Mic access denied or error: ' + err.message;
    stopSpeech();
  }
}

async function processAudioChunk() {
  if (!isMicActive || pcmData.length === 0) return;

  // Flatten Float32 arrays
  let totalLength = pcmData.reduce((acc, arr) => acc + arr.length, 0);
  const flattened = new Float32Array(totalLength);
  let offset = 0;
  for (let arr of pcmData) {
    flattened.set(arr, offset);
    offset += arr.length;
  }
  
  // Clear buffer for the next chunk
  pcmData = [];

  const sampleRate = audioContext.sampleRate;
  const buffer = new ArrayBuffer(44 + flattened.length * 2);
  const view = new DataView(buffer);

  const writeString = (view, offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + flattened.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, flattened.length * 2, true);

  let pcmOffset = 44;
  for (let i = 0; i < flattened.length; i++, pcmOffset += 2) {
    let s = Math.max(-1, Math.min(1, flattened[i]));
    view.setInt16(pcmOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  // Convert to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64data = btoa(binary);

  try {
    const res = await fetch(`${BACKEND_URL}/overlay/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: base64data })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.error) {
        transcriptTextEl.textContent = 'STT Error: ' + data.error.substring(0, 50);
        console.error(data.error);
      } else if (data.text) {
        const words = data.text.trim().split(/\s+/);
        transcriptBuffer.push(...words);
        if (transcriptBuffer.length > 200) {
          transcriptBuffer = transcriptBuffer.slice(-200);
        }
        const display = transcriptBuffer.join(' ');
        transcriptTextEl.textContent = display.split(' ').slice(-50).join(' ');

        // ── Trigger AI analysis immediately after new speech arrives ──
        runAnalysis();
      }
    }
  } catch (err) {
    console.error('[STT API]', err);
  }
}

function stopSpeech() {
  isMicActive = false;
  if (recordingIntervalId) clearInterval(recordingIntervalId);
  pcmData = [];
  
  if (audioProcessor) {
    audioProcessor.disconnect();
    audioProcessor = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (audioStream) {
    audioStream.getTracks().forEach(t => t.stop());
    audioStream = null;
  }
  setMicInactive();
}

function setMicInactive() {
  isMicActive = false;
  micDot.style.animationPlayState = 'paused';
  micDot.style.background = 'var(--text-muted)';
  listenBtn.style.display = 'flex';
  stopBtn.style.display = 'none';
  if (isOverlayVisible) setStatus('ready');
}
