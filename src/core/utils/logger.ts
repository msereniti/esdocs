import { getConfiguration, getRootConfiguration } from '../configuration/configuration';

type Levels = 'error' | 'warn' | 'info' | 'debug' | 'verbose';
const levels: Levels[] = ['error', 'warn', 'info', 'debug', 'verbose'];

const log = (level: 'error' | 'warn' | 'info' | 'debug' | 'verbose', message: string, path?: string) => {
  const levelIndex = levels.indexOf(level);
  let allowedLogLevelIndex = levels.indexOf('warn');
  try {
    const config = path ? getConfiguration(path) : getRootConfiguration();
    allowedLogLevelIndex = levels.indexOf(config.logLevel);
  } catch {
    /* */
  }
  if (allowedLogLevelIndex < levelIndex) return;

  const fullMessage = `[${new Date().toISOString()}, ${level}] ${message} (${path})`;

  if (level in console) {
    // eslint-disable-next-line no-console
    console[level as 'error' | 'warn' | 'info' | 'debug'](fullMessage);
  }
  // eslint-disable-next-line no-console
  console.log(fullMessage);
};

export const logger = {
  error: (message: string, path?: string) => log('error', message, path),
  warn: (message: string, path?: string) => log('warn', message, path),
  info: (message: string, path?: string) => log('info', message, path),
  debug: (message: string, path?: string) => log('debug', message, path),
  verbose: (message: string, path?: string) => log('verbose', message, path),
};
