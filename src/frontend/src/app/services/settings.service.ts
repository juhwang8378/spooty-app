import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettings } from '../models/settings';

const ENDPOINT = '/api/settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly http: HttpClient) {}

  get(): Observable<AppSettings> {
    return this.http.get<AppSettings>(ENDPOINT);
  }

  update(settings: AppSettings): Observable<AppSettings> {
    return this.http.put<AppSettings>(ENDPOINT, settings);
  }
}
