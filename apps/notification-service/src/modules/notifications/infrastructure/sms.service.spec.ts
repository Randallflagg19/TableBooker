import { ConfigService } from '@nestjs/config';
import { BookingEventPayload } from '../../../../../../libs/contracts/booking-events.contract';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;

  const fetchMock = jest.fn();

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        EXOLVE_API_TOKEN: 'test-api-token',
        EXOLVE_SOURCE_NUMBER: '79587734180',
      };

      return values[key];
    }),
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        EXOLVE_BASE_URL: 'https://api.exolve.ru',
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

    global.fetch = fetchMock;

    fetchMock.mockResolvedValue({
      ok: true,
      text: jest.fn(),
    });

    service = new SmsService(configServiceMock as unknown as ConfigService);
  });

  it('sends booking confirmation sms using payload phone', async () => {
    const payload = createPayload({
      bookingId: 'booking-confirmed-id',
      phone: '+79991234567',
      status: 'CONFIRMED',
    });

    await service.sendBookingConfirmationSms(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exolve.ru/messaging/v1/SendSMS',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: '79587734180',
          destination: '79991234567',
          text: 'Your booking booking-confirmed-id has been confirmed.',
        }),
      },
    );
  });

  it('normalizes phone number before sending sms', async () => {
    const payload = createPayload({
      bookingId: 'booking-normalized-id',
      phone: '8 (999) 123-45-67',
    });

    await service.sendBookingConfirmationSms(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.exolve.ru/messaging/v1/SendSMS',
      expect.objectContaining({
        body: JSON.stringify({
          number: '79587734180',
          destination: '79991234567',
          text: 'Your booking booking-normalized-id has been confirmed.',
        }),
      }),
    );
  });

  it('throws when payload phone is missing', async () => {
    const payload = createPayload({
      phone: null,
    });

    await expect(service.sendBookingConfirmationSms(payload)).rejects.toThrow(
      'Cannot send booking confirmation SMS: user phone is missing for booking booking-id',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when Exolve response is not ok', async () => {
    const payload = createPayload({
      bookingId: 'booking-error-id',
      phone: '+79991234567',
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('incorrect request'),
    });

    await expect(service.sendBookingCancellationSms(payload)).rejects.toThrow(
      'Exolve SMS request failed: 400 incorrect request',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
