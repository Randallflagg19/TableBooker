import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { BookingEventPayload } from '../../../../../../libs/contracts/booking-events.contract';
import { EmailService } from './email.service';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;

  const sendMailMock = jest.fn();

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        MAILTRAP_SMTP_HOST: 'sandbox.smtp.mailtrap.io',
        MAILTRAP_SMTP_PORT: '2525',
        MAILTRAP_SECURE: 'false',
        MAILTRAP_SMTP_USER: 'test-user',
        MAILTRAP_SMTP_PASS: 'test-pass',
        MAILTRAP_SENDER_EMAIL: 'no-reply@example.com',
      };

      return values[key];
    }),
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

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    service = new EmailService(configServiceMock as unknown as ConfigService);
  });

  it('sends booking confirmation email using payload email', async () => {
    const payload = createPayload({
      bookingId: 'booking-confirmed-id',
      email: 'confirmed@example.com',
      status: 'CONFIRMED',
    });

    await service.sendBookingConfirmationEmail(payload);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'no-reply@example.com',
      to: 'confirmed@example.com',
      subject: 'Booking confirmed',
      text: 'Your booking booking-confirmed-id has been confirmed.',
    });
  });

  it('sends booking cancellation email using payload email', async () => {
    const payload = createPayload({
      bookingId: 'booking-cancelled-id',
      email: 'cancelled@example.com',
      status: 'CANCELLED',
    });

    await service.sendBookingCancellationEmail(payload);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'no-reply@example.com',
      to: 'cancelled@example.com',
      subject: 'Booking cancelled',
      text: 'Your booking booking-cancelled-id has been cancelled.',
    });
  });

  it('throws when payload email is missing', async () => {
    const payload = createPayload({
      email: null,
    });

    await expect(service.sendBookingConfirmationEmail(payload)).rejects.toThrow(
      'Cannot send booking confirmation email: user email is missing for booking booking-id',
    );

    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
