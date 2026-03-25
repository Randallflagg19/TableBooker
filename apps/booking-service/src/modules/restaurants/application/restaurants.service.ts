import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { Restaurant } from '../infrastructure/restaurant.types';
import { Table } from '../../tables/infrastructure/tables.types';

@Injectable()
export class RestaurantsService {
  private static readonly CACHE_TTL = 300;

  constructor(
    private readonly db: DbService,
    private readonly redis: RedisService,
  ) {}

  public async findAll() {
    const cacheKey = 'restaurants:list';

    const cachedRestaurants = await this.redis.get<Restaurant[]>(cacheKey);

    if (cachedRestaurants) {
      return cachedRestaurants;
    }

    const restaurants = await this.db.client<Restaurant[]>`
    SELECT * FROM restaurants
  `;

    await this.redis.set(cacheKey, restaurants, RestaurantsService.CACHE_TTL);

    return restaurants;
  }

  public async findById(id: string) {
    const cacheKey = `restaurants:${id}`;

    const cachedRestaurant = await this.redis.get<Restaurant>(cacheKey);

    if (cachedRestaurant) {
      return cachedRestaurant;
    }

    const [restaurant] = await this.db.client<Restaurant[]>`
      SELECT * FROM restaurants
      WHERE id = ${id}
    `;

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    await this.redis.set(cacheKey, restaurant, RestaurantsService.CACHE_TTL);

    return restaurant;
  }

  public async findTablesByRestaurantId(restaurantId: string) {
    const cacheKey = `restaurants:${restaurantId}:tables`;

    const cachedTables = await this.redis.get<Table[]>(cacheKey);

    if (cachedTables) {
      return cachedTables;
    }
    const tables = await this.db.client<Table[]>`
      SELECT * FROM restaurant_tables
      WHERE restaurant_id = ${restaurantId}
    `;

    await this.redis.set(cacheKey, tables, RestaurantsService.CACHE_TTL);

    return tables;
  }
}
