import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app.logger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new AppLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
    rawBody: true,
  });
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // Explicit body size limits — prevent large-payload DoS on non-file endpoints
  // File uploads are handled by Multer with their own limits
  app.use((req: any, res: any, next: any) => {
    if (req.path?.includes('/webhook')) return next(); // Stripe webhook uses rawBody
    return json({ limit: '1mb' })(req, res, next);
  });
  app.use(urlencoded({ extended: false, limit: '1mb' }));

  // CORS
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const isProd = config.get('NODE_ENV') === 'production';
      // In production: only allow the configured frontend URL
      // In development: also allow any localhost port (for Swagger, dev servers)
      if (!origin || origin === frontendUrl) {
        callback(null, true);
      } else if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger — available only in non-production environments
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EduInovatrium API')
      .setDescription('Platformă cursuri online – API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs at http://localhost:${config.get<number>('BACKEND_PORT', 3001)}/api/docs`, 'Bootstrap');
  }

  const port = config.get<number>('BACKEND_PORT', 3001);
  await app.listen(port);
  logger.log(`EduInovatrium API running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
