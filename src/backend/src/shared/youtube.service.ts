import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity } from '../track/track.entity';
import { EnvironmentEnum } from '../environmentEnum';
import { TrackService } from '../track/track.service';
import { ConfigService } from '@nestjs/config';
import { YtDlp } from 'ytdlp-nodejs';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const NodeID3 = require('node-id3');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

type YoutubeCandidate = {
  url: string;
  title?: string;
  description?: string | null;
  durationSeconds?: number;
  channel?: string;
  uploader?: string;
  isLive?: boolean;
};

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(TrackService.name);
  private ytDlp?: YtDlp;

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

  async findOnYoutubeOne(
    artist: string,
    name: string,
    durationMs?: number,
  ): Promise<string> {
    this.logger.debug(`Searching ${artist} - ${name} on YT`);
    const query = `${artist} - ${name}`.trim();
    const candidates = await this.searchYoutubeCandidates(query);
    if (!candidates.length) {
      throw new Error(`No YouTube result found for ${artist} - ${name}`);
    }
    await this.fillCandidateDetails(candidates);

    const filtered = candidates.filter(
      (video) => !this.isRejectedTitleOrDescription(video, name),
    );
    const eligible = filtered.length > 0 ? filtered : candidates;
    const artistMatched = eligible.filter((video) =>
      this.hasArtistMatch(video, artist),
    );
    const artistMatchPool = artistMatched.length > 0 ? artistMatched : eligible;
    const baseCandidates = artistMatchPool;
    const releaseCandidates = baseCandidates.filter((video) =>
      this.isReleaseCandidate(video, artist),
    );
    const durationReleaseCandidates = durationMs
      ? releaseCandidates.filter((video) =>
          this.isDurationMatch(video, durationMs),
        )
      : [];
    const durationCandidates = durationMs
      ? baseCandidates.filter((video) => this.isDurationMatch(video, durationMs))
      : [];

    const selectionPool =
      durationReleaseCandidates.length > 0
        ? durationReleaseCandidates
        : durationCandidates.length > 0
        ? durationCandidates
        : releaseCandidates.length > 0
        ? releaseCandidates
        : baseCandidates;
    const sorted = [...selectionPool].sort(
      (a, b) =>
        this.scoreVideo(b, artist, name, durationMs) -
        this.scoreVideo(a, artist, name, durationMs),
    );
    const pick = sorted[0];
    if (!pick?.url) {
      throw new Error(`No YouTube result found for ${artist} - ${name}`);
    }
    this.logger.debug(`Found ${artist} - ${name} on ${pick.url}`);
    return pick.url;
  }

  private isRejectedTitleOrDescription(
    video: YoutubeCandidate,
    trackName: string,
  ): boolean {
    if (video?.isLive) {
      return true;
    }
    const title = video?.title ?? '';
    const description = video?.description ?? '';
    const combined = `${title} ${description}`;
    const hardReject =
      /(^|\W)(mv|m\/v)(\W|$)|music video|official video|dance practice|performance( video)?|choreography|live|라이브|remix|cover|karaoke|instrumental|sped\s*up|slowed|nightcore|직캠|콘서트|행사/i.test(
        combined,
      );
    if (hardReject) {
      return true;
    }
    const hasVersionLabel =
      /(^|\W)ver\.?(\W|$)|(^|\W)version(\W|$)/i.test(combined);
    if (hasVersionLabel && !this.trackNameHasVersionTerm(trackName)) {
      return true;
    }
    return false;
  }

  private isReleaseCandidate(
    video: YoutubeCandidate,
    artist: string,
  ): boolean {
    const title = String(video?.title ?? '');
    const author = String(video?.channel ?? video?.uploader ?? '');
    const description = String(video?.description ?? '');
    const normalizedAuthor = this.normalizeText(author);
    const normalizedArtist = this.normalizeText(artist);
    const normalizedTitle = this.normalizeText(title);

    if (normalizedAuthor.includes('topic')) {
      return true;
    }
    if (description.toLowerCase().includes('provided to youtube by')) {
      return true;
    }
    if (
      normalizedTitle.includes('official audio') ||
      normalizedTitle.includes('audio')
    ) {
      return (
        normalizedAuthor.includes(normalizedArtist) ||
        normalizedTitle.includes(normalizedArtist)
      );
    }
    return false;
  }

  private scoreVideo(
    video: YoutubeCandidate,
    artist: string,
    name: string,
    durationMs?: number,
  ): number {
    const title = String(video?.title ?? '');
    const author = String(video?.channel ?? video?.uploader ?? '');
    const description = String(video?.description ?? '');
    const normalizedTitle = this.normalizeText(title);
    const normalizedAuthor = this.normalizeText(author);
    const normalizedArtist = this.normalizeText(artist);
    const normalizedName = this.normalizeText(name);

    let score = 0;
    if (
      normalizedTitle.includes(normalizedArtist) &&
      normalizedTitle.includes(normalizedName)
    ) {
      score += 3;
    }
    if (normalizedAuthor.includes('topic')) {
      score += 3;
    }
    if (normalizedAuthor.includes(normalizedArtist)) {
      score += 2;
    }
    if (normalizedTitle.includes('official audio')) {
      score += 2;
    } else if (normalizedTitle.includes('audio')) {
      score += 1;
    }
    if (
      normalizedTitle.includes('dance practice') ||
      normalizedTitle.includes('performance video') ||
      normalizedTitle.includes('choreography')
    ) {
      score -= 3;
    }
    if (description.toLowerCase().includes('provided to youtube by')) {
      score += 2;
    }
    if (this.hasArtistMatch(video, artist)) {
      score += 3;
    } else {
      score -= 2;
    }
    const durationDiffMs = this.getDurationDiffMs(video, durationMs);
    if (durationDiffMs !== undefined) {
      const diffPenalty = Math.min(4, durationDiffMs / 2500);
      score += 4 - diffPenalty;
      if (durationDiffMs <= 10000) {
        score += 2;
      }
    }

    return score;
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private hasArtistMatch(video: YoutubeCandidate, artist: string): boolean {
    const tokens = this.getArtistTokens(artist);
    if (tokens.length === 0) {
      return false;
    }
    const combined = `${video?.title ?? ''} ${video?.description ?? ''} ${
      video?.channel ?? ''
    } ${video?.uploader ?? ''}`.trim();
    if (!combined) {
      return false;
    }
    const normalizedCombined = this.normalizeText(combined);
    return tokens.some((token) =>
      this.matchesToken(combined, normalizedCombined, token),
    );
  }

  private getArtistTokens(artist: string): string[] {
    const raw = artist?.trim();
    if (!raw) {
      return [];
    }
    const tokens = new Set<string>();
    tokens.add(raw);
    const splitTokens = raw
      .split(/,|&| feat\.?| ft\.?| with | x |\/|•|·/gi)
      .map((token) => token.trim())
      .filter(Boolean);
    for (const token of splitTokens) {
      tokens.add(token);
    }
    const hangulMatches = raw.match(/[\uac00-\ud7a3]+/g) ?? [];
    for (const token of hangulMatches) {
      tokens.add(token);
    }
    return [...tokens].filter((token) => token.length > 1);
  }

  private matchesToken(
    combined: string,
    normalizedCombined: string,
    token: string,
  ): boolean {
    if (this.hasHangul(token)) {
      return combined.includes(token);
    }
    const normalizedToken = this.normalizeText(token);
    if (!normalizedToken) {
      return false;
    }
    return normalizedCombined.includes(normalizedToken);
  }

  private hasHangul(value: string): boolean {
    return /[\uac00-\ud7a3]/.test(value);
  }

  private trackNameHasVersionTerm(name: string): boolean {
    if (!name) {
      return false;
    }
    return /(^|\W)ver\.?(\W|$)|(^|\W)version(\W|$)/i.test(name);
  }

  private getDurationDiffMs(
    video: YoutubeCandidate,
    durationMs?: number,
  ): number | undefined {
    if (!durationMs || !video.durationSeconds) {
      return undefined;
    }
    return Math.abs(video.durationSeconds * 1000 - durationMs);
  }

  private isDurationMatch(video: YoutubeCandidate, durationMs: number): boolean {
    const diffMs = this.getDurationDiffMs(video, durationMs);
    if (diffMs === undefined) {
      return false;
    }
    return diffMs <= 10000;
  }

  private async searchYoutubeCandidates(
    query: string,
  ): Promise<YoutubeCandidate[]> {
    const ytdlp = this.getYtDlp();
    const options = {
      flatPlaylist: true,
      ignoreErrors: true,
      socketTimeout: 10,
      quiet: true,
      noWarnings: true,
    } as any;
    let info: any;
    const musicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(
      query,
    )}`;
    try {
      info = await ytdlp.getInfoAsync(musicUrl, options);
    } catch (error) {
      this.logger.debug(
        `YT Music search failed, falling back to ytsearch: ${error.message}`,
      );
    }
    if (!info?.entries?.length) {
      info = await ytdlp.getInfoAsync(`ytsearch10:${query}`, options);
    }
    const entries = Array.isArray(info?.entries) ? info.entries : [];
    return entries
      .map((entry: any) => this.mapEntryToCandidate(entry))
      .filter((candidate): candidate is YoutubeCandidate => Boolean(candidate));
  }

  private mapEntryToCandidate(entry: any): YoutubeCandidate | null {
    if (entry?._type === 'playlist') {
      return null;
    }
    const url = entry?.url || entry?.webpage_url;
    if (!url) {
      return null;
    }
    if (this.isPlaylistUrl(url)) {
      return null;
    }
    return {
      url,
      title: entry?.title,
      description: entry?.description ?? null,
      durationSeconds: Number.isFinite(entry?.duration)
        ? Number(entry.duration)
        : undefined,
      channel: entry?.channel,
      uploader: entry?.uploader,
    };
  }

  private async fillCandidateDetails(
    candidates: YoutubeCandidate[],
  ): Promise<void> {
    const ytdlp = this.getYtDlp();
    const detailTargets = candidates.slice(0, 8);
    await Promise.all(
      detailTargets.map(async (candidate) => {
        if (this.isPlaylistUrl(candidate.url)) {
          return;
        }
        try {
          const detailOptions = {
            flatPlaylist: false,
            ignoreErrors: true,
            socketTimeout: 10,
            quiet: true,
            noWarnings: true,
          } as any;
          const info = (await ytdlp.getInfoAsync(
            candidate.url,
            detailOptions,
          )) as any;
          if (!info) {
            return;
          }
          if (info._type === 'playlist') {
            return;
          }
          candidate.description =
            info.description ?? info.short_description ?? candidate.description;
          candidate.durationSeconds =
            Number.isFinite(info.duration) && info.duration
              ? Number(info.duration)
              : candidate.durationSeconds;
          candidate.channel = info.channel ?? candidate.channel;
          candidate.uploader = info.uploader ?? candidate.uploader;
          candidate.isLive = Boolean(info.is_live || info.was_live);
        } catch (error) {
          this.logger.debug(
            `YT detail fetch failed for ${candidate.url}: ${error.message}`,
          );
        }
      }),
    );
  }

  private getYtDlp(): YtDlp {
    if (this.ytDlp) {
      return this.ytDlp;
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
    this.ytDlp = new YtDlp({
      binaryPath,
      ...(ffmpegPath ? { ffmpegPath } : {}),
    });
    return this.ytDlp;
  }

  private isPlaylistUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) {
      return false;
    }
    if (/youtube\.com\/playlist\?list=/.test(trimmed)) {
      return true;
    }
    if (/music\.youtube\.com\/playlist\?list=/.test(trimmed)) {
      return true;
    }
    if (/\/watch\?v=/.test(trimmed)) {
      return false;
    }
    return /[?&]list=/.test(trimmed);
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
    const ytdlp = this.getYtDlp();
    const cookies = this.configService.get<string>('YT_COOKIES')?.trim();
    await ytdlp.downloadAsync(track.youtubeUrl, {
      format: {
        filter: 'audioonly',
        type: this.configService.get<'m4a'>(EnvironmentEnum.FORMAT),
        quality: 0,
      },
      output,
      forceOverwrites: true,
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
