import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, Swagger, mobile) or any localhost port in dev
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || origin === frontendUrl) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
    console.log(`📚 Swagger docs at http://localhost:${config.get<number>('BACKEND_PORT', 3001)}/api/docs`);
  }

  const port = config.get<number>('BACKEND_PORT', 3001);
  await app.listen(port);
  console.log(`🚀 EduInovatrium API running on http://localhost:${port}/api`);
}
bootstrap();
