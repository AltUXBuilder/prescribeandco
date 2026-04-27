import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // ── Prefix ──────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: config.get<string>('app.corsOrigin'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Validation pipe ──────────────────────────────────────────────────────
  // whitelist: strip properties not in the DTO
  // forbidNonWhitelisted: throw 400 for unknown properties
  // transform: auto-coerce query params and body to DTO types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Serialisation interceptor ────────────────────────────────────────────
  // Applies @Exclude() and @Expose() from class-transformer globally.
  // Ensures passwordHash and other sensitive fields are never returned.
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      strategy: 'excludeAll',
      excludeExtraneousValues: true,
    }),
  );

  const port = config.get<number>('app.port') ?? 3001;
  await app.listen(port);
  console.log(`Prescribe & Co API running on :${port}/api/v1`);
}

bootstrap();
