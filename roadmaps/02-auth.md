# Roadmap 02. Auth

План внедрения аутентификации в текущий монолитный backend так, чтобы потом её было легко вынести в отдельный `auth-service`.

## Цель

Добавить в проект базовую production-like аутентификацию без лишнего усложнения:

- регистрация
- логин
- access token
- refresh token
- hashing паролей
- защищённые маршруты
- привязка бронирования к текущему пользователю

## Архитектурный принцип

Auth делаем внутри текущего backend, но как отдельный модуль с чистой границей.

Это значит:

- `AuthModule` отвечает за регистрацию, логин, токены и проверку пользователя
- `BookingsModule` не занимается логином и не знает деталей auth-flow
- `BookingsModule` получает только `currentUser`

Такой подход потом позволит без боли вынести auth в отдельный сервис и связать его с booking-частью через `gRPC`.

## Технологический выбор

### Hashing

Используем `argon2`.

Почему:

- современный и уважаемый вариант
- подходит для портфолио
- хорошо показывает понимание безопасного хранения паролей

### JWT

Используем:

- `access token` для защищённых запросов
- `refresh token` для обновления access token

## MVP scope

В первую версию auth включаем:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

И дополнительно:

- защищаем `POST /bookings`
- убираем `userId` из `CreateBookingDto`
- берём `userId` из токена

## Step 1. Dependencies And Database

### Установить зависимости

- `@nestjs/jwt`
- `@nestjs/passport`
- `passport`
- `passport-jwt`
- `argon2`

### Обновить таблицу `users`

Добавить поле:

- `refresh_token_hash`

Итоговая идея по пользователю:

- `email`
- `password_hash`
- `refresh_token_hash`
- `role`

## Step 2. Auth Module Skeleton

Создать модуль auth:

- `src/modules/auth/auth.module.ts`
- `src/modules/auth/application/auth.service.ts`
- `src/modules/auth/interfaces/auth.controller.ts`

Создать DTO:

- `src/modules/auth/dto/register.dto.ts`
- `src/modules/auth/dto/login.dto.ts`
- `src/modules/auth/dto/refresh-token.dto.ts`

## Step 3. Register

### Endpoint

- `POST /auth/register`

### Что делает

- принимает `email` и `password`
- валидирует входные данные
- проверяет, что пользователь с таким email ещё не существует
- хеширует пароль через `argon2`
- создаёт пользователя в БД

### Результат

На выходе можно вернуть:

- либо созданного пользователя без password hash
- либо сразу токены

Для начала проще вернуть сразу токены и не заставлять клиента делать лишний login сразу после регистрации.

## Step 4. Login

### Endpoint

- `POST /auth/login`

### Что делает

- принимает `email` и `password`
- находит пользователя по email
- сверяет пароль через `argon2.verify(...)`
- создаёт `access token`
- создаёт `refresh token`
- сохраняет `refresh_token_hash` в БД

### Что возвращает

- `accessToken`
- `refreshToken`

## Step 5. JWT Infrastructure

Создать:

- `JwtStrategy`
- `JwtAuthGuard`
- `CurrentUser` decorator

Примерная структура:

- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/guards/jwt-auth.guard.ts`
- `src/modules/auth/decorators/current-user.decorator.ts`

### Задача этого шага

Сделать так, чтобы защищённые маршруты могли получать текущего пользователя из access token.

## Step 6. Auth Me

### Endpoint

- `GET /auth/me`

### Что делает

- требует access token
- возвращает текущего пользователя

Этот endpoint удобен для проверки, что JWT guard и стратегия работают правильно.

## Step 7. Authenticated Booking

Переделать создание брони:

- убрать `userId` из `CreateBookingDto`
- защитить `POST /bookings` через `JwtAuthGuard`
- брать `userId` из `CurrentUser`

### Почему это важно

После этого booking-flow станет выглядеть как в реальном приложении:

- пользователь логинится
- получает access token
- создаёт бронь от своего имени
- сервер сам знает, кто делает запрос

## Step 8. Refresh Token

### Endpoint

- `POST /auth/refresh`

### Что делает

- принимает refresh token
- проверяет пользователя
- сравнивает refresh token с `refresh_token_hash`
- выдаёт новый `accessToken`
- при необходимости может выдать новый `refreshToken`

### Для MVP

Можно хранить один актуальный refresh token hash на пользователя.  
Без сложной ротации этого достаточно.

## Step 9. Logout

### Endpoint

- `POST /auth/logout`

### Что делает

- очищает `refresh_token_hash` в БД

### Результат

Старый refresh token становится бесполезным.

## What Not To Add Yet

Пока не усложняем проект следующим:

- OAuth
- email verification
- password reset
- multi-device sessions
- refresh token family rotation
- blacklist access tokens в Redis

## Definition Of Done

Auth MVP можно считать готовым, когда:

- пользователь может зарегистрироваться
- пользователь может залогиниться
- пароль хранится только в виде hash
- access token защищает маршруты
- refresh token позволяет получить новый access token
- `GET /auth/me` работает
- `POST /bookings` создаёт бронь от текущего пользователя
- `userId` больше не передаётся в теле запроса

## Why This Design Is Good For Future Extraction

Потому что:

- auth-логика живёт в одном модуле
- booking-логика не знает деталей логина
- booking-логика работает только с `currentUser`
- токены и guards изолированы внутри auth-слоя

Позже это упростит переход к отдельному `auth-service` и интеграции через `gRPC`.
