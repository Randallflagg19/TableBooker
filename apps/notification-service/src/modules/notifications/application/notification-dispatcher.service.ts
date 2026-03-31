import { Injectable, Logger } from '@nestjs/common';
import {
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';
import { EmailService } from '../infrastructure/email.service';
import { SmsService } from '../infrastructure/sms.service';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  public constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  public async dispatch(
    routingKey: string,
    payload: BookingEventPayload,
  ): Promise<void> {
    if (routingKey === BOOKING_CONFIRMED_EVENT) {
      await this.dispatchBookingConfirmed(payload);
      return;
    }

    if (routingKey === BOOKING_CANCELLED_EVENT) {
      await this.dispatchBookingCancelled(payload);
      return;
    }

    this.logger.warn(`Unsupported routing key: ${routingKey}`);
  }

  private async dispatchBookingConfirmed(
    payload: BookingEventPayload,
  ): Promise<void> {
    if (!payload.email && !payload.phone) {
      this.logger.warn(
        `Skip notifications: no email and phone for booking ${payload.bookingId}`,
      );
      return;
    }

    if (payload.email) {
      try {
        await this.emailService.sendBookingConfirmationEmail(payload);
      } catch (error) {
        this.logger.error(
          `Failed to send confirmation email for booking ${payload.bookingId}`,
          error,
        );
      }
    } else {
      this.logger.warn(`Skip email: no email for booking ${payload.bookingId}`);
    }

    if (payload.phone) {
      try {
        await this.smsService.sendBookingConfirmationSms(payload);
      } catch (error) {
        this.logger.error(
          `Failed to send confirmation SMS for booking ${payload.bookingId}`,
          error,
        );
      }
    } else {
      this.logger.warn(`Skip SMS: no phone for booking ${payload.bookingId}`);
    }

    this.logger.log(
      `Notification dispatch completed for booking ${payload.bookingId}`,
    );
  }

  private async dispatchBookingCancelled(
    payload: BookingEventPayload,
  ): Promise<void> {
    if (!payload.email && !payload.phone) {
      this.logger.warn(
        `Skip notifications: no email and phone for booking ${payload.bookingId}`,
      );
      return;
    }

    if (payload.email) {
      try {
        await this.emailService.sendBookingCancellationEmail(payload);
      } catch (error) {
        this.logger.error(
          `Failed to send cancellation email for booking ${payload.bookingId}`,
          error,
        );
      }
    } else {
      this.logger.warn(`Skip email: no email for booking ${payload.bookingId}`);
    }

    if (payload.phone) {
      try {
        await this.smsService.sendBookingCancellationSms(payload);
      } catch (error) {
        this.logger.error(
          `Failed to send cancellation SMS for booking ${payload.bookingId}`,
          error,
        );
      }
    } else {
      this.logger.warn(`Skip SMS: no phone for booking ${payload.bookingId}`);
    }

    this.logger.log(
      `Notification dispatch completed for booking ${payload.bookingId}`,
    );
  }
}
