import { app, BrowserWindow, ipcMain, shell, session, dialog, screen } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import http from 'http';

// 🚀 Windows 환경에서 Chromium WPAD 프록시 자동 탐색으로 인한 10초 스톨(Stall) 원천 차단
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('disable-http-cache');
// 🚀 AI 에이전트 및 E2E 테스트 자동화를 위한 CDP 디버깅 포트 개방 (Playwright 실행 시 충돌 방지 가드)
if (!process.env.PW_TEST && !app.commandLine.hasSwitch('remote-debugging-port')) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

const startTime = Date.now();
function getPerfLogPath(): string {
  try {
    return path.join(app.getPath('userData'), 'startup_perf.log');
  } catch {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'MiniPDM', 'startup_perf.log');
  }
}

function logPerf(step: string) {
  const elapsed = Date.now() - startTime;
  const line = `[${new Date().toISOString()}] (+${elapsed}ms) ${step}\n`;
  console.log('[PERF]', line.trim());
  try {
    const logPath = getPerfLogPath();
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, line);
  } catch {}
}

logPerf('Electron main.js 실행 시작');

let __filename = '';
let __dirname = '';
try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (err) {
  logPerf('Error resolving paths: ' + err);
}

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

app.setName('MiniPDM');

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): WindowState {
  const defaultState: WindowState = {
    width: 1400,
    height: 900,
    isMaximized: false
  };

  try {
    const filePath = getWindowStatePath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        const state: WindowState = {
          width: Math.max(1024, parsed.width),
          height: Math.max(700, parsed.height),
          isMaximized: !!parsed.isMaximized
        };

        // 다중 모니터 분리 시 화면 밖으로 뜨는 현상 방지
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const visible = screen.getAllDisplays().some(display => {
            const b = display.bounds;
            return (
              parsed.x >= b.x &&
              parsed.x < b.x + b.width &&
              parsed.y >= b.y &&
              parsed.y < b.y + b.height
            );
          });
          if (visible) {
            state.x = parsed.x;
            state.y = parsed.y;
          }
        }
        return state;
      }
    }
  } catch (e) {
    console.warn('Failed to load window state:', e);
  }
  return defaultState;
}

let saveStateTimeout: NodeJS.Timeout | null = null;
function saveWindowState(targetWin: BrowserWindow) {
  if (saveStateTimeout) clearTimeout(saveStateTimeout);
  saveStateTimeout = setTimeout(() => {
    try {
      if (!targetWin || targetWin.isDestroyed()) return;
      const isMaximized = targetWin.isMaximized();
      let bounds = targetWin.getBounds();

      // 최대화 시 이전 일반 창 크기를 보존
      if (isMaximized) {
        const existing = loadWindowState();
        bounds = {
          x: existing.x ?? bounds.x,
          y: existing.y ?? bounds.y,
          width: existing.width ?? bounds.width,
          height: existing.height ?? bounds.height
        };
      }

      const state: WindowState = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      };

      fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save window state:', e);
    }
  }, 300);
}

