import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

let cachedConfig: Record<string, any> | null = null;

const loadEnv = () => {
  if (cachedConfig) return cachedConfig;

  let config: Record<string, any> = {};

  // Determine NODE_ENV
  // Default to 'dev' if running npm run dev (not set in environment)
  const nodeEnv = process.env.NODE_ENV || 'dev';
  process.env.NODE_ENV = nodeEnv;

  // Only load YAML if NODE_ENV is set and not 'docker'
  if (nodeEnv && nodeEnv !== 'docker') {
    let YAML_CONFIG_FILENAME = 'config.yaml';
    if (nodeEnv === 'dev') {
      YAML_CONFIG_FILENAME = 'dev.yaml';
    }
    if (nodeEnv === 'staging') {
      YAML_CONFIG_FILENAME = 'staging.yaml';
    }
    if (nodeEnv === 'production') {
      YAML_CONFIG_FILENAME = 'production.yaml';
    }

    // Try loading from configs/ folder first, then root folder
    // Fallback to config.yaml if env-specific YAML not found
    const candidates = [
      YAML_CONFIG_FILENAME,
      ...(YAML_CONFIG_FILENAME !== 'config.yaml' ? ['config.yaml'] : []),
    ];

    let loaded = false;
    for (const filename of candidates) {
      const configsPath = join(__dirname, '../../configs', filename);
      const rootPath = join(__dirname, '../../', filename);

      try {
        let pathToLoad = rootPath;
        if (existsSync(configsPath)) {
          pathToLoad = configsPath;
        }
        config = yaml.load(readFileSync(pathToLoad, 'utf8')) as Record<string, any>;
        console.log(`Config loaded from: ${pathToLoad}`);
        loaded = true;
        break;
      } catch (e) {
        // Try next candidate
      }
    }

    if (!loaded) {
      console.log(`YAML config not found at configs/ or root, using environment variables`);
    }
  }

  // Set process.env with YAML values (so they're accessible via process.env)
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== '' && !process.env[key]) {
      process.env[key] = String(value);
    }
  }

  // Override with environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      config[key] = value;
    }
  }

  cachedConfig = config;
  return config;
};
export default loadEnv;
