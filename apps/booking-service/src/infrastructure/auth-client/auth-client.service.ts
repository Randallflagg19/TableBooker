import {
  Inject,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type {
  AuthGrpcService,
  ValidateAccessTokenResponse,
} from './auth-client.types';

@Injectable()
export class AuthClientService implements OnModuleInit {
  private authGrpcService: AuthGrpcService;

  constructor(
    @Inject('AUTH_GRPC_CLIENT')
    private readonly client: ClientGrpc,
  ) {}

  public onModuleInit() {
    this.authGrpcService =
      this.client.getService<AuthGrpcService>('AuthService');
  }

  public async validateAccessToken(
    accessToken: string,
  ): Promise<ValidateAccessTokenResponse> {
    try {
      return await firstValueFrom(
        this.authGrpcService.ValidateAccessToken({ accessToken }),
      );
    } catch {
      throw new ServiceUnavailableException('Auth service is unavailable');
    }
  }
}
