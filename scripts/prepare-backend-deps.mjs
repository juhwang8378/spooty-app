import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rebuild } from '@electron/rebuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distBackendDir = path.join(rootDir, 'dist', 'backend');
const outputNodeModulesDir = path.join(distBackendDir, 'node_modules');
const backendPackageJsonPath = path.join(rootDir, 'src', 'backend', 'package.json');
const desktopPackageJsonPath = path.join(rootDir, 'src', 'desktop', 'package.json');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDependencyPaths() {
  const raw = execSync(
    'npm ls --omit=dev -w backend --parseable --all',
    {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    },
  );
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function copyModulePath(modulePath) {
  const marker = `${path.sep}node_modules${path.sep}`;
  const idx = modulePath.indexOf(marker);
  if (idx === -1) {
    return;
  }
  const relative = modulePath.slice(idx + marker.length);
  if (!relative || relative === 'backend') {
    return;
  }
  const dest = path.join(outputNodeModulesDir, relative);
  if (fs.existsSync(dest)) {
    return;
  }
  ensureDir(path.dirname(dest));
  fs.cpSync(modulePath, dest, { recursive: true, dereference: true });
}

async function main() {
  if (!fs.existsSync(distBackendDir)) {
    throw new Error('dist/backend is missing. Run npm run build first.');
  }
  if (fs.existsSync(backendPackageJsonPath)) {
    fs.copyFileSync(
      backendPackageJsonPath,
      path.join(distBackendDir, 'package.json'),
    );
  }
  ensureDir(outputNodeModulesDir);
  const paths = getDependencyPaths();
  for (const depPath of paths) {
    if (depPath.includes(`${path.sep}node_modules${path.sep}backend`)) {
      continue;
    }
    if (!fs.existsSync(depPath)) {
      continue;
    }
    copyModulePath(depPath);
  }
  const desktopPackage = JSON.parse(
    fs.readFileSync(desktopPackageJsonPath, 'utf8'),
  );
  const electronVersion = String(
    desktopPackage?.devDependencies?.electron || '31.2.0',
  ).replace(/^[^0-9]*/, '');
  await rebuild({
    buildPath: distBackendDir,
    electronVersion,
    arch: process.arch,
    force: true,
    onlyModules: ['sqlite3'],
  });
  console.log('Rebuilt native backend dependencies for Electron.');
  console.log('Prepared backend production node_modules in dist/backend.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
