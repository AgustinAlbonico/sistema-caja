import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const windowsRuntimeRoot = 'C:\\SistemaCajaEstudio';

function ensureDirectory(pathValue: string): void {
  if (!existsSync(pathValue)) {
    mkdirSync(pathValue, { recursive: true });
  }
}

export function getRuntimeRoot(): string {
  if (process.env.SISTEMA_CAJA_RUNTIME_ROOT) {
    return process.env.SISTEMA_CAJA_RUNTIME_ROOT;
  }

  if (process.platform === 'win32') {
    return windowsRuntimeRoot;
  }

  return join(homedir(), '.sistema-caja');
}

export function getCentralConfigFilePath(): string {
  return join(getRuntimeRoot(), 'config', 'config.json');
}

export function getLegacyConfigFilePath(): string {
  const appDataPath = process.env.APPDATA;
  if (!appDataPath) {
    return join(homedir(), 'AppData', 'Roaming', 'sistema-caja', 'config.json');
  }

  return join(appDataPath, 'sistema-caja', 'config.json');
}

export function getPreferredConfigFilePath(): string {
  if (process.env.APP_CONFIG_PATH) {
    return process.env.APP_CONFIG_PATH;
  }

  return getCentralConfigFilePath();
}

export function ensureConfigDirectory(configFilePath: string): void {
  const lastSlash = Math.max(configFilePath.lastIndexOf('/'), configFilePath.lastIndexOf('\\'));
  if (lastSlash <= 0) {
    return;
  }

  const directoryPath = configFilePath.slice(0, lastSlash);
  ensureDirectory(directoryPath);
}

export function getReadableConfigPathCandidates(): string[] {
  const candidates: string[] = [];

  if (process.env.APP_CONFIG_PATH) {
    candidates.push(process.env.APP_CONFIG_PATH);
  }

  const central = getCentralConfigFilePath();
  if (!candidates.includes(central)) {
    candidates.push(central);
  }

  const legacy = getLegacyConfigFilePath();
  if (!candidates.includes(legacy)) {
    candidates.push(legacy);
  }

  return candidates;
}

export function getLogsDirectoryPath(): string {
  if (process.env.APP_LOGS_PATH) {
    ensureDirectory(process.env.APP_LOGS_PATH);
    return process.env.APP_LOGS_PATH;
  }

  const logsPath = join(getRuntimeRoot(), 'logs');
  ensureDirectory(logsPath);
  return logsPath;
}
