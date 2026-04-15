import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType, createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isAvailable = false;

  public constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    this.client = redisUrl
      ? createClient({
          url: redisUrl,
          socket: {
            reconnectStrategy: false,
            connectTimeout: 5000,
          },
        })
      : createClient({
          socket: {
            host: this.configService.getOrThrow<string>('REDIS_HOST'),
            port: Number(this.configService.getOrThrow<string>('REDIS_PORT')),
            reconnectStrategy: false,
            connectTimeout: 5000,
          },
        });

    this.client.on('error', (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';

      this.logger.error(message);
    });
  }

  public async onModuleInit() {
    try {
      await this.client.connect();
      this.isAvailable = true;
      this.logger.log('Redis connected');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown Redis connection error';

      this.logger.warn(`Redis unavailable, continuing without it: ${message}`);
      this.isAvailable = false;
    }
  }

  public async onModuleDestroy() {
    if (this.isAvailable) {
      await this.client.quit();
    }
  }

  public async increment(key: string, ttlSeconds: number): Promise<number> {
    if (!this.isAvailable) {
      return 1;
    }

    const value = await this.client.incr(key);

    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return value;
  }

  public async del(key: string): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    await this.client.del(key);
  }
}
