import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TablesModule } from './modules/tables/tables.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RestaurantsModule,
    BookingsModule,
    TablesModule,
  ],
})
export class AppModule {}
