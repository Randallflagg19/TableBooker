# TableBooker

Учебный backend-проект на **NestJS + PostgreSQL**, выросший из модульного монолита в **два микросервиса**:

- `auth-service`
- `booking-service`

Сейчас проект показывает не только CRUD, но и более интересный backend-flow:

- регистрацию и логин пользователя;
- JWT auth с `accessToken` и `refreshToken`;
- logout с инвалидацией refresh token;
- создание брони от имени текущего пользователя;
- проверку пользователя в `booking-service` через `auth-service` по `gRPC`;
- rate limiting в `auth-service` через `Redis`;
- read cache в `booking-service` через `Redis`;
- проверку конфликтов по времени;
- автоистечение `HOLD`-броней.

## Current Status

Текущий MVP завершён.

Реализовано:

- `auth-service`:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- `booking-service`:
  - список ресторанов;
  - получение столика по `id`;
  - создание брони;
  - подтверждение брони;
  - отмена брони;
  - список броней пользователя;
- auth-flow:
  - пароль хранится только в виде `argon2` hash;
  - access token защищает маршруты;
  - refresh token позволяет получить новый access token;
  - rate limiting включён для `register`, `login`, `refresh`;
  - `POST /bookings` не принимает `userId` в body;
  - `booking-service` получает current user через `auth-service` по `gRPC`;
- booking-flow:
  - проверка конфликтов по времени;
  - поддержка `REGULAR` и `SHARED` столов;
  - автоистечение `HOLD` через cron-задачу;
  - read cache для ресторанов и столов через `Redis`;
- testing:
  - e2e тесты для `auth-service`;
  - e2e тесты для `booking-service`;
  - отдельный `gRPC` integration test;
  - Redis integration tests;
  - `GitHub Actions` прогоняет `yarn test:e2e` на `push` и `pull_request`.

## Architecture

Проект организован как monorepo с двумя Nest-приложениями:

- [apps/auth-service](./apps/auth-service)
- [apps/booking-service](./apps/booking-service)

Общий gRPC-контракт лежит в:

- [proto/auth.proto](./proto/auth.proto)

### Auth Service

Владеет:

- таблицей `users`;
- auth-логикой;
- JWT validation;
- register/login/refresh/logout/me;
- gRPC методом `ValidateAccessToken`.

### Booking Service

Владеет:

- `restaurants`;
- `restaurant_tables`;
- `bookings`;
- hold expiration;
- HTTP API для бронирования.

### Межсервисный flow

1. Клиент логинится в `auth-service`
2. Получает `accessToken`
3. Отправляет запрос в `booking-service` с `Authorization: Bearer <token>`
4. `booking-service` вызывает `auth-service` по `gRPC`
5. `auth-service` валидирует токен и возвращает current user
6. `booking-service` создаёт бронь от имени этого пользователя

## Tech Stack

- NestJS
- PostgreSQL
- `postgres` driver without ORM
- Redis
- Swagger
- `@nestjs/schedule`
- JWT + Passport
- `argon2`
- gRPC (`@nestjs/microservices`, `@grpc/grpc-js`, `@grpc/proto-loader`)
- Docker Compose
- GitHub Actions

## Main Entities

- `users`
- `restaurants`
- `restaurant_tables`
- `bookings`

## Booking Statuses

- `HOLD`
- `CONFIRMED`
- `CANCELLED`
- `EXPIRED`

## Hold Expiration

При создании бронь получает статус `HOLD`.
Если в течение 5 минут бронь не подтверждена, фоновая cron-задача переводит её в `EXPIRED`.
После этого слот снова становится доступным.

## Local Run

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Start services

`auth-service`:

```bash
yarn start:auth:dev
```

`booking-service`:

```bash
yarn start:booking:dev
```

## Default Ports

- `auth-service` HTTP: `3001`
- `auth-service` gRPC: `50051`
- `booking-service` HTTP: `3002`
- PostgreSQL: `5434`
- Redis: `6379`

## Swagger

- Auth service docs: [http://localhost:3001/docs](http://localhost:3001/docs)
- Booking service docs: [http://localhost:3002/docs](http://localhost:3002/docs)

Важно:

- токен получается в `auth-service`;
- в Swagger `booking-service` его нужно отдельно вставить через кнопку `Authorize`;
- в реальном клиенте этот header будет подставляться автоматически.

## Environment

Основные переменные окружения:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=tablebooker
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

AUTH_SERVICE_PORT=3001
AUTH_SERVICE_GRPC_HOST=0.0.0.0
AUTH_SERVICE_GRPC_PORT=50051

BOOKING_SERVICE_PORT=3002

REDIS_HOST=localhost
REDIS_PORT=6379
```

Для тестов используется отдельный `.env.test`.

## Useful Commands

Build both services:

```bash
yarn build
```

Build конкретный сервис:

```bash
yarn build:auth
yarn build:booking
```

Start конкретный сервис:

```bash
yarn start:auth
yarn start:booking
```

Lint:

```bash
yarn lint
```

E2E tests:

```bash
yarn test:e2e
```

## gRPC Contract

Сейчас используется минимальный контракт:

- `AuthService.ValidateAccessToken`

Request:

- `accessToken`

Response:

- `isValid`
- `userId`
- `email`
- `role`

Контракт описан в:

- [proto/auth.proto](./proto/auth.proto)

## Project Roadmaps

- Backend roadmap: [01-backend.md](./zz-roadmaps/01-backend.md)
- Auth roadmap: [02-auth.md](./zz-roadmaps/02-auth.md)
- gRPC migration roadmap: [03-grpc-migration.md](./zz-roadmaps/03-grpc-migration.md)
- Redis roadmap: [04-redis.md](./zz-roadmaps/04-redis.md)
- Testing roadmap: [05-testing.md](./zz-roadmaps/05-testing.md)
- Notifications + RabbitMQ roadmap: [06-notifications-rabbitmq.md](./zz-roadmaps/06-notifications-rabbitmq.md)
- Notifications providers roadmap: [07-notifications-providers.md](./zz-roadmaps/07-notifications-providers.md)

## Quality

В проекте уже есть:

- e2e тесты на `auth-service`;
- e2e тесты на `booking-service`;
- отдельный тест на реальный `gRPC` flow;
- Redis-focused integration tests;
- `GitHub Actions` workflow для автоматического прогона `yarn test:e2e`.

## Next Ideas

Следующие разумные шаги для развития проекта:

- notifications-service;
- RabbitMQ для событий;
- email/SMS интеграции поверх notification-flow;
- API gateway;
- frontend client.
