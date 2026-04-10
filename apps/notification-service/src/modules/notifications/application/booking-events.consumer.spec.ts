import type { ConsumeMessage } from 'amqplib';
import {
  BOOKING_CANCELLED_EVENT,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_EVENTS_EXCHANGE,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';
import { RabbitMqService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { BookingEventsConsumer } from './booking-events.consumer';
import { NotificationDispatcherService } from './notification-dispatcher.service';

describe('BookingEventsConsumer', () => {
  let consumer: BookingEventsConsumer;
  let consumeHandler: ((message: ConsumeMessage | null) => void) | undefined;

  const channelMock = {
    assertExchange: jest.fn(),
    assertQueue: jest.fn(),
    bindQueue: jest.fn(),
    consume: jest.fn(
      (_queue: string, handler: (message: ConsumeMessage | null) => void) => {
        consumeHandler = handler;
      },
    ),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const rabbitMqServiceMock = {
    getChannel: jest.fn(() => channelMock),
  };

  const notificationDispatcherServiceMock = {
    dispatch: jest.fn(),
  };

  const createPayload = (
    overrides?: Partial<BookingEventPayload>,
  ): BookingEventPayload => ({
    bookingId: 'booking-id',
    userId: 'user-id',
    tableId: 'table-id',
    status: 'CONFIRMED',
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    email: 'user@example.com',
    phone: '+79991234567',
    ...overrides,
  });

  const createMessage = (
    routingKey: string,
    payload: BookingEventPayload,
  ): ConsumeMessage =>
    ({
      fields: {
        routingKey,
      },
      content: Buffer.from(JSON.stringify(payload)),
    }) as ConsumeMessage;

  const waitForMicrotasks = () =>
    new Promise<void>((resolve) => {
      process.nextTick(() => resolve());
    });

  beforeEach(() => {
    jest.clearAllMocks();
    consumeHandler = undefined;

    consumer = new BookingEventsConsumer(
      rabbitMqServiceMock as unknown as RabbitMqService,
      notificationDispatcherServiceMock as unknown as NotificationDispatcherService,
    );
  });

  it('registers queue bindings and acknowledges successful dispatch', async () => {
    const payload = createPayload();
    const message = createMessage(BOOKING_CONFIRMED_EVENT, payload);

    await consumer.onModuleInit();

    expect(channelMock.assertExchange).toHaveBeenCalledWith(
      BOOKING_EVENTS_EXCHANGE,
      'topic',
      { durable: true },
    );
    expect(channelMock.assertQueue).toHaveBeenCalledWith(
      'notification.booking.events',
      { durable: true },
    );
    expect(channelMock.bindQueue).toHaveBeenCalledWith(
      'notification.booking.events',
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CONFIRMED_EVENT,
    );
    expect(channelMock.bindQueue).toHaveBeenCalledWith(
      'notification.booking.events',
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CANCELLED_EVENT,
    );
    expect(channelMock.consume).toHaveBeenCalled();

    expect(consumeHandler).toBeDefined();

    if (!consumeHandler) {
      throw new Error('Consume handler was not registered');
    }

    consumeHandler(message);
    await waitForMicrotasks();

    expect(notificationDispatcherServiceMock.dispatch).toHaveBeenCalledWith(
      BOOKING_CONFIRMED_EVENT,
      payload,
    );
    expect(channelMock.ack).toHaveBeenCalledWith(message);
    expect(channelMock.nack).not.toHaveBeenCalled();
  });

  it('nacks message when dispatcher throws', async () => {
    const payload = createPayload({
      status: 'CANCELLED',
    });
    const message = createMessage(BOOKING_CANCELLED_EVENT, payload);

    notificationDispatcherServiceMock.dispatch.mockRejectedValue(
      new Error('Dispatch failed'),
    );

    await consumer.onModuleInit();

    expect(consumeHandler).toBeDefined();

    if (!consumeHandler) {
      throw new Error('Consume handler was not registered');
    }

    consumeHandler(message);
    await waitForMicrotasks();

    expect(notificationDispatcherServiceMock.dispatch).toHaveBeenCalledWith(
      BOOKING_CANCELLED_EVENT,
      payload,
    );
    expect(channelMock.ack).not.toHaveBeenCalled();
    expect(channelMock.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('ignores null message', async () => {
    await consumer.onModuleInit();

    expect(consumeHandler).toBeDefined();

    if (!consumeHandler) {
      throw new Error('Consume handler was not registered');
    }

    consumeHandler(null);
    await waitForMicrotasks();

    expect(notificationDispatcherServiceMock.dispatch).not.toHaveBeenCalled();
    expect(channelMock.ack).not.toHaveBeenCalled();
    expect(channelMock.nack).not.toHaveBeenCalled();
  });
});
