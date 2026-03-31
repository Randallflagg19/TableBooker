import { GrpcMethod } from '@nestjs/microservices';
import type {
  ValidateAccessTokenRequest,
  ValidateAccessTokenResponse,
  GetUserContactRequest,
  GetUserContactResponse,
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

  @GrpcMethod('AuthService', 'GetUserContact')
  public async getUserContact(
    data: GetUserContactRequest,
  ): Promise<GetUserContactResponse> {
    return this.authService.getUserContact(data.userId);
  }
}
