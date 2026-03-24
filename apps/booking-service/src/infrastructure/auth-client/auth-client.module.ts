import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AuthClientService } from './auth-client.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'AUTH_GRPC_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(process.cwd(), 'proto', 'auth.proto'),
            url: `${configService.getOrThrow<string>('AUTH_SERVICE_GRPC_HOST')}:${configService.getOrThrow<string>('AUTH_SERVICE_GRPC_PORT')}`,
          },
        }),
      },
    ]),
  ],
  providers: [AuthClientService],
  exports: [AuthClientService],
})
export class AuthClientModule {}
