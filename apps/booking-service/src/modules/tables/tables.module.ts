import { Module } from '@nestjs/common';
import { TablesService } from './application/tables.service';
import { TablesController } from './interfaces/tables.controller';
import { DbModule } from '../../infrastructure/db/db.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';

@Module({
  imports: [DbModule, RedisModule],
  providers: [TablesService],
  controllers: [TablesController],
})
export class TablesModule {}
