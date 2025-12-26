import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'deps', 'bin');

const downloads = [
  {
    urls: [
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    ],
    dest: path.join(binDir, 'yt-dlp-x64'),
  },
  {
    urls: [
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos_arm64',
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    ],
    dest: path.join(binDir, 'yt-dlp-arm64'),
  },
  {
    urls: [
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    ],
    dest: path.join(binDir, 'yt-dlp-x64.exe'),
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url} (${res.statusCode})`));
        res.resume();
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(binDir, { recursive: true });
  for (const item of downloads) {
    let downloaded = false;
    for (const url of item.urls) {
      try {
        console.log(`Downloading ${url} -> ${item.dest}`);
        await downloadFile(url, item.dest);
        downloaded = true;
        break;
      } catch (error) {
        const message = String(error?.message || error);
        if (!message.includes('(404)')) {
          throw error;
        }
        console.warn(`Skipped missing asset: ${url}`);
      }
    }
    if (!downloaded) {
      throw new Error(`Failed to download yt-dlp for ${item.dest}`);
    }
    fs.chmodSync(item.dest, 0o755);
  }
  console.log('Dependency download complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
