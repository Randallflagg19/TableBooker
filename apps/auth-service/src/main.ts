import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import type { RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const cookieParserMiddleware: RequestHandler = cookieParser();
  app.use(cookieParserMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const grpcHost = process.env.AUTH_SERVICE_GRPC_HOST ?? '0.0.0.0';
  const grpcPort = process.env.AUTH_SERVICE_GRPC_PORT ?? '50051';
  const httpPort = process.env.AUTH_SERVICE_PORT ?? 3001;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(process.cwd(), 'proto', 'auth.proto'),
      url: `${grpcHost}:${grpcPort}`,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Authentication service for TableBooker')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(httpPort);
}
void bootstrap();
