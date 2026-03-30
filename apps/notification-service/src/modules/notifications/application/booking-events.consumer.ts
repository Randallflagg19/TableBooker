import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Channel, ConsumeMessage } from 'amqplib';
import { RabbitMqService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import {
  BOOKING_EVENTS_EXCHANGE,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';

@Injectable()
export class BookingEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(BookingEventsConsumer.name);

  public constructor(private readonly rabbitMqService: RabbitMqService) {}

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

  private handleMessage(channel: Channel, message: ConsumeMessage): void {
    try {
      const routingKey = message.fields.routingKey;
      const payload = JSON.parse(
        message.content.toString(),
      ) as BookingEventPayload;

      this.logger.log(`Received event: ${routingKey}`);
      this.logger.log(`Payload: ${JSON.stringify(payload)}`);

      if (routingKey === BOOKING_CONFIRMED_EVENT) {
        this.logger.log('Send booking confirmation notification');
      }

      if (routingKey === BOOKING_CANCELLED_EVENT) {
        this.logger.log('Send booking cancellation notification');
      }

      channel.ack(message);
    } catch (error) {
      this.logger.error('Failed to process booking event', error);
      channel.nack(message, false, false);
    }
  }
}
