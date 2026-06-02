import 'dotenv/config';
import loadEnv from './config/configuration';
loadEnv();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as helmet from 'helmet';
import compression from 'compression';
import express from 'express';
import { AppModule } from './app.module';
import initSwagger from './config/innit-swagger';
import { getDynamicCorsConfig } from './config/cors.config';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const GLOBAL_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 3000;

  app.setGlobalPrefix(GLOBAL_PREFIX);

  (app.getHttpAdapter().getInstance() as express.Application).set('trust proxy', 1);

  app.use(helmet.default() as any);
  app.use(compression());

  const corsConfig = getDynamicCorsConfig();
  app.enableCors(corsConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    initSwagger(app);
    console.log(`Swagger is running on: http://localhost:${port}/${GLOBAL_PREFIX}/swagger`);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();
