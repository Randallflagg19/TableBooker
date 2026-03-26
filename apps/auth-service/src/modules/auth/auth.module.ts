import { Module } from '@nestjs/common';
import { DbModule } from '../../infrastructure/db/db.module';
import { AuthService } from './application/auth.service';
import { AuthController } from './interfaces/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGrpcController } from './interfaces/auth.grpc.controller';
import { AuthRateLimitService } from './application/auth-rate-limit.service';
import { RedisModule } from '../../infrastructure/redis/redis.module';

@Module({
  imports: [
    DbModule,
    ConfigModule,
    PassportModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, AuthGrpcController],
  providers: [AuthService, JwtStrategy, AuthRateLimitService],
})
export class AuthModule {}
