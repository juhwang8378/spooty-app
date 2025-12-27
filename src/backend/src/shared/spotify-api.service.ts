import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('isomorphic-unfetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDetails } = require('spotify-url-info')(fetch);

export type SpotifySearchType = 'track' | 'album' | 'artist';

export interface SpotifySearchItem {
  type: SpotifySearchType;
  id: string;
  name: string;
  url: string;
  image?: string;
  subtitle?: string;
  previewUrl?: string;
  durationMs?: number;
}

export interface SpotifySearchResponse {
  items: SpotifySearchItem[];
}

@Injectable()
export class SpotifyApiService {
  private readonly logger = new Logger(SpotifyApiService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {}

  private getPlaylistId(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const playlistIndex = pathParts.findIndex((part) => part === 'playlist');
      if (playlistIndex >= 0 && pathParts.length > playlistIndex + 1) {
        return pathParts[playlistIndex + 1].split('?')[0];
      }
      throw new Error('Invalid Spotify playlist URL');
    } catch (error) {
      this.logger.error(`Failed to extract playlist ID: ${error.message}`);
      throw error;
    }
  }

  async getPlaylistMetadata(
    spotifyUrl: string,
  ): Promise<{ name: string; image: string }> {
    try {
      this.logger.debug(`Getting playlist metadata for ${spotifyUrl}`);
      const detail = await this.getDetailsWithLocale(spotifyUrl);

      return {
        name: detail.preview.title,
        image: detail.preview.image,
      };
    } catch (error) {
      this.logger.error(`Failed to get playlist metadata: ${error.message}`);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      this.logger.debug('Getting new Spotify access token');

      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          'Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Settings or environment variables',
        );
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get access token: ${errorData}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

      this.logger.debug('Successfully obtained Spotify access token');
      return this.accessToken;
    } catch (error) {
      this.logger.error(`Error getting Spotify access token: ${error.message}`);
      throw error;
    }
  }

  private async fillTrackPreviewUrls(
    trackItems: SpotifySearchItem[],
    accessToken: string,
  ): Promise<void> {
    const missing = trackItems.filter((item) => !item.previewUrl && item.id);
    if (missing.length === 0) {
      return;
    }

    const market = this.getMarketParam();
    const previewMap = new Map<string, string>();
    const chunkSize = 50;

    for (let i = 0; i < missing.length; i += chunkSize) {
      const ids = missing.slice(i, i + chunkSize).map((item) => item.id);
      const tracksUrl = new URL('https://api.spotify.com/v1/tracks');
      tracksUrl.searchParams.set('ids', ids.join(','));
      if (market) {
        tracksUrl.searchParams.set('market', market);
      }

      try {
        const response = await fetch(tracksUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.debug(
            `Spotify track preview error: ${response.status} ${errorText}`,
          );
          continue;
        }

        const data = await response.json();
        for (const track of data?.tracks ?? []) {
          if (track?.id && track.preview_url) {
            previewMap.set(track.id, track.preview_url);
          }
        }
      } catch (error) {
        this.logger.debug(
          `Spotify track preview fetch failed: ${error.message}`,
        );
      }
    }

    for (const item of missing) {
      const previewUrl = previewMap.get(item.id);
      if (previewUrl) {
        item.previewUrl = previewUrl;
      }
    }
  }

  private async fillTrackPreviewUrlsFromDetails(
    trackItems: SpotifySearchItem[],
  ): Promise<void> {
    const missing = trackItems.filter((item) => !item.previewUrl && item.url);
    if (missing.length === 0) {
      return;
    }

    await Promise.all(
      missing.map(async (item) => {
        try {
          const detail = await this.getDetailsWithLocale(item.url);
          const previewUrl =
            detail?.tracks?.[0]?.previewUrl || detail?.preview?.audio;
          if (previewUrl) {
            item.previewUrl = previewUrl;
          }
        } catch (error) {
          this.logger.debug(
            `Spotify preview details failed for ${item.url}: ${error.message}`,
          );
        }
      }),
    );
  }
  private getMarketParam(): string | undefined {
    const raw = process.env.SPOTIFY_MARKET;
    const trimmed = raw?.trim();
    return trimmed || 'US';
  }

  async search(
    query: string,
    types: SpotifySearchType[] = ['track', 'album', 'artist'],
    limit?: number,
  ): Promise<SpotifySearchResponse> {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      return { items: [] };
    }

    const allowedTypes: SpotifySearchType[] = ['track', 'album', 'artist'];
    const normalizedTypes = (types || [])
      .map((type) => type.toLowerCase())
      .filter((type): type is SpotifySearchType =>
        allowedTypes.includes(type as SpotifySearchType),
      );
    const effectiveTypes =
      normalizedTypes.length > 0 ? normalizedTypes : allowedTypes;
    const normalizedLimit = limit ?? Number.NaN;
    const effectiveLimit = Number.isFinite(normalizedLimit)
      ? Math.min(Math.max(normalizedLimit, 1), 50)
      : 10;

    try {
      const accessToken = await this.getAccessToken();
      const searchUrl = new URL('https://api.spotify.com/v1/search');
      searchUrl.searchParams.set('q', trimmedQuery);
      searchUrl.searchParams.set('type', effectiveTypes.join(','));
      searchUrl.searchParams.set('limit', String(effectiveLimit));
      const market = this.getMarketParam();
      if (market) {
        searchUrl.searchParams.set('market', market);
      }

      const response = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Spotify search error: ${response.status} ${errorText}`,
        );
        throw new Error(`Failed to search Spotify: ${response.status}`);
      }

      const data = await response.json();
      const items: SpotifySearchItem[] = [];
      const trackItems: SpotifySearchItem[] = [];
      const albumItems: SpotifySearchItem[] = [];

      const pickImage = (images: Array<{ url: string }> | undefined) =>
        images?.[1]?.url || images?.[0]?.url || images?.[2]?.url;
      const formatArtists = (artists: Array<{ name: string }> | undefined) =>
        artists?.map((artist) => artist.name).filter(Boolean).join(', ');

      for (const track of data?.tracks?.items ?? []) {
        const artists = formatArtists(track.artists);
        const albumName = track.album?.name;
        const subtitle = [artists, albumName].filter(Boolean).join(' • ');
        const url = track.external_urls?.spotify;
        if (!url) {
          continue;
        }
        trackItems.push({
          type: 'track',
          id: track.id,
          name: track.name,
          url,
          image: pickImage(track.album?.images),
          subtitle: subtitle || undefined,
          previewUrl: track.preview_url || undefined,
          durationMs: this.normalizeDuration(track.duration_ms),
        });
      }

      await this.fillTrackPreviewUrls(trackItems, accessToken);
      await this.fillTrackPreviewUrlsFromDetails(trackItems);
      items.push(...trackItems);

      for (const album of data?.albums?.items ?? []) {
        const artists = formatArtists(album.artists);
        const url = album.external_urls?.spotify;
        if (!url) {
          continue;
        }
        albumItems.push({
          type: 'album',
          id: album.id,
          name: album.name,
          url,
          image: pickImage(album.images),
          subtitle: artists || undefined,
        });
      }

      await this.applyLocalizedSearchMetadata(trackItems, albumItems);
      items.push(...albumItems);

      for (const artist of data?.artists?.items ?? []) {
        const url = artist.external_urls?.spotify;
        if (!url) {
          continue;
        }
        items.push({
          type: 'artist',
          id: artist.id,
          name: artist.name,
          url,
          image: pickImage(artist.images),
        });
      }

      return { items };
    } catch (error) {
      this.logger.error(`Spotify search failed: ${error.message}`);
      throw error;
    }
  }

  async getAllPlaylistTracks(spotifyUrl: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting all tracks for playlist ${spotifyUrl}`);

      const detail = await this.getDetailsWithLocale(spotifyUrl);
      const normalizedDetailTracks = (detail.tracks ?? [])
        .map((track: { artist: string; name: string; previewUrl?: string; duration?: number }) => {
          if (!track?.artist || !track?.name) {
            return null;
          }
          return {
            artist: track.artist,
            name: track.name,
            previewUrl: track.previewUrl,
            durationMs: this.normalizeDuration(track.duration),
          };
        })
        .filter(Boolean);
      this.logger.debug(
        `Initial tracks count from spotify-url-info: ${detail.tracks?.length || 0}`,
      );

      if (!detail.tracks || detail.tracks.length < 100) {
        return normalizedDetailTracks;
      }

      this.logger.debug(
        'Playlist has 100 or more tracks, using official Spotify API for pagination',
      );

      const playlistId = this.getPlaylistId(spotifyUrl);
      this.logger.debug(`Extracted playlist ID: ${playlistId}`);

      try {
        const accessToken = await this.getAccessToken();

        const allTracks = [...detail.tracks];
        let offset = 0;
        let hasMoreTracks = true;

        allTracks.length = 0;

        while (hasMoreTracks) {
          this.logger.debug(
            `Fetching tracks from Spotify API with offset ${offset}`,
          );

          const playlistUrl = new URL(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          );
          playlistUrl.searchParams.set('offset', String(offset));
          playlistUrl.searchParams.set('limit', '100');
          playlistUrl.searchParams.set(
            'fields',
            'items(track(name,artists,preview_url,duration_ms)),next',
          );
          const response = await fetch(playlistUrl.toString(), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(
              `Spotify API error: ${response.status} ${errorText}`,
            );
            throw new Error(`Failed to fetch tracks: ${response.status}`);
          }

          const data = await response.json();

          if (!data.items || data.items.length === 0) {
            this.logger.debug('No more tracks to fetch from Spotify API');
            hasMoreTracks = false;
            continue;
          }

          const pageTracks = data.items
            .map(
              (item: {
                track: {
                  name: string;
                  artists: Array<{ name: string }>;
                  preview_url?: string;
                  duration_ms?: number;
                };
              }) => {
                if (!item.track) return null;

                return {
                  name: item.track.name,
                  artist: item.track.artists.map((a) => a.name).join(', '),
                  previewUrl: item.track.preview_url,
                  durationMs: this.normalizeDuration(item.track.duration_ms),
                };
              },
            )
            .filter((track) => track !== null);

          this.logger.debug(
            `Retrieved ${pageTracks.length} tracks from Spotify API at offset ${offset}`,
          );

          if (pageTracks.length > 0) {
            allTracks.push(...pageTracks);
          }

          if (pageTracks.length < 100) {
            hasMoreTracks = false;
          } else {
            offset += 100;
          }
        }

        this.logger.debug(
          `Total tracks retrieved from Spotify API: ${allTracks.length}`,
        );
        return allTracks;
      } catch (apiError) {
        this.logger.error(
          `Failed to get tracks from Spotify API: ${apiError.message}`,
        );
        this.logger.debug('Falling back to initial tracks only');
        return normalizedDetailTracks;
      }
    } catch (error) {
      this.logger.error(`Failed to get all playlist tracks: ${error.message}`);
      throw error;
    }
  }

  private async getDetailsWithLocale(spotifyUrl: string): Promise<any> {
    const locale = this.getSpotifyLocale();
    if (!locale) {
      return getDetails(spotifyUrl);
    }
    try {
      return await getDetails(spotifyUrl, {
        headers: {
          'Accept-Language': locale,
        },
      });
    } catch (error) {
      this.logger.debug(
        `Spotify localized details failed, falling back: ${error.message}`,
      );
      return getDetails(spotifyUrl);
    }
  }

  private getSpotifyLocale(): string | undefined {
    const raw = process.env.SPOTIFY_LOCALE;
    const trimmed = raw?.trim();
    return trimmed || 'ko';
  }

  private hasHangul(value?: string): boolean {
    if (!value) {
      return false;
    }
    return /[\uac00-\ud7a3]/.test(value);
  }

  private async applyLocalizedSearchMetadata(
    trackItems: SpotifySearchItem[],
    albumItems: SpotifySearchItem[],
  ): Promise<void> {
    const locale = this.getSpotifyLocale();
    if (!locale) {
      return;
    }
    const candidates = [...trackItems, ...albumItems];
    await Promise.all(
      candidates.map(async (item) => {
        if (!item.url) {
          return;
        }
        try {
          const detail = await this.getDetailsWithLocale(item.url);
          if (item.type === 'track') {
            const localizedTrack = detail?.tracks?.[0];
            const localizedName =
              localizedTrack?.name || detail?.preview?.track;
            const localizedArtist =
              localizedTrack?.artist || detail?.preview?.artist;
            if (this.hasHangul(localizedName)) {
              item.name = localizedName;
            }
            if (this.hasHangul(localizedArtist)) {
              item.subtitle = this.mergeSubtitleArtist(
                item.subtitle,
                localizedArtist,
              );
            }
            return;
          }
          if (item.type === 'album') {
            const localizedTitle = detail?.preview?.title;
            const localizedArtist = detail?.preview?.artist;
            if (this.hasHangul(localizedTitle)) {
              item.name = localizedTitle;
            }
            if (this.hasHangul(localizedArtist)) {
              item.subtitle = localizedArtist;
            }
          }
        } catch (error) {
          this.logger.debug(
            `Spotify localized metadata failed: ${error.message}`,
          );
        }
      }),
    );
  }

  private mergeSubtitleArtist(
    subtitle: string | undefined,
    localizedArtist: string,
  ): string {
    if (!subtitle) {
      return localizedArtist;
    }
    const parts = subtitle.split(' • ');
    if (parts.length <= 1) {
      return localizedArtist;
    }
    return [localizedArtist, ...parts.slice(1)].join(' • ');
  }

  private normalizeDuration(duration?: number): number | undefined {
    if (!Number.isFinite(duration)) {
      return undefined;
    }
    if (!duration) {
      return undefined;
    }
    return duration < 1000 ? Math.round(duration * 1000) : Math.round(duration);
  }
}
