import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';

type AuthAction = 'register' | 'login' | 'refresh';

@Injectable()
export class AuthRateLimitService {
  private static readonly WINDOW_SECONDS = 60;
  private static readonly CHECK_TIMEOUT_MS = 1000;

  private static readonly LIMITS: Record<AuthAction, number> = {
    register: 3,
    login: 5,
    refresh: 10,
  };

  private readonly logger = new Logger(AuthRateLimitService.name);

  public constructor(private readonly redis: RedisService) {}

  public async check(action: AuthAction, clientKey: string): Promise<void> {
    const key = `rate-limit:${action}:${clientKey}`;
    const limit = AuthRateLimitService.LIMITS[action];
    const attempts = await this.getAttemptsWithTimeout(key, action);

    if (attempts > limit) {
      throw new HttpException(
        `Too many ${action} attempts. Please try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async getAttemptsWithTimeout(
    key: string,
    action: AuthAction,
  ): Promise<number> {
    try {
      return await Promise.race([
        this.redis.increment(key, AuthRateLimitService.WINDOW_SECONDS),
        new Promise<number>((resolve) => {
          setTimeout(() => {
            this.logger.warn(
              `Rate limit check timed out for ${action}, allowing request`,
            );
            resolve(1);
          }, AuthRateLimitService.CHECK_TIMEOUT_MS);
        }),
      ]);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown rate limit check error';

      this.logger.warn(
        `Rate limit check failed for ${action}, allowing request: ${message}`,
      );

      return 1;
    }
  }
}
