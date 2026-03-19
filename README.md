# TableBooker

Учебный backend-проект на **NestJS + PostgreSQL** с логикой бронирования столиков. Цель проекта — показать не только CRUD, но и работу с реальной доменной логикой: конфликтами по времени, статусами брони и автоистечением hold-броней.

## MVP status

Первая версия backend MVP завершена.

Реализовано:
- список ресторанов;
- список столиков ресторана;
- создание брони;
- подтверждение брони;
- отмена брони;
- список броней пользователя;
- проверка конфликтов по времени;
- поддержка `REGULAR` и `SHARED` столов;
- автоматическое истечение `HOLD` через 5 минут с переводом в `EXPIRED`.

## Стек

- NestJS
- PostgreSQL
- SQL schema / seed scripts
- Docker Compose
- `postgres` driver without ORM
- `@nestjs/schedule` for background expiration job

## Основные сущности

- `restaurants`
- `restaurant_tables`
- `users`
- `bookings`

## Статусы брони

- `HOLD`
- `CONFIRMED`
- `CANCELLED`
- `EXPIRED`

## Как работает hold expiration

При создании бронь получает статус `HOLD`.  
Если в течение 5 минут она не была подтверждена, фоновая cron-задача переводит её в `EXPIRED`. После этого такая бронь больше не блокирует слот и стол снова доступен для бронирования.

## Запуск локально

```bash
docker compose up -d
yarn install
yarn start:dev
```

## Полезные команды

```bash
yarn build
yarn lint
yarn test:e2e
```

## Архитектурная идея

Проект стартует как модульный монолит:
- `restaurants`
- `tables`
- `bookings`

Дальше его можно развивать в сторону Redis, очередей, уведомлений и отдельного frontend-клиента, но текущая версия намеренно остаётся простой и сфокусированной на backend-ядре бронирования.
