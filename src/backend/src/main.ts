import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import { EnvironmentEnum } from './environmentEnum';
import {
  applyEffectiveSettingsToEnv,
  getDefaultDbPath,
} from './settings/settings.store';
import { resolveFromBase } from './shared/path-resolver';
import { join, delimiter } from 'path';

process.env.SPOOTY_BASE_DIR = process.env.SPOOTY_BASE_DIR || __dirname;

applyEffectiveSettingsToEnv();

if (!process.env[EnvironmentEnum.DB_PATH]) {
  process.env[EnvironmentEnum.DB_PATH] = getDefaultDbPath();
}
if (!process.env[EnvironmentEnum.FE_PATH]) {
  process.env[EnvironmentEnum.FE_PATH] = '../frontend/browser';
}

const resourcesPath = process.env.SPOOTY_RESOURCES_PATH;
if (resourcesPath) {
  const depsBin = join(resourcesPath, 'deps', 'bin');
  if (fs.existsSync(depsBin)) {
    const currentPath = process.env.PATH || '';
    process.env.PATH = `${depsBin}${delimiter}${currentPath}`;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT || 3000);
}
bootstrap();

const baseDir = process.env.SPOOTY_BASE_DIR || __dirname;
const downloadsPath = resolveFromBase(
  process.env[EnvironmentEnum.DOWNLOADS_PATH],
  baseDir,
);
if (!fs.existsSync(downloadsPath)) {
  fs.mkdirSync(downloadsPath, { recursive: true });
}
