import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DbService } from '../../../infrastructure/db/db.service';
import { LoginDto } from '../dto/login.dto';
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
  private static readonly OPERATION_TIMEOUT_MS = 5000;
  private readonly logger = new Logger(AuthService.name);

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
      const [existingUserByEmail] = await this.withTimeout(
        this.db.client<User[]>`
          SELECT *
          FROM users
          WHERE email = ${dto.email}
        `,
        'register:select-user-by-email',
      );

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (dto.phone) {
      const [existingUserByPhone] = await this.withTimeout(
        this.db.client<User[]>`
          SELECT *
          FROM users
          WHERE phone = ${dto.phone}
        `,
        'register:select-user-by-phone',
      );

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    const passwordHash = await this.withTimeout(
      argon2.hash(dto.password),
      'register:argon2-hash-password',
    );

    const [user] = await this.withTimeout(
      this.db.client<User[]>`
        INSERT INTO users (email, phone, password_hash)
        VALUES (${dto.email ?? null}, ${dto.phone ?? null}, ${passwordHash})
        RETURNING *
      `,
      'register:insert-user',
    );

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
      [user] = await this.withTimeout(
        this.db.client<User[]>`
          SELECT *
          FROM users
          WHERE email = ${dto.email}
        `,
        'login:select-user-by-email',
      );
    } else if (dto.phone) {
      [user] = await this.withTimeout(
        this.db.client<User[]>`
          SELECT *
          FROM users
          WHERE phone = ${dto.phone}
        `,
        'login:select-user-by-phone',
      );
    }

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.withTimeout(
      argon2.verify(user.password_hash, dto.password),
      'login:argon2-verify-password',
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

    const accessToken = await this.withTimeout(
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: 15 * 60,
      }),
      'login:sign-access-token',
    );

    const refreshToken = await this.withTimeout(
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: 7 * 24 * 60 * 60,
      }),
      'login:sign-refresh-token',
    );

    const refreshTokenHash = await this.withTimeout(
      argon2.hash(refreshToken),
      'login:argon2-hash-refresh-token',
    );

    await this.withTimeout(
      this.db.client`
        UPDATE users
        SET refresh_token_hash = ${refreshTokenHash},
            updated_at = now()
        WHERE id = ${user.id}
      `,
      'login:update-refresh-token-hash',
    );

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

  public async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [user] = await this.withTimeout(
      this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE id = ${payload.sub}
      `,
      'refresh:select-user-by-id',
    );

    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await this.withTimeout(
      argon2.verify(user.refresh_token_hash, refreshToken),
      'refresh:argon2-verify-refresh-token',
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    const newAccessToken = await this.withTimeout(
      this.jwtService.signAsync(
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
      ),
      'refresh:sign-access-token',
    );

    return {
      accessToken: newAccessToken,
    };
  }

  public async logout(userId: string): Promise<{ message: string }> {
    await this.withTimeout(
      this.db.client`
        UPDATE users
        SET refresh_token_hash = NULL,
            updated_at = now()
        WHERE id = ${userId}
      `,
      'logout:clear-refresh-token-hash',
    );

    return {
      message: 'Logged out successfully',
    };
  }

  public async getUserContact(userId: string): Promise<GetUserContactResponse> {
    const [user] = await this.withTimeout(
      this.db.client<User[]>`
        SELECT *
        FROM users
        WHERE id = ${userId}
      `,
      'grpc:get-user-contact',
    );

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

  private async withTimeout<T>(
    operation: Promise<T>,
    step: string,
  ): Promise<T> {
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_, reject) => {
          setTimeout(
            () => reject(new Error(`${step} timed out`)),
            AuthService.OPERATION_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Auth operation failed at ${step}: ${message}`);

      throw new ServiceUnavailableException(`Auth operation failed at ${step}`);
    }
  }
}
