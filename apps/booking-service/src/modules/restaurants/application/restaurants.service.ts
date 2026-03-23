import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';

import { RestaurantRow } from '../infrastructure/restaurant.types';

@Injectable()
export class RestaurantsService {
  constructor(private readonly db: DbService) {}

  public async findAll() {
    return this.db.client`SELECT * FROM restaurants`;
  }

  public async findById(id: string) {
    const [restaurant] = await this.db.client<RestaurantRow[]>`
      SELECT * FROM restaurants
      WHERE id = ${id}
    `;

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  public async findTablesByRestaurantId(restaurantId: string) {
    return this.db.client`
      SELECT * FROM restaurant_tables
      WHERE restaurant_id = ${restaurantId}
    `;
  }
}
