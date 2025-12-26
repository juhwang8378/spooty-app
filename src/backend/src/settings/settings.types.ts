export const SETTINGS_KEYS = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'DOWNLOADS_PATH',
  'FORMAT',
  'YT_COOKIES',
  'YT_DOWNLOADS_PER_MINUTE',
  'YTDLP_BINARY_PATH',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type AppSettings = Partial<Record<SettingsKey, string>>;
