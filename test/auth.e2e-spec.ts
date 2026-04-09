import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import argon2 from 'argon2';
import { AppModule } from '../apps/auth-service/src/app.module';
import { DbService } from '../apps/auth-service/src/infrastructure/db/db.service';
import { AuthRateLimitService } from '../apps/auth-service/src/modules/auth/application/auth-rate-limit.service';

type PublicUserDto = {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'GUEST' | 'ADMIN';
  created_at: string;
  updated_at: string;
};

type CurrentUserDto = {
  id: string;
  email: string | null;
  phone: string | null;
  role: 'GUEST' | 'ADMIN';
};

type AuthResponseDto = {
  accessToken: string;
  refreshToken: string;
  user: PublicUserDto;
};

type AccessTokenResponseDto = {
  accessToken: string;
};

type ErrorResponseDto = {
  message: string | string[];
  error: string;
  statusCode: number;
};

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  refresh_token_hash: string | null;
  role: 'GUEST' | 'ADMIN';
  created_at: string;
  updated_at: string;
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let httpApp: Parameters<typeof request>[0];
  let db: DbService;

  const authRateLimitServiceMock: Pick<AuthRateLimitService, 'check'> = {
    check: jest.fn(),
  };

  const createTestEmail = () =>
    `auth-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const createTestPhone = () => `+7999${Date.now().toString().slice(-7)}`;

  const createUserInDb = async (
    password: string,
    options?: {
      email?: string | null;
      phone?: string | null;
    },
  ) => {
    const passwordHash = await argon2.hash(password);

    const [user] = await db.client<UserRow[]>`
      INSERT INTO users (email, phone, password_hash)
      VALUES (${options?.email ?? null}, ${options?.phone ?? null}, ${passwordHash})
      RETURNING *
    `;

    return user;
  };

  const login = async (credentials: {
    email?: string;
    phone?: string;
    password: string;
  }) => {
    const response: Response = await request(httpApp)
      .post('/auth/login')
      .send(credentials)
      .expect(201);

    return response.body as AuthResponseDto;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthRateLimitService)
      .useValue(authRateLimitServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    httpApp = app.getHttpAdapter().getInstance() as Parameters<
      typeof request
    >[0];
    db = app.get(DbService);
  });

  afterAll(async () => {
    await db.client`
      DELETE FROM users
      WHERE email LIKE 'auth-e2e-%@example.com'
        OR phone LIKE '+7999000%'
    `;

    await app.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();

    await db.client`
      DELETE FROM users
      WHERE email LIKE 'auth-e2e-%@example.com'
        OR phone LIKE '+7999000%'
    `;
  });

  it('POST /auth/register creates a new user', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const user = response.body as PublicUserDto;

    expect(typeof user.id).toBe('string');
    expect(user.email).toBe(email);
    expect(user.phone).toBeNull();
    expect(user.role).toBe('GUEST');
    expect(typeof user.created_at).toBe('string');
    expect(typeof user.updated_at).toBe('string');
  });

  it('POST /auth/register rejects duplicate email', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await request(httpApp)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(409);

    const error = response.body as ErrorResponseDto;

    expect(error.message).toBe('User with this email already exists');
  });

  it('POST /auth/login returns access and refresh tokens', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await createUserInDb(password, { email });

    const response: Response = await request(httpApp)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const authResponse = response.body as AuthResponseDto;

    expect(typeof authResponse.accessToken).toBe('string');
    expect(typeof authResponse.refreshToken).toBe('string');
    expect(authResponse.user.email).toBe(email);
    expect(authResponse.user.phone).toBeNull();
    expect(authResponse.user.role).toBe('GUEST');
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await createUserInDb(password, { email });

    const response: Response = await request(httpApp)
      .post('/auth/login')
      .send({
        email,
        password: 'wrongPass123',
      })
      .expect(401);

    const error = response.body as ErrorResponseDto;

    expect(error.message).toBe('Invalid credentials');
  });

  it('GET /auth/me returns current user for valid access token', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    const user = await createUserInDb(password, { email });
    const authResponse = await login({ email, password });

    const response: Response = await request(httpApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authResponse.accessToken}`)
      .expect(200);

    const currentUser = response.body as CurrentUserDto;

    expect(currentUser.id).toBe(user.id);
    expect(currentUser.email).toBe(email);
    expect(currentUser.phone).toBeNull();
    expect(currentUser.role).toBe('GUEST');
  });

  it('POST /auth/refresh returns a valid access token', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await createUserInDb(password, { email });
    const authResponse = await login({ email, password });

    const response: Response = await request(httpApp)
      .post('/auth/refresh')
      .send({
        refreshToken: authResponse.refreshToken,
      })
      .expect(201);

    const refreshResponse = response.body as AccessTokenResponseDto;

    expect(typeof refreshResponse.accessToken).toBe('string');

    const meResponse: Response = await request(httpApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshResponse.accessToken}`)
      .expect(200);

    const currentUser = meResponse.body as {
      id: string;
      email: string | null;
      phone: string | null;
      role: 'GUEST' | 'ADMIN';
    };

    expect(currentUser.email).toBe(email);
    expect(currentUser.phone).toBeNull();
    expect(currentUser.role).toBe('GUEST');
  });

  it('POST /auth/logout invalidates refresh token', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await createUserInDb(password, { email });
    const authResponse = await login({ email, password });

    const logoutResponse: Response = await request(httpApp)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${authResponse.accessToken}`)
      .expect(201);

    expect(logoutResponse.body).toEqual({
      message: 'Logged out successfully',
    });

    const refreshResponse: Response = await request(httpApp)
      .post('/auth/refresh')
      .send({
        refreshToken: authResponse.refreshToken,
      })
      .expect(401);

    const error = refreshResponse.body as ErrorResponseDto;

    expect(error.message).toBe('Invalid refresh token');
  });

  it('GET /auth/me rejects invalid access token', async () => {
    const response: Response = await request(httpApp)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-access-token')
      .expect(401);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('POST /auth/refresh rejects invalid refresh token', async () => {
    const response: Response = await request(httpApp)
      .post('/auth/refresh')
      .send({
        refreshToken: 'invalid-refresh-token',
      })
      .expect(401);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid refresh token');
  });

  it('POST /auth/register creates a new user with phone only', async () => {
    const phone = createTestPhone();
    const password = 'strongPass123';

    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        phone,
        password,
      })
      .expect(201);

    const user = response.body as PublicUserDto;

    expect(typeof user.id).toBe('string');
    expect(user.email).toBeNull();
    expect(user.phone).toBe(phone);
    expect(user.role).toBe('GUEST');
  });

  it('POST /auth/register creates a new user with email and phone', async () => {
    const email = createTestEmail();
    const phone = createTestPhone();
    const password = 'strongPass123';

    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        email,
        phone,
        password,
      })
      .expect(201);

    const user = response.body as PublicUserDto;

    expect(user.email).toBe(email);
    expect(user.phone).toBe(phone);
    expect(user.role).toBe('GUEST');
  });

  it('POST /auth/register rejects request when email and phone are missing', async () => {
    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        password: 'strongPass123',
      })
      .expect(400);

    const error = response.body as ErrorResponseDto;

    expect(Array.isArray(error.message)).toBe(true);
    expect(error.message).toContain('Either email or phone must be provided');
  });

  it('POST /auth/register rejects duplicate phone', async () => {
    const phone = createTestPhone();
    const password = 'strongPass123';

    await request(httpApp)
      .post('/auth/register')
      .send({
        phone,
        password,
      })
      .expect(201);

    const response: Response = await request(httpApp)
      .post('/auth/register')
      .send({
        phone,
        password,
      })
      .expect(409);

    const error = response.body as ErrorResponseDto;

    expect(error.message).toBe('User with this phone already exists');
  });

  it('POST /auth/login returns access and refresh tokens for phone login', async () => {
    const phone = createTestPhone();
    const password = 'strongPass123';

    await createUserInDb(password, { phone });

    const response: Response = await request(httpApp)
      .post('/auth/login')
      .send({
        phone,
        password,
      })
      .expect(201);

    const authResponse = response.body as AuthResponseDto;

    expect(typeof authResponse.accessToken).toBe('string');
    expect(typeof authResponse.refreshToken).toBe('string');
    expect(authResponse.user.email).toBeNull();
    expect(authResponse.user.phone).toBe(phone);
    expect(authResponse.user.role).toBe('GUEST');
  });

  it('GET /auth/me returns phone for phone-only user', async () => {
    const phone = createTestPhone();
    const password = 'strongPass123';

    const user = await createUserInDb(password, { phone });
    const authResponse = await login({
      phone,
      password,
    });

    const response: Response = await request(httpApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authResponse.accessToken}`)
      .expect(200);

    const currentUser = response.body as CurrentUserDto;

    expect(currentUser.id).toBe(user.id);
    expect(currentUser.email).toBeNull();
    expect(currentUser.phone).toBe(phone);
    expect(currentUser.role).toBe('GUEST');
  });
});
