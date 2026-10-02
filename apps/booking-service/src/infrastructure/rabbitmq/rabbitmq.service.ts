import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel } from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  public constructor(private readonly configService: ConfigService) {}

  public async onModuleInit() {
    const rabbitMqUrl = this.configService.get<string>('RABBITMQ_URL');
    const connectionTarget = rabbitMqUrl
      ? rabbitMqUrl
      : `amqp://${this.configService.getOrThrow<string>('RABBITMQ_HOST')}:${this.configService.getOrThrow<string>('RABBITMQ_PORT')}`;

    try {
      this.connection = await amqp.connect(connectionTarget);
      this.attachConnectionHandlers(this.connection);

      this.channel = await this.connection.createChannel();
      this.attachChannelHandlers(this.channel);

      this.logger.log('RabbitMQ connected');
    } catch (error) {
      this.connection = null;
      this.channel = null;
      this.logger.error(
        'RabbitMQ connection failed. Booking service will continue without event publishing.',
      );
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }

  public async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }

  public async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn(
        `RabbitMQ channel is not initialized. Skipping publish for ${routingKey}.`,
      );
      return;
    }

    await this.channel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
      },
    );
  }

  private attachConnectionHandlers(connection: ChannelModel) {
    connection.on('error', (error) => {
      this.logger.error(
        `RabbitMQ connection error: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    connection.on('close', () => {
      this.logger.warn('RabbitMQ connection closed');
      this.connection = null;
      this.channel = null;
    });
  }

  private attachChannelHandlers(channel: Channel) {
    channel.on('error', (error) => {
      this.logger.error(
        `RabbitMQ channel error: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    channel.on('close', () => {
      this.logger.warn('RabbitMQ channel closed');
      this.channel = null;
    });
  }
}
