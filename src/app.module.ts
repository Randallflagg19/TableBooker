import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TablesModule } from './modules/tables/tables.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    RestaurantsModule,
    BookingsModule,
    TablesModule,
  ],
})
export class AppModule {}
