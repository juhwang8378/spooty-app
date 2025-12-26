import { Controller, Get, Query } from '@nestjs/common';
import {
  SpotifyApiService,
  SpotifySearchResponse,
  SpotifySearchType,
} from '../shared/spotify-api.service';

@Controller('search')
export class SearchController {
  constructor(private readonly spotifyApiService: SpotifyApiService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ): Promise<SpotifySearchResponse> {
    const typeList = (types || '')
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter(Boolean) as SpotifySearchType[];
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.spotifyApiService.search(query || '', typeList, parsedLimit);
  }
}
