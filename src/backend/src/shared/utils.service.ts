import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { EnvironmentEnum } from '../environmentEnum';
import { resolveFromBase } from './path-resolver';

@Injectable()
export class UtilsService {
  constructor(private readonly configService: ConfigService) {}

  getPlaylistFolderPath(name: string): string {
    const baseDir = process.env.SPOOTY_BASE_DIR || resolve(__dirname, '..');
    const downloadsPath = resolveFromBase(
      this.configService.get<string>(EnvironmentEnum.DOWNLOADS_PATH),
      baseDir,
    );
    return resolve(downloadsPath, this.stripFileIllegalChars(name));
  }

  getArtistFolderPath(artist: string): string {
    const baseDir = process.env.SPOOTY_BASE_DIR || resolve(__dirname, '..');
    const downloadsPath = resolveFromBase(
      this.configService.get<string>(EnvironmentEnum.DOWNLOADS_PATH),
      baseDir,
    );
    const safeArtist = this.stripFileIllegalChars(artist || 'unknown_artist');
    return resolve(downloadsPath, safeArtist);
  }

  stripFileIllegalChars(text: string): string {
    return text.replace(/[/\\?%*:|"<>]/g, '-');
  }
}
