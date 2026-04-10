# TableBooker

TableBooker is a production-like backend system for restaurant table booking.

It is designed to demonstrate how a real-world backend evolves from a simple modular monolith into a microservice architecture with:

- synchronous communication via gRPC
- asynchronous event-driven flows via RabbitMQ
- caching and rate limiting via Redis
- resilient notification delivery (email + SMS)
- meaningful automated test coverage

The focus of this project is not on CRUD, but on **architecture, reliability, and evolution of a system over time**.

## Why This Project Matters

This project showcases:

- how to split a monolith into multiple services with clear boundaries
- how services communicate using both sync (gRPC) and async (RabbitMQ) patterns
- how to design a system that continues to work even when parts of it fail
- how to implement real-world auth flows (access + refresh tokens, logout invalidation)
- how to move from manual testing to structured automated tests

It reflects real backend engineering challenges rather than isolated features.

## What I Learned

While building this project, I focused on:

- designing service boundaries and responsibilities
- implementing inter-service communication (gRPC)
- building event-driven flows with RabbitMQ
- handling partial failures in notification delivery
- using Redis for both caching and rate limiting
- writing meaningful e2e tests instead of only unit tests
- working with PostgreSQL using raw SQL instead of an ORM
- structuring a project for scalability and clarity

This project represents a transition from writing code to thinking in terms of systems.

## Current State

The backend is currently feature-complete and ready for frontend integration and deployment.

Implemented:

- three Nest applications:
  - `auth-service`
  - `booking-service`
  - `notification-service`
- user registration and login with:
  - `email`
  - `phone`
  - `email + phone`
- JWT auth with:
  - `accessToken`
  - `refreshToken`
  - logout with refresh token invalidation
- current user resolution through protected endpoints
- booking creation on behalf of the authenticated user
- booking confirmation and cancellation
- booking conflict detection by time
- support for `REGULAR` and `SHARED` tables
- automatic expiration of `HOLD` bookings
- `gRPC` communication between `booking-service` and `auth-service`
- Redis-backed:
  - auth rate limiting
  - read caching for restaurant data
- RabbitMQ-based booking events
- notification dispatching through:
  - email
  - SMS
- graceful notification behavior:
  - skip missing email
  - skip missing phone
  - continue when one provider fails

## Services

The monorepo currently contains three backend services:

- [apps/auth-service](./apps/auth-service)
- [apps/booking-service](./apps/booking-service)
- [apps/notification-service](./apps/notification-service)

### Auth Service

Responsible for:

- `users` table
- register / login / refresh / logout / me
- JWT issuance and validation
- password hashing with `argon2`
- auth rate limiting via Redis
- `gRPC` methods for other services

Main HTTP endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Auth supports flexible contact input:

- register with `email`
- register with `phone`
- register with both
- login by `email`
- login by `phone`

### Booking Service

Responsible for:

- `restaurants`
- `restaurant_tables`
- `bookings`
- booking conflict detection
- booking status changes
- hold expiration scheduler
- read cache through Redis
- publishing booking events to RabbitMQ

Main HTTP endpoints:

- `GET /restaurants`
- `GET /restaurants/:id`
- `GET /restaurants/:id/tables`
- `GET /tables/:id`
- `POST /bookings`
- `PATCH /bookings/:id/confirm`
- `PATCH /bookings/:id/cancel`
- `GET /bookings/my`

Important rule:

- `POST /bookings` does not accept `userId` from the client
- `booking-service` resolves the current user through `auth-service` over `gRPC`

### Notification Service

Responsible for:

- consuming booking events from RabbitMQ
- dispatching notifications by channel
- sending email notifications
- sending SMS notifications
- handling partial delivery gracefully

It reacts to:

- `booking.confirmed`
- `booking.cancelled`

And can send:

- booking confirmation email
- booking cancellation email
- booking confirmation SMS
- booking cancellation SMS

## Architecture

### Core Flow

1. A user registers or logs in through `auth-service`.
2. The client receives an `accessToken`.
3. The client sends a booking request to `booking-service`.
4. `booking-service` validates the current user through `auth-service` over `gRPC`.
5. A booking is created with status `HOLD`.
6. Booking status changes can publish domain events to RabbitMQ.
7. `notification-service` consumes those events and dispatches notifications through available channels.

### Communication

- HTTP for public APIs
- `gRPC` between `booking-service` and `auth-service`
- RabbitMQ between `booking-service` and `notification-service`

### Shared Contracts

The project keeps shared contracts in [libs/contracts](./libs/contracts).

The auth `gRPC` contract is described in:

