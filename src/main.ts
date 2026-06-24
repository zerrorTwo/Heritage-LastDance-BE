import 'dotenv/config';
import loadEnv from './config/configuration';
loadEnv();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import initSwagger from './config/innit-swagger';
import { getDynamicCorsConfig } from './config/cors.config';

const GLOBAL_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  app.setGlobalPrefix(GLOBAL_PREFIX);

  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');

  app.use(helmet.default() as any);
  app.use(compression());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

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

  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    initSwagger(app);
    console.log(`Swagger is running on: http://localhost:${port}/${GLOBAL_PREFIX}/swagger`);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();
