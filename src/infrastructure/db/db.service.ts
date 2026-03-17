import { Injectable, OnModuleDestroy } from '@nestjs/common';
import postgres, { type Sql } from 'postgres';

@Injectable()
export class DbService implements OnModuleDestroy {
  public readonly client: Sql;

  public constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }

    this.client = postgres(process.env.DATABASE_URL);
  }

  public async onModuleDestroy() {
    await this.client.end();
  }
}
