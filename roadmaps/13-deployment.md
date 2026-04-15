# Roadmap 13. Deployment

Следующий этап после завершения frontend MVP, frontend testing и базового product hardening.

## Цель

Вывести `TableBooker` в публично доступное состояние, чтобы проект можно было:

- открыть по живой ссылке;
- показать как цельный продукт, а не только локальную разработку;
- использовать в портфолио;
- дальше улучшать уже в условиях реального deployment setup.

На этом этапе хотим получить:

- задеплоенный frontend;
- задеплоенный backend;
- production environment variables;
- рабочее соединение frontend и backend в production;
- рабочую cookie/auth схему в production;
- собственный домен или хотя бы готовую схему его подключения.

## Почему это следующий шаг

Сейчас проект уже выглядит как полноценный MVP:

- backend работает;
- frontend работает;
- основные пользовательские сценарии уже собраны;
- тесты и CI уже есть;
- визуально приложение уже можно показывать.

То есть следующий естественный шаг — не продолжать бесконечно polishing локально, а получить живой deployment.

## Что не хотим делать

На этом этапе не хотим:

- сразу поднимать собственный VPS ради первого deployment;
- уходить в ручной `nginx`, SSL и серверное администрирование без необходимости;
- превращать deployment в отдельный инфраструктурный проект;
- откладывать живую ссылку ради “идеальной” production architecture.

Нужен практичный и достаточно чистый путь до реального URL.

## Предлагаемая схема

Для текущего этапа разумный вариант:

- frontend на `Vercel`;
- `auth-service` на `Render Web Service`;
- `booking-service` на `Render Web Service`;
- `notification-service` на `Render Background Worker`;
- PostgreSQL на `Render Postgres`;
- Redis на `Render Key Value`;
- RabbitMQ через внешний managed broker, например `CloudAMQP`;
- позже собственный домен поверх;
- разделение адресов по поддоменам:
  - `app.<domain>`
  - `api.<domain>`

## Почему именно так

Плюсы этой схемы:

- быстрый старт;
- deployment из Git;
- встроенный HTTPS на frontend и публичных backend endpoints;
- не нужно сразу управлять сервером вручную;
- удобно для портфолио;
- потом можно постепенно усложнять инфраструктуру, если это реально понадобится.

Отдельно важно:

- `notification-service` не должен жить как обычный публичный web app;
- RabbitMQ для текущего этапа лучше брать как managed service, а не пытаться вручную поднимать broker рядом с первым deployment.

## Общий подход

Этап лучше проходить в таком порядке:

1. зафиксировать production env и deployment constraints;
2. поднять infra;
3. поднять backend;
4. проверить production API отдельно;
5. поднять frontend;
6. связать frontend с production API;
7. затем подключать собственный домен, если временные адреса уже живы.

Это проще, чем пытаться сразу делать всё одновременно.

## Step 1. Prepare Production Deployment Inputs

### Что делаем

Готовим проект к тому, чтобы его вообще можно было безопасно и предсказуемо выкатывать.

### Что входит

- список production env variables;
- проверка build commands;
- проверка start commands;
- понимание, какие сервисы должны быть публичными, а какие нет;
- решение, какие `.env` значения допустимы для production, а какие нет;
- фиксация production auth/cookie стратегии.

### Что особенно важно

У проекта уже есть важная production-особенность:

- `refreshToken` живёт в `httpOnly` cookie;
- `accessToken` остаётся во frontend.

Поэтому ещё до первого deploy нужно понять:

- какой у frontend будет production origin;
- какой у backend будет production origin;
- как будет настроен `CORS`;
- как будет работать cookie-based refresh flow между frontend и backend;
- нужен ли кастомный домен раньше, чем хотелось бы, чтобы auth работал чисто.

### Уже зафиксировано на старте этапа

#### Deployment matrix

- frontend:
  - `Vercel`
- backend:
  - `auth-service` → `Render Web Service`
  - `booking-service` → `Render Web Service`
  - `notification-service` → `Render Background Worker`
- infrastructure:
  - PostgreSQL → `Render Postgres`
  - Redis → `Render Key Value`
  - RabbitMQ → managed broker, например `CloudAMQP`

#### Production env groups

Frontend:

- `NEXT_PUBLIC_AUTH_API_URL`
- `NEXT_PUBLIC_BOOKING_API_URL`

Auth service:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `AUTH_SERVICE_PORT`
- `AUTH_SERVICE_GRPC_HOST`
- `AUTH_SERVICE_GRPC_PORT`
- `REDIS_HOST`
- `REDIS_PORT`

Booking service:

- `DATABASE_URL`
- `BOOKING_SERVICE_PORT`
- `AUTH_SERVICE_GRPC_HOST`
- `AUTH_SERVICE_GRPC_PORT`
- `REDIS_HOST`
- `REDIS_PORT`
- `RABBITMQ_HOST`
- `RABBITMQ_PORT`

Notification service:

- `NOTIFICATION_SERVICE_PORT`
- `RABBITMQ_HOST`
- `RABBITMQ_PORT`
- `MAILTRAP_SMTP_HOST`
- `MAILTRAP_SMTP_PORT`
- `MAILTRAP_SMTP_USER`
- `MAILTRAP_SMTP_PASS`
- `MAILTRAP_SENDER_EMAIL`
- `MAILTRAP_SECURE`
- `EXOLVE_API_TOKEN`
- `EXOLVE_SOURCE_NUMBER`
- `EXOLVE_BASE_URL`

#### Что почти наверняка нужно добавить или адаптировать до первого deploy

- production CORS origin через env, а не через `http://localhost:3000`
- production cookie options через env:
  - `AUTH_COOKIE_SECURE`
  - `AUTH_COOKIE_SAME_SITE`
  - при необходимости `AUTH_COOKIE_DOMAIN`
