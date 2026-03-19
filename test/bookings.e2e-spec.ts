import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from './../src/app.module';
import { DbService } from './../src/infrastructure/db/db.service';

type UserRow = {
  id: string;
};

type RestaurantDto = {
  id: string;
};

type RestaurantTableDto = {
  id: string;
  capacity: number;
  kind: 'REGULAR' | 'SHARED';
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

type CreateBookingOptions = {
  tableId?: string;
  userId?: string;
  guests?: number;
  startAt?: Date;
  endAt?: Date;
};

type ErrorResponseDto = {
  message: string | string[];
  error: string;
  statusCode: number;
};

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let db: DbService;

  const getUserId = async (): Promise<string> => {
    const [user] = await db.client<UserRow[]>`
      SELECT id
      FROM users
      ORDER BY created_at ASC
      LIMIT 1
    `;

    expect(user).toBeDefined();

    return user.id;
  };

  const getRegularTableId = async (): Promise<string> => {
    const restaurantsResponse: Response = await request(app.getHttpServer())
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const restaurantId = restaurants[0].id;

    const tablesResponse: Response = await request(app.getHttpServer())
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

  const createBooking = async (
    options?: CreateBookingOptions,
  ): Promise<BookingDto> => {
    const tableId = options?.tableId ?? (await getRegularTableId());
    const userId = options?.userId ?? (await getUserId());
    const guests = options?.guests ?? 2;
    const startAt = options?.startAt ?? new Date(Date.now() + 60 * 60 * 1000);
    const endAt =
      options?.endAt ?? new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    const response: Response = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        tableId,
        userId,
        guests,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      .expect(201);

    return response.body as BookingDto;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    db = app.get(DbService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await db.client`DELETE FROM bookings`;
  });

  it('POST /bookings creates a booking with HOLD status', async () => {
    const booking = await createBooking();

    expect(typeof booking.id).toBe('string');
    expect(typeof booking.table_id).toBe('string');
    expect(typeof booking.user_id).toBe('string');
    expect(booking.guests).toBe(2);
    expect(booking.status).toBe('HOLD');
    expect(typeof booking.start_at).toBe('string');
    expect(typeof booking.end_at).toBe('string');
    expect(typeof booking.created_at).toBe('string');
    expect(typeof booking.updated_at).toBe('string');
  });

  it('PATCH /bookings/:id/confirm changes booking status to CONFIRMED', async () => {
    const booking = await createBooking();

    const response: Response = await request(app.getHttpServer())
      .patch(`/bookings/${booking.id}/confirm`)
      .expect(200);

    const confirmedBooking = response.body as BookingDto;

    expect(confirmedBooking.id).toBe(booking.id);
    expect(confirmedBooking.status).toBe('CONFIRMED');
    expect(typeof confirmedBooking.updated_at).toBe('string');
  });

  it('PATCH /bookings/:id/cancel changes booking status to CANCELLED', async () => {
    const booking = await createBooking();

    const response: Response = await request(app.getHttpServer())
      .patch(`/bookings/${booking.id}/cancel`)
      .expect(200);

    const cancelledBooking = response.body as BookingDto;

    expect(cancelledBooking.id).toBe(booking.id);
    expect(cancelledBooking.status).toBe('CANCELLED');
    expect(typeof cancelledBooking.updated_at).toBe('string');
  });

  it('POST /bookings rejects overlapping booking for the same regular table', async () => {
    const tableId = await getRegularTableId();
    const userId = await getUserId();
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    await createBooking({
      tableId,
      userId,
      guests: 2,
      startAt,
      endAt,
    });

    const overlappingResponse: Response = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        tableId,
        userId,
        guests: 2,
        startAt: new Date(startAt.getTime() + 30 * 60 * 1000).toISOString(),
        endAt: new Date(endAt.getTime() + 30 * 60 * 1000).toISOString(),
      })
      .expect(400);

    const errorResponse = overlappingResponse.body as ErrorResponseDto;

    expect(errorResponse.message).toBe(
      'This table is already booked for the selected time',
    );
  });
});
