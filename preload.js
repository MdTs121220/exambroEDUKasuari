const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('examAPI', {
  getSystemInfo:  ()       => ipcRenderer.invoke('get-system-info'),
  getConfig:      ()       => ipcRenderer.invoke('get-config'),
  verifyPassword:     (pass)   => ipcRenderer.invoke('verify-password', pass),
  verifyExitPassword: (pass)   => ipcRenderer.invoke('verify-exit-password', pass),
  saveConfig:     (cfg)    => ipcRenderer.invoke('save-config', cfg),
  launchKiosk:    ()       => ipcRenderer.invoke('launch-kiosk'),
  openSettings:   ()       => ipcRenderer.invoke('open-settings'),
  closeSettings:  ()       => ipcRenderer.invoke('close-settings'),
  exitApp:        ()       => ipcRenderer.invoke('exit-app'),
});