function createWindow() {
  logPerf('createWindow 시작');
  const iconPath = process.platform === 'win32'
    ? path.join(process.env.VITE_PUBLIC, 'favicon.ico')
    : path.join(process.env.VITE_PUBLIC, 'kep_logo.png');

  const windowState = loadWindowState();

  // 🚀 V1 순정 스타일: partition 없이 기본 세션의 영구 localStorage 사용
  win = new BrowserWindow({
    title: 'MiniPDM v2.0',
    icon: fs.existsSync(iconPath) ? iconPath : path.join(process.env.VITE_PUBLIC, 'kep_logo.png'),
    backgroundColor: '#0D1117',
    show: false, // 렌더링 완료 즉시 ready-to-show에서 화면 표시
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161B22',
      symbolColor: '#E6EDF3',
      height: 48
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (windowState.isMaximized) {
    win.maximize();
  }

  // 창 상태 자동 저장 이벤트
  win.on('resize', () => win && saveWindowState(win));
  win.on('move', () => win && saveWindowState(win));
  win.on('close', () => win && saveWindowState(win));

  // 프로덕션 환경에서 실수로 F5, Ctrl+R 누름으로 인한 작업 데이터 유실 방지
  win.webContents.on('before-input-event', (event, input) => {
    if (!VITE_DEV_SERVER_URL) {
      if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
        event.preventDefault();
      }
    }
  });

  win.webContents.on('dom-ready', () => {
    logPerf('win.webContents dom-ready 완료');
  });

  win.webContents.on('did-finish-load', () => {
    logPerf('win.webContents did-finish-load 완료');
  });

  // 🚀 첫 화면 렌더링 준비 완료 시 즉시 창을 띄워 지연 체감 0ms
  win.once('ready-to-show', () => {
    logPerf('win ready-to-show 발생 -> 창 표시');
    win?.show();
    win?.focus();
  });

  if (win) {
    setupConsoleLogging(win);
  }

  if (VITE_DEV_SERVER_URL) {
    logPerf('win.loadURL 호출: ' + VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    logPerf('win.loadFile 호출: index.html');
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logUpdate(`앱 종료(before-quit) 감지됨. isUpdateDownloaded=${isUpdateDownloaded}`);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  logPerf('app.whenReady 완료');
  try {
    // 🚀 프록시 탐색 원천 차단 (직접 연결)
    await session.defaultSession.setProxy({ mode: 'direct' });
  } catch {}

  try {
    createWindow();

    // 🤖 AI 에이전트 및 E2E 자동 테스트 브릿지 HTTP 서버 기동
    startAgentBridgeServer();

    // 🚀 기동 1초 후 즉각 백그라운드 업데이트 확인 및 10분 주기 폴링 시작
    startAutoUpdateChecks();
  } catch (err) {
    logPerf('Error creating window: ' + err);
  }
});

ipcMain.handle('log-perf', (_event, step: string) => {
  logPerf(`[Renderer] ${step}`);
});
process.on('uncaughtException', (err) => {
  fs.appendFileSync('electron_debug.log', 'Uncaught: ' + err + '\n');
});

ipcMain.handle('read-local-file', async (event, filePath: string) => {
  try {
    let targetPath = filePath;
    if (!fs.existsSync(targetPath)) {
      const candidates: string[] = [];
      
      // 1. 상대 경로 기본 프로젝트 경로
      candidates.push(path.join(process.cwd(), filePath));
      
      // 2. 레거시 MiniPDM 경로
      candidates.push(path.join('D:\\06_Coding\\AntiGravity\\MiniPDM', filePath));
      
      // 3. 사내 기본 임시 데이터 경로
      candidates.push(path.join('D:\\99_ETC\\임시데이터', filePath));
      
      // 4. userData 내 MiniPDM_Storage 하위 경로들 탐색
      const storageDir = path.join(app.getPath('userData'), 'MiniPDM_Storage');
      if (fs.existsSync(storageDir)) {
        try {
          const companyDirs = fs.readdirSync(storageDir);
          for (const cDir of companyDirs) {
            candidates.push(path.join(storageDir, cDir, filePath));
          }
        } catch {}
      }

      // 후보 경로 중 존재하는 첫 번째 경로 선택
      const found = candidates.find(c => fs.existsSync(c));
      if (found) {
        targetPath = found;
      }
    }

    const data = await fs.promises.readFile(targetPath);
    // Node.js Buffer pool 공유로 인한 가비지 데이터 유입 방지: 실제 바이트 범위만 정밀 슬라이스
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return { success: true, data: arrayBuffer, actualPath: targetPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-local-file', async (event, filePath: string) => {
  try {
    const errorMessage = await shell.openPath(filePath);
    if (errorMessage) {
      return { success: false, error: errorMessage };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-local-file', async (event, { filePath, data }: { filePath: string, data: ArrayBuffer | Uint8Array }) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, srcPath: string, companyId: string, targetPath: string) => {
  try {
    // 앱 데이터 폴더 내 MiniPDM_Storage를 가상 파일 서버로 사용합니다.
    const storageRoot = path.join(app.getPath('userData'), 'MiniPDM_Storage', companyId);
    const destDir = path.join(storageRoot, targetPath);
    await fs.promises.mkdir(destDir, { recursive: true });
    
    const fileName = path.basename(srcPath);
    const destPath = path.join(destDir, fileName);
    
    // 파일 복사
    await fs.promises.copyFile(srcPath, destPath);
    
    return { success: true, filePath: destPath };
  } catch (error: any) {
    console.error('save-file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file-from-buffer', async (event, data: ArrayBuffer | Uint8Array, companyId: string, targetPath: string, fileName: string) => {
  try {
    const storageRoot = path.join(app.getPath('userData'), 'MiniPDM_Storage', companyId);
    const destDir = path.join(storageRoot, targetPath);
    await fs.promises.mkdir(destDir, { recursive: true });
    
    const destPath = path.join(destDir, fileName);
    
    // 파일 쓰기
    await fs.promises.writeFile(destPath, Buffer.from(data));
    
    return { success: true, filePath: destPath };
  } catch (error: any) {
    console.error('save-file-from-buffer error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-directory', async (event, title?: string) => {
  try {
    const result = await dialog.showOpenDialog({
      title: title || '폴더를 선택하세요',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    return { success: true, folderPath: result.filePaths[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// 🚀 자동 업데이트 (Auto Updater) 설정 및 IPC
// ==========================================
// 다운로드는 백그라운드에서 자동으로 받고, 사용자가 앱을 종료(창 닫기)하면 자동으로 설치되거나,
// 상단의 [재시작하여 적용] 버튼을 눌러 즉시 적용할 수 있도록 합니다.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const updaterLogPath = path.join(app.getPath('userData'), 'updater.log');
function logUpdate(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log('[AutoUpdater]', msg);
  try {
    fs.appendFileSync(updaterLogPath, line);
  } catch {}
}

let isUpdateDownloaded = false;
let updateCheckInterval: NodeJS.Timeout | null = null;

function sendUpdateStatus(payload: { status: string; message: string; version?: string; percent?: number; error?: string }) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-status', payload);
  }
}

function startAutoUpdateChecks() {
  if (!app.isPackaged) return;

  // 1. 기동 1초 후 백그라운드에서 조용히 즉각 확인
  setTimeout(() => {
    logUpdate('🚀 기동 1초 후 백그라운드 자동 업데이트 체크 시작...');
    autoUpdater.checkForUpdates().catch((err) => {
      logUpdate(`Initial autoUpdater check error: ${err.message}`);
    });
  }, 1000);

  // 2. 10분 주기(600,000ms) 백그라운드 자동 감지
  if (!updateCheckInterval) {
    updateCheckInterval = setInterval(() => {
      logUpdate('⏱️ 10분 주기 백그라운드 자동 업데이트 체크...');
      autoUpdater.checkForUpdates().catch((err) => {
        logUpdate(`Periodic autoUpdater check error: ${err.message}`);
      });
    }, 10 * 60 * 1000);
  }
}

autoUpdater.on('checking-for-update', () => {
  logUpdate('새 버전 확인 중...');
  sendUpdateStatus({ status: 'checking', message: '새 버전이 있는지 확인하는 중입니다...' });
});

autoUpdater.on('update-available', (info) => {
  logUpdate(`새 버전 발견: v${info.version} (백그라운드 다운로드 자동 시작)`);
  sendUpdateStatus({
    status: 'available',
    version: info.version,
    message: `새로운 버전(v${info.version})이 출시되어 백그라운드 다운로드를 시작합니다.`
  });
});

autoUpdater.on('update-not-available', (info) => {
  logUpdate(`현재 최신 버전 사용 중: v${info.version}`);
  sendUpdateStatus({
    status: 'not-available',
    version: info.version,
    message: '현재 최신 버전을 사용하고 있습니다.'
  });
});

autoUpdater.on('error', (err) => {
  logUpdate(`업데이트 에러: ${err.message}`);
  sendUpdateStatus({
    status: 'error',
    error: err.message,
    message: `업데이트 확인 실패: ${err.message}`
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  logUpdate(`다운로드 진행률: ${percent}%`);
  sendUpdateStatus({
    status: 'downloading',
    percent,
    message: `최신 버전 백그라운드 다운로드 중: ${percent}%`
  });
});

autoUpdater.on('update-downloaded', (info) => {
  isUpdateDownloaded = true;
  logUpdate(`업데이트 다운로드 완료: v${info.version}`);
  sendUpdateStatus({
    status: 'downloaded',
    version: info.version,
    message: `v${info.version} 다운로드가 완료되었습니다. 앱 종료 시 자동 적용됩니다.`
  });
});

ipcMain.handle('check-for-updates', async () => {
  if (app.isPackaged) {
    try {
      logUpdate('사용자 수동 업데이트 체크 요청');
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error: any) {
      logUpdate(`수동 체크 에러: ${error.message}`);
      return { success: false, error: error.message };
    }
  } else {
    // 개발 모드(Dev) 환경에서는 업데이트 시뮬레이션
    sendUpdateStatus({
      status: 'not-available',
      version: app.getVersion(),
      message: '개발 모드 환경입니다. (최신 상태 시뮬레이션)'
    });
    return {
      success: true,
      isDev: true,
      version: app.getVersion(),
      message: '개발 환경입니다. 패키징된 배포 버전에서 R2 서버와 실제 동기화됩니다.'
    };
  }
});

ipcMain.handle('start-download-update', async () => {
  if (app.isPackaged) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  } else {
    sendUpdateStatus({
      status: 'downloading',
      percent: 45,
      message: '개발 모드 다운로드 시뮬레이션 중...'
    });
    setTimeout(() => {
      sendUpdateStatus({
        status: 'downloaded',
        version: app.getVersion(),
        message: 'v' + app.getVersion() + ' 다운로드가 완료되었습니다 (시뮬레이션).'
      });
    }, 1500);
    return { success: true, isDev: true };
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('quit-and-install', () => {
  logUpdate('quit-and-install 호출: 즉시 재시작 및 설치 실행');
  autoUpdater.quitAndInstall(false, true);
});

// ==========================================
// 💾 영구 로컬 설정/세션 스토리지 IPC (JSON 파일 기반)
// ==========================================
function getUserStoragePath(): string {
  return path.join(app.getPath('userData'), 'user_storage.json');
}

function readUserStorage(): Record<string, string> {
  try {
    const filePath = getUserStoragePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read user_storage.json:', err);
  }
  return {};
}

function writeUserStorage(storage: Record<string, string>) {
  try {
    const filePath = getUserStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(storage, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write user_storage.json:', err);
  }
}

ipcMain.handle('storage-get', (_event, key: string) => {
  const store = readUserStorage();
  return store[key] ?? null;
});

ipcMain.handle('storage-set', (_event, key: string, value: string) => {
  const store = readUserStorage();
  store[key] = String(value);
  writeUserStorage(store);
  return true;
});

ipcMain.handle('storage-remove', (_event, key: string) => {
  const store = readUserStorage();
  delete store[key];
  writeUserStorage(store);
  return true;
});

ipcMain.handle('storage-get-all', () => {
  return readUserStorage();
});

// 앱 기동 즉시 Preload에서 0.0001초 만에 초기 데이터를 동기적으로 받아가도록 지원
ipcMain.on('storage-get-all-sync', (event) => {
  event.returnValue = readUserStorage();
});

// ==============================================================================
// 🤖 AI Agent Test Bridge HTTP Server (개발 및 E2E 자동화용 API)
// ==============================================================================
interface ConsoleLogItem {
  level: number;
  message: string;
  line: number;
  sourceId: string;
  time: string;
}

const consoleLogs: ConsoleLogItem[] = [];

function setupConsoleLogging(targetWin: BrowserWindow) {
  targetWin.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    consoleLogs.push({ level, message, line, sourceId, time: new Date().toISOString() });
    if (consoleLogs.length > 500) consoleLogs.shift();
  });
}

function startAgentBridgeServer() {
  const PORT = 49152;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    const sendJson = (status: number, data: any) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data, null, 2));
    };

    const getBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try { resolve(body ? JSON.parse(body) : {}); }
          catch { resolve({}); }
        });
      });
    };

    try {
      if (url.pathname === '/api/status' && req.method === 'GET') {
        if (!win || win.isDestroyed()) {
          return sendJson(503, { ok: false, error: 'Window not ready' });
        }
        const currentUrl = win.webContents.getURL();
        let hash = '';
        try {
          hash = await win.webContents.executeJavaScript('window.location.hash');
        } catch {}
        return sendJson(200, {
          ok: true,
          url: currentUrl,
          hash,
          isMinimized: win.isMinimized(),
          isFocused: win.isFocused(),
          bounds: win.getBounds(),
        });
      }

      if (url.pathname === '/api/navigate' && req.method === 'POST') {
        if (!win || win.isDestroyed()) return sendJson(503, { ok: false, error: 'Window not ready' });
        const { hash } = await getBody();
        if (!hash) return sendJson(400, { ok: false, error: 'Missing hash' });
        await win.webContents.executeJavaScript(`window.location.hash = ${JSON.stringify(hash)};`);
        return sendJson(200, { ok: true, hash });
      }

      if (url.pathname === '/api/eval' && req.method === 'POST') {
        if (!win || win.isDestroyed()) return sendJson(503, { ok: false, error: 'Window not ready' });
        const { code } = await getBody();
        if (!code) return sendJson(400, { ok: false, error: 'Missing code' });
        const result = await win.webContents.executeJavaScript(code);
        return sendJson(200, { ok: true, result });
      }

      if (url.pathname === '/api/screenshot' && req.method === 'POST') {
        if (!win || win.isDestroyed()) return sendJson(503, { ok: false, error: 'Window not ready' });
        const { targetPath } = await getBody();
        const image = await win.webContents.capturePage();
        const buffer = image.toPNG();
        const savePath = targetPath || path.join(process.cwd(), 'screenshot.png');
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(savePath, buffer);
        return sendJson(200, { ok: true, savedTo: savePath, size: buffer.length });
      }

      if (url.pathname === '/api/logs' && req.method === 'GET') {
        return sendJson(200, { ok: true, logs: consoleLogs });
      }

      sendJson(404, { ok: false, error: 'Not found' });
    } catch (e: any) {
      sendJson(500, { ok: false, error: e.message });
    }
  });

  server.on('error', (err: any) => {
    console.log('[AGENT BRIDGE] Server port 49152 already in use or error:', err.message);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[AGENT BRIDGE] Test API server listening on http://127.0.0.1:${PORT}`);
  });
}



