import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DbService } from '../../../infrastructure/db/db.service';
import { Booking } from '../infrastructure/booking.type';

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(private readonly db: DbService) {}

  @Cron('0 * * * * *')
  public async expireHoldBookings() {
    const expiredBookings = await this.db.client<Booking[]>`
      UPDATE bookings
      SET status = 'EXPIRED',
          updated_at = now()
      WHERE status = 'HOLD'
        AND created_at <= now() - interval '5 minutes'
      RETURNING *
    `;

    if (expiredBookings.length > 0) {
      this.logger.log(`Expired ${expiredBookings.length} hold booking(s)`);
    }
  }
}
