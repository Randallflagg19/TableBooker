import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { Table } from '../infrastructure/tables.types';
import { RedisService } from '../../../infrastructure/redis/redis.service';

@Injectable()
export class TablesService {
  private static readonly CACHE_TTL = 300;

  constructor(
    private readonly db: DbService,
    private readonly redis: RedisService,
  ) {}

  public async findById(id: string) {
    const cacheKey = `tables:${id}`;

    const cachedTable = await this.redis.get<Table>(cacheKey);

    if (cachedTable) {
      return cachedTable;
    }

    const [table] = await this.db.client<Table[]>`
      SELECT * FROM restaurant_tables
      WHERE id = ${id}
    `;

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    await this.redis.set(cacheKey, table, TablesService.CACHE_TTL);

    return table;
  }
}
