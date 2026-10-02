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
  private static readonly COMMAND_TIMEOUT_MS = 1500;
  private client: RedisClientType;
  private isAvailable = false;
  private reconnectInFlight: Promise<void> | null = null;

  public constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    this.client = redisUrl
      ? createClient({
          url: redisUrl,
          socket: {
            reconnectStrategy: (retries: number) =>
              Math.min(1000 * Math.max(retries, 1), 5000),
            connectTimeout: 5000,
          },
        })
      : createClient({
          socket: {
            host: this.configService.getOrThrow<string>('REDIS_HOST'),
            port: Number(this.configService.getOrThrow<string>('REDIS_PORT')),
            reconnectStrategy: (retries: number) =>
              Math.min(1000 * Math.max(retries, 1), 5000),
            connectTimeout: 5000,
          },
        });

    this.client.on('connect', () => {
      this.logger.log('Redis connecting');
    });

    this.client.on('ready', () => {
      this.isAvailable = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';

      this.isAvailable = false;
      this.logger.error(message);
    });

    this.client.on('end', () => {
      this.isAvailable = false;
      this.logger.error('Socket closed unexpectedly');
    });
  }

  public onModuleInit(): void {
    void this.ensureConnection();
  }

  public async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  public async increment(key: string, ttlSeconds: number): Promise<number> {
    const didConnect = await this.ensureConnection();

    if (!didConnect) {
      return 1;
    }

    try {
      const value = await this.withTimeout(
        this.client.incr(key),
        'Redis increment timed out',
      );

      if (value === 1) {
        await this.withTimeout(
          this.client.expire(key, ttlSeconds),
          'Redis expire timed out',
        );
      }

      return value;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown Redis increment error';

      this.isAvailable = false;
      this.logger.warn(
        `Redis increment failed, bypassing rate limit: ${message}`,
      );
      void this.ensureConnection();

      return 1;
    }
  }

  public async del(key: string): Promise<void> {
    const didConnect = await this.ensureConnection();

    if (!didConnect) {
      return;
    }

    try {
      await this.withTimeout(this.client.del(key), 'Redis delete timed out');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown Redis delete error';

      this.isAvailable = false;
      this.logger.warn(`Redis delete failed, skipping: ${message}`);
      void this.ensureConnection();
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (this.client.isReady) {
      this.isAvailable = true;
      return true;
    }

    if (this.reconnectInFlight) {
      await this.reconnectInFlight;
      return this.client.isReady;
    }

    this.reconnectInFlight = this.withTimeout(
      this.client.connect(),
      'Redis connect timed out',
    )
      .then(() => {
        this.isAvailable = true;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown Redis connection error';

        this.isAvailable = false;
        this.logger.warn(
          `Redis unavailable, continuing without it: ${message}`,
        );
      })
      .finally(() => {
        this.reconnectInFlight = null;
      });

    await this.reconnectInFlight;

    return this.client.isReady;
  }

  private async withTimeout<T>(
    operation: Promise<T>,
    timeoutMessage: string,
  ): Promise<T> {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        setTimeout(
          () => reject(new Error(timeoutMessage)),
          RedisService.COMMAND_TIMEOUT_MS,
        );
      }),
    ]);
  }
}
