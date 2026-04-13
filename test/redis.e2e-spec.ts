import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule as AuthAppModule } from '../apps/auth-service/src/app.module';
import { AppModule as BookingAppModule } from '../apps/booking-service/src/app.module';
import { DbService as AuthDbService } from '../apps/auth-service/src/infrastructure/db/db.service';
import { RedisService as AuthRedisService } from '../apps/auth-service/src/infrastructure/redis/redis.service';
import { RedisService as BookingRedisService } from '../apps/booking-service/src/infrastructure/redis/redis.service';
import cookieParser from 'cookie-parser';
import type { RequestHandler } from 'express';

type ErrorResponseDto = {
  message: string | string[];
  error: string;
  statusCode: number;
};

type AuthResponseDto = {
  accessToken: string;
  user: {
    id: string;
    email: string | null;
    role: 'GUEST' | 'ADMIN';
    created_at: string;
    updated_at: string;
  };
};

type RestaurantDto = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

type RestaurantTableDto = {
  id: string;
  restaurant_id: string;
  code: string;
  capacity: number;
  kind: 'REGULAR' | 'SHARED';
  created_at: string;
  updated_at: string;
};

describe('Redis integration (e2e)', () => {
  let authApp: INestApplication;
  let bookingApp: INestApplication;
  let authHttpServer: Parameters<typeof request>[0];
  let bookingHttpServer: Parameters<typeof request>[0];
  let authDb: AuthDbService;
  let authRedis: AuthRedisService;
  let bookingRedis: BookingRedisService;

  const clearRateLimitKeys = async () => {
    await authRedis.del('rate-limit:register:::ffff:127.0.0.1');
    await authRedis.del('rate-limit:register:::1');
    await authRedis.del('rate-limit:login:::ffff:127.0.0.1');
    await authRedis.del('rate-limit:login:::1');
    await authRedis.del('rate-limit:refresh:::ffff:127.0.0.1');
    await authRedis.del('rate-limit:refresh:::1');
  };

  const createTestEmail = () =>
    `redis-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const extractCookies = (response: Response): string[] => {
    const setCookieHeader: unknown = response.headers['set-cookie'];

    if (Array.isArray(setCookieHeader)) {
      return setCookieHeader.filter(
        (cookie): cookie is string => typeof cookie === 'string',
      );
    }

    if (typeof setCookieHeader === 'string') {
      return [setCookieHeader];
    }

    return [];
  };

  beforeAll(async () => {
    const authModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthAppModule],
    }).compile();

    authApp = authModuleFixture.createNestApplication();

    const cookieParserMiddleware: RequestHandler = cookieParser();
    authApp.use(cookieParserMiddleware);

    authApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await authApp.init();

    authHttpServer = authApp.getHttpServer() as Parameters<typeof request>[0];
    authDb = authApp.get(AuthDbService);
    authRedis = authApp.get(AuthRedisService);

    const bookingModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [BookingAppModule],
    }).compile();

    bookingApp = bookingModuleFixture.createNestApplication();

    bookingApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await bookingApp.init();

    bookingHttpServer = bookingApp.getHttpServer() as Parameters<
      typeof request
    >[0];
    bookingRedis = bookingApp.get(BookingRedisService);

    await clearRateLimitKeys();
  });

  afterAll(async () => {
    await authDb.client`
      DELETE FROM users
      WHERE email LIKE 'redis-e2e-%@example.com'
    `;

    await authApp.close();
    await bookingApp.close();
  });

  afterEach(async () => {
    await authDb.client`
      DELETE FROM users
      WHERE email LIKE 'redis-e2e-%@example.com'
    `;

    await clearRateLimitKeys();

    await bookingRedis.del('restaurants:list');
  });

  it('returns 429 after exceeding register rate limit', async () => {
    const password = 'strongPass123';

    for (let i = 0; i < 3; i += 1) {
      await request(authHttpServer)
        .post('/auth/register')
        .send({
          email: createTestEmail(),
          password,
        })
        .expect(201);
    }

    const response: Response = await request(authHttpServer)
      .post('/auth/register')
      .send({
        email: createTestEmail(),
        password,
      })
      .expect(429);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(429);
    expect(error.message).toBe(
      'Too many register attempts. Please try again later.',
    );
  });

  it('GET /restaurants returns the same data shape on repeated requests with Redis enabled', async () => {
    const firstResponse: Response = await request(bookingHttpServer)
      .get('/restaurants')
      .expect(200);

    const firstRestaurants = firstResponse.body as RestaurantDto[];

    expect(Array.isArray(firstRestaurants)).toBe(true);
    expect(firstRestaurants.length).toBeGreaterThan(0);
    expect(typeof firstRestaurants[0].id).toBe('string');
    expect(typeof firstRestaurants[0].name).toBe('string');
    expect(typeof firstRestaurants[0].slug).toBe('string');

    const secondResponse: Response = await request(bookingHttpServer)
      .get('/restaurants')
      .expect(200);

    const secondRestaurants = secondResponse.body as RestaurantDto[];

    expect(secondRestaurants).toEqual(firstRestaurants);
  });

  it('GET /restaurants/:id/tables returns the same data shape on repeated requests with Redis enabled', async () => {
    const restaurantsResponse: Response = await request(bookingHttpServer)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const restaurantId = restaurants[0].id;

    const firstResponse: Response = await request(bookingHttpServer)
      .get(`/restaurants/${restaurantId}/tables`)
      .expect(200);

    const firstTables = firstResponse.body as RestaurantTableDto[];

    expect(Array.isArray(firstTables)).toBe(true);
    expect(firstTables.length).toBeGreaterThan(0);
    expect(typeof firstTables[0].id).toBe('string');
    expect(firstTables[0].restaurant_id).toBe(restaurantId);

    const secondResponse: Response = await request(bookingHttpServer)
      .get(`/restaurants/${restaurantId}/tables`)
      .expect(200);

    const secondTables = secondResponse.body as RestaurantTableDto[];

    expect(secondTables).toEqual(firstTables);
  });

  it('GET /restaurants/:id returns the same data on repeated requests with Redis enabled', async () => {
    const restaurantsResponse: Response = await request(bookingHttpServer)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const restaurantId = restaurants[0].id;

    const firstResponse: Response = await request(bookingHttpServer)
      .get(`/restaurants/${restaurantId}`)
      .expect(200);

    const firstRestaurant = firstResponse.body as RestaurantDto;

    expect(firstRestaurant.id).toBe(restaurantId);
    expect(typeof firstRestaurant.name).toBe('string');
    expect(typeof firstRestaurant.slug).toBe('string');
    expect(typeof firstRestaurant.created_at).toBe('string');
    expect(typeof firstRestaurant.updated_at).toBe('string');

    const secondResponse: Response = await request(bookingHttpServer)
      .get(`/restaurants/${restaurantId}`)
      .expect(200);

    const secondRestaurant = secondResponse.body as RestaurantDto;

    expect(secondRestaurant).toEqual(firstRestaurant);
  });

  it('GET /tables/:id returns the same data on repeated requests with Redis enabled', async () => {
    const restaurantsResponse: Response = await request(bookingHttpServer)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const restaurantId = restaurants[0].id;

    const tablesResponse: Response = await request(bookingHttpServer)
      .get(`/restaurants/${restaurantId}/tables`)
      .expect(200);

    const tables = tablesResponse.body as RestaurantTableDto[];

    expect(tables.length).toBeGreaterThan(0);

    const tableId = tables[0].id;

    const firstResponse: Response = await request(bookingHttpServer)
      .get(`/tables/${tableId}`)
      .expect(200);

    const firstTable = firstResponse.body as RestaurantTableDto;

    expect(firstTable.id).toBe(tableId);
    expect(firstTable.restaurant_id).toBe(restaurantId);
    expect(typeof firstTable.code).toBe('string');
    expect(typeof firstTable.capacity).toBe('number');
    expect(['REGULAR', 'SHARED']).toContain(firstTable.kind);
    expect(typeof firstTable.created_at).toBe('string');
    expect(typeof firstTable.updated_at).toBe('string');

    const secondResponse: Response = await request(bookingHttpServer)
      .get(`/tables/${tableId}`)
      .expect(200);

    const secondTable = secondResponse.body as RestaurantTableDto;

    expect(secondTable).toEqual(firstTable);
  });

  it('returns 429 after exceeding login rate limit', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await request(authHttpServer)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    for (let i = 0; i < 5; i += 1) {
      await request(authHttpServer)
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);
    }

    const response: Response = await request(authHttpServer)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(429);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(429);
    expect(error.message).toBe(
      'Too many login attempts. Please try again later.',
    );
  });

  it('returns 429 after exceeding refresh rate limit', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';

    await request(authHttpServer)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const loginResponse: Response = await request(authHttpServer)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const authResponse = loginResponse.body as AuthResponseDto;
    const cookies = extractCookies(loginResponse);

    expect(typeof authResponse.accessToken).toBe('string');
    expect(cookies.length).toBeGreaterThan(0);

    for (let i = 0; i < 10; i += 1) {
      await request(authHttpServer)
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(201);
    }

    const response: Response = await request(authHttpServer)
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(429);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(429);
    expect(error.message).toBe(
      'Too many refresh attempts. Please try again later.',
    );
  });
});
