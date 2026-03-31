import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqModule } from './infrastructure/rabbitmq/rabbitmq.module';
import { BookingEventsConsumer } from './modules/notifications/application/booking-events.consumer';
import { NotificationDispatcherService } from './modules/notifications/application/notification-dispatcher.service';
import { EmailService } from './modules/notifications/infrastructure/email.service';
import { SmsService } from './modules/notifications/infrastructure/sms.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
    }),
    RabbitMqModule,
  ],
  providers: [
    BookingEventsConsumer,
    NotificationDispatcherService,
    EmailService,
    SmsService,
  ],
})
export class AppModule {}
