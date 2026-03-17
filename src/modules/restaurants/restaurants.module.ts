import { Module } from '@nestjs/common';
import { RestaurantsService } from './application/restaurants.service';
import { RestaurantsController } from './interfaces/restaurants.controller';
import { DbModule } from '../../infrastructure/db/db.module';

@Module({
  imports: [DbModule],
  providers: [RestaurantsService],
  controllers: [RestaurantsController],
})
export class RestaurantsModule {}
