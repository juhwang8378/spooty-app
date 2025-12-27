import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {CommonModule, NgFor} from "@angular/common";
import {PlaylistService, PlaylistStatusEnum} from "./services/playlist.service";
import {PlaylistBoxComponent} from "./components/playlist-box/playlist-box.component";
import {VersionService} from "./services/version.service";
import {SettingsService} from "./services/settings.service";
import {AppSettings} from "./models/settings";
import {I18nService, LanguageCode} from "./services/i18n.service";
import { SearchResultItem } from './models/search';
import { SearchService } from './services/search.service';

@Component({
    selector: 'app-root',
    imports: [CommonModule, FormsModule, NgFor, PlaylistBoxComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
})
export class AppComponent {

  searchQuery = '';
  trackResults: SearchResultItem[] = [];
  albumResults: SearchResultItem[] = [];
  searchLoading = false;
  searchErrorKey = '';
  searchPerformed = false;
  activePreviewKey: string | null = null;
  private readonly previewAudio = new Audio();
  playlists$ = this.playlistService.all$;
  version = this.versionService.getVersion();
  settingsOpen = false;
  instructionsOpen = false;
  aboutOpen = false;
  settingsLoading = false;
  settingsSaving = false;
  settingsMessageKey = '';
  settingsErrorKey = '';
  showSecrets = false;
  showCookies = false;
  settings: AppSettings = {};

  constructor(
    private readonly playlistService: PlaylistService,
    private readonly versionService: VersionService,
    private readonly settingsService: SettingsService,
    private readonly searchService: SearchService,
    public readonly i18n: I18nService,
  ) {
    this.fetchPlaylists();
    this.loadSettings();
    this.previewAudio.addEventListener('ended', () => this.stopPreview());
    this.previewAudio.addEventListener('error', () => this.stopPreview());
  }

  fetchPlaylists(): void {
    this.playlistService.fetch();
  }

  search(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.trackResults = [];
      this.albumResults = [];
      this.searchPerformed = false;
      this.stopPreview();
      return;
    }
    this.searchLoading = true;
    this.searchErrorKey = '';
    this.searchService.search(query).subscribe({
      next: (response) => {
        const items = response?.items ?? [];
        this.trackResults = items.filter((item) => item.type === 'track');
        this.albumResults = items.filter((item) => item.type === 'album');
        this.stopPreview();
        this.searchLoading = false;
        this.searchPerformed = true;
      },
      error: () => {
        this.trackResults = [];
        this.albumResults = [];
        this.stopPreview();
        this.searchErrorKey = 'searchError';
        this.searchLoading = false;
        this.searchPerformed = true;
      },
    });
  }

  downloadFromSearch(item: SearchResultItem): void {
    if (item?.url) {
      this.playlistService.create(item.url);
    }
  }

  togglePreview(item: SearchResultItem): void {
    const previewUrl = item?.previewUrl?.trim();
    if (!previewUrl) {
      return;
    }
    const previewKey = this.getPreviewKey(item);
    if (this.activePreviewKey === previewKey) {
      if (this.previewAudio.paused) {
        this.previewAudio.play().catch(() => this.stopPreview());
      } else {
        this.previewAudio.pause();
      }
      return;
    }
    this.previewAudio.pause();
    this.previewAudio.currentTime = 0;
    this.previewAudio.src = previewUrl;
    this.activePreviewKey = previewKey;
    this.previewAudio.play().catch(() => this.stopPreview());
  }

  isPreviewPlaying(item: SearchResultItem): boolean {
    return (
      this.activePreviewKey === this.getPreviewKey(item) &&
      !this.previewAudio.paused
    );
  }

  hasPreview(item: SearchResultItem): boolean {
    return Boolean(item?.previewUrl?.trim());
  }

  previewTitle(item: SearchResultItem): string {
    if (!this.hasPreview(item)) {
      return this.i18n.t('previewUnavailableTitle');
    }
    return this.isPreviewPlaying(item)
      ? this.i18n.t('previewPauseTitle')
      : this.i18n.t('previewPlayTitle');
  }

  deleteCompleted(): void {
    this.playlistService.deleteAllByStatus(PlaylistStatusEnum.Completed);
  }

  deleteFailed(): void {
    this.playlistService.deleteAllByStatus(PlaylistStatusEnum.Error);
  }

  toggleSettings(): void {
    this.settingsOpen = !this.settingsOpen;
    this.settingsMessageKey = '';
    this.settingsErrorKey = '';
  }

  toggleInstructions(): void {
    this.instructionsOpen = !this.instructionsOpen;
  }

  toggleAbout(): void {
    this.aboutOpen = !this.aboutOpen;
  }

  loadSettings(): void {
    this.settingsLoading = true;
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.settings = settings || {};
        this.settingsLoading = false;
      },
      error: () => {
        this.settingsErrorKey = 'settingsLoadError';
        this.settingsLoading = false;
      },
    });
  }

  saveSettings(): void {
    this.settingsSaving = true;
    this.settingsMessageKey = '';
    this.settingsErrorKey = '';
    this.settingsService.update(this.settings).subscribe({
      next: (settings) => {
        this.settings = settings || {};
        this.settingsMessageKey = 'settingsSaved';
        this.settingsSaving = false;
      },
      error: () => {
        this.settingsErrorKey = 'settingsSaveError';
        this.settingsSaving = false;
      },
    });
  }

  setLanguage(lang: LanguageCode): void {
    this.i18n.setLang(lang);
    this.settingsMessageKey = '';
    this.settingsErrorKey = '';
  }

  private stopPreview(): void {
    this.previewAudio.pause();
    this.previewAudio.currentTime = 0;
    this.previewAudio.removeAttribute('src');
    this.activePreviewKey = null;
  }

  private getPreviewKey(item: SearchResultItem): string {
    return `${item.type}:${item.id}`;
  }
}
