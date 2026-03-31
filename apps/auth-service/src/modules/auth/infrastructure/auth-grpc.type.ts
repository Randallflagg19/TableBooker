export type ValidateAccessTokenRequest = {
  accessToken: string;
};

export type ValidateAccessTokenResponse = {
  isValid: boolean;
  userId: string;
  email: string;
  role: string;
};

export type GetUserContactRequest = {
  userId: string;
};

export type GetUserContactResponse = {
  found: boolean;
  email: string;
  phone: string;
};
