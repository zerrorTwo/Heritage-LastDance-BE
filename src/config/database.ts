import { DataSource, DataSourceOptions } from 'typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import loadEnv from './configuration';
import * as path from 'path';

const baseDbConfig = (): DataSourceOptions => {
  const env = loadEnv();
  const host = env.DATABASE_HOST || env.HOST || 'localhost';
  const port = Number(env.DATABASE_PORT || env.PORT_DB || 3306);
  const isProduction = env.NODE_ENV === 'production';
  const useSsl =
    String(env.DATABASE_SSL || '').toLowerCase() === 'true' ||
    String(host).includes('aivencloud.com');

  return {
    type: 'mysql',
    host,
    port,
    username: env.DATABASE_USER || env.USERNAME || 'root',
    password: env.DATABASE_PASS || env.PASSWORD || '',
    database: env.DATABASE_NAME || env.NAME || 'defaultdb',
    entities: [
      path.join(__dirname, '../modules/**/*.model.{js,ts}'),
    ],
    synchronize: !isProduction,
    logging: isProduction ? ['error', 'warn'] : ['error'],
    extra: {
      connectionLimit: 10,
      charset: 'utf8mb4',
      ...(useSsl && {
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    },
    poolSize: 10,
    connectTimeout: 60000,
  };
};

export const dbConfig = (): TypeOrmModuleOptions => ({
  ...baseDbConfig(),
  autoLoadEntities: true,
});

export const dataSource = new DataSource(baseDbConfig());
