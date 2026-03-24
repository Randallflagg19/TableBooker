import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../apps/booking-service/src/app.module';

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

describe('Restaurants (e2e)', () => {
  let app: INestApplication;
  let httpApp: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /restaurants returns a list of restaurants', async () => {
    const response: Response = await request(httpApp)
      .get('/restaurants')
      .expect(200);

    const restaurants = response.body as RestaurantDto[];

    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
    expect(typeof restaurants[0].id).toBe('string');
    expect(typeof restaurants[0].name).toBe('string');
    expect(typeof restaurants[0].slug).toBe('string');
    expect(typeof restaurants[0].created_at).toBe('string');
    expect(typeof restaurants[0].updated_at).toBe('string');
  });

  it('GET /restaurants/:id returns one restaurant', async () => {
    const restaurantsResponse: Response = await request(httpApp)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const firstRestaurantId = restaurants[0].id;

    const response: Response = await request(httpApp)
      .get(`/restaurants/${firstRestaurantId}`)
      .expect(200);

    const restaurant = response.body as RestaurantDto;

    expect(restaurant.id).toBe(firstRestaurantId);
    expect(typeof restaurant.name).toBe('string');
    expect(typeof restaurant.slug).toBe('string');
    expect(typeof restaurant.created_at).toBe('string');
    expect(typeof restaurant.updated_at).toBe('string');
  });

  it('GET /restaurants/:id/tables returns restaurant tables', async () => {
    const restaurantsResponse: Response = await request(httpApp)
      .get('/restaurants')
      .expect(200);

    const restaurants = restaurantsResponse.body as RestaurantDto[];

    expect(restaurants.length).toBeGreaterThan(0);

    const firstRestaurantId = restaurants[0].id;

    const response: Response = await request(httpApp)
      .get(`/restaurants/${firstRestaurantId}/tables`)
      .expect(200);

    const tables = response.body as RestaurantTableDto[];

    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBeGreaterThan(0);
    expect(typeof tables[0].id).toBe('string');
    expect(tables[0].restaurant_id).toBe(firstRestaurantId);
    expect(typeof tables[0].code).toBe('string');
    expect(typeof tables[0].capacity).toBe('number');
    expect(['REGULAR', 'SHARED']).toContain(tables[0].kind);
    expect(typeof tables[0].created_at).toBe('string');
    expect(typeof tables[0].updated_at).toBe('string');
  });
});
