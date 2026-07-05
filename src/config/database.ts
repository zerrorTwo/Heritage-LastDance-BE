import {
  DataSource,
  DataSourceOptions,
  DefaultNamingStrategy,
  NamingStrategyInterface,
} from 'typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import loadEnv from './configuration';
import * as path from 'path';

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName || toSnakeCase(targetName);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return toSnakeCase(`${embeddedPrefixes.join('_')}${customName || propertyName}`);
  }

  relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return toSnakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`,
    );
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return toSnakeCase(`${tableName}_${columnName || propertyName}`);
  }

  joinTableInverseColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return this.joinTableColumnName(tableName, propertyName, columnName);
  }
}

const baseDbConfig = (): DataSourceOptions => {
  const env = loadEnv();
  const host = env.DATABASE_HOST || env.HOST || 'localhost';
  const type = env.DATABASE_TYPE || 'postgres';
  const port = Number(env.DATABASE_PORT || env.PORT_DB || 5432);
  const isProduction = env.NODE_ENV === 'production';
  const synchronize = String(env.DATABASE_SYNCHRONIZE ?? '').toLowerCase() === 'true';
  const useSsl =
    String(env.DATABASE_SSL_ENABLED ?? env.DATABASE_SSL ?? '').toLowerCase() === 'true' ||
    String(host).includes('aivencloud.com');

  return {
    type,
    host,
    port,
    username: env.DATABASE_USERNAME || env.DATABASE_USER || env.USERNAME || 'postgres',
    password: env.DATABASE_PASSWORD || env.DATABASE_PASS || env.PASSWORD || '',
    database: env.DATABASE_NAME || env.NAME || 'defaultdb',
    entities: [
      path.join(__dirname, '../modules/**/model.{js,ts}'),
    ],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: env.DATABASE_SYNCHRONIZE === undefined ? !isProduction : synchronize,
    logging: false,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
    poolSize: Number(env.DATABASE_MAX_CONNECTIONS || 10),
    connectTimeout: 60000,
  } as DataSourceOptions;
};

export const dbConfig = (): TypeOrmModuleOptions => ({
  ...baseDbConfig(),
  autoLoadEntities: true,
});

export const dataSource = new DataSource(baseDbConfig());
