import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import initSwagger from './config/innit-swagger';
import { getDynamicCorsConfig } from './config/cors.config';

const GLOBAL_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  // API prefix
  app.setGlobalPrefix(GLOBAL_PREFIX);

  // Trust proxy (for apps behind reverse proxy like nginx)
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');

  // Security: Helmet for security headers
  app.use(helmet.default() as any);

  // Performance: Compression
  app.use(compression());

  // CORS configuration
  const corsConfig = getDynamicCorsConfig();
  app.enableCors(corsConfig);

  // Global validation pipe
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

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Initialize Swagger (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    initSwagger(app);
    console.log(`Swagger is running on: http://localhost:${port}/${GLOBAL_PREFIX}/swagger`);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();