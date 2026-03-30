import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { BookingEventsConsumer } from './modules/notifications/application/booking-events.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
    }),
    RabbitMqModule,
  ],
  providers: [BookingEventsConsumer],
})
export class AppModule {}
