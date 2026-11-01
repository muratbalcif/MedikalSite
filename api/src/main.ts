import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const logger = new Logger('Bootstrap');

  const port = configService.get('PORT', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  app.setGlobalPrefix('api/v1');

  const corsOrigins = configService.get('CORS_ORIGINS', { infer: true });
  const origins = corsOrigins
    ? corsOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : nodeEnv === 'production'
      ? []
      : [
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          'http://localhost:3002',
          'http://127.0.0.1:3002',
        ];

  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must be set to an explicit allowlist in production (no wildcard)',
    );
  }

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ANAMUR ACİL MEDİKAL API')
      .setDescription('Anamur Acil Medikal ve Anamur İşitme Merkezi API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  logger.log(`Application listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