- более явная frontend origin переменная:
  - `FRONTEND_APP_URL` или `ALLOWED_ORIGIN`
- поддержка URL-based infra config для managed services:
  - `REDIS_URL`
  - `RABBITMQ_URL`

#### Уже обнаруженные deployment risks

- `auth-service` и `booking-service` сейчас жёстко разрешают только localhost в CORS
- refresh cookie сейчас настроена как dev-only:
  - `sameSite: 'lax'`
  - `secure: false`
- Redis и RabbitMQ в коде пока подключаются только через `HOST/PORT`
- без этих правок production deployment может формально подняться, но auth refresh flow и managed infra integration будут нестабильны или сломаны

### Definition of Done

- есть список всех нужных production env vars;
- есть понятные build/start commands для frontend и backend;
- понятно, какие сервисы публичные, а какие фоновые;
- cookie/auth стратегия для production зафиксирована заранее, а не “по факту после деплоя”.

## Step 2. Deploy Infrastructure

### Что делаем

Поднимаем всё, от чего зависят backend services.

### Что входит

- `Render Postgres`;
- `Render Key Value`;
- managed RabbitMQ, например `CloudAMQP`;
- первичная настройка production credentials и connection strings.

### Что важно

- не поднимать backend раньше, чем готовы внешние зависимости;
- заранее держать под рукой production connection URLs;
- сразу разделить test/dev/prod secrets.

### Definition of Done

- PostgreSQL, Redis и RabbitMQ доступны;
- connection strings готовы;
- backend services можно конфигурировать без угадывания.

## Step 3. Deploy Backend Services

### Что делаем

Поднимаем backend в облаке.

### Что входит

- deployment `auth-service` на `Render Web Service`;
- deployment `booking-service` на `Render Web Service`;
- deployment `notification-service` на `Render Background Worker`;
- настройка environment variables;
- проверка health и доступности API.

### Что важно

- backend должен быть доступен раньше frontend;
- сначала нужно убедиться, что production API живой сам по себе;
- особенно важно проверить `auth-service` и `booking-service`;
- worker должен быть подключён к RabbitMQ и не требовать ручного старта.

### Definition of Done

- backend services подняты;
- production API отвечает;
- worker жив;
- ключевые endpoints доступны;
- backend можно проверить отдельно от frontend.

## Step 4. Verify Backend In Production Manually

### Что делаем

Проходим базовые сценарии напрямую по production API.

### Что входит

- register;
- login;
- refresh;
- me;
- restaurants;
- create booking;
- my bookings;
- confirm / cancel;
- публикация и обработка booking events.

### Что важно

До подключения frontend нужно убедиться, что backend environment не сломан сам по себе.

Особенно важно на этом этапе:

- refresh flow реально работает;
- cookie и auth endpoints ведут себя так, как ожидается;
- booking flow не ломается из-за production env differences.

### Definition of Done

- production backend проходит ручную проверку;
- auth и booking flow живы в production;
- worker реагирует на booking events;
- нет критичных surprises после выкладки.

## Step 5. Deploy Frontend

### Что делаем

Поднимаем `apps/web` в `Vercel`.

### Что входит

- настройка проекта в `Vercel`;
- production env vars для frontend;
- указание production API URL;
- build и deploy из Git.

### Что важно

- frontend должен ссылаться на production API, а не на localhost;
- frontend env должны храниться в настройках deployment platform, а не в коде;
- нужно заранее понимать, совместим ли текущий frontend origin с cookie-based auth flow.

### Definition of Done

- frontend доступен по live URL;
- production build проходит;
- приложение открывается и не падает на старте.

## Step 6. Connect Frontend And Backend In Production

### Что делаем

Связываем обе стороны в один публично доступный продукт.

### Что входит

- проверка `CORS`;
- проверка API base URL;
- проверка auth-flow в production;
- проверка refresh-cookie flow в production;
- проверка booking-flow в production;
- проверка confirm / cancel в production UI.

### Что важно

- отдельно задеплоенные части ещё не означают, что продукт реально работает end-to-end;
- здесь важна именно финальная связка;
- если временные домены мешают cookie/auth flow, это нужно признать сразу, а не пытаться “дотерпеть” до конца этапа.

### Definition of Done

- frontend и backend работают вместе в production;
- ключевые пользовательские сценарии проходят через живой URL;
- auth flow не разваливается на refresh/cookie части;
- deployment ощущается как единый продукт.

## Step 7. Add Custom Domain

### Что делаем

Подключаем собственный домен.

### Что входит

- покупка домена;
- настройка DNS;
- привязка frontend domain к `Vercel`;
- привязка API domain к `Render`;
- проверка HTTPS и маршрутизации.

### Что важно

- удобный и читаемый вариант:
  - `app.<domain>` для frontend
  - `api.<domain>` для backend
- для проекта с cookie-based auth это не только вопрос красоты, но и вопрос более чистой production-схемы;
- если auth на временных адресах неудобен или нестабилен, домен становится частью практического решения, а не только polishing.

### Definition of Done

- проект доступен по собственному домену;
- frontend и backend разведены по понятным поддоменам;
- HTTPS работает корректно.

## Step 8. Document Deployment Setup

### Что делаем

Обновляем документацию после появления реального deployment.

### Что входит

- `README.md`;
- production URLs;
- список нужных env vars;
- notes по deployment platforms;
- notes по worker/infrastructure setup;
- notes по custom domain setup.

### Что важно

Deployment без документации быстро превращается в “работает, но непонятно как это потом повторить”.

### Definition of Done

- deployment instructions описаны;
- ссылки и env notes зафиксированы;
- проект можно повторно развернуть без угадывания.
