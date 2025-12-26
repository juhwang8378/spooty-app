This folder is used to bundle third-party binaries (yt-dlp, ffmpeg) into the desktop build.

Recommended layout:
- deps/bin/yt-dlp-x64
- deps/bin/yt-dlp-arm64

ffmpeg is bundled via `@ffmpeg-installer/ffmpeg` by default; a local
`deps/bin/ffmpeg` is optional.

Use the build scripts in `scripts/` to download these binaries before packaging.
