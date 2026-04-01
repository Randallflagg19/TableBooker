export type UserRole = 'GUEST' | 'ADMIN';

export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  refresh_token_hash: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};
