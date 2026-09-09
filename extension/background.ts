chrome.runtime.onInstalled.addListener(() => {
    console.log("PresentMate Extension Installed.");
});

const BACKEND_URL = "http://localhost:8000";

// Enhanced session management with improved persistence layer
// Persist session in storage so it survives service worker restarts
async function getStoredSession(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get("pm_session_id", (result) => {
            resolve((result.pm_session_id as string) || null);
        });
    });
}
//movie
async function setStoredSession(sessionId: string | null) {
    if (sessionId) {
        chrome.storage.local.set({ pm_session_id: sessionId });
    } else {
        chrome.storage.local.remove("pm_session_id");
    }
}

// Inject overlay into ALL currently open tabs
function broadcastToAllTabs(message: object) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id && tab.url &&
                !tab.url.startsWith("chrome://") &&
                !tab.url.startsWith("chrome-extension://") &&
                !tab.url.startsWith("about:")) {
                chrome.tabs.sendMessage(tab.id, message, () => {
                    void chrome.runtime.lastError;
                });
            }
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CONNECT_SESSION") {
        const sessionId = message.sessionId;
        fetch(`${BACKEND_URL}/sessions/${sessionId}`)
            .then((res) => {
                if (!res.ok) {
                    sendResponse({ success: false, error: "Session not found" });
                    return null;
                }
                return res.json();
            })
            .then(async (data) => {
                if (!data) return;
                await setStoredSession(sessionId);
                broadcastToAllTabs({ type: "SHOW_OVERLAY", sessionId });
                sendResponse({ success: true });
            })
            .catch((err) => {
                console.error("Session validation error:", err);
                sendResponse({ success: false, error: "Could not reach backend" });
            });
        return true;
    }

    if (message.type === "GET_SESSION") {
        getStoredSession().then((id) => {
            sendResponse({ sessionId: id });
        });
        return true;
    }

    if (message.type === "SET_STEALTH_MODE") {
        broadcastToAllTabs({ type: "SET_STEALTH_MODE", enabled: message.enabled });
        sendResponse({ success: true });
    }

    if (message.type === "STOP_SESSION") {
        setStoredSession(null);
        broadcastToAllTabs({ type: "HIDE_OVERLAY" });
        sendResponse({ success: true });
    }

    if (message.type === "FETCH_HINTS_FOR_POPUP") {
        getStoredSession().then(async (sessionId) => {
            if (!sessionId) {
                sendResponse({ error: "No active session" });
                return;
            }
            try {
                const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/hints/current-slide`);
                const data = await res.json();
                sendResponse({ data, sessionId });
            } catch (e) {
                sendResponse({ error: "Could not fetch hints" });
            }
        });
        return true;
    }
});

// When a new tab fully loads, auto-inject overlay if session exists
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("chrome-extension://")) {
        getStoredSession().then((sessionId) => {
            if (sessionId) {
                // Delay slightly so content script has time to initialize
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: "SHOW_OVERLAY", sessionId }, () => {
                        void chrome.runtime.lastError;
                    });
                }, 1200);
            }
        });
    }
});
