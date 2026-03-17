import { Module } from '@nestjs/common';
import { TablesService } from './application/tables.service';
import { TablesController } from './infrastructure/tables.controller';
import { DbModule } from '../../infrastructure/db/db.module';

@Module({
  imports: [DbModule],
  providers: [TablesService],
  controllers: [TablesController],
})
export class TablesModule {}
