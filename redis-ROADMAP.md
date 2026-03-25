# Redis Roadmap

План следующего инфраструктурного этапа для `TableBooker` после перехода на:

- `auth-service`
- `booking-service`
- `gRPC` между ними

## Цель

Добавить в проект `Redis` не "для галочки", а под реальные use case, которые:

- полезны для backend-практики;
- хорошо смотрятся в портфолио;
- логично дополняют текущую архитектуру;
- не превращают проект в перегруженный зоопарк инфраструктуры.

## Зачем Redis здесь вообще нужен

`Redis` полезен в проекте, когда нужны:

- быстрый кэш;
- временные данные с TTL;
- rate limiting;
- координация короткоживущих состояний;
- снижение нагрузки на БД на горячих чтениях.

Для `TableBooker` это особенно уместно, потому что у тебя уже есть:

- auth-flow;
- booking-flow;
- hold expiration;
- два отдельных сервиса;
- понятные read-heavy и write-heavy сценарии.

## Что Redis может дать именно этому проекту

### 1. Rate limiting для auth endpoints

Самый естественный первый сценарий:

- ограничить частоту `register`
- ограничить частоту `login`
- ограничить частоту `refresh`

Почему это хороший use case:

- очень понятен;
- связан с реальной безопасностью;
- часто встречается в production;
- не требует ломать доменную логику.

### 2. Кэш справочных данных

Например:

- список ресторанов;
- ресторан по `id`;
- список столов ресторана;
- стол по `id`.

Почему это хороший use case:

- это mostly read endpoints;
- данные меняются редко;
- их легко кэшировать;
- это даёт понятный выигрыш без сложной инвалидации.

### 3. Кэш availability / временной агрегации

Это уже более интересный, но более сложный сценарий:

- кэшировать результат проверки доступности столов или слотов;
- быстро инвалидировать кэш при создании / отмене / подтверждении брони.

Это сильный портфолио-шаг, но не лучший первый Redis-MVP.

### 4. Временные hold-state данные

Теоретически можно хранить часть hold-логики в Redis:

- временные блокировки;
- TTL на hold;
- быстрые маркеры занятых слотов.

Но это уже заметно усложняет доменную модель.

Для первой Redis-итерации я бы это не трогал.

## Что рекомендую как Redis MVP

### MVP = два use case

Я бы рекомендовал вот такой первый этап:

- `Redis` как backend infrastructure
- rate limiting для `auth-service`
- кэш на read endpoints в `booking-service`

### Что именно включаем

#### В `auth-service`

