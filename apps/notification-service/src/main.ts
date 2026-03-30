import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.NOTIFICATION_SERVICE_PORT ?? 3003;

  await app.listen(port);
}
void bootstrap();
