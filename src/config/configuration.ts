import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const loadEnv = () => {
  let config: Record<string, any> = {};

  // Only load YAML if NODE_ENV is set and not 'docker'
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'docker') {
    let YAML_CONFIG_FILENAME = 'config.yaml';
    if (process.env.NODE_ENV === 'dev') {
      YAML_CONFIG_FILENAME = 'dev.yaml';
    }
    if (process.env.NODE_ENV === 'staging') {
      YAML_CONFIG_FILENAME = 'staging.yaml';
    }
    if (process.env.NODE_ENV === 'production') {
      YAML_CONFIG_FILENAME = 'production.yaml';
    }
    try {
      const path = join(__dirname, '../../', YAML_CONFIG_FILENAME);
      config = yaml.load(readFileSync(path, 'utf8')) as Record<string, any>;
    } catch (e) {
      console.log(`YAML config not found, using environment variables`);
    }
  }

  // Override with environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      config[key] = value;
    }
  }

  return config;
};
export default loadEnv;
