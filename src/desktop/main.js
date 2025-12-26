const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

let backendProcess;
let backendPort = 3000;

function getProjectRoot() {
  return path.resolve(__dirname, '..', '..');
}

function getBackendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(getProjectRoot(), 'dist', 'backend');
}

function getFrontendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'browser')
    : path.join(getProjectRoot(), 'dist', 'frontend', 'browser');
}

function getDepsBinDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'deps', 'bin')
    : path.join(getProjectRoot(), 'deps', 'bin');
}

function buildBackendEnv() {
  const userDataDir = app.getPath('userData');
  const backendDir = getBackendDir();
  const frontendDir = getFrontendDir();
  const depsBin = getDepsBinDir();
  const isWindows = process.platform === 'win32';
  const env = {
    ...process.env,
    SPOOTY_USER_DATA_DIR: userDataDir,
    SPOOTY_CONFIG_PATH: path.join(userDataDir, 'config.json'),
    SPOOTY_RESOURCES_PATH: app.isPackaged ? process.resourcesPath : getProjectRoot(),
    SPOOTY_BASE_DIR: backendDir,
    FE_PATH: frontendDir,
    PORT: process.env.PORT || '3000',
  };

  backendPort = Number(env.PORT) || 3000;

  if (fs.existsSync(depsBin)) {
    env.PATH = `${depsBin}${path.delimiter}${env.PATH || ''}`;
    const ytDlpCandidates = [
      path.join(depsBin, `yt-dlp-${process.arch}${isWindows ? '.exe' : ''}`),
      path.join(depsBin, `yt-dlp${isWindows ? '.exe' : ''}`),
      path.join(depsBin, `yt-dlp-${process.arch}`),
      path.join(depsBin, 'yt-dlp'),
    ];
    for (const candidate of ytDlpCandidates) {
      if (candidate && fs.existsSync(candidate)) {
        env.YTDLP_BINARY_PATH = candidate;
        break;
      }
    }
    const ffmpegCandidates = [
      path.join(depsBin, `ffmpeg${isWindows ? '.exe' : ''}`),
      path.join(depsBin, 'ffmpeg'),
    ];
    for (const candidate of ffmpegCandidates) {
      if (candidate && fs.existsSync(candidate)) {
        env.FFMPEG_PATH = candidate;
        break;
      }
    }
  }

  return env;
}

function startBackend() {
  const backendDir = getBackendDir();
  const backendEntry = path.join(backendDir, 'main.js');
  if (!fs.existsSync(backendEntry)) {
    dialog.showErrorBox(
      'Backend missing',
      `Backend build not found at ${backendEntry}. Run the build first.`,
    );
    app.quit();
    return;
  }

  const env = buildBackendEnv();
  backendProcess = spawn(process.execPath, [backendEntry], {
    env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
    cwd: backendDir,
    stdio: 'inherit',
  });

  backendProcess.on('exit', (code) => {
    if (!app.isQuitting) {
      dialog.showErrorBox(
        'Backend stopped',
        `Backend exited with code ${code ?? 'unknown'}.`,
      );
    }
  });
}

function waitForPort(port, retries = 100, delayMs = 200) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        attempts += 1;
        if (attempts >= retries) {
          reject(new Error('Timed out waiting for backend'));
          return;
        }
        setTimeout(tryConnect, delayMs);
      });
    };
    tryConnect();
  });
}

async function createMainWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once('ready-to-show', () => window.show());
  await window.loadURL(`http://127.0.0.1:${backendPort}`);
}

app.whenReady().then(async () => {
  startBackend();
  try {
    await waitForPort(backendPort);
    await createMainWindow();
  } catch (error) {
    dialog.showErrorBox('Startup error', String(error));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});
