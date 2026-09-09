const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  desktopCapturer,
  systemPreferences
} = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();
const isDev = process.argv.includes('--dev');

// Initialize overlay and bridge components
let overlayWindow = null;
let bridgeProcess = null;
let slideshowActive = false;
let detectionInterval = null;
let noSlideshowCounter = 0; // Stability counter for slideshow detection
const STABILITY_THRESHOLD = 3; // Number of failed checks before hiding
let lastIgnoreToggle = 0;

// ─── Python Bridge ────────────────────────────────────────────────────────────

function startBridge() {
  const bridgePath = path.join(__dirname, 'bridge', 'bridge.py');
  
  const fs = require('fs');
  // If running locally, point to the backend's virtual environment which we know works
  const venvPath = path.join(__dirname, '..', 'backend', '.venv', 'Scripts', 'python.exe');
  let pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
  if (fs.existsSync(venvPath)) {
    pythonExecutable = venvPath;
  }

  bridgeProcess = spawn(pythonExecutable, [bridgePath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  bridgeProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter((l) => l.trim());
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('bridge-response', msg);
        }
      } catch (e) {
        console.error('[Bridge] Bad JSON:', line);
      }
    }
  });

  bridgeProcess.stderr.on('data', (d) => console.error('[Bridge STDERR]', d.toString()));
  bridgeProcess.on('close', (code) => console.log('[Bridge] Exited with code', code));
}

function sendToBridge(payload) {
  if (bridgeProcess && bridgeProcess.stdin.writable) {
    bridgeProcess.stdin.write(JSON.stringify(payload) + '\n');
  }
}

// ─── Overlay Window ──────────────────────────────────────────────────────────

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const fullBounds = screen.getPrimaryDisplay().bounds;

  overlayWindow = new BrowserWindow({
    x: fullBounds.x,
    y: fullBounds.y,
    width: fullBounds.width,
    height: fullBounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,      // must be true for buttons/clicks to work in panels
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Default: pass all clicks through to the underlying window (PowerPoint).
  // The renderer toggles this off when the mouse enters an interactive panel.
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // Set to 'screen-saver' level to ensure it displays above True Fullscreen apps like PowerPoint
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (isDev) {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// ─── Slideshow Detection ─────────────────────────────────────────────────────

async function checkSlideshowActive() {
  try {
    // Dynamic import for ESM active-win
    const { default: activeWin } = await import('active-win');
    const win = await activeWin();

    if (!win) return;

    const title   = (win.title   || '').toLowerCase();
    const appName = (win.owner?.name || '').toLowerCase();

    // KEY FIX: If our own Electron overlay just received focus (e.g. user
    // clicked a button), do NOT change the slideshow state.
    // Without this, detection thinks PowerPoint closed and hides the overlay!
    const ownerPid = win.owner?.processId;
    if (ownerPid === process.pid || appName.includes('electron') || appName.includes('presentmate') || appName.includes('node') || BrowserWindow.getFocusedWindow() !== null) {
      return;
    }

    // Give a 5-second grace period after toggling window click-through state.
    // Windows often drops focus to Explorer randomly when making a window click-through.
    if (Date.now() - lastIgnoreToggle < 5000) {
      return;
    }

    const isPowerPoint =
      appName.includes('powerpnt') ||
      appName.includes('microsoft powerpoint') ||
      appName.includes('powerpoint');

    const { bounds: displayBounds } = screen.getPrimaryDisplay();
    const isSlideshow =
      title.includes('slide show') ||
      title.includes('slideshow') ||
      (isPowerPoint && win.bounds &&
        win.bounds.width  >= displayBounds.width  * 0.85 &&
        win.bounds.height >= displayBounds.height * 0.85);

    if (isSlideshow && !slideshowActive) {
      noSlideshowCounter = 0;
      slideshowActive = true;
      showOverlay();
    } else if (isSlideshow && slideshowActive) {
      noSlideshowCounter = 0; // Reset on success to keep it stable
    } else if (!isSlideshow && slideshowActive) {
      noSlideshowCounter++;
      
      // Only hide if we consistently fail to find a slideshow (Stability Buffer)
      if (noSlideshowCounter >= STABILITY_THRESHOLD) {
        slideshowActive = false;
        noSlideshowCounter = 0;
        hideOverlay();
      }
    }
  } catch (err) {
    // active-win may not be installed yet — fail silently
    console.error('[Detection]', err.message);
  }
}

function showOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.showInactive();
    overlayWindow.webContents.send('overlay-show');
  }
}

function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay-hide');
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
    }, 400); // wait for fade-out animation
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
    });
    if (sources.length > 0) {
      const jpgBuf = sources[0].thumbnail.toJPEG(60);
      return 'data:image/jpeg;base64,' + jpgBuf.toString('base64');
    }
    return null;
  } catch (e) {
    console.error('[Capture]', e);
    return null;
  }
});

ipcMain.on('send-to-bridge', (_event, payload) => {
  sendToBridge(payload);
});

ipcMain.on('set-ignore-mouse', (_event, ignore) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
    lastIgnoreToggle = Date.now();
    // After changing click-through state, Windows may change the active window. 
    // Reassert top-level presence to prevent fullscreen apps from swallowing the overlay.
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createOverlayWindow();
  startBridge();

  // Poll for PowerPoint slideshow every 1.5 seconds
  detectionInterval = setInterval(checkSlideshowActive, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  clearInterval(detectionInterval);
  if (bridgeProcess) {
    bridgeProcess.kill();
  }
});
