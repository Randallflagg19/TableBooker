import { Module } from '@nestjs/common';
import { RestaurantsService } from './application/restaurants.service';
import { RestaurantsController } from './interfaces/restaurants.controller';
import { DbModule } from '../../infrastructure/db/db.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';

@Module({
  imports: [DbModule, RedisModule],
  providers: [RestaurantsService],
  controllers: [RestaurantsController],
})
export class RestaurantsModule {}
