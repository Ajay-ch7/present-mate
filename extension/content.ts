export {};

const API_URL = "http://localhost:8000";
let activeSessionId: string | null = null;
let overlayDiv: HTMLDivElement | null = null;
let stealthBadge: HTMLDivElement | null = null;
let pollingInterval: number | null = null;
let isStealthMode = false;
let currentSlide = 1;
let totalSlides = 1;

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Inject global animations once
const injectStyles = () => {
    if (document.getElementById("pm-global-styles")) return;
    const style = document.createElement("style");
    style.id = "pm-global-styles";
    style.textContent = `
        @keyframes pmSlideUp {
            0% { opacity: 0; transform: translateY(20px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pmPulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4); }
            50% { box-shadow: 0 0 0 6px rgba(20, 184, 166, 0); }
        }
        .pm-btn-hover { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .pm-btn-hover:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .pm-btn-hover:active:not(:disabled) { transform: translateY(0); }
        .pm-scroll::-webkit-scrollbar { width: 4px; }
        .pm-scroll::-webkit-scrollbar-track { background: transparent; }
        .pm-scroll::-webkit-scrollbar-thumb { background: rgba(20, 184, 166, 0.3); border-radius: 4px; }
        .pm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.6); }
    `;
    document.head.appendChild(style);
};

document.addEventListener("fullscreenchange", () => {
    const target = document.fullscreenElement || document.body;
    if (stealthBadge) target.appendChild(stealthBadge);
    if (overlayDiv) target.appendChild(overlayDiv);
});

chrome.runtime.sendMessage({ type: "GET_SESSION" }, (response) => {
    if (response && response.sessionId) {
        activeSessionId = response.sessionId;
        injectStyles();
        createOverlay();
        fetchCurrentSlideHints();
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = window.setInterval(fetchCurrentSlideHints, 5000);
    }
});

function createStealthBadge() {
    if (stealthBadge) return;
    stealthBadge = document.createElement("div");
    stealthBadge.id = "pm-stealth-badge";
    stealthBadge.style.cssText = `
        position: fixed; top: 12px; right: 16px; 
        background: rgba(253, 251, 247, 0.95);
        color: #0d9488; font-family: system-ui, sans-serif; font-size: 11px;
        padding: 6px 14px; border-radius: 24px; z-index: 2147483647;
        pointer-events: none; border: 1px solid rgba(20, 184, 166, 0.3);
        letter-spacing: 0.3px; font-weight: 700;
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.15);
        backdrop-filter: blur(8px);
        animation: pmSlideUp 0.4s ease-out;
    `;
    stealthBadge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; margin-right:6px; animation:pmPulseGlow 2s infinite;"></span>PresentMate Active`;
    (document.fullscreenElement || document.body).appendChild(stealthBadge);
}

function removeStealthBadge() {
    stealthBadge?.remove();
    stealthBadge = null;
}

