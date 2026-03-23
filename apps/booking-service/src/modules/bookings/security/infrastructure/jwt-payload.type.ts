import { UserRole } from './user.type';

export type JwtPayload = {
  sub: string;
  email: string | null;
  role: UserRole;
};

export type CurrentUserData = {
  id: string;
  email: string | null;
  role: UserRole;
};
