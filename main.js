const { app, BrowserWindow, globalShortcut, session, dialog,
        ipcMain, screen, shell, powerSaveBlocker } = require('electron');
const path = require('path');
const os   = require('os');
const dns  = require('dns');
const fs   = require('fs');

// ── Konfigurasi (simpan di file JSON lokal) ───────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  const defaults = {
    url:             'https://edu.timurkasuari.com/cbt/',
    settings_pass:   'edukasuari2025',
    exit_hint:       'Kombinasi tombol rahasia: Ctrl+Shift+Q',
    app_name:        'ExamBrowser EDU Kasuari',
    version:         '1.0.0',
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return Object.assign(defaults, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
    }
  } catch(e) {}
  return defaults;
}

function saveConfig(data) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2)); } catch(e) {}
}

let config = loadConfig();

// ── State windows ──────────────────────────────────────────────
let splashWin   = null;
let checkerWin  = null;
let browserWin  = null;
let settingsWin = null;
let psBlockerId = null;

// Cegah multi-instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// ── 1. SPLASH SCREEN ──────────────────────────────────────────
function createSplash() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  splashWin = new BrowserWindow({
    width:  520,
    height: 360,
    x: Math.round((width - 520) / 2),
    y: Math.round((height - 360) / 2),
    frame:           false,
    resizable:       false,
    alwaysOnTop:     true,
    skipTaskbar:     true,
    transparent:     false,
    backgroundColor: '#0F172A',
    webPreferences:  { nodeIntegration: false, contextIsolation: true },
  });
  splashWin.loadFile('splash.html');
  splashWin.setContentProtection(true);

  // Setelah 3 detik → buka system checker
  setTimeout(() => {
    createChecker();
    if (splashWin && !splashWin.isDestroyed()) splashWin.destroy();
  }, 3000);
}

// ── 2. SYSTEM CHECKER ─────────────────────────────────────────
function createChecker() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  checkerWin = new BrowserWindow({
    width:  700,
    height: 580,
    x: Math.round((width - 700) / 2),
    y: Math.round((height - 580) / 2),
    frame:           false,
    resizable:       false,
    alwaysOnTop:     true,
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
    },
  });
  checkerWin.loadFile('checker.html');
  checkerWin.setContentProtection(true);
  checkerWin.webContents.on('before-input-event', (e, input) => {
    // Blokir F12 / Ctrl+Shift+I
    if (input.key === 'F12' ||
        (input.control && input.shift && ['I','J','C'].includes(input.key.toUpperCase()))) {
      e.preventDefault();
    }
  });
}

// ── 3. KIOSK BROWSER ─────────────────────────────────────────
function launchKiosk() {
  if (checkerWin && !checkerWin.isDestroyed()) checkerWin.destroy();

  // Cegah layar mati
  psBlockerId = powerSaveBlocker.start('prevent-display-sleep');

  browserWin = new BrowserWindow({
    fullscreen:   true,
    kiosk:        true,
    frame:        false,
    alwaysOnTop:  true,
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration:        false,
      contextIsolation:       true,
      preload:                path.join(__dirname, 'preload.js'),
      webSecurity:            true,
      allowRunningInsecureContent: false,
    },
  });

  // Blokir screenshot & screen recording
  browserWin.setContentProtection(true);

  // Blokir DevTools
  browserWin.webContents.on('devtools-opened', () => {
    browserWin.webContents.closeDevTools();
  });
  browserWin.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F12' ||
        (input.control && input.shift && ['I','J','C'].includes(input.key.toUpperCase())) ||
        (input.control && input.key === 'U')) {
      e.preventDefault();
    }
  });

  // Blokir navigasi ke URL lain
  const allowedDomain = 'edu.timurkasuari.com';
  browserWin.webContents.on('will-navigate', (e, url) => {
    try {
      const host = new URL(url).hostname;
      if (!host.endsWith(allowedDomain)) { e.preventDefault(); }
    } catch(_) { e.preventDefault(); }
  });
  browserWin.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const host = new URL(url).hostname;
      if (host.endsWith(allowedDomain)) {
        browserWin.webContents.loadURL(url);
      }
    } catch(_) {}
    return { action: 'deny' };
  });

  browserWin.loadURL(config.url);

  // ── Shortcut keluar rahasia: Ctrl+Shift+Q ─────────────────
  globalShortcut.register('Control+Shift+Q', () => showExitPrompt());
  // Juga: Ctrl+H+C+B simulasi via sequence (karena Electron tidak support 3-key)
  // Alternatif: Ctrl+Alt+F4
  globalShortcut.register('Control+Alt+F4', () => showExitPrompt());
}

// ── Prompt keluar (minta password) ───────────────────────────
function showExitPrompt() {
  if (settingsWin && !settingsWin.isDestroyed()) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  settingsWin = new BrowserWindow({
    width:  420,
    height: 320,
    x: Math.round((width - 420) / 2),
    y: Math.round((height - 320) / 2),
    frame:       false,
    resizable:   false,
    alwaysOnTop: true,
    modal:       false,
    backgroundColor: '#1E293B',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
    },
  });
  settingsWin.loadFile('settings.html');
  settingsWin.setContentProtection(true);
}

// ── 4. SETTINGS (dari checker) ────────────────────────────────
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  settingsWin = new BrowserWindow({
    width:  500,
    height: 420,
    x: Math.round((width - 500) / 2),
    y: Math.round((height - 420) / 2),
    frame:       false,
    resizable:   false,
    alwaysOnTop: true,
    backgroundColor: '#1E293B',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
    },
  });
  settingsWin.loadFile('settings.html');
  settingsWin.query = 'full'; // mode edit penuh
}

// ── IPC Handlers ──────────────────────────────────────────────
ipcMain.handle('get-system-info', async () => {
  const cpus = os.cpus();
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const { width, height } = screen.getPrimaryDisplay().size;
  const online = await checkInternet();
  return {
    os:         `${os.type()} ${os.release()} (${os.arch()})`,
    cpu:        cpus[0]?.model || 'Unknown',
    cores:      cpus.length,
    ram:        totalMem,
    resolution: `${width}x${height}`,
    online,
    version:    config.version,
    app_name:   config.app_name,
    url:        config.url,
  };
});

ipcMain.handle('get-config', () => config);

ipcMain.handle('verify-password', (_, pass) => pass === config.settings_pass);

ipcMain.handle('save-config', (_, newConfig) => {
  config = Object.assign(config, newConfig);
  saveConfig(config);
  return true;
});

ipcMain.handle('launch-kiosk', () => {
  launchKiosk();
});

ipcMain.handle('open-settings', () => {
  openSettings();
});

ipcMain.handle('close-settings', () => {
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.destroy();
});

ipcMain.handle('exit-app', () => {
  globalShortcut.unregisterAll();
  if (psBlockerId !== null) powerSaveBlocker.stop(psBlockerId);
  app.quit();
});

// ── Cek internet ──────────────────────────────────────────────
function checkInternet() {
  return new Promise(resolve => {
    dns.resolve('edu.timurkasuari.com', err => resolve(!err));
  });
}

// ── App ready ─────────────────────────────────────────────────
app.whenReady().then(() => {
  // Blokir permission kamera, mic, dll
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['notifications'];
    callback(allowed.includes(permission));
  });

  createSplash();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (psBlockerId !== null) powerSaveBlocker.stop(psBlockerId);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});
