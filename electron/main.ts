import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let __filename = '';
let __dirname = '';
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
  fs.writeFileSync('electron_debug.log', 'Paths resolved: ' + __filename + '\n');
} catch (err) {
  fs.writeFileSync('electron_debug.log', 'Error resolving paths: ' + err + '\n');
}

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true
    },
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  fs.appendFileSync('electron_debug.log', 'App ready.\n');
  try {
    createWindow();
  } catch (err) {
    fs.appendFileSync('electron_debug.log', 'Error creating window: ' + err + '\n');
  }
});
process.on('uncaughtException', (err) => {
  fs.appendFileSync('electron_debug.log', 'Uncaught: ' + err + '\n');
});
