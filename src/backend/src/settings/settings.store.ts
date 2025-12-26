import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppSettings, SettingsKey, SETTINGS_KEYS } from './settings.types';

const CONFIG_FILENAME = 'config.json';

export type SettingsUpdate = Partial<Record<SettingsKey, string | null>>;

export function getUserDataDir(): string {
  if (process.env.SPOOTY_USER_DATA_DIR) {
    return process.env.SPOOTY_USER_DATA_DIR;
  }
  const home = os.homedir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Spooty');
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'Spooty');
  }
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  return path.join(xdgConfig, 'spooty');
}

export function getConfigPath(): string {
  if (process.env.SPOOTY_CONFIG_PATH) {
    return process.env.SPOOTY_CONFIG_PATH;
  }
  return path.join(getUserDataDir(), CONFIG_FILENAME);
}

export function getDefaultDownloadsPath(): string {
  return path.join(os.homedir(), 'Downloads', 'Spooty');
}

export function getDefaultDbPath(): string {
  return path.join(getUserDataDir(), 'db.sqlite');
}

export function getDefaultSettings(): AppSettings {
  return {
    DOWNLOADS_PATH: getDefaultDownloadsPath(),
    FORMAT: 'mp3',
    YT_DOWNLOADS_PER_MINUTE: '3',
  };
}

function filterSettings(input: Record<string, unknown>): AppSettings {
  const output: AppSettings = {};
  for (const key of SETTINGS_KEYS) {
    const value = input[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        output[key] = trimmed;
      }
    }
  }
  return output;
}

export function loadSettings(): AppSettings {
  const filePath = getConfigPath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return filterSettings(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function saveSettings(update: SettingsUpdate): AppSettings {
  const current = loadSettings();
  const next: AppSettings = { ...current };
  for (const key of SETTINGS_KEYS) {
    if (!(key in update)) {
      continue;
    }
    const value = update[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        next[key] = trimmed;
      } else {
        delete next[key];
      }
    } else if (value === null) {
      delete next[key];
    }
  }

  const filePath = getConfigPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });

  return next;
}

export function getEffectiveSettings(): AppSettings {
  const defaults = getDefaultSettings();
  const stored = loadSettings();
  const env: AppSettings = {};
  for (const key of SETTINGS_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      env[key] = value.trim();
    }
  }
  return { ...defaults, ...stored, ...env };
}

export function applySettingsToEnv(settings: AppSettings): void {
  for (const key of SETTINGS_KEYS) {
    const value = settings[key];
    if (typeof value === 'string' && value.length > 0) {
      process.env[key] = value;
    }
  }
}

export function applySettingsUpdateToEnv(update: SettingsUpdate): void {
  for (const key of SETTINGS_KEYS) {
    if (!(key in update)) {
      continue;
    }
    const value = update[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        process.env[key] = trimmed;
      } else {
        delete process.env[key];
      }
    } else if (value === null) {
      delete process.env[key];
    }
  }
}

export function applyEffectiveSettingsToEnv(): AppSettings {
  const effective = getEffectiveSettings();
  applySettingsToEnv(effective);
  return effective;
}
