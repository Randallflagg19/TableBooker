import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { BookingEventPayload } from '../../../../../../libs/contracts/booking-events.contract';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transport: Transporter;

  public constructor(private readonly configService: ConfigService) {
    this.transport = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('MAILTRAP_SMTP_HOST'),
      port: Number(this.configService.getOrThrow<string>('MAILTRAP_SMTP_PORT')),
      secure:
        this.configService.getOrThrow<string>('MAILTRAP_SECURE') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('MAILTRAP_SMTP_USER'),
        pass: this.configService.getOrThrow<string>('MAILTRAP_SMTP_PASS'),
      },
    });
  }

  public async sendBookingConfirmationEmail(payload: BookingEventPayload) {
    if (!payload.email) {
      throw new Error(
        `Cannot send booking confirmation email: user email is missing for booking ${payload.bookingId}`,
      );
    }
    await this.transport.sendMail({
      from: this.configService.getOrThrow<string>('MAILTRAP_SENDER_EMAIL'),
      to: payload.email,
      subject: 'Booking confirmed',
      text: `Your booking ${payload.bookingId} has been confirmed.`,
    });

    this.logger.log(`Booking confirmation email sent for ${payload.bookingId}`);
  }

  public async sendBookingCancellationEmail(payload: BookingEventPayload) {
    if (!payload.email) {
      throw new Error(
        `Cannot send booking cancellation email: user email is missing for booking ${payload.bookingId}`,
      );
    }
    await this.transport.sendMail({
      from: this.configService.getOrThrow<string>('MAILTRAP_SENDER_EMAIL'),
      to: payload.email,
      subject: 'Booking cancelled',
      text: `Your booking ${payload.bookingId} has been cancelled.`,
    });

    this.logger.log(`Booking cancellation email sent for ${payload.bookingId}`);
  }
}
