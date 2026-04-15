const { app, BrowserWindow, globalShortcut, session,
        ipcMain, screen, powerSaveBlocker } = require('electron');
const path = require('path');
const os   = require('os');
const dns  = require('dns');
const fs   = require('fs');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  const defaults = {
    url:           'https://edu.timurkasuari.com/cbt/',
    settings_pass: 'edukasuari2025',
    version:       '1.0.0',
    app_name:      'ExamBrowser EDU Kasuari',
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
let splashWin = null, checkerWin = null, browserWin = null, settingsWin = null;
let psBlockerId = null;

if (!app.requestSingleInstanceLock()) { app.quit(); }

function createSplash() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  splashWin = new BrowserWindow({
    width: 520, height: 360,
    x: Math.round((width-520)/2), y: Math.round((height-360)/2),
    frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#0F172A',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWin.loadFile('splash.html');
  splashWin.setContentProtection(true);
  setTimeout(() => {
    createChecker();
    if (splashWin && !splashWin.isDestroyed()) splashWin.destroy();
    splashWin = null;
  }, 3000);
}

function createChecker() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  checkerWin = new BrowserWindow({
    width: 700, height: 640,
    x: Math.round((width-700)/2), y: Math.round((height-640)/2),
    frame: false, resizable: false, alwaysOnTop: true,
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  checkerWin.loadFile('checker.html');
  // checkerWin.setContentProtection(true);
  checkerWin.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F12' || (input.control && input.shift && 'IJC'.includes(input.key.toUpperCase())))
      e.preventDefault();
  });
}

function launchKiosk() {
  // Sembunyikan checker dulu, jangan destroy — biar IPC reply sempat terkirim
  if (checkerWin && !checkerWin.isDestroyed()) checkerWin.hide();

  try { psBlockerId = powerSaveBlocker.start('prevent-display-sleep'); } catch(e) {}

  const { width, height } = screen.getPrimaryDisplay().size;
  browserWin = new BrowserWindow({
    width, height, x: 0, y: 0,
    frame: false, resizable: false, movable: false,
    minimizable: false, maximizable: false, closable: false,
    alwaysOnTop: true, fullscreen: true,
    show: false,  // tampilkan setelah ready-to-show
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  });

  browserWin.setContentProtection(true);

  // Destroy checkerWin dan tampilkan browserWin hanya setelah siap
  browserWin.once('ready-to-show', () => {
    if (checkerWin && !checkerWin.isDestroyed()) { checkerWin.destroy(); checkerWin = null; }
    browserWin.setFullScreen(true);
    browserWin.show();
  });

  browserWin.webContents.on('devtools-opened', () => browserWin.webContents.closeDevTools());
  browserWin.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F12' ||
        (input.control && input.shift && 'IJC'.includes(input.key.toUpperCase())) ||
        (input.control && input.key === 'U'))
      e.preventDefault();
  });

  const allowed = 'edu.timurkasuari.com';
  browserWin.webContents.on('will-navigate', (e, url) => {
    try { if (!new URL(url).hostname.endsWith(allowed)) e.preventDefault(); }
    catch(_) { e.preventDefault(); }
  });
  browserWin.webContents.setWindowOpenHandler(({ url }) => {
    try { if (new URL(url).hostname.endsWith(allowed)) browserWin.webContents.loadURL(url); }
    catch(_) {}
    return { action: 'deny' };
  });
  browserWin.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (browserWin && !browserWin.isDestroyed()) browserWin.loadURL(config.url);
    }, 3000);
  });
  browserWin.on('closed', () => { browserWin = null; });
  browserWin.loadURL(config.url);

  globalShortcut.register('Control+Shift+Q', () => showExitDialog());
  globalShortcut.register('Control+Alt+F4',  () => showExitDialog());
}

function showExitDialog() {
  if (settingsWin && !settingsWin.isDestroyed()) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  settingsWin = new BrowserWindow({
    width: 520, height: 380,
    x: Math.round((width-520)/2), y: Math.round((height-380)/2),
    frame: false, resizable: false, alwaysOnTop: true,
    backgroundColor: '#1E293B',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  settingsWin.loadFile('settings.html', { query: { mode: 'exit' } });
  settingsWin.setContentProtection(true);
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return;
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  settingsWin = new BrowserWindow({
    width: 500, height: 440,
    x: Math.round((width-500)/2), y: Math.round((height-440)/2),
    frame: false, resizable: false, alwaysOnTop: true,
    backgroundColor: '#1E293B',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  settingsWin.loadFile('settings.html');
  settingsWin.setContentProtection(true);
}

ipcMain.handle('get-system-info', async () => {
  const cpus = os.cpus();
  const disp = screen.getPrimaryDisplay();
  const online = await checkInternet();
  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: cpus[0]?.model || 'Unknown',
    cores: cpus.length,
    ram: Math.round(os.totalmem()/1024/1024),
    resolution: `${disp.size.width}x${disp.size.height}`,
    online, version: config.version, app_name: config.app_name, url: config.url,
  };
});

ipcMain.handle('get-config',      ()      => config);
ipcMain.handle('verify-password', (_, p)  => p === config.settings_pass);
ipcMain.handle('save-config',     (_, c)  => { config = Object.assign(config, c); saveConfig(config); return true; });
ipcMain.handle('open-settings',   ()      => { openSettings(); return true; });
ipcMain.handle('close-settings',  ()      => { if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.destroy(); settingsWin = null; } return true; });
ipcMain.handle('exit-app',        ()      => { globalShortcut.unregisterAll(); app.exit(0); });

ipcMain.handle('launch-kiosk', () => {
  setTimeout(() => {
    try { launchKiosk(); } catch(err) { console.error('launchKiosk error:', err); }
  }, 100);
  return { ok: true };
});

function checkInternet() {
  return new Promise(resolve => dns.resolve('edu.timurkasuari.com', err => resolve(!err)));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'notifications'));
  createSplash();
});

app.on('window-all-closed', () => { globalShortcut.unregisterAll(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => globalShortcut.unregisterAll());
