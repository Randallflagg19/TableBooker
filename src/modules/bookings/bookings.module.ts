import { Module } from '@nestjs/common';
import { BookingsService } from './application/bookings.service';
import { BookingsController } from './interfaces/bookings.controller';
import { DbModule } from '../../infrastructure/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
