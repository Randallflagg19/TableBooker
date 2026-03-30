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
    const host = this.configService.getOrThrow<string>('RABBITMQ_HOST');
    const port = this.configService.getOrThrow<string>('RABBITMQ_PORT');

    this.connection = await amqp.connect(`amqp://${host}:${port}`);
    this.channel = await this.connection.createChannel();

    this.logger.log('RabbitMQ connected');
  }

  public async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }

  public getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    return this.channel;
  }
}
