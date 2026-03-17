import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { Booking } from '../infrastructure/booking.type';
import { RestaurantTable } from '../infrastructure/restaurant-table.type';

@Injectable()
export class BookingsService {
  constructor(private readonly db: DbService) {}

  public async create(dto: CreateBookingDto) {
    // Проверяем стол
    const [table] = await this.db.client<RestaurantTable[]>`
      SELECT * FROM restaurant_tables WHERE id = ${dto.tableId}
    `;

    if (!table) {
      throw new BadRequestException('Table not found');
    }

    if (dto.guests > table.capacity) {
      throw new BadRequestException('Too many guests for this table');
    }

    // Создаём бронь (без проверки пересечений пока)
    const [booking] = await this.db.client`
      INSERT INTO bookings (table_id, user_id, guests, start_at, end_at)
      VALUES (${dto.tableId}, ${dto.userId}, ${dto.guests}, ${dto.startAt}, ${dto.endAt})
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
}
