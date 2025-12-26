import { isAbsolute, resolve } from 'path';

export function resolveFromBase(
  configuredPath: string | undefined,
  baseDir: string,
): string {
  if (!configuredPath) {
    return baseDir;
  }
  return isAbsolute(configuredPath) ? configuredPath : resolve(baseDir, configuredPath);
}
