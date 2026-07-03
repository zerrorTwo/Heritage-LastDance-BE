import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

let cachedConfig: Record<string, any> | null = null;

const isSecretEnvKey = (key: string): boolean =>
  key === 'DATABASE_URL' || /(^|_)(SECRET|PASSWORD|PASS|TOKEN|KEY)(_|$)/.test(key);

const parseEnvFile = (pathToLoad: string): Record<string, string> => {
  if (!existsSync(pathToLoad)) return {};

  return readFileSync(pathToLoad, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((parsed, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return parsed;

      const separatorIndex = line.includes('=') ? line.indexOf('=') : line.indexOf(':');
      if (separatorIndex <= 0) return parsed;

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      if (!key) return parsed;

      parsed[key] = rawValue.replace(/^['"]|['"]$/g, '');
      return parsed;
    }, {});
};

const loadEnv = () => {
  if (cachedConfig) return cachedConfig;

  let config: Record<string, any> = {};

  const nodeEnv = process.env.NODE_ENV || 'development';
  process.env.NODE_ENV = nodeEnv;
  const isDocker = process.env.DOCKER === 'true' || nodeEnv === 'docker';
  const envFileConfig = parseEnvFile(join(__dirname, '../../.env'));

  const candidates = ['config.yaml'];

  for (const filename of candidates) {
    const configsPath = join(__dirname, '../../configs', filename);
    const rootPath = join(__dirname, '../../', filename);
    const pathToLoad = existsSync(configsPath) ? configsPath : rootPath;

    if (!existsSync(pathToLoad)) continue;

    config = (yaml.load(readFileSync(pathToLoad, 'utf8')) as Record<string, any>) || {};
    break;
  }

  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== '' && !process.env[key]) {
      process.env[key] = String(value);
    }
  }

  for (const [key, value] of Object.entries(envFileConfig)) {
    if (value !== undefined && value !== '') {
      if (!process.env[key]) process.env[key] = value;
      if (isDocker || isSecretEnvKey(key) || config[key] === undefined) {
        config[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      if (isDocker || isSecretEnvKey(key) || config[key] === undefined) {
        config[key] = value;
      }
    }
  }

  cachedConfig = config;
  return config;
};
export default loadEnv;
