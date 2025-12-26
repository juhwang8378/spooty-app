import { Injectable } from '@angular/core';

export type LanguageCode = 'en' | 'ko';

type TranslationMap = {
  appSubtitle: string;
  settingsTitle: string;
  settingsSpotifyClientIdLabel: string;
  settingsSpotifyClientSecretLabel: string;
  settingsSpotifyClientIdPlaceholder: string;
  settingsSpotifyClientSecretPlaceholder: string;
  settingsDownloadsPathLabel: string;
  settingsDownloadsPathPlaceholder: string;
  settingsDownloadsPathHelp: string;
  settingsFormatLabel: string;
  settingsFormatPlaceholder: string;
  settingsYtCookiesLabel: string;
  settingsYtCookiesPlaceholder: string;
  settingsYtDownloadsLabel: string;
  settingsYtDownloadsPlaceholder: string;
  settingsYtdlpPathLabel: string;
  settingsYtdlpPathPlaceholder: string;
  settingsSaveButton: string;
  settingsLoading: string;
  settingsSaved: string;
  settingsLoadError: string;
  settingsSaveError: string;
  settingsToggleVisibility: string;
  downloadTitle: string;
  downloadPlaceholder: string;
  downloadButton: string;
  searchButton: string;
  searchResultsTitle: string;
  searchNoResults: string;
  searchError: string;
  searchTypeTrack: string;
  searchTypeAlbum: string;
  searchTypeArtist: string;
  playlistsTitle: string;
  playlistsRemoveCompletedTitle: string;
  playlistsRemoveFailedTitle: string;
  instructionsTitle: string;
  instructionsUsageTitle: string;
  instructionsSpotifyTitle: string;
  spotifyRedirectNote: string;
  aboutTitle: string;
  usageSteps: string[];
  spotifySteps: string[];
  trackSpotifyPreviewTitle: string;
  trackYoutubePreviewTitle: string;
  trackDownloadTitle: string;
  trackRetryTitle: string;
  trackRemoveTitle: string;
  trackStatusNew: string;
  trackStatusSearching: string;
  trackStatusQueued: string;
  trackStatusDownloading: string;
  trackStatusCompleted: string;
  trackStatusError: string;
  playlistSpotifyLinkTitle: string;
  playlistToggleOnTitle: string;
  playlistToggleOffTitle: string;
  playlistRetryFailedTitle: string;
  playlistRemoveTitle: string;
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'spooty-lang';
  private currentLang: LanguageCode = 'en';

  private readonly translations: Record<LanguageCode, TranslationMap> = {
    en: {
      appSubtitle: 'Self-hosted Spotify downloader',
      settingsTitle: 'Settings',
      settingsSpotifyClientIdLabel: 'Spotify Client ID',
      settingsSpotifyClientSecretLabel: 'Spotify Client Secret',
      settingsSpotifyClientIdPlaceholder: 'your_client_id',
      settingsSpotifyClientSecretPlaceholder: 'your_client_secret',
      settingsDownloadsPathLabel: 'Downloads Path',
      settingsDownloadsPathPlaceholder: '/Users/you/Downloads/Spooty',
      settingsDownloadsPathHelp: 'Use an absolute path for best results.',
      settingsFormatLabel: 'Format',
      settingsFormatPlaceholder: 'mp3',
      settingsYtCookiesLabel: 'YouTube Cookies',
      settingsYtCookiesPlaceholder: 'VISITOR_INFO1_LIVE=...; YSC=...; ...',
      settingsYtDownloadsLabel: 'YouTube Downloads Per Minute',
      settingsYtDownloadsPlaceholder: '3',
      settingsYtdlpPathLabel: 'yt-dlp Binary Path (optional)',
      settingsYtdlpPathPlaceholder: '/usr/local/bin/yt-dlp',
      settingsSaveButton: 'Save Settings',
      settingsLoading: 'Loading settings...',
      settingsSaved: 'Settings saved.',
      settingsLoadError: 'Failed to load settings.',
      settingsSaveError: 'Failed to save settings.',
      settingsToggleVisibility: 'Toggle visibility',
      downloadTitle: 'Search & Download',
      downloadPlaceholder: 'Search tracks, albums, or artists',
      downloadButton: 'Download',
      searchButton: 'Search',
      searchResultsTitle: 'Results',
      searchNoResults: 'No results found.',
      searchError: 'Search failed. Check Spotify credentials in Settings.',
      searchTypeTrack: 'Track',
      searchTypeAlbum: 'Album',
      searchTypeArtist: 'Artist',
      playlistsTitle: 'Downloads',
      playlistsRemoveCompletedTitle: 'Remove completed from list',
      playlistsRemoveFailedTitle: 'Remove failed from list',
      instructionsTitle: 'How to Use',
      instructionsUsageTitle: 'How to use Spooty',
      instructionsSpotifyTitle: 'If downloads do not work',
      spotifyRedirectNote:
        'Note: Only cookies from a logged-in session are valid. If they expire, refresh them and paste again.',
      aboutTitle: 'About',
      usageSteps: [
        'Open the dmg file.',
        'In the popup, drag the Spooty icon into the Applications folder to install.',
        'Run this in Terminal: xattr -dr com.apple.quarantine /Applications/Spooty.app',
        'Confirm the Spooty app launches properly.',
        'Create a free Spotify account (skip if you already have one).',
        'Go to developer.spotify.com/dashboard.',
        'Create a new app on that page.',
        'Enter any app name and description.',
        'In Redirect URI, enter https://127.0.0.1:3000.',
        'After the app is created, click it in the dashboard to open the details page.',
        'Copy the Client ID and paste it into the Spooty app settings.',
        'Go back to the site, click View client secret, copy it, and paste it into the Spooty app settings.',
        'At this step, you do not need to change anything in Settings except those two values and the download path.',
        'If the download format and path look good, save the settings.',
        'Search for a track, album, or artist inside Spooty.',
        'Click Download next to the result you want.',
      ],
      spotifySteps: [
        'Log in to https://www.youtube.com in a browser.',
        'Open developer tools. (Mac: Option + Command + I / Windows: F12)',
        'Go to the Application tab (or Storage tab).',
        'In the left menu, select Cookies -> https://www.youtube.com.',
        'List all cookies in name=value format and join them with ;. Example: VISITOR_INFO1_LIVE=xxx; YSC=xxx; SID=xxx; HSID=xxx; ...',
        'Paste this string into Settings > YouTube Cookies and save.',
      ],
      trackSpotifyPreviewTitle: 'Spotify preview of track that will be downloaded',
      trackYoutubePreviewTitle: 'YouTube searched track that will be downloaded',
      trackDownloadTitle: 'Download the saved file',
      trackRetryTitle: 'Retry download',
      trackRemoveTitle: 'Remove track from list',
      trackStatusNew: 'New',
      trackStatusSearching: 'Searching',
      trackStatusQueued: 'Queued',
      trackStatusDownloading: 'Downloading',
      trackStatusCompleted: 'Completed',
      trackStatusError: 'Error',
      playlistSpotifyLinkTitle: 'Link to Spotify URL to download from',
      playlistToggleOnTitle: '[ON]: Unsubscribe from playlist changes?',
      playlistToggleOffTitle: '[OFF]: Subscribe to playlist changes?',
      playlistRetryFailedTitle: 'Retry download failed tracks',
      playlistRemoveTitle: 'Remove playlist from list',
    },
    ko: {
      appSubtitle: '셀프 호스팅 Spotify 다운로더',
      settingsTitle: '설정',
      settingsSpotifyClientIdLabel: 'Spotify 클라이언트 ID',
      settingsSpotifyClientSecretLabel: 'Spotify 클라이언트 시크릿',
      settingsSpotifyClientIdPlaceholder: 'your_client_id',
      settingsSpotifyClientSecretPlaceholder: 'your_client_secret',
      settingsDownloadsPathLabel: '다운로드 경로',
      settingsDownloadsPathPlaceholder: '/Users/you/Downloads/Spooty',
      settingsDownloadsPathHelp: '가능하면 절대 경로를 사용하세요.',
      settingsFormatLabel: '포맷',
      settingsFormatPlaceholder: 'mp3',
      settingsYtCookiesLabel: 'YouTube 쿠키',
      settingsYtCookiesPlaceholder: 'VISITOR_INFO1_LIVE=...; YSC=...; ...',
      settingsYtDownloadsLabel: '분당 YouTube 다운로드 수',
      settingsYtDownloadsPlaceholder: '3',
      settingsYtdlpPathLabel: 'yt-dlp 바이너리 경로 (선택)',
      settingsYtdlpPathPlaceholder: '/usr/local/bin/yt-dlp',
      settingsSaveButton: '설정 저장',
      settingsLoading: '설정을 불러오는 중...',
      settingsSaved: '설정이 저장되었습니다.',
      settingsLoadError: '설정을 불러오지 못했습니다.',
      settingsSaveError: '설정을 저장하지 못했습니다.',
      settingsToggleVisibility: '표시 전환',
      downloadTitle: '검색 및 다운로드',
      downloadPlaceholder: '곡/앨범/아티스트 검색하기',
      downloadButton: '다운로드',
      searchButton: '검색',
      searchResultsTitle: '검색 결과',
      searchNoResults: '검색 결과가 없습니다.',
      searchError: '검색에 실패했습니다. 설정의 Spotify 키를 확인하세요.',
      searchTypeTrack: '곡',
      searchTypeAlbum: '앨범',
      searchTypeArtist: '아티스트',
      playlistsTitle: '다운로드',
      playlistsRemoveCompletedTitle: '완료된 항목 목록에서 제거',
      playlistsRemoveFailedTitle: '실패한 항목 목록에서 제거',
      instructionsTitle: '사용 방법',
      instructionsUsageTitle: 'Spooty 사용방법',
      instructionsSpotifyTitle: '다운로드가 안될경우',
      spotifyRedirectNote:
        '참고: 로그인 상태에서 얻은 쿠키만 유효합니다. 쿠키가 만료되면 다시 갱신해서 넣어주세요.',
      aboutTitle: '정보',
      usageSteps: [
        'dmg 파일을 엽니다.',
        '팝업창에서 Spooty 아이콘을 어플리케이션 폴더로 드래그해서 설치합니다.',
        '다음 코드를 터미널에서 실행합니다 -> xattr -dr com.apple.quarantine /Applications/Spooty.app',
        'Spooty 앱이 잘 실행되는지 확인합니다.',
        'Spotify 무료 계정을 만듭니다 (있다면 스킵).',
        'developer.spotify.com/dashboard에 접속합니다.',
        '접속한 페이지에서 새 앱을 만듭니다.',
        '앱 이름과 설명은 아무거나 입력합니다.',
        'Redirect URI 부분에 https://127.0.0.1:3000을 입력합니다.',
        '사이트에서 앱이 만들어졌으면 대시보드에서 앱을 클릭해서 정보가 있는 페이지로 이동합니다.',
        'Client ID를 복사해서 Spooty 앱 설정에다가 붙여넣습니다.',
        '다시 사이트로 돌아가서 View client secret을 눌러서 Client secret을 복사하고 Spooty 앱 설정에다가 붙여넣습니다.',
        '이 단계에서는 설정에서 이 둘과 다운로드 경로 외에는 만지지 않아도 됩니다.',
        '다운로드 포맷(여러가지 가능)과 경로가 마음에 들면 설정을 저장합니다.',
        'Spooty 앱에서 곡/앨범/아티스트를 검색합니다.',
        '원하는 결과 옆의 다운로드 버튼을 누릅니다.',
      ],
      spotifySteps: [
        '인터넷 브라우저에서 https://www.youtube.com에 로그인합니다.',
        '개발자 도구를 엽니다. (Mac: Option + Command + I / Windows: F12)',
        'Application 탭(또는 Storage 탭)으로 이동합니다.',
        '왼쪽 메뉴에서 Cookies -> https://www.youtube.com을 선택합니다.',
        '표에 있는 모든 쿠키를 name=value 형태로 나열하고 ; 로 이어 붙입니다. 예: VISITOR_INFO1_LIVE=xxx; YSC=xxx; SID=xxx; HSID=xxx; ...',
        '이 문자열을 앱의 Settings > YouTube Cookies에 붙여넣고 저장합니다.',
      ],
      trackSpotifyPreviewTitle: '다운로드될 트랙의 Spotify 미리보기',
      trackYoutubePreviewTitle: '다운로드될 YouTube 검색 결과',
      trackDownloadTitle: '저장된 파일 다운로드',
      trackRetryTitle: '다운로드 재시도',
      trackRemoveTitle: '목록에서 트랙 제거',
      trackStatusNew: '신규',
      trackStatusSearching: '검색 중',
      trackStatusQueued: '대기 중',
      trackStatusDownloading: '다운로드 중',
      trackStatusCompleted: '완료',
      trackStatusError: '오류',
      playlistSpotifyLinkTitle: '다운로드할 Spotify 링크',
      playlistToggleOnTitle: '[ON]: 플레이리스트 변경 구독 해제?',
      playlistToggleOffTitle: '[OFF]: 플레이리스트 변경 구독?',
      playlistRetryFailedTitle: '실패한 트랙 재시도',
      playlistRemoveTitle: '목록에서 플레이리스트 제거',
    },
  };

  constructor() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'en' || saved === 'ko') {
      this.currentLang = saved;
    }
  }

  get lang(): LanguageCode {
    return this.currentLang;
  }

  setLang(lang: LanguageCode): void {
    this.currentLang = lang;
    localStorage.setItem(this.storageKey, lang);
  }

  t(key: string): string {
    const dictionary = this.translations[this.currentLang] as Record<string, string | string[]>;
    const value = dictionary[key];
    if (typeof value === 'string') {
      return value;
    }
    return key;
  }

  tList(key: 'usageSteps' | 'spotifySteps'): string[] {
    return this.translations[this.currentLang][key];
  }
}
