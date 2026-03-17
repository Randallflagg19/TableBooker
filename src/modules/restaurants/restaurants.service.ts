import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/db/db.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly db: DbService) {}

  public async findAll() {
    return this.db.client`SELECT * FROM restaurants`;
  }

  public async findTablesByRestaurantId(restaurantId: string) {
    return this.db.client`
      SELECT * FROM restaurant_tables
      WHERE restaurant_id = ${restaurantId}
    `;
  }
}
