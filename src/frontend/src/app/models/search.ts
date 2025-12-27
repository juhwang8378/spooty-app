export type SearchResultType = 'track' | 'album' | 'artist';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  name: string;
  url: string;
  image?: string;
  subtitle?: string;
  previewUrl?: string;
  durationMs?: number;
}

export interface SearchResponse {
  items: SearchResultItem[];
}
