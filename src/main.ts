import compression from 'compression';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import loadEnv from './config/configuration';
import initSwagger from './config/innit-swagger';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { getDynamicCorsConfig } from './config/cors.config';

async function bootstrap() {
  const env = loadEnv();

  const app = await NestFactory.create(AppModule);

  app.enableCors(getDynamicCorsConfig());
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: '50mb' }));

  app.setGlobalPrefix('v1/api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value:  false,
      },
    }),
  );

  // Single entry point for all error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  initSwagger(app);

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${env.PORT}`);
}

bootstrap();
