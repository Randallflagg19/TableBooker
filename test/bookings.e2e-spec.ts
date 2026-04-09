import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../apps/booking-service/src/app.module';
import { AuthClientService } from '../apps/booking-service/src/infrastructure/auth-client/auth-client.service';
import { DbService } from '../apps/booking-service/src/infrastructure/db/db.service';
import type {
  GetUserContactResponse,
  ValidateAccessTokenResponse,
} from '../apps/booking-service/src/infrastructure/auth-client/auth-client.types';
import { RabbitMqService } from '../apps/booking-service/src/infrastructure/rabbitmq/rabbitmq.service';
import {
  BOOKING_CANCELLED_EVENT,
  BOOKING_CONFIRMED_EVENT,
  BOOKING_EVENTS_EXCHANGE,
} from '../libs/contracts/booking-events.contract';

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
  let httpApp: Parameters<typeof request>[0];
  let db: DbService;
  let currentUserId: string;

  const authClientServiceMock: Pick<
    AuthClientService,
    'validateAccessToken' | 'getUserContact'
  > = {
    validateAccessToken: jest.fn(),
    getUserContact: jest.fn(),
  };

  const rabbitMqServiceMock: Pick<RabbitMqService, 'publish'> = {
    publish: jest.fn(),
  };

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
    const restaurantsResponse: Response = await request(httpApp)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const restaurantId = restaurants[0].id;

    const tablesResponse: Response = await request(httpApp)
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
    const userId = options?.userId ?? currentUserId;
    const guests = options?.guests ?? 2;
    const startAt = options?.startAt ?? new Date(Date.now() + 60 * 60 * 1000);
    const endAt =
      options?.endAt ?? new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    const validateAccessToken =
      authClientServiceMock.validateAccessToken as jest.MockedFunction<
        AuthClientService['validateAccessToken']
      >;
    const getUserContact =
      authClientServiceMock.getUserContact as jest.MockedFunction<
        AuthClientService['getUserContact']
      >;

    validateAccessToken.mockResolvedValue({
      isValid: true,
      userId,
      email: 'test@example.com',
      role: 'GUEST',
    } satisfies ValidateAccessTokenResponse);
    getUserContact.mockResolvedValue({
      found: true,
      email: 'test@example.com',
      phone: '',
    } satisfies GetUserContactResponse);

    const response: Response = await request(httpApp)
      .post('/bookings')
      .set('Authorization', 'Bearer mocked-access-token')
      .send({
        tableId,
        guests,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      })
      .expect(201);

    return response.body as BookingDto;
  };

  const mockUserContact = (contact?: {
    found?: boolean;
    email?: string;
    phone?: string;
  }) => {
    const getUserContact =
      authClientServiceMock.getUserContact as jest.MockedFunction<
        AuthClientService['getUserContact']
      >;

    getUserContact.mockResolvedValue({
      found: contact?.found ?? true,
      email: contact?.email ?? 'test@example.com',
      phone: contact?.phone ?? '',
    } satisfies GetUserContactResponse);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClientService)
      .useValue(authClientServiceMock)
      .overrideProvider(RabbitMqService)
      .useValue(rabbitMqServiceMock)
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
    currentUserId = await getUserId();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();
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

    const response: Response = await request(httpApp)
      .patch(`/bookings/${booking.id}/confirm`)
      .expect(200);

    const confirmedBooking = response.body as BookingDto;

    expect(confirmedBooking.id).toBe(booking.id);
    expect(confirmedBooking.status).toBe('CONFIRMED');
    expect(typeof confirmedBooking.updated_at).toBe('string');
  });

  it('PATCH /bookings/:id/cancel changes booking status to CANCELLED', async () => {
    const booking = await createBooking();

    const response: Response = await request(httpApp)
      .patch(`/bookings/${booking.id}/cancel`)
      .expect(200);

    const cancelledBooking = response.body as BookingDto;

    expect(cancelledBooking.id).toBe(booking.id);
    expect(cancelledBooking.status).toBe('CANCELLED');
    expect(typeof cancelledBooking.updated_at).toBe('string');
  });

  it('POST /bookings rejects overlapping booking for the same regular table', async () => {
    const tableId = await getRegularTableId();
    const userId = currentUserId;
    const startAt = new Date(Date.now() + 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

    await createBooking({
      tableId,
      userId,
      guests: 2,
      startAt,
      endAt,
    });

    const validateAccessToken =
      authClientServiceMock.validateAccessToken as jest.MockedFunction<
        AuthClientService['validateAccessToken']
      >;

    validateAccessToken.mockResolvedValue({
      isValid: true,
      userId,
      email: 'test@example.com',
      role: 'GUEST',
    } satisfies ValidateAccessTokenResponse);

    const overlappingResponse: Response = await request(httpApp)
      .post('/bookings')
      .set('Authorization', 'Bearer mocked-access-token')
      .send({
        tableId,
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

  it('GET /bookings/my returns bookings for the current user', async () => {
    const booking = await createBooking();

    const validateAccessToken =
      authClientServiceMock.validateAccessToken as jest.MockedFunction<
        AuthClientService['validateAccessToken']
      >;

    validateAccessToken.mockResolvedValue({
      isValid: true,
      userId: currentUserId,
      email: 'test@example.com',
      role: 'GUEST',
    } satisfies ValidateAccessTokenResponse);

    const response: Response = await request(httpApp)
      .get('/bookings/my')
      .set('Authorization', 'Bearer mocked-access-token')
      .expect(200);

    const bookings = response.body as BookingDto[];

    expect(Array.isArray(bookings)).toBe(true);
    expect(bookings.length).toBeGreaterThan(0);

    const currentUserBooking = bookings.find((item) => item.id === booking.id);

    expect(currentUserBooking).toBeDefined();

    if (!currentUserBooking) {
      throw new Error(
        'Expected booking was not found in current user bookings',
      );
    }

    expect(currentUserBooking.user_id).toBe(currentUserId);
    expect(currentUserBooking.status).toBe('HOLD');
  });

  it('PATCH /bookings/:id/confirm returns 404 for non-existent booking', async () => {
    const response: Response = await request(httpApp)
      .patch('/bookings/00000000-0000-0000-0000-000000000000/confirm')
      .expect(404);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Booking not found');
  });

  it('PATCH /bookings/:id/cancel returns 404 for non-existent booking', async () => {
    const response: Response = await request(httpApp)
      .patch('/bookings/00000000-0000-0000-0000-000000000000/cancel')
      .expect(404);

    const error = response.body as ErrorResponseDto;

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Booking not found');
  });

  it('PATCH /bookings/:id/confirm publishes booking.confirmed event with user contacts', async () => {
    const booking = await createBooking();

    mockUserContact({
      found: true,
      email: 'confirmed@example.com',
      phone: '+79991234567',
    });

    const publish = rabbitMqServiceMock.publish as jest.MockedFunction<
      RabbitMqService['publish']
    >;

    await request(httpApp).patch(`/bookings/${booking.id}/confirm`).expect(200);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CONFIRMED_EVENT,
      expect.objectContaining({
        bookingId: booking.id,
        userId: booking.user_id,
        tableId: booking.table_id,
        status: 'CONFIRMED',
        email: 'confirmed@example.com',
        phone: '+79991234567',
      }),
    );
  });

  it('PATCH /bookings/:id/cancel publishes booking.cancelled event with user contacts', async () => {
    const booking = await createBooking();

    mockUserContact({
      found: true,
      email: 'cancelled@example.com',
      phone: '+79997654321',
    });

    const publish = rabbitMqServiceMock.publish as jest.MockedFunction<
      RabbitMqService['publish']
    >;

    await request(httpApp).patch(`/bookings/${booking.id}/cancel`).expect(200);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CANCELLED_EVENT,
      expect.objectContaining({
        bookingId: booking.id,
        userId: booking.user_id,
        tableId: booking.table_id,
        status: 'CANCELLED',
        email: 'cancelled@example.com',
        phone: '+79997654321',
      }),
    );
  });

  it('PATCH /bookings/:id/confirm publishes null contacts when user contact is missing', async () => {
    const booking = await createBooking();

    mockUserContact({
      found: false,
      email: '',
      phone: '',
    });

    const publish = rabbitMqServiceMock.publish as jest.MockedFunction<
      RabbitMqService['publish']
    >;

    await request(httpApp).patch(`/bookings/${booking.id}/confirm`).expect(200);

    expect(publish).toHaveBeenCalledWith(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CONFIRMED_EVENT,
      expect.objectContaining({
        bookingId: booking.id,
        status: 'CONFIRMED',
        email: null,
        phone: null,
      }),
    );
  });

  it('PATCH /bookings/:id/cancel publishes null contacts when user contact is missing', async () => {
    const booking = await createBooking();

    mockUserContact({
      found: false,
      email: '',
      phone: '',
    });

    const publish = rabbitMqServiceMock.publish as jest.MockedFunction<
      RabbitMqService['publish']
    >;

    await request(httpApp).patch(`/bookings/${booking.id}/cancel`).expect(200);

    expect(publish).toHaveBeenCalledWith(
      BOOKING_EVENTS_EXCHANGE,
      BOOKING_CANCELLED_EVENT,
      expect.objectContaining({
        bookingId: booking.id,
        status: 'CANCELLED',
        email: null,
        phone: null,
      }),
    );
  });
});
