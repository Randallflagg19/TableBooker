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
  - `POST /bookings` не принимает `userId` в body;
  - `booking-service` получает current user через `auth-service` по `gRPC`;
- booking-flow:
  - проверка конфликтов по времени;
  - поддержка `REGULAR` и `SHARED` столов;
  - автоистечение `HOLD` через cron-задачу.

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
- Swagger
- `@nestjs/schedule`
- JWT + Passport
- `argon2`
- gRPC (`@nestjs/microservices`, `@grpc/grpc-js`, `@grpc/proto-loader`)
- Docker Compose

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

### 1. Start PostgreSQL

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

- Auth / backend roadmap: [README_TableBooker.md](./README_TableBooker.md)
- gRPC migration roadmap: [grpc-ROADMAP.md](./grpc-ROADMAP.md)

## Next Ideas

Следующие разумные шаги для развития проекта:

- Redis для rate limit или кэша;
- e2e tests для межсервисного flow;
- notifications-service;
- RabbitMQ для событий;
- API gateway;
- frontend client.
