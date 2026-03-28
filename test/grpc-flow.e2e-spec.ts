import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import request, { Response } from 'supertest';
import { join } from 'path';
import { AppModule as AuthAppModule } from '../apps/auth-service/src/app.module';
import { AppModule as BookingAppModule } from '../apps/booking-service/src/app.module';
import { DbService as AuthDbService } from '../apps/auth-service/src/infrastructure/db/db.service';
import { DbService as BookingDbService } from '../apps/booking-service/src/infrastructure/db/db.service';

type RestaurantDto = {
  id: string;
};

type RestaurantTableDto = {
  id: string;
  kind: 'REGULAR' | 'SHARED';
};

type AuthResponseDto = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    role: 'GUEST' | 'ADMIN';
    created_at: string;
    updated_at: string;
  };
};

type BookingDto = {
  id: string;
  table_id: string;
  user_id: string;
  guests: number;
  start_at: string;
  end_at: string;
  status: 'HOLD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
};

type CurrentUserDto = {
  id: string;
  email: string | null;
  role: 'GUEST' | 'ADMIN';
};

describe('gRPC auth-booking flow (e2e)', () => {
  let authApp: INestApplication;
  let bookingApp: INestApplication;
  let authHttpServer: Parameters<typeof request>[0];
  let bookingHttpServer: Parameters<typeof request>[0];
  let authDb: AuthDbService;
  let bookingDb: BookingDbService;

  const originalGrpcHost = process.env.AUTH_SERVICE_GRPC_HOST;
  const originalGrpcPort = process.env.AUTH_SERVICE_GRPC_PORT;

  const createTestEmail = () =>
    `grpc-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const getRegularTableId = async (): Promise<string> => {
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

    const regularTable = tables.find((table) => table.kind === 'REGULAR');

    expect(regularTable).toBeDefined();

    if (!regularTable) {
      throw new Error('Regular table was not found');
    }

    return regularTable.id;
  };

  beforeAll(async () => {
    process.env.AUTH_SERVICE_GRPC_HOST = '127.0.0.1';
    process.env.AUTH_SERVICE_GRPC_PORT = '50061';

    const authModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthAppModule],
    }).compile();

    authApp = authModuleFixture.createNestApplication();

    authApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    authApp.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: join(process.cwd(), 'proto', 'auth.proto'),
        url: `${process.env.AUTH_SERVICE_GRPC_HOST}:${process.env.AUTH_SERVICE_GRPC_PORT}`,
      },
    });

    await authApp.startAllMicroservices();
    await authApp.init();

    authHttpServer = authApp.getHttpServer() as Parameters<typeof request>[0];
    authDb = authApp.get(AuthDbService);

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
    bookingDb = bookingApp.get(BookingDbService);
  });

  afterAll(async () => {
    await bookingDb.client`DELETE FROM bookings`;

    await authDb.client`
      DELETE FROM users
      WHERE email LIKE 'grpc-e2e-%@example.com'
    `;

    await bookingApp.close();
    await authApp.close();

    process.env.AUTH_SERVICE_GRPC_HOST = originalGrpcHost;
    process.env.AUTH_SERVICE_GRPC_PORT = originalGrpcPort;
  });

  afterEach(async () => {
    await bookingDb.client`DELETE FROM bookings`;

    await authDb.client`
      DELETE FROM users
      WHERE email LIKE 'grpc-e2e-%@example.com'
    `;
  });

  it('POST /bookings creates a booking using current user resolved via gRPC', async () => {
    const email = createTestEmail();
    const password = 'strongPass123';
    const tableId = await getRegularTableId();

    const registerResponse: Response = await request(authHttpServer)
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    const registeredUser = registerResponse.body as CurrentUserDto;

    expect(registeredUser.email).toBe(email);
    expect(registeredUser.role).toBe('GUEST');

    const loginResponse: Response = await request(authHttpServer)
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const authResponse = loginResponse.body as AuthResponseDto;

    expect(typeof authResponse.accessToken).toBe('string');
    expect(typeof authResponse.refreshToken).toBe('string');
    expect(authResponse.user.id).toBe(registeredUser.id);
    expect(authResponse.user.email).toBe(email);
    expect(authResponse.user.role).toBe('GUEST');

    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    const bookingResponse: Response = await request(bookingHttpServer)
      .post('/bookings')
      .set('Authorization', `Bearer ${authResponse.accessToken}`)
      .send({
        tableId,
        guests: 2,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      .expect(201);

    const booking = bookingResponse.body as BookingDto;

    expect(typeof booking.id).toBe('string');
    expect(booking.table_id).toBe(tableId);
    expect(booking.user_id).toBe(registeredUser.id);
    expect(booking.guests).toBe(2);
    expect(booking.status).toBe('HOLD');
    expect(typeof booking.start_at).toBe('string');
    expect(typeof booking.end_at).toBe('string');
    expect(typeof booking.created_at).toBe('string');
    expect(typeof booking.updated_at).toBe('string');
  });
});
