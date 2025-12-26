import { Injectable } from '@nestjs/common';
import { AppSettings, SETTINGS_KEYS } from './settings.types';
import {
  applyEffectiveSettingsToEnv,
  applySettingsUpdateToEnv,
  getEffectiveSettings,
  saveSettings,
  SettingsUpdate,
} from './settings.store';
import * as fs from 'fs';
import { resolveFromBase } from '../shared/path-resolver';
import { EnvironmentEnum } from '../environmentEnum';

@Injectable()
export class SettingsService {
  getSettings(): AppSettings {
    return getEffectiveSettings();
  }

  updateSettings(update: AppSettings): AppSettings {
    const normalized: SettingsUpdate = {};
    for (const key of SETTINGS_KEYS) {
      if (!(key in update)) {
        continue;
      }
      const rawValue = update[key];
      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        normalized[key] = trimmed.length > 0 ? trimmed : null;
      } else if (rawValue === null) {
        normalized[key] = null;
      }
    }
    saveSettings(normalized);
    applySettingsUpdateToEnv(normalized);
    const effective = applyEffectiveSettingsToEnv();
    this.ensureDownloadsPath(effective[EnvironmentEnum.DOWNLOADS_PATH]);
    return effective;
  }

  private ensureDownloadsPath(downloadsPath?: string): void {
    if (!downloadsPath) {
      return;
    }
    const baseDir = process.env.SPOOTY_BASE_DIR || process.cwd();
    const resolvedPath = resolveFromBase(downloadsPath, baseDir);
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }
  }
}
