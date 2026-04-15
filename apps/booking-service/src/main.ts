import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendAppUrl =
    process.env.FRONTEND_APP_URL ?? 'http://localhost:3000';

  app.enableCors({
    origin: frontendAppUrl,
    credentials: true,
  });

  const httpPort = process.env.BOOKING_SERVICE_PORT ?? 3002;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Booking Service API')
    .setDescription('Booking service for TableBooker')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen(httpPort);
}
void bootstrap();
