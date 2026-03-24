import { GrpcMethod } from '@nestjs/microservices';
import type {
  ValidateAccessTokenRequest,
  ValidateAccessTokenResponse,
} from '../infrastructure/auth-grpc.type';
import { AuthService } from '../application/auth.service';
import { Controller } from '@nestjs/common';

@Controller()
export class AuthGrpcController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'ValidateAccessToken')
  public async validateAccessToken(
    data: ValidateAccessTokenRequest,
  ): Promise<ValidateAccessTokenResponse> {
    return this.authService.validateAccessToken(data.accessToken);
  }
}
