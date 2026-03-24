import type { Observable } from 'rxjs';

export type ValidateAccessTokenRequest = {
  accessToken: string;
};

export type ValidateAccessTokenResponse = {
  isValid: boolean;
  userId: string;
  email: string;
  role: string;
};

export type AuthGrpcService = {
  ValidateAccessToken(
    data: ValidateAccessTokenRequest,
  ): Observable<ValidateAccessTokenResponse>;
};
