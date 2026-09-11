export {};

const POPUP_API_URL = "http://localhost:8000";

type StatusType = "waiting" | "connecting" | "connected" | "error";

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const sessionInput = document.getElementById("sessionId") as HTMLInputElement;
    const connectBtn = document.getElementById("connectBtn") as HTMLButtonElement;
    const disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement;
    const stealthBtn = document.getElementById("stealthBtn") as HTMLButtonElement;
    const statusDiv = document.getElementById("status") as HTMLDivElement;
    const hintsPanel = document.getElementById("pm-hints-panel") as HTMLDivElement;
    const hintsContent = document.getElementById("pm-hints-content") as HTMLDivElement;
    const prevBtn = document.getElementById("pop-prev-btn") as HTMLButtonElement;
    const nextBtn = document.getElementById("pop-next-btn") as HTMLButtonElement;
    const slideText = document.getElementById("pop-slide-text") as HTMLDivElement;

    // State
    let isStealthMode = false;
    let hintsInterval: ReturnType<typeof setInterval> | null = null;
    let activeSessionId: string | null = null;
    let currentSlide = 1;
    let totalSlides = 1;

    // Helper: Update status display
    function setStatus(type: StatusType, message: string) {
        statusDiv.className = `status-card ${type}`;
        const icon = document.createElement("span");
        icon.className = "status-icon";
        statusDiv.innerHTML = "";
        statusDiv.appendChild(icon);
        statusDiv.appendChild(document.createTextNode(message));
    }

    // Helper: Update UI state based on connection
    function updateUIState(connected: boolean) {
        connectBtn.disabled = connected;
        sessionInput.disabled = connected;
        disconnectBtn.style.display = connected ? "block" : "none";
        stealthBtn.disabled = !connected;

        if (!connected) {
            hintsPanel.style.display = "none";
            isStealthMode = false;
            stealthBtn.textContent = "Enable Presentation Mode";
            stealthBtn.classList.remove("active");
        }
    }

    // Restore existing session
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (response) => {
        if (response && response.sessionId) {
            activeSessionId = response.sessionId;
            setStatus("connected", `Connected: ${response.sessionId.substring(0, 8)}...`);
            updateUIState(true);
            sessionInput.style.display = "none";
        }
    });

    // Connect button handler
    connectBtn.addEventListener("click", () => {
        const sessionId = sessionInput.value.trim();
        if (!sessionId) {
            setStatus("error", "Please enter a valid Session ID");
            return;
        }

        setStatus("connecting", "Connecting...");
        connectBtn.disabled = true;

        chrome.runtime.sendMessage({ type: "CONNECT_SESSION", sessionId }, (response) => {
            if (response && response.success) {
                activeSessionId = sessionId;
                setStatus("connected", `Connected: ${sessionId.substring(0, 8)}...`);
                sessionInput.value = "";
                sessionInput.style.display = "none";
                updateUIState(true);
            } else {
                activeSessionId = null;
                const errMsg = response?.error || "Invalid session ID";
                setStatus("error", `Failed: ${errMsg}`);
                connectBtn.disabled = false;
                updateUIState(false);
            }
        });
    });

    // Disconnect button handler
    disconnectBtn.addEventListener("click", () => {
        activeSessionId = null;
        isStealthMode = false;
        sessionInput.value = "";
        sessionInput.style.display = "block";
        hintsPanel.style.display = "none";
        stealthBtn.textContent = "Enable Presentation Mode";
        stealthBtn.classList.remove("active");

        if (hintsInterval) {
            clearInterval(hintsInterval);
            hintsInterval = null;
        }

        setStatus("waiting", "Waiting for connection");
        updateUIState(false);

        chrome.runtime.sendMessage({ type: "DISCONNECT_SESSION" });
    });

    // Update navigation buttons
    function updateNavButtons() {
        prevBtn.disabled = currentSlide <= 1;
        nextBtn.disabled = currentSlide >= totalSlides;
        slideText.textContent = `Slide ${currentSlide} of ${totalSlides}`;
    }

    // Change slide
    async function changeSlide(direction: number) {
        if (!activeSessionId) return;
        const newSlide = currentSlide + direction;
        if (newSlide < 1 || newSlide > totalSlides) return;

        currentSlide = newSlide;
        updateNavButtons();

        try {
            const response = await fetch(`${POPUP_API_URL}/sessions/${activeSessionId}/slide?slide_number=${newSlide}`, { method: "POST" });
            if (!response.ok) throw new Error(`Slide update failed (${response.status})`);
            fetchAndDisplayHints();
        } catch (e) {
            console.error("Failed to change slide", e);
            hintsContent.innerHTML = `<p style="color: #e11d48; font-size: 12px;">Failed to update slide. Check connection.</p>`;
        }
    }

    // Slide navigation
    prevBtn.addEventListener("click", () => changeSlide(-1));
    nextBtn.addEventListener("click", () => changeSlide(1));

    // Fetch and display hints
    function fetchAndDisplayHints() {
        chrome.runtime.sendMessage({ type: "FETCH_HINTS_FOR_POPUP" }, (response) => {
            if (!response || response.error) {
                hintsContent.innerHTML = `<p style="color:#94a3b8; font-size:13px;">Unable to load hints. Check your connection.</p>`;
                return;
            }

            const data = response.data;
            if (data.slide_number) currentSlide = data.slide_number;
            if (data.total_slides) totalSlides = data.total_slides;
            updateNavButtons();

            if (data.message) {
                hintsContent.innerHTML = `<p style="font-size:13px; color:#475569;">${escapeHtml(data.message)}</p>`;
                return;
            }

            let html = `<div style="margin-bottom: 12px;">
                <p style="font-size: 13px; margin: 0; color: #1e293b; line-height: 1.6; font-weight: 500;">${escapeHtml(data.summary)}</p>
            </div>`;

            if (data.key_points?.length > 0) {
                html += `<div style="margin-top: 12px;">
                    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0d9488; letter-spacing: 0.5px; margin: 0 0 6px;">Key Points</p>
                    <ul style="font-size: 12px; margin: 0; padding-left: 16px; color: #334155; line-height: 1.7;">`;
                data.key_points.forEach((pt: string) => {
                    html += `<li style="margin-bottom: 4px;">${escapeHtml(pt)}</li>`;
                });
                html += `</ul></div>`;
            }

            hintsContent.innerHTML = html;
        });
    }

    // Presentation mode toggle
    stealthBtn.addEventListener("click", () => {
        if (!activeSessionId) return;

        isStealthMode = !isStealthMode;

        if (isStealthMode) {
            stealthBtn.textContent = "Exit Presentation Mode";
            stealthBtn.classList.add("active");
            hintsPanel.style.display = "block";
            fetchAndDisplayHints();
            if (hintsInterval) clearInterval(hintsInterval);
            hintsInterval = setInterval(fetchAndDisplayHints, 5000);
        } else {
            stealthBtn.textContent = "Enable Presentation Mode";
            stealthBtn.classList.remove("active");
            hintsPanel.style.display = "none";
            if (hintsInterval) {
                clearInterval(hintsInterval);
                hintsInterval = null;
            }
        }

        chrome.runtime.sendMessage({ type: "SET_STEALTH_MODE", enabled: isStealthMode });
    });

    // Allow Enter key to submit
    sessionInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") connectBtn.click();
    });
});
