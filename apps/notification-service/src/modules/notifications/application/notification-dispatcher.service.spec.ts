import {
  BOOKING_CANCELLED_EVENT,
  BOOKING_CONFIRMED_EVENT,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { EmailService } from '../infrastructure/email.service';
import { SmsService } from '../infrastructure/sms.service';

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;

  const emailServiceMock = {
    sendBookingConfirmationEmail: jest.fn(),
    sendBookingCancellationEmail: jest.fn(),
  };

  const smsServiceMock = {
    sendBookingConfirmationSms: jest.fn(),
    sendBookingCancellationSms: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();

    service = new NotificationDispatcherService(
      emailServiceMock as unknown as EmailService,
      smsServiceMock as unknown as SmsService,
    );
  });

  it('dispatches email and sms for booking.confirmed', async () => {
    const payload = createPayload({
      status: 'CONFIRMED',
    });

    await service.dispatch(BOOKING_CONFIRMED_EVENT, payload);

    expect(emailServiceMock.sendBookingConfirmationEmail).toHaveBeenCalledWith(
      payload,
    );
    expect(smsServiceMock.sendBookingConfirmationSms).toHaveBeenCalledWith(
      payload,
    );

    expect(
      emailServiceMock.sendBookingCancellationEmail,
    ).not.toHaveBeenCalled();
    expect(smsServiceMock.sendBookingCancellationSms).not.toHaveBeenCalled();
  });

  it('dispatches email and sms for booking.cancelled', async () => {
    const payload = createPayload({
      status: 'CANCELLED',
    });

    await service.dispatch(BOOKING_CANCELLED_EVENT, payload);

    expect(emailServiceMock.sendBookingCancellationEmail).toHaveBeenCalledWith(
      payload,
    );
    expect(smsServiceMock.sendBookingCancellationSms).toHaveBeenCalledWith(
      payload,
    );

    expect(
      emailServiceMock.sendBookingConfirmationEmail,
    ).not.toHaveBeenCalled();
    expect(smsServiceMock.sendBookingConfirmationSms).not.toHaveBeenCalled();
  });

  it('skips email when email is missing and still sends sms', async () => {
    const payload = createPayload({
      email: null,
    });

    await service.dispatch(BOOKING_CONFIRMED_EVENT, payload);

    expect(
      emailServiceMock.sendBookingConfirmationEmail,
    ).not.toHaveBeenCalled();
    expect(smsServiceMock.sendBookingConfirmationSms).toHaveBeenCalledWith(
      payload,
    );
  });

  it('skips sms when phone is missing and still sends email', async () => {
    const payload = createPayload({
      phone: null,
    });

    await service.dispatch(BOOKING_CONFIRMED_EVENT, payload);

    expect(emailServiceMock.sendBookingConfirmationEmail).toHaveBeenCalledWith(
      payload,
    );
    expect(smsServiceMock.sendBookingConfirmationSms).not.toHaveBeenCalled();
  });

  it('does not fail when both email and phone are missing', async () => {
    const payload = createPayload({
      email: null,
      phone: null,
    });

    await expect(
      service.dispatch(BOOKING_CONFIRMED_EVENT, payload),
    ).resolves.toBeUndefined();

    expect(
      emailServiceMock.sendBookingConfirmationEmail,
    ).not.toHaveBeenCalled();
    expect(smsServiceMock.sendBookingConfirmationSms).not.toHaveBeenCalled();
  });

  it('continues dispatch when email provider throws', async () => {
    const payload = createPayload();

    emailServiceMock.sendBookingConfirmationEmail.mockRejectedValue(
      new Error('Email failed'),
    );

    await expect(
      service.dispatch(BOOKING_CONFIRMED_EVENT, payload),
    ).resolves.toBeUndefined();

    expect(emailServiceMock.sendBookingConfirmationEmail).toHaveBeenCalledWith(
      payload,
    );
    expect(smsServiceMock.sendBookingConfirmationSms).toHaveBeenCalledWith(
      payload,
    );
  });
});
