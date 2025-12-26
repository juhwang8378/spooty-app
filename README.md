[![npm version](https://img.shields.io/docker/pulls/raiper34/spooty)](https://hub.docker.com/r/raiper34/spooty)
[![npm version](https://img.shields.io/docker/image-size/raiper34/spooty)](https://hub.docker.com/r/raiper34/spooty)
![Docker Image Version](https://img.shields.io/docker/v/raiper34/spooty)
[![npm version](https://img.shields.io/docker/stars/raiper34/spooty)](https://hub.docker.com/r/raiper34/spooty)
[![GitHub License](https://img.shields.io/github/license/raiper34/spooty)](https://github.com/Raiper34/spooty)
[![GitHub Repo stars](https://img.shields.io/github/stars/raiper34/spooty)](https://github.com/Raiper34/spooty)

![spooty logo](assets/logo.svg)
# Spooty - self-hosted Spotify downloader
Spooty is a self-hosted Spotify downloader.
It lets you search Spotify inside the app and download tracks, albums, or artists.
It can also subscribe to playlists and download new songs upon release.
Spooty does not download audio from Spotify; it only uses Spotify for metadata and then finds and downloads matching music on YouTube.
The project is based on NestJS and Angular.

> [!IMPORTANT]
> Please do not use this tool for piracy! Download only music you own rights! Use this tool only on your responsibility.

### Content
- [🚀 Installation](#-installation)
  - [Spotify App Configuration](#spotify-app-configuration)
  - [Docker](#docker)
    - [Docker command](#docker-command)
    - [Docker compose](#docker-compose)
  - [Build from source](#build-from-source)
    - [Requirements](#requirements)
    - [Process](#process)
  - [Desktop app (macOS DMG)](#desktop-app-macos-dmg)
    - [Build steps](#build-steps)
    - [Settings](#settings)
    - [Usage (desktop app)](#usage-desktop-app)
    - [macOS 데스크톱 앱 안내 (한국어)](#macos-데스크톱-앱-안내-한국어)
  - [Environment variables](#environment-variables)
  - [How to get your YouTube cookies (using browser dev tools)](#how-to-get-your-youtube-cookies-using-browser-dev-tools)
- [⚖️ License](#-license)

## 🚀 Installation
Recommended and the easiest way to start using Spooty is via Docker.

### Spotify App Configuration

To fully use Spooty, you need to create an application in the Spotify Developer Dashboard:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Sign in with your Spotify account
3. Create a new application
4. Note your `Client ID` and `Client Secret`
5. Add a redirect URI in the Spotify app settings (required by Spotify, not used by Spooty):
   - Local server example: `http://localhost:3000`
   - Desktop app example: `https://127.0.0.1:3000`

These credentials will be used by Spooty to access the Spotify API.

### Docker

Just run docker command or use docker compose configuration.
For detailed configuration, see available [environment variables](#environment-variables).

#### Docker command
```shell
docker run -d -p 3000:3000 \
  -v /path/to/downloads:/spooty/backend/downloads \
  -e SPOTIFY_CLIENT_ID=your_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret \
  raiper34/spooty:latest
```

#### Docker compose
```yaml
services:
  spooty:
    image: raiper34/spooty:latest
    container_name: spooty
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/downloads:/spooty/backend/downloads
    environment:
      - SPOTIFY_CLIENT_ID=your_client_id
      - SPOTIFY_CLIENT_SECRET=your_client_secret
      # Configure other environment variables if needed
```

### Build from source

Spooty can also be built from source.

#### Requirements
- Node v18.19.1 (it is recommended to use `nvm` node version manager to install proper version of node)
- Ffmpeg
- Python3
Tip: use `nvm` (or your preferred Node version manager) to match `.nvmrc`. Local Node bundles such as `.node` or `.tools` are for personal use and should not be committed.

#### Process
- install Node v18.19.1 using `nvm install` and use that node version `nvm use`
- from project root install all dependencies using `npm install`
- copy `.env.default` as `.env` in `src/backend` folder and modify desired environment properties (see [environment variables](#environment-variables))
- add your Spotify application credentials to the `.env` file:
  ```
  SPOTIFY_CLIENT_ID=your_client_id
  SPOTIFY_CLIENT_SECRET=your_client_secret
  ```
- build source files `npm run build`
    - built project will be stored in `dist` folder
- start server `npm run start`

### Desktop app (macOS DMG)

This project can be packaged as a signed macOS app with an embedded UI.

#### Build steps
1. Install dependencies: `npm install`
2. Download bundled `yt-dlp` binaries: `npm run deps:download`
3. Build backend + frontend: `npm run build`
4. Create the DMG: `npm run build:desktop`

The DMG is generated under `src/desktop/dist`.

#### Settings
The desktop app exposes a Settings panel where users enter Spotify credentials and other configuration values.
Settings are stored per-user; no `.env` files are included in the packaged app.

#### Usage (desktop app)
1. Open Settings and enter your Spotify Client ID and Client Secret.
2. Save Settings.
3. Use the Search box to find a track, album, or artist.
4. Click Download next to the result you want.

#### macOS 데스크톱 앱 안내 (한국어)
1. **1단계: 설치 및 실행 권한 부여**
   - 설치: 다운로드한 `.dmg` 파일을 열고 Spooty 아이콘을 Applications(응용 프로그램) 폴더로 드래그합니다.
   - 권한 해제: 터미널(Terminal)을 열고 아래 코드를 복사해서 실행합니다. (Mac 보안 경고 해결용)
     ```bash
     xattr -dr com.apple.quarantine /Applications/Spooty.app
     ```
   - 실행: Spooty 앱을 실행하여 정상 작동하는지 확인합니다.
2. **2단계: Spotify API 연동 (최초 1회)**
   - Spotify Developer Dashboard에 접속하여 로그인합니다.
   - Create App을 클릭하여 새 앱을 만듭니다. (이름/설명은 자유)
   - Redirect URI 항목에 `https://127.0.0.1:3000`을 입력하고 저장합니다.
   - 만들어진 앱의 Settings에서 다음 정보를 복사해 Spooty 앱 설정에 붙여넣습니다.
     - Client ID 복사 ➜ 앱 설정에 붙여넣기
     - View client secret 클릭 후 복사 ➜ 앱 설정에 붙여넣기
   - 원하는 다운로드 경로 및 포맷을 선택한 후 설정을 저장합니다.
3. **3단계: 곡 다운로드 방법**
   - Spooty 앱에서 곡/앨범/아티스트를 검색합니다.
   - 원하는 결과 옆의 다운로드 버튼을 누릅니다.

##### 🛠 다운로드 오류 시 해결 방법 (YouTube 쿠키 설정)
다운로드가 진행되지 않는다면 YouTube 권한 문제일 수 있습니다.
1. 브라우저에서 YouTube 로그인 후 개발자 도구(Option + Command + I)를 켭니다.
2. Application 탭 > Cookies > `youtube.com`을 선택합니다.
3. 목록에 있는 모든 쿠키를 `이름=값;` 형식으로 이어 붙여 복사합니다.
   - 예: `VISITOR_INFO1_LIVE=abc; YSC=def; SID=ghi...`
4. 이 문자열을 앱의 Settings > YouTube Cookies에 붙여넣고 저장하세요.

참고: 쿠키가 만료되면 이 과정을 다시 반복해야 합니다.

### Environment variables

Some behaviour and settings of Spooty can be configured using environment variables and `.env` file. In the desktop app, these values are managed in-app via the Settings panel and stored per-user.

 Name                 | Default                                     | Description                                                                                                                                                      |
----------------------|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
 DB_PATH              | `./config/db.sqlite` (relative to backend)  | Path where Spooty database will be stored                                                                                                                        |
 FE_PATH              | `../frontend/browser` (relative to backend) | Path to frontend part of application                                                                                                                             |
 DOWNLOADS_PATH       | `./downloads` (relative to backend)         | Path where downloaded files will be stored                                                                                                                       |
 FORMAT               | `mp3`                                       | Format of downloaded files (currently fully supported only `mp3` but you can try whatever you want from [ffmpeg](https://ffmpeg.org/ffmpeg-formats.html#Muxers)) |
 PORT                 | 3000                                        | Port of Spooty server                                                                                                                                            |
 SPOTIFY_CLIENT_ID    | your_client_id                              | Client ID of your Spotify application (required)                                                                                                                  |
 SPOTIFY_CLIENT_SECRET | your_client_secret                          | Client Secret of your Spotify application (required)                                                                                                              |
 YT_DOWNLOADS_PER_MINUTE | 3                                           | Set the maximum number of YouTube downloads started per minute                                                                                                  |
 YT_COOKIES           |                                             | Allows you to pass your YouTube cookies to bypass some download restrictions. See [below](#how-to-get-your-youtube-cookies-using-browser-dev-tools) for instructions. |
 YTDLP_BINARY_PATH    |                                             | Optional absolute path to `yt-dlp` binary (use this when `yt-dlp` is not on PATH)                                                                                 |
 FFMPEG_PATH          |                                             | Optional absolute path to `ffmpeg` binary (overrides the bundled installer)                                                                                      |

### How to get your YouTube cookies (using browser dev tools):
1. Go to https://www.youtube.com and log in if needed.
2. Open the browser developer tools (F12 or right click > Inspect).
3. Go to the "Application" tab (in Chrome) or "Storage" (in Firefox).
4. In the left menu, find "Cookies" and select https://www.youtube.com.
5. Copy all the cookies (name=value) and join them with a semicolon and a space, like:
   VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; SID=xxxx; ...
6. Paste this string into the YT_COOKIES environment variable (in your .env or Docker config).

# ⚖️ License
[MIT](https://choosealicense.com/licenses/mit/)
