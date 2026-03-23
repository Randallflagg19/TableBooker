import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { TableRow } from '../interfaces/tables.types';

@Injectable()
export class TablesService {
  constructor(private readonly db: DbService) {}

  public async findById(id: string) {
    const [table] = await this.db.client<TableRow[]>`
      SELECT * FROM restaurant_tables
      WHERE id = ${id}
    `;

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }
}