function createOverlay() {
    if (overlayDiv) return;

    overlayDiv = document.createElement("div");
    overlayDiv.id = "presentmate-overlay";
    overlayDiv.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; width: 420px;
        max-height: calc(100vh - 48px); display: flex; flex-direction: column;
        background: rgba(253, 251, 247, 0.96); color: #0f172a; padding: 24px;
        border-radius: 16px; box-shadow: 0 24px 40px -8px rgba(13, 148, 136, 0.15);
        font-family: system-ui, sans-serif; z-index: 2147483647;
        border: 1px solid rgba(20, 184, 166, 0.25); backdrop-filter: blur(16px);
        animation: pmSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    overlayDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink: 0;
                    margin-bottom:16px; border-bottom:1px solid rgba(20, 184, 166, 0.15); padding-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="background:#0d9488; padding:5px; border-radius:8px; display:flex;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>
                </div>
                <span style="font-weight:900; font-size:15px; color:#0d9488; letter-spacing:-0.5px;">PresentMate</span>
                <button id="pm-mic-btn" class="pm-btn-hover" style="background:#0d9488; border:none; border-radius:6px; padding:6px 12px; color:white; font-size:11px; cursor:pointer; font-weight:700; margin-left:4px; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);">Listen</button>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <button id="pm-prev-btn" class="pm-btn-hover" style="background:#e2e8f0; border:none; border-radius:6px; padding:5px 10px; color:#334155; font-size:11px; cursor:pointer; font-weight:700;" disabled>Prev</button>
                <button id="pm-next-btn" class="pm-btn-hover" style="background:#e2e8f0; border:none; border-radius:6px; padding:5px 10px; color:#334155; font-size:11px; cursor:pointer; font-weight:700;" disabled>Next</button>
                <button id="close-pm-overlay" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:18px; margin-left:8px; transition:color 0.2s;" aria-label="Close" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">&#x2715;</button>
            </div>
        </div>

        <div style="overflow-y: auto; overflow-x: hidden; flex-grow: 1; padding-right: 4px; margin-right: -4px;" class="pm-scroll">
            <div id="pm-content">
                <p style="font-size:14px; color:#64748b; font-weight:500;">Loading live hints for current slide...</p>
            </div>

            <div id="pm-qa-content" style="margin-top:16px; border-top:1px solid rgba(20, 184, 166, 0.15); padding-top:12px;">
                <div id="pm-mic-status" style="font-size:11px; color:#64748b; font-weight:500; display:flex; align-items:center; gap:6px;">
                    <div style="width:6px; height:6px; background:#cbd5e1; border-radius:50%;"></div> Mic off. Click Listen to capture audience questions.
                </div>
            </div>
        </div>
    `;

    (document.fullscreenElement || document.body).appendChild(overlayDiv);

    overlayDiv.querySelector("#close-pm-overlay")?.addEventListener("click", () => {
        overlayDiv?.remove();
        overlayDiv = null;
        if (pollingInterval) clearInterval(pollingInterval);
    });

    overlayDiv.querySelector("#pm-mic-btn")?.addEventListener("click", toggleListening);
    overlayDiv.querySelector("#pm-prev-btn")?.addEventListener("click", () => changeSlide(-1));
    overlayDiv.querySelector("#pm-next-btn")?.addEventListener("click", () => changeSlide(1));
}

function setStealthMode(enabled: boolean) {
    isStealthMode = enabled;
    if (enabled) {
        if (overlayDiv) overlayDiv.style.display = "none";
        createStealthBadge();
    } else {
        if (overlayDiv) {
            overlayDiv.style.display = "block";
            overlayDiv.style.animation = "none"; // reset to avoid replay
        } else {
            createOverlay();
        }
        removeStealthBadge();
    }
}

async function changeSlide(direction: number) {
    if (!activeSessionId) return;
    const newSlide = currentSlide + direction;
    if (newSlide < 1 || newSlide > totalSlides) return;
    
    currentSlide = newSlide;
    updateNavButtons();

    try {
        const response = await fetch(`${API_URL}/sessions/${activeSessionId}/slide?slide_number=${newSlide}`, { method: "POST" });
        if (!response.ok) throw new Error(`Slide update failed (${response.status})`);
        fetchCurrentSlideHints();
    } catch (e) {
        console.error("Failed to update slide", e);
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById("pm-prev-btn") as HTMLButtonElement | null;
    const nextBtn = document.getElementById("pm-next-btn") as HTMLButtonElement | null;
    if (prevBtn) {
        prevBtn.disabled = currentSlide <= 1;
        prevBtn.style.opacity = prevBtn.disabled ? "0.4" : "1";
    }
    if (nextBtn) {
        nextBtn.disabled = currentSlide >= totalSlides;
        nextBtn.style.opacity = nextBtn.disabled ? "0.4" : "1";
    }
}

async function fetchCurrentSlideHints() {
    if (!activeSessionId || !overlayDiv) return;

    try {
        const res = await fetch(`${API_URL}/sessions/${activeSessionId}/hints/current-slide`);
        const data = await res.json();

        if (data.slide_number) currentSlide = data.slide_number;
        if (data.total_slides) totalSlides = data.total_slides;
        updateNavButtons();

        const contentDiv = document.getElementById("pm-content");
        if (!contentDiv) return;

        if (data.message) {
            contentDiv.innerHTML = `<p style="font-size:14px; color:#64748b; font-weight:500;">${escapeHtml(data.message)}</p>`;
        } else {
            let html = `<div style="margin-bottom:12px;">
                <strong style="color:#0d9488; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:6px;">Slide ${data.slide_number} of ${data.total_slides}</strong>
                <p style="font-size:15px; margin:0; color:#1e293b; font-weight:500; line-height:1.5;">${escapeHtml(data.summary)}</p>
            </div>`;

            if (data.key_points?.length > 0) {
                html += `<div>
                    <strong style="color:#0d9488; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Key Points</strong>
                    <ul style="font-size:13px; margin:6px 0 0 0; padding-left:18px; line-height:1.6; color:#334155; font-weight:500;">`;
                data.key_points.forEach((pt: string) => { html += `<li style="margin-bottom:4px;">${escapeHtml(pt)}</li>`; });
                html += `</ul></div>`;
            }

            contentDiv.innerHTML = html;
        }
    } catch (err) {
        console.error("Failed to fetch hints:", err);
    }
}

let recognition: any = null;
let isListening = false;

function toggleListening() {
    if (!("webkitSpeechRecognition" in window)) {
        const micStatus = document.getElementById("pm-mic-status");
        if (micStatus) micStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">Speech recognition not supported in this browser.</span>`;
        return;
    }

    const micBtn = document.getElementById("pm-mic-btn") as HTMLButtonElement | null;
    const micStatus = document.getElementById("pm-mic-status");

    if (isListening && recognition) {
        recognition.stop();
        isListening = false;
        if (micBtn) { micBtn.style.background = "#0d9488"; micBtn.textContent = "Listen"; }
        if (micStatus) micStatus.innerHTML = `<div style="width:6px; height:6px; background:#cbd5e1; border-radius:50%;"></div> Mic off.`;
        return;
    }

    // @ts-ignore
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isListening = true;
        if (micBtn) { micBtn.style.background = "#ef4444"; micBtn.textContent = "Stop"; }
        if (micStatus) micStatus.innerHTML = `<div style="width:8px; height:8px; background:#ef4444; border-radius:50%; animation:pmPulseGlow 1.5s infinite;"></div> <span style="color:#0f172a; font-weight:600;">Listening to audience...</span>`;
    };

    recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (micStatus) micStatus.innerHTML = `<i style="color:#334155;">Heard: "${transcript}"</i><br/><br/><span style="color:#0d9488; font-weight:700; display:flex; align-items:center; gap:6px;"><div style="width:6px; height:6px; background:#0d9488; border-radius:50%; animation:pmPulseGlow 1s infinite;"></div> Generating hint...</span>`;

        try {
            const res = await fetch(`${API_URL}/sessions/${activeSessionId}/question`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionText: transcript })
            });
            const data = await res.json();

            if (data.hint?.answer_hint) {
                let qaHtml = `<strong style="color:#d97706; font-size:13px; display:block; margin-bottom:4px;">Q: ${escapeHtml(transcript)}</strong>`;
                qaHtml += `<p style="font-size:14px; margin:0 0 8px 0; color:#0f172a; font-weight:600;">${escapeHtml(data.hint.answer_hint)}</p>`;
                if (data.hint.talking_points?.length > 0) {
                    qaHtml += `<ul style="font-size:13px; margin:0; padding-left:18px; color:#334155; font-weight:500;">`;
                    data.hint.talking_points.forEach((tp: string) => { qaHtml += `<li>${escapeHtml(tp)}</li>`; });
                    qaHtml += `</ul>`;
                }
                if (micStatus) micStatus.innerHTML = qaHtml;
            } else {
                if (micStatus) micStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">No clear hint generated.</span>`;
            }
        } catch (err) {
            console.error(err);
            if (micStatus) micStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">Error fetching answer hint.</span>`;
        }
    };

    recognition.onerror = (event: any) => {
        isListening = false;
        if (micBtn) { micBtn.style.background = "#0d9488"; micBtn.textContent = "Listen"; }
        if (micStatus) micStatus.innerHTML = `<span style="color:#ef4444; font-weight:600;">Error: ${event.error}</span>`;
    };

    recognition.onend = () => {
        isListening = false;
        if (micBtn) { micBtn.style.background = "#0d9488"; micBtn.textContent = "Listen"; }
    };

    recognition.start();
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SHOW_OVERLAY") {
        activeSessionId = message.sessionId;
        injectStyles();
        createOverlay();
        fetchCurrentSlideHints();
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = window.setInterval(fetchCurrentSlideHints, 5000);
    }
    if (message.type === "SET_STEALTH_MODE") {
        setStealthMode(message.enabled);
    }
    if (message.type === "HIDE_OVERLAY") {
        if (overlayDiv) {
            overlayDiv.remove();
            overlayDiv = null;
        }
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        activeSessionId = null;
    }
});

window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "STOP_PRESENTMATE_SESSION") {
        chrome.runtime.sendMessage({ type: "STOP_SESSION" });
    }
});
