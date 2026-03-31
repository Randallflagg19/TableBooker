import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingEventPayload } from '../../../../../../libs/contracts/booking-events.contract';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  public constructor(private readonly configService: ConfigService) {}

  public async sendBookingConfirmationSms(
    payload: BookingEventPayload,
  ): Promise<void> {
    if (!payload.phone) {
      throw new Error(
        `Cannot send booking confirmation SMS: user phone is missing for booking ${payload.bookingId}`,
      );
    }

    const text = `Your booking ${payload.bookingId} has been confirmed.`;

    await this.sendSms(payload.phone, text);

    this.logger.log(`Booking confirmation SMS sent for ${payload.bookingId}`);
  }

  public async sendBookingCancellationSms(
    payload: BookingEventPayload,
  ): Promise<void> {
    if (!payload.phone) {
      throw new Error(
        `Cannot send booking cancellation SMS: user phone is missing for booking ${payload.bookingId}`,
      );
    }

    const text = `Your booking ${payload.bookingId} has been cancelled.`;

    await this.sendSms(payload.phone, text);

    this.logger.log(`Booking cancellation SMS sent for ${payload.bookingId}`);
  }

  private async sendSms(destination: string, text: string): Promise<void> {
    const apiToken = this.configService.getOrThrow<string>('EXOLVE_API_TOKEN');
    const sourceNumber = this.configService.getOrThrow<string>(
      'EXOLVE_SOURCE_NUMBER',
    );

    const baseUrl =
      this.configService.get<string>('EXOLVE_BASE_URL') ??
      'https://api.exolve.ru';

    const normalizedDestination = this.normalizePhoneNumber(destination);

    const response = await fetch(`${baseUrl}/messaging/v1/SendSMS`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: sourceNumber,
        destination: normalizedDestination,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Exolve SMS request failed: ${response.status} ${errorText}`,
      );
    }
  }

  private normalizePhoneNumber(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.startsWith('8')) {
      return `7${digitsOnly.slice(1)}`;
    }

    return digitsOnly;
  }
}
