import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { Booking } from '../infrastructure/booking.type';
import { RestaurantTable } from '../infrastructure/restaurant-table.type';
import { RabbitMqService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import {
  BOOKING_EVENTS_EXCHANGE,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_CANCELLED_EVENT,
  BookingEventPayload,
} from '../../../../../../libs/contracts/booking-events.contract';
import { AuthClientService } from '../../../infrastructure/auth-client/auth-client.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly db: DbService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly authClientService: AuthClientService,
  ) {}

  public async create(dto: CreateBookingDto, userId: string) {
    const [table] = await this.db.client<RestaurantTable[]>`
      SELECT * FROM restaurant_tables WHERE id = ${dto.tableId}
    `;

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (dto.guests > table.capacity) {
      throw new BadRequestException('Too many guests for this table');
    }

    if (table.kind === 'REGULAR') {
      const [overlappingBooking] = await this.db.client<Booking[]>`
        SELECT 1
        FROM bookings
        WHERE table_id = ${dto.tableId}
          AND status IN ('HOLD', 'CONFIRMED')
          AND start_at < ${dto.endAt}
          AND end_at > ${dto.startAt}
      `;

      if (overlappingBooking) {
        throw new BadRequestException(
          'This table is already booked for the selected time',
        );
      }
    }

    if (table.kind === 'SHARED') {
      const [sharedLoad] = await this.db.client<{ occupied: number }[]>`
        SELECT COALESCE(SUM(guests), 0)::int AS occupied
        FROM bookings
        WHERE table_id = ${dto.tableId}
          AND status IN ('HOLD', 'CONFIRMED')
          AND start_at < ${dto.endAt}
          AND end_at > ${dto.startAt}
      `;

      const occupied = sharedLoad?.occupied ?? 0;

      if (occupied + dto.guests > table.capacity) {
        throw new BadRequestException(
          'Not enough free seats for the selected time',
        );
      }
    }

    const [booking] = await this.db.client<Booking[]>`
      INSERT INTO bookings (table_id, user_id, guests, start_at, end_at)
      VALUES (
        ${dto.tableId}, 
        ${userId}, 
        ${dto.guests}, 
        ${dto.startAt}, 
        ${dto.endAt})
      RETURNING *
    `;

    return booking;
  }

  public async findById(id: string) {
    const [booking] = await this.db.client<Booking[]>`
      SELECT * FROM bookings
      WHERE id = ${id}
    `;

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  public async findByUserId(userId: string) {
    return this.db.client<Booking[]>`
      SELECT * FROM bookings
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  }

  public async cancel(id: string) {
    const [booking] = await this.db.client<Booking[]>`
      SELECT * FROM bookings
      WHERE id = ${id}
    `;

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === 'EXPIRED') {
      throw new BadRequestException('Expired booking cannot be cancelled');
    }

    const [updatedBooking] = await this.db.client<Booking[]>`
      UPDATE bookings
      SET status = 'CANCELLED',
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    const userContact = await this.authClientService.getUserContact(
      updatedBooking.user_id,
    );

    const payload: BookingEventPayload = {
      bookingId: updatedBooking.id,
      userId: updatedBooking.user_id,
      tableId: updatedBooking.table_id,
      status: 'CANCELLED',
      startAt: updatedBooking.start_at,
      endAt: updatedBooking.end_at,
      email: userContact.found ? userContact.email || null : null,
      phone: userContact.found ? userContact.phone || null : null,
    };

    await this.rabbitMqService.publish(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CANCELLED_EVENT,
      payload,
    );

    return updatedBooking;
  }

  async confirm(id: string) {
    const [booking] = await this.db.client<Booking[]>`
      SELECT *
      FROM bookings
      WHERE id = ${id}
    `;

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CONFIRMED') {
      throw new BadRequestException('Booking is already confirmed');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled booking cannot be confirmed');
    }

    if (booking.status === 'EXPIRED') {
      throw new BadRequestException('Expired booking cannot be confirmed');
    }

    const [updatedBooking] = await this.db.client<Booking[]>`
      UPDATE bookings
      SET status = 'CONFIRMED',
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    const userContact = await this.authClientService.getUserContact(
      updatedBooking.user_id,
    );

    const payload: BookingEventPayload = {
      bookingId: updatedBooking.id,
      userId: updatedBooking.user_id,
      tableId: updatedBooking.table_id,
      status: 'CONFIRMED',
      startAt: updatedBooking.start_at,
      endAt: updatedBooking.end_at,
      email: userContact.found ? userContact.email || null : null,
      phone: userContact.found ? userContact.phone || null : null,
    };

    await this.rabbitMqService.publish(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CONFIRMED_EVENT,
      payload,
    );

    return updatedBooking;
  }
}
