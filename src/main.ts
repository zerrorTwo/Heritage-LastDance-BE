import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import initSwagger from './config/innit-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  // Initialize Swagger
  initSwagger(app);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger is running on: http://localhost:${port}/api/swagger`);
  }
}

bootstrap();