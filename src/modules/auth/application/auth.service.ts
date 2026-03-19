import {
  ConflictException,
  Injectable,
  NotImplementedException,
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

  public async register(dto: RegisterDto): Promise<PublicUser> {
    const [existingUser] = await this.db.client<User[]>`
      SELECT *
      FROM users
      WHERE email = ${dto.email}
    `;

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const [user] = await this.db.client<User[]>`
      INSERT INTO users (email, password_hash)
      VALUES (${dto.email}, ${passwordHash})
      RETURNING *
    `;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  public async login(dto: LoginDto): Promise<AuthResponse> {
    const [user] = await this.db.client<User[]>`
      SELECT *
      FROM users
      WHERE email = ${dto.email}
    `;

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
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  public async refresh(_dto: RefreshTokenDto) {
    throw new NotImplementedException('Refresh is not implemented yet');
  }
}
