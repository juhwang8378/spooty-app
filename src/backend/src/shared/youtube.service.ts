import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity } from '../track/track.entity';
import { EnvironmentEnum } from '../environmentEnum';
import { TrackService } from '../track/track.service';
import { ConfigService } from '@nestjs/config';
import { YtDlp } from 'ytdlp-nodejs';
import * as yts from 'yt-search';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const NodeID3 = require('node-id3');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private readonly configService: ConfigService) {}

  private resolveYtDlpBinaryPath(): string | undefined {
    const configuredPath = this.configService.get<string>(
      EnvironmentEnum.YTDLP_BINARY_PATH,
    );
    if (configuredPath) {
      const trimmedPath = configuredPath.trim();
      if (trimmedPath.length > 0) {
        if (fs.existsSync(trimmedPath)) {
          return trimmedPath;
        }
        this.logger.warn(
          `YTDLP_BINARY_PATH is set but not found at: ${trimmedPath}`,
        );
      }
    }

    const resourcesPath = process.env.SPOOTY_RESOURCES_PATH;
    const isWindows = process.platform === 'win32';
    if (resourcesPath) {
      const archSuffix = process.arch;
      const candidates = [
        path.join(
          resourcesPath,
          'deps',
          'bin',
          `yt-dlp-${archSuffix}${isWindows ? '.exe' : ''}`,
        ),
        path.join(
          resourcesPath,
          'deps',
          'bin',
          `yt-dlp${isWindows ? '.exe' : ''}`,
        ),
        path.join(resourcesPath, 'deps', 'bin', `yt-dlp-${archSuffix}`),
        path.join(resourcesPath, 'deps', 'bin', 'yt-dlp'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    const pathEnv = process.env.PATH ?? '';
    for (const dir of pathEnv.split(path.delimiter)) {
      if (!dir) {
        continue;
      }
      const candidate = path.join(dir, 'yt-dlp');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      if (process.platform === 'win32') {
        const windowsCandidate = path.join(dir, 'yt-dlp.exe');
        if (fs.existsSync(windowsCandidate)) {
          return windowsCandidate;
        }
      }
    }

    const fallbackCandidates = ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp'];
    for (const candidate of fallbackCandidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private resolveFfmpegPath(): string | undefined {
    const configuredPath = process.env.FFMPEG_PATH?.trim();
    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    const installerPath = ffmpegInstaller?.path;
    if (installerPath && fs.existsSync(installerPath)) {
      return installerPath;
    }

    const resourcesPath = process.env.SPOOTY_RESOURCES_PATH;
    if (resourcesPath) {
      const candidate = path.join(
        resourcesPath,
        'deps',
        'bin',
        `ffmpeg${process.platform === 'win32' ? '.exe' : ''}`,
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  async findOnYoutubeOne(artist: string, name: string): Promise<string> {
    this.logger.debug(`Searching ${artist} - ${name} on YT`);
    const url = (await yts(`${artist} - ${name}`)).videos[0].url;
    this.logger.debug(`Found ${artist} - ${name} on ${url}`);
    return url;
  }

  async downloadAndFormat(
    track: TrackEntity,
    output: string,
  ): Promise<void> {
    this.logger.debug(
      `Downloading ${track.artist} - ${track.name} (${track.youtubeUrl}) from YT`,
    );
    if (!track.youtubeUrl) {
      this.logger.error('youtubeUrl is null or undefined');
      throw Error('youtubeUrl is null or undefined');
    }
    const binaryPath = this.resolveYtDlpBinaryPath();
    if (!binaryPath) {
      this.logger.error(
        'yt-dlp binary not found. Install yt-dlp or set YTDLP_BINARY_PATH.',
      );
      throw Error(
        'yt-dlp binary not found. Install yt-dlp or set YTDLP_BINARY_PATH.',
      );
    }
    const ffmpegPath = this.resolveFfmpegPath();
    const ytdlp = new YtDlp({ binaryPath, ...(ffmpegPath ? { ffmpegPath } : {}) });
    const cookies = this.configService.get<string>('YT_COOKIES')?.trim();
    await ytdlp.downloadAsync(track.youtubeUrl, {
      format: {
        filter: 'audioonly',
        type: this.configService.get<'m4a'>(EnvironmentEnum.FORMAT),
        quality: 0,
      },
      output,
      ...(cookies ? { cookies } : {}),
      headers: HEADERS,
    });
    this.logger.debug(
      `Downloaded ${track.artist} - ${track.name} to ${output}`,
    );
  }

  async addImage(
    folderName: string,
    coverUrl: string,
    title: string,
    artist: string,
  ): Promise<void> {
    if (coverUrl) {
      const res = await fetch(coverUrl);
      const arrayBuf = await res.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuf);

      NodeID3.write(
        {
          title,
          artist,
          APIC: {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'cover',
            imageBuffer,
          },
        },
        folderName,
      );
    }
  }
}