- rate limit на:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`

#### В `booking-service`

- кэш на:
  - `GET /restaurants`
  - `GET /restaurants/:id`
  - `GET /restaurants/:id/tables`
  - `GET /tables/:id`

Это уже даст:

- безопасный auth-flow;
- ускорение чтения;
- понятную демонстрацию Redis как cache + limiter;
- хороший narrative для портфолио.

## Что не надо тащить в Redis сразу

На первом этапе не стоит:

- переносить в Redis всю booking-логику;
- хранить там брони как источник истины;
- делать distributed locks без явной необходимости;
- уносить туда refresh token storage;
- строить event bus на Redis streams;
- смешивать Redis и RabbitMQ в одном шаге;
- пытаться одновременно делать и cache, и queue, и pub/sub, и session store.

## Архитектурная идея

### PostgreSQL остаётся источником истины

Очень важно:

- `PostgreSQL` хранит настоящие данные;
- `Redis` — это ускоритель и временное хранилище;
- не наоборот.

То есть:

- пользователи живут в Postgres;
- рестораны, столы и брони живут в Postgres;
- Redis только помогает быстрее читать и ограничивать злоупотребление.

## Предлагаемая структура

Я бы не делал отдельный Redis-сервис как новый Nest app.

Для текущего этапа лучше:

- подключить Redis как инфраструктурную зависимость;
- дать каждому сервису свой Redis module/client;
- использовать его локально внутри `auth-service` и `booking-service`.

Например:

- `apps/auth-service/src/infrastructure/redis/*`
- `apps/booking-service/src/infrastructure/redis/*`

Позже, если захочешь, можно вынести общее в `libs/redis`.

Но для первого шага это необязательно.

## Этапы

## Step 1. Decide Redis Use Cases

### Что делаем

Фиксируем, зачем Redis нужен именно сейчас.

### Рекомендуемый выбор

- rate limiting для auth;
- cache для read endpoints booking.

### Что важно

Не подключать Redis без понятного сценария.

### Definition of Done

- понятно, какие endpoints используют Redis;
- понятно, где Redis не участвует.

## Step 2. Add Redis To Local Infrastructure

### Что делаем

Добавляем Redis в локальную инфраструктуру проекта.

### Что обычно понадобится

- Redis container в `docker-compose.yml`
- env-переменные для host/port
- проверка, что Redis поднимается локально

### Что важно

На этом этапе не надо ещё трогать бизнес-логику.

### Definition of Done

- Redis поднимается локально;
- сервисы могут к нему подключиться.

## Step 3. Create Redis Infrastructure Modules

### Что делаем

Добавляем Redis client/module в оба сервиса.

### В auth-service

- Redis module
- Redis service/client wrapper

### В booking-service

- Redis module
- Redis service/client wrapper

### Что важно

Инфраструктурный слой должен быть аккуратно изолирован.

### Definition of Done

- оба сервиса умеют подключаться к Redis;
- Redis client не размазан по контроллерам.

## Step 4. Add Rate Limiting To Auth Service

### Что делаем

Включаем rate limiting на чувствительные auth endpoints.

### Минимальный набор

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### Какой смысл

Redis хранит счётчики попыток и TTL для окна ограничения.

### Что важно

Не усложнять до per-device / per-session limit policies.

### Definition of Done

- auth endpoints ограничены по частоте;
- при превышении лимита возвращается понятная ошибка.

## Step 5. Add Read Cache To Booking Service

### Что делаем

Кэшируем read endpoints в `booking-service`.

### Подходящий минимум

- `GET /restaurants`
- `GET /restaurants/:id`
- `GET /restaurants/:id/tables`
- `GET /tables/:id`

### Логика

- сначала проверяем Redis;
- если cache miss — читаем из Postgres;
- кладём результат в Redis с TTL.

### Что важно

Начать с простого TTL cache без сложной инвалидации.

### Definition of Done

- read endpoints умеют работать через cache;
- при отсутствии кэша поведение не ломается.

## Step 6. Define Cache Keys And TTL Policy

### Что делаем

Фиксируем понятную схему ключей и TTL.

### Примерно по смыслу

- `restaurants:list`
- `restaurants:{id}`
- `restaurants:{id}:tables`
- `tables:{id}`

### TTL

Например:

- 30 секунд
- 60 секунд
- 5 минут

### Что важно

TTL должен быть маленьким и безопасным для первой версии.

### Definition of Done

- cache keys предсказуемы;
- TTL понятен и одинаково используется в коде.

## Step 7. Add Basic Cache Invalidation

### Что делаем

Добавляем минимальную инвалидацию, если меняются справочные данные.

### Сейчас можно даже отложить

Если рестораны и столы пока read-only, можно жить только с TTL.

Но если у тебя появятся create/update/delete endpoints:

- при изменении ресторана инвалидировать `restaurants:*`
- при изменении стола инвалидировать связанные `tables:*` и `restaurants:{id}:tables`

### Что важно

Не строить слишком сложную invalidation layer раньше времени.

### Definition of Done

- кэш либо живёт на коротком TTL;
- либо корректно сбрасывается на изменениях.

## Step 8. Manual Verification

### Что проверяем

1. Redis поднят локально
2. auth-service подключается к Redis
3. booking-service подключается к Redis
4. rate limiting реально срабатывает на auth endpoints
5. read endpoints в booking-service читают из cache
6. при отключённом Redis приложение ведёт себя предсказуемо

### Негативные сценарии

- Redis недоступен;
- auth-service не падает молча;
- booking-service не возвращает сломанную структуру;
- fallback-поведение понятно.

### Definition of Done

- Redis use cases реально подтверждены руками;
- happy path и failure path понятны.

## Что можно улучшить потом

После первого Redis-этапа можно развивать дальше:

- cache для availability;
- более умная invalidation strategy;
- Redis-backed hold coordination;
- shared Redis library;
- background warming;
- metrics по hit/miss;
- распределённые блокировки для конкурентных сценариев.

## Что даст это в портфолио

Такой этап хорошо показывает:

- понимание разницы между source of truth и cache;
- работу с TTL и временными данными;
- практический rate limiting;
- аккуратную инфраструктурную интеграцию;
- умение добавлять Redis под реальную задачу, а не "чтобы был Redis".

## Definition Of Done

Redis-этап можно считать завершённым, когда:

- Redis поднят локально;
- `auth-service` использует Redis для rate limiting;
- `booking-service` использует Redis для read cache;
- PostgreSQL остаётся источником истины;
- приложение не ломается при cache miss;
- Redis-интеграция подтверждена вручную и понятна по коду.
