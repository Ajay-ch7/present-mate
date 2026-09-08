const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Screen capture
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // Send data to the Python bridge
  sendToBridge: (payload) => ipcRenderer.send('send-to-bridge', payload),

  // Receive responses from the Python bridge
  onBridgeResponse: (callback) => {
    ipcRenderer.on('bridge-response', (_event, data) => callback(data));
  },

  // Overlay lifecycle events from main process
  onOverlayShow: (callback) => ipcRenderer.on('overlay-show', callback),
  onOverlayHide: (callback) => ipcRenderer.on('overlay-hide', callback),

  // Allow renderer to toggle mouse pass-through (e.g., when hovering a panel)
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
});
