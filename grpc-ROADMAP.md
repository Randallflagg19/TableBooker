# gRPC Roadmap

План перехода от текущего модульного монолита к двум отдельным сервисам:

- `auth-service`
- `booking-service`

с синхронным взаимодействием через `gRPC`.

## Цель

Следующий этап проекта — показать не только backend и auth, но и умение:

- выделять bounded context
- разносить монолит на отдельные сервисы
- проектировать межсервисный контракт
- связывать сервисы через `gRPC`

## Что хотим получить на выходе

После завершения этого этапа проект должен выглядеть так:

- `auth-service` отвечает за регистрацию, логин, refresh, logout и текущего пользователя
- `booking-service` отвечает за рестораны, столы и бронирования
- `booking-service` не хранит у себя auth-логику
- сервисы общаются через `gRPC`
- создание брони по-прежнему идёт от имени текущего пользователя, но источник истины по пользователю — `auth-service`

## Почему следующим шагом именно это

Потому что:

- auth уже достаточно оформлен и изолирован
- booking-часть уже использует current user
- граница между доменами стала естественной
- `gRPC` даст сильный архитектурный шаг для портфолио

## Архитектурная идея

### Auth Service

Отвечает за:

- `register`
- `login`
- `refresh`
- `logout`
- `me`
- валидацию пользователя для других сервисов

### Booking Service

Отвечает за:

- `restaurants`
- `tables`
- `bookings`
- правила пересечения слотов
- статусы бронирования
- hold expiration

### Граница между сервисами

`booking-service` не должен знать:

- как хешируются пароли
- как устроены refresh token
- как реализован login

`booking-service` должен знать только:

- как получить текущего пользователя из `auth-service`
- как убедиться, что пользователь существует и валиден

## Какой MVP делаем

### MVP для перехода на 2 сервиса

В первую версию включаем:

- отдельный `auth-service`
- отдельный `booking-service`
- `gRPC` контракт между ними
- проверку текущего пользователя через `auth-service`
- сохранение текущего пользовательского booking-flow

### Что не делаем в первую версию

- service discovery
- API gateway
- Docker orchestration уровня compose для нескольких app с кучей сетевых оптимизаций
- shared authentication proxy
- observability stack
- retries / circuit breaker
- RabbitMQ
- Redis
- notifications-service

## Какая модель взаимодействия нужна

На первом этапе `booking-service` должен уметь обратиться к `auth-service` и получить ответ на вопрос:

- кто этот пользователь?

### Самый удобный MVP-контракт

Например:

- `ValidateAccessToken`
  или
- `GetUserByAccessToken`

Смысл:

- клиент приходит в `booking-service` с bearer token
- `booking-service` отправляет token в `auth-service`
- `auth-service` валидирует token
- `auth-service` возвращает данные текущего пользователя
- `booking-service` создаёт бронь уже на основе этого ответа

Это хороший первый шаг, потому что:

- логика проверки токена остаётся в `auth-service`
- booking не тащит к себе JWT-инфраструктуру целиком

## Предлагаемая структура

Есть два возможных пути.

### Вариант A. Monorepo With Two Apps

Оставить текущий репозиторий и создать внутри него два Nest-приложения:

- `apps/auth-service`
- `apps/booking-service`

Плюсы:

- проще стартовать
- удобно делиться кодом
- меньше организационного шума

Минусы:

- не такая жёсткая изоляция

### Вариант B. Two Separate Repositories

Разнести по двум отдельным репозиториям.

Плюсы:

- сильнее ощущается разделение сервисов

Минусы:

- сложнее поддерживать на старте
- больше рутинной настройки

### Рекомендация

Для твоего проекта я бы рекомендовал:

- начать с **одного репозитория**
- но уже с **двумя отдельными Nest apps**

Это лучший компромисс между реализмом и сложностью.

## Этапы

## Step 1. Decide Service Boundaries

### Что делаем

Фиксируем, что уходит в каждый сервис.

### Auth Service

- auth module
- users table
- register/login/refresh/logout/me
- JWT validation logic

### Booking Service

- restaurants module
- tables module
- bookings module
- hold expiration
- booking e2e logic

### Что важно

Не переносить всё хаотично.  
Сначала нужно чётко решить, где находится источник истины для пользователя.

### Definition of Done

- чётко зафиксировано, что `users` принадлежат `auth-service`
- booking перестаёт быть владельцем auth-логики

## Step 2. Create Two Nest Apps

### Что делаем

Создаём две отдельные app внутри проекта:

- `auth-service`
- `booking-service`

### Что важно

