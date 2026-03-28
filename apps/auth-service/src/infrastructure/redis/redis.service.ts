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

  public constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('REDIS_HOST');
    const port = Number(this.configService.getOrThrow<string>('REDIS_PORT'));

    this.client = createClient({
      socket: {
        host,
        port,
      },
    });

    this.client.on('error', (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';

      this.logger.error(message);
    });
  }

  public async onModuleInit() {
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  public async onModuleDestroy() {
    await this.client.quit();
  }

  public async increment(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);

    if (value === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return value;
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
