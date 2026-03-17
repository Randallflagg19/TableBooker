// bookings.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DbService } from '../../infrastructure/db/db.service';
import { CreateBookingDto } from './dto/create-booking.dto';

type RestaurantTableRow = {
  id: string;
  restaurant_id: string;
  code: string;
  capacity: number;
  kind: 'REGULAR' | 'SHARED';
  created_at: string;
  updated_at: string;
};

@Injectable()
export class BookingsService {
  constructor(private readonly db: DbService) {}

  public async create(dto: CreateBookingDto) {
    // Проверяем стол
    const [table] = await this.db.client<RestaurantTableRow[]>`
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
}