На этом этапе можно не переносить код полностью, а только подготовить каркас двух приложений.

### Definition of Done

- оба приложения поднимаются отдельно
- у каждого свой `main.ts`
- у каждого свой `AppModule`

## Step 3. Move Auth Into Auth Service

### Что делаем

Переносим auth-модуль в `auth-service`.

### Что должно переехать

- auth controller
- auth service
- JWT strategy
- guard/decorator инфраструктура, если она нужна внутри auth-service
- users-related типы

### Что важно

На этом этапе `auth-service` уже должен уметь:

- register
- login
- refresh
- logout
- me

### Definition of Done

- auth работает из нового сервиса
- текущий auth-flow не сломан

## Step 4. Extract Booking Into Booking Service

### Что делаем

Переносим booking-домены в `booking-service`.

### Что остаётся там

- restaurants
- tables
- bookings
- hold expiration

### Что важно

Booking service больше не должен содержать auth module.

### Definition of Done

- booking-service поднимается отдельно
- endpoints по ресторанам и бронированиям доступны из него

## Step 5. Design gRPC Contract

### Что делаем

Проектируем минимальный protobuf-контракт между сервисами.

### MVP-контракт

Я бы рекомендовал начать с одного метода:

- `ValidateAccessToken`

Примерно по смыслу:

- request:
  - `accessToken`
- response:
  - `userId`
  - `email`
  - `role`
  - `isValid`

### Почему именно так

Это самый понятный первый use case:

- booking-service получает токен от клиента
- auth-service валидирует токен
- booking-service получает current user

### Definition of Done

- есть `.proto` файл
- контракт понятен и минимален

## Step 6. Add gRPC Server To Auth Service

### Что делаем

Поднимаем в `auth-service` gRPC endpoint для проверки access token.

### Что делает auth-service

- принимает token
- валидирует его
- возвращает данные пользователя

### Что важно

Сначала достаточно только одного gRPC метода.  
Не надо сразу тащить туда весь auth по gRPC.

### Definition of Done

- auth-service отвечает на gRPC запрос валидации токена

## Step 7. Add gRPC Client To Booking Service

### Что делаем

Подключаем gRPC client в `booking-service`.

### Что делает booking-service

- получает bearer token из HTTP запроса
- отправляет token в `auth-service`
- получает current user
- использует его для создания брони

### Что важно

Это заменит локальную JWT-проверку в booking-service.

### Definition of Done

- booking-service умеет получать current user из auth-service через gRPC

## Step 8. Replace Local Auth Dependency In Booking

### Что делаем

Убираем прямую зависимость booking-service от локальной auth-логики.

### Что меняется

- booking-service больше не использует local `JwtStrategy` для аутентификации пользователя
- user context приходит через вызов в `auth-service`

### Что важно

Именно здесь появляется настоящая межсервисная зависимость.

### Definition of Done

- booking-service создаёт бронь только после успешной проверки пользователя через gRPC

## Step 9. Manual End-To-End Verification

### Что проверяем

1. register в `auth-service`
2. login в `auth-service`
3. access token получен
4. запрос в `booking-service` с этим токеном
5. booking-service через gRPC валидирует пользователя
6. бронь создаётся успешно

### Негативный сценарий

- невалидный token
- auth-service отклоняет его
- booking-service возвращает `401`

### Definition of Done

- happy path работает
- invalid token path тоже работает

## Что можно улучшить потом

После MVP сервиса можно улучшать проект так:

- Redis для rate limit и кэша
- auth e2e tests
- gRPC error mapping
- централизованный proto package
- общий shared contract package
- API gateway
- notifications-service
- RabbitMQ для событий

## Что не надо усложнять сразу

На старте не стоит:

- выносить всё в 3-4 сервиса сразу
- делать gateway до появления реальной необходимости
- строить сложную security layer между сервисами
- добавлять retry policies и resilience patterns заранее
- добавлять Redis только потому, что “так принято”

## Definition Of Done

Переход на 2 микросервиса можно считать завершённым, когда:

- есть `auth-service`
- есть `booking-service`
- auth-flow живёт только в `auth-service`
- booking-flow живёт только в `booking-service`
- сервисы общаются по `gRPC`
- booking-service получает current user через `auth-service`
- бронирование от авторизованного пользователя работает end-to-end

## Почему это хороший следующий этап

Потому что он показывает:

- понимание service boundaries
- понимание auth как отдельного домена
- умение проектировать межсервисный контракт
- практику работы с `gRPC`
- постепенную эволюцию от монолита к микросервисам без хаоса
