import { Module } from '@nestjs/common';
import { BookingsService } from './application/bookings.service';
import { BookingsController } from './interfaces/bookings.controller';
import { DbModule } from '../../infrastructure/db/db.module';
import { BookingExpirationService } from './application/booking-expiration.service';
import { AuthClientModule } from '../../infrastructure/auth-client/auth-client.module';

@Module({
  imports: [DbModule, AuthClientModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingExpirationService],
})
export class BookingsModule {}
