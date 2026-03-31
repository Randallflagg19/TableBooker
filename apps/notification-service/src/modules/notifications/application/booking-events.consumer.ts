import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ConsumeMessage } from 'amqplib';
import { RabbitMqService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import {
  BOOKING_EVENTS_EXCHANGE,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Injectable()
export class BookingEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingEventsConsumer.name);

  public constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly notificationDispatcherService: NotificationDispatcherService,
  ) {}

  public async onModuleInit() {
    const channel = this.rabbitMqService.getChannel();
    const exchange = BOOKING_EVENTS_EXCHANGE;
    const queue = 'notification.booking.events';

    await channel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    await channel.assertQueue(queue, {
      durable: true,
    });

    await channel.bindQueue(queue, exchange, BOOKING_CONFIRMED_EVENT);
    await channel.bindQueue(queue, exchange, BOOKING_CANCELLED_EVENT);

    await channel.consume(queue, (message) => {
      if (!message) {
        return;
      }

      void this.handleMessage(channel, message);
    });

    this.logger.log(`Listening to queue: ${queue}`);
  }

  private async handleMessage(
    channel: Channel,
    message: ConsumeMessage,
  ): Promise<void> {
    try {
      const routingKey = message.fields.routingKey;
      const payload = JSON.parse(
        message.content.toString(),
      ) as BookingEventPayload;

      this.logger.log(`Received event: ${routingKey}`);
      this.logger.log(`Payload: ${JSON.stringify(payload)}`);

      await this.notificationDispatcherService.dispatch(routingKey, payload);

      channel.ack(message);
    } catch (error) {
      this.logger.error('Failed to process booking event', error);
      channel.nack(message, false, false);
    }
  }
}
