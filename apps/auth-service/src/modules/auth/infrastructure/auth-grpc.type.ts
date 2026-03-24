export type ValidateAccessTokenRequest = {
  accessToken: string;
};

export type ValidateAccessTokenResponse = {
  isValid: boolean;
  userId: string;
  email: string;
  role: string;
};
