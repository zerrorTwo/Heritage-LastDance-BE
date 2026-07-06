import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export default function initSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Heritage Last Dance API')
    .setDescription('API documentation for Heritage Last Dance service')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'access-token',
    )
    .addTag('Authentication', 'Auth endpoints')
    .addTag('Users', 'User management endpoints')
    .setContact('Heritage Last Dance Team', 'https://heritage-lastdance.com', 'dev@heritage-lastdance.com')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // const isProduction = process.env.NODE_ENV === 'production';

  SwaggerModule.setup('api/swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Heritage Last Dance API Docs',
    customfavIcon: '/favicon.ico',
  });
}
