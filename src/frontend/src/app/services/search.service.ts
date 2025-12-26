import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResponse } from '../models/search';

const ENDPOINT = '/api/search';

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private readonly http: HttpClient) {}

  search(query: string, limit = 12): Observable<SearchResponse> {
    const trimmed = query.trim();
    const params = new HttpParams()
      .set('q', trimmed)
      .set('limit', String(limit))
      .set('types', 'track,album');
    return this.http.get<SearchResponse>(ENDPOINT, { params });
  }
}
