import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { PublicUser, User } from '../infrastructure/user.type';
import argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../infrastructure/jwt-payload.type';
import {
  ValidateAccessTokenResponse,
  GetUserContactResponse,
} from '../infrastructure/auth-grpc.type';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async validateAccessToken(
    accessToken: string,
  ): Promise<ValidateAccessTokenResponse> {
    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        accessToken,
        {
          secret: accessSecret,
        },
      );
      return {
        isValid: true,
        userId: payload.sub,
        email: payload.email ?? '',
        role: payload.role,
      };
    } catch {
      return {
        isValid: false,
        userId: '',
        email: '',
        role: '',
      };
    }
  }

  public async register(dto: RegisterDto): Promise<PublicUser> {
    if (dto.email) {
      const [existingUserByEmail] = await this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE email = ${dto.email}
      `;

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (dto.phone) {
      const [existingUserByPhone] = await this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE phone = ${dto.phone}
      `;

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const [user] = await this.db.client<User[]>`
      INSERT INTO users (email, phone, password_hash)
      VALUES (${dto.email ?? null}, ${dto.phone ?? null}, ${passwordHash})
      RETURNING *
    `;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  public async login(dto: LoginDto): Promise<AuthResponse> {
    let user: User | undefined;

    if (dto.email) {
      [user] = await this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE email = ${dto.email}
      `;
    } else if (dto.phone) {
      [user] = await this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE phone = ${dto.phone}
      `;
    }

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.password_hash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: 15 * 60,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: 7 * 24 * 60 * 60,
    });

    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.db.client`
      UPDATE users
      SET refresh_token_hash = ${refreshTokenHash},
          updated_at = now()
      WHERE id = ${user.id}
    `;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  public async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [user] = await this.db.client<User[]>`
      SELECT *
      FROM users
      WHERE id = ${payload.sub}
    `;

    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await argon2.verify(
      user.refresh_token_hash,
      dto.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      {
        secret: accessSecret,
        expiresIn: 15 * 60,
      },
    );

    return {
      accessToken: newAccessToken,
    };
  }

  public async logout(userId: string): Promise<{ message: string }> {
    await this.db.client`
      UPDATE users
      SET refresh_token_hash = NULL,
          updated_at = now()
      WHERE id = ${userId}
    `;

    return {
      message: 'Logged out successfully',
    };
  }

  public async getUserContact(userId: string): Promise<GetUserContactResponse> {
    const [user] = await this.db.client<User[]>`
      SELECT *
      FROM users
      WHERE id = ${userId}
    `;

    if (!user) {
      return {
        found: false,
        email: '',
        phone: '',
      };
    }

    return {
      found: true,
      email: user.email ?? '',
      phone: user.phone ?? '',
    };
  }
}
