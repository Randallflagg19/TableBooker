import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';

type AuthAction = 'register' | 'login' | 'refresh';

@Injectable()
export class AuthRateLimitService {
  private static readonly WINDOW_SECONDS = 60;

  private static readonly LIMITS: Record<AuthAction, number> = {
    register: 3,
    login: 5,
    refresh: 10,
  };

  public constructor(private readonly redis: RedisService) {}

  public async check(action: AuthAction, clientKey: string): Promise<void> {
    const key = `rate-limit:${action}:${clientKey}`;
    const limit = AuthRateLimitService.LIMITS[action];

    const attempts = await this.redis.increment(
      key,
      AuthRateLimitService.WINDOW_SECONDS,
    );

    if (attempts > limit) {
      throw new HttpException(
        `Too many ${action} attempts. Please try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