- [proto/auth.proto](./proto/auth.proto)

## Booking Domain

### Main Entities

- `users`
- `restaurants`
- `restaurant_tables`
- `bookings`

### Booking Statuses

- `HOLD`
- `CONFIRMED`
- `CANCELLED`
- `EXPIRED`

### Hold Expiration

When a booking is created, it starts in `HOLD`.

If it is not confirmed in time, a scheduled job changes it to `EXPIRED`, and the slot becomes available again.

## Tech Stack

- NestJS
- PostgreSQL
- `postgres` driver without ORM
- Redis
- RabbitMQ
- Swagger
- `@nestjs/schedule`
- JWT + Passport
- `argon2`
- `gRPC`
- `nodemailer`
- external SMS provider integration
- Docker Compose
- GitHub Actions
- Jest + Supertest

## Testing

The backend has both `e2e` and service-level automated tests.

Current coverage includes:

- auth e2e scenarios
- booking e2e scenarios
- `gRPC` integration flow
- Redis-backed integration checks
- booking event publishing tests
- notification consumer tests
- notification dispatcher tests
- email provider tests
- SMS provider tests

Current local suite size:

- `40` e2e tests
- `16` notification and service-level specs
- `56` total automated tests

Useful commands:

```bash
yarn test:e2e
```

```bash
yarn jest apps/notification-service/src/modules/notifications --runInBand
```

```bash
yarn test:e2e && yarn jest apps/notification-service/src/modules/notifications --runInBand
```

CI runs on:

- `push`
- `pull_request`

and verifies:

- e2e tests
- notification service specs

## Local Run

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL
- Redis
- RabbitMQ

### 2. Install dependencies

```bash
yarn install
```

### 3. Start services

Auth service:

```bash
yarn start:auth:dev
```

Booking service:

```bash
yarn start:booking:dev
```

Notification service:

```bash
yarn start:notification:dev
```

## Ports

- `auth-service` HTTP: `3001`
- `auth-service` gRPC: `50051`
- `booking-service` HTTP: `3002`
- `notification-service` HTTP: `3003`
- PostgreSQL: `5434`
- Redis: `6379`
- RabbitMQ: `5672`
- RabbitMQ management: `15672`

## Swagger

- Auth docs: [http://localhost:3001/docs](http://localhost:3001/docs)
- Booking docs: [http://localhost:3002/docs](http://localhost:3002/docs)

Notes:

- log in through `auth-service` first
- take the returned `accessToken`
- use Swagger `Authorize` to send it to protected endpoints
- `GET /auth/me` and booking endpoints require a valid bearer token

## Environment

Main environment variables:

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
NOTIFICATION_SERVICE_PORT=3003

REDIS_HOST=localhost
REDIS_PORT=6379

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
```

For tests, the project uses a dedicated test environment.

## Useful Commands

Install dependencies:

```bash
yarn install
```

Build:

```bash
yarn build
```

Build individual services:

```bash
yarn build:auth
yarn build:booking
```

Start services:

```bash
yarn start:auth
yarn start:booking
yarn start:notification
```

Start in watch mode:

```bash
yarn start:auth:dev
yarn start:booking:dev
yarn start:notification:dev
```

Lint:

```bash
yarn lint
```

## Roadmaps

Project evolution is documented in [roadmaps](./roadmaps):

- [01-backend.md](./roadmaps/01-backend.md)
- [02-auth.md](./roadmaps/02-auth.md)
- [03-grpc-migration.md](./roadmaps/03-grpc-migration.md)
- [04-redis.md](./roadmaps/04-redis.md)
- [05-testing.md](./roadmaps/05-testing.md)
- [06-notifications-rabbitmq.md](./roadmaps/06-notifications-rabbitmq.md)
- [07-notifications-providers.md](./roadmaps/07-notifications-providers.md)
- [08-auth-email-or-phone.md](./roadmaps/08-auth-email-or-phone.md)
- [09-testing-expansion.md](./roadmaps/09-testing-expansion.md)

## What This Project Demonstrates

This project is meant to show:

- practical NestJS backend work beyond simple controllers
- SQL-first backend development without hiding everything behind an ORM
- service boundaries and gradual architecture growth
- `gRPC` and event-driven integration
- caching and rate limiting
- auth and booking business logic
- test-driven stabilization of a non-trivial backend

## What Comes Next

The next natural stage is a frontend client.

At this point the backend is already strong enough to support:

- authenticated flows
- booking creation and management
- restaurant browsing
- integration through Swagger-backed manual checks
- future UI integration without needing major backend redesign
