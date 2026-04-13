import { authApi } from './client';

export type LoginPayload = {
  email?: string;
  phone?: string;
  password: string;
};

export type RegisterPayload = {
  email?: string;
  phone?: string;
  password: string;
};

export type PublicUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'GUEST' | 'ADMIN';
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  accessToken: string;
  user: PublicUser;
};

export type RefreshResponse = {
  accessToken: string;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'GUEST' | 'ADMIN';
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<PublicUser> {
  const response = await authApi.post<PublicUser>('/auth/register', payload);
  return response.data;
}

export async function refreshTokens(): Promise<RefreshResponse> {
  const response = await authApi.post<RefreshResponse>('/auth/refresh');

  return response.data;
}

export async function getMe(accessToken: string): Promise<CurrentUser> {
  const response = await authApi.get<CurrentUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

export async function logout(
  accessToken: string,
): Promise<{ message: string }> {
  const response = await authApi.post<{ message: string }>(
    '/auth/logout',
    undefined,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
}
