# Notifications And RabbitMQ Roadmap

План следующего этапа для `TableBooker` после укрепления проекта тестами.

## Цель

Добавить в проект асинхронный сценарий, который покажет:

- работу с message broker;
- отделение основной бизнес-операции от побочных действий;
- более реалистичную микросервисную архитектуру;
- подготовку к реальным уведомлениям в будущем.

## Зачем здесь нужны notifications

Сейчас `booking-service` отвечает за основную доменную логику:

- создание брони;
- подтверждение брони;
- отмену брони;
- хранение статусов;
- проверку конфликтов.

Но есть действия, которые логически связаны с бронью, однако не должны ломать основную операцию:

- отправка подтверждения;
- отправка уведомления об отмене;
- напоминание о визите;
- любые будущие внешние уведомления.

Если попытаться делать это прямо внутри `booking-service`, появятся проблемы:

- лишняя ответственность у booking-сервиса;
- зависимость от внешних интеграций;
- риск сломать основной flow из-за побочного действия;
- более тяжёлый и менее чистый код.

## Архитектурная идея

Для этого этапа хотим получить такую схему:

- `booking-service` публикует событие;
- `RabbitMQ` доставляет сообщение;
- `notification-service` получает событие;
- обработка уведомления живёт отдельно от основной транзакции.

То есть:

- booking остаётся владельцем брони;
- notifications занимаются только реакцией на события;
- RabbitMQ выступает как транспорт между сервисами.

## Что именно не делаем пока

На этом этапе сознательно не подключаем:

- реальный SMTP provider;
- SMS provider;
- push notifications;
- шаблонизатор писем;
- retry/circuit breaker инфраструктуру;
- полноценный outbox pattern.

Сначала хотим показать саму event-driven архитектуру.

## Какой MVP делаем

### Новый сервис

Добавляем:

- `notification-service`

### Новый broker

Добавляем:

- `RabbitMQ`

### Первые события

Для MVP достаточно событий:

- `booking.confirmed`
- `booking.cancelled`

### Что делает notification-service

На первом этапе он может:

- принимать события;
- логировать, что уведомление должно быть отправлено;
- показывать, что side effect вынесен из booking-flow.

Это уже хороший и взрослый архитектурный шаг даже без реального email/SMS.

## Почему не нужен реальный email сразу

Потому что главная цель этого этапа:

- не интеграция с провайдером;
- а отделение событийной обработки от основного сервиса.

Даже если `notification-service` пока просто пишет в лог:

- `Send booking confirmation notification`
- `Send booking cancellation notification`

архитектурная ценность уже есть.

## Step 1. Define Notification Responsibilities

Status: done

### Что делаем

Фиксируем, что именно будет обязанностью `notification-service`.

### На первом этапе

- получать события о бронированиях;
- обрабатывать их независимо от `booking-service`;
- готовить место для будущих email/SMS интеграций.

### Definition of Done

- понятно, какие события идут в notifications;
- понятно, что booking-service не отправляет уведомления сам.

## Step 2. Add RabbitMQ To Local Infrastructure

Status: done

### Что делаем

Добавляем `RabbitMQ` в локальную инфраструктуру проекта.

### Что обычно понадобится

- container в `docker-compose.yml`;
- env-переменные для host/port;
- проверка локального запуска.

### Definition of Done

- RabbitMQ поднимается локально;
- сервисы могут к нему подключаться.

## Step 3. Create Notification Service Skeleton

Status: done

### Что делаем

Создаём новый Nest app:

- `apps/notification-service`

### Что важно

На первом этапе достаточно каркаса:

- `main.ts`
- `AppModule`
- базовый consumer layer

### Definition of Done

- notification-service поднимается отдельно;
- в проекте появляется третий сервис с понятной ролью.

## Step 4. Add RabbitMQ Infrastructure Modules

Status: done

### Что делаем

Подключаем RabbitMQ client/consumer infrastructure.

### Где

- в `booking-service` как publisher;
- в `notification-service` как consumer.

### Definition of Done

- booking-service умеет публиковать событие;
- notification-service умеет его получать.

## Step 5. Publish Booking Events

Status: done

### Что делаем

После важных действий в booking-flow публикуем доменные события.

### Минимум

- после подтверждения брони публикуем `booking.confirmed`;
- после отмены брони публикуем `booking.cancelled`.

### Что важно

На первом этапе событие должно публиковаться после успешного изменения состояния в БД.

### Definition of Done

- booking-service публикует хотя бы два события;
- payload события понятен и предсказуем.

## Step 6. Consume Events In Notification Service

Status: done

### Что делаем

Обрабатываем события в `notification-service`.

### MVP-поведение

- логируем получение события;
- логируем, какое уведомление должно быть отправлено;
- не падаем молча на ошибках.

### Definition of Done

- notification-service получает и обрабатывает события;
- связь между сервисами подтверждена вручную.

## Step 7. Define Event Contracts

Status: done

### Что делаем

Фиксируем структуру сообщений.

### Например

- `eventType`
- `bookingId`
- `userId`
- `email`
- `restaurantId`
- `tableId`
- `startAt`
- `status`

### Что важно

Контракт должен быть достаточно явным, чтобы потом можно было без боли подключить реальные провайдеры.

### Definition of Done

- payload событий стабилен;
- producer и consumer одинаково понимают структуру сообщений.

## Step 8. Manual Verification

Status: done

### Что проверяем

1. RabbitMQ поднят локально
2. booking-service подключается к RabbitMQ
3. notification-service подключается к RabbitMQ
4. при подтверждении брони событие публикуется
5. notification-service получает событие
6. при отмене брони происходит то же самое

### Негативные сценарии

- RabbitMQ недоступен;
- booking-service не падает молча;
- consumer логирует ошибку предсказуемо;

## Итог

MVP для `Notifications + RabbitMQ` завершён:

- `booking-service` публикует события `booking.confirmed` и `booking.cancelled`;
- `notification-service` получает и логирует эти события;
- общий контракт событий вынесен в `libs/contracts/booking-events.contract.ts`;
- ручная проверка end-to-end flow выполнена локально.
- failure path понятен.

### Definition of Done

- асинхронный flow подтверждён руками;
- event-driven взаимодействие видно по коду и поведению.

## Что можно улучшить потом

После этого этапа можно развивать дальше:

- реальная email-интеграция;
- реальная SMS-интеграция;
- retry policy;
- dead-letter queues;
- outbox pattern;
- шаблоны уведомлений;
- расписание напоминаний.

## Definition Of Done

Этап notifications + RabbitMQ можно считать завершённым, когда:

- в проекте есть `notification-service`;
- `RabbitMQ` поднят локально;
- `booking-service` публикует события;
- `notification-service` получает и обрабатывает их;
- уведомления вынесены из основного booking-flow;
- проект готов к будущему подключению email/SMS провайдеров.
