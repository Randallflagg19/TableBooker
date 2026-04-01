# Roadmap 09. Testing Expansion

Следующий этап после завершения `Auth Email Or Phone`.

## Цель

Довести тестовый слой до состояния, в котором backend можно считать законченным не только по ручным проверкам, но и по автоматическим сценариям.

На этом этапе хотим получить:

- закрытие `Roadmap 08` тестами;
- тестовую фиксацию новых notification-flow сценариев;
- покрытие последних интеграций, добавленных после `Roadmap 05`;
- сохранение текущего набора e2e в рабочем и понятном состоянии.

## Что уже есть

Сейчас в проекте уже проходят `30` e2e тестов:

- auth-flow;
- booking-flow;
- restaurants read-flow;
- Redis scenarios;
- реальный `gRPC` auth-booking flow.

То есть база уже хорошая.
Не нужно строить тестовый слой с нуля.
Нужно добить именно новые сценарии, появившиеся после `Roadmap 05`.

## Что сейчас ещё не зафиксировано тестами

После `Roadmap 05` в проекте появились новые важные куски:

- `RabbitMQ` publish в `booking-service`;
- `notification-service` как consumer;
- `Mailtrap` / `Exolve` provider layer;
- graceful dispatch по каналам;
- auth через `email` или `phone`;
- `phone` в JWT / current user flow.

Часть этого уже проверена руками, но ещё не вся закреплена автоматическими тестами.

## Архитектурная идея

На этом этапе не хотим бездумно наращивать число тестов.
Хотим покрывать только то, что действительно защищает проект от регрессий:

- новые auth-сценарии;
- event publishing после confirm/cancel;
- dispatcher behavior;
- provider edge cases без реальных внешних запросов;
- основные интеграционные happy-path и skip/error-path для notifications.

То есть цель не “сделать 100 тестов ради числа”, а зафиксировать наиболее ценные места.

## Step 1. Close Roadmap 08 With Auth E2E Scenarios

### Что делаем

Добавляем в [auth.e2e-spec.ts](/Users/tapir/Programming/Restaurants/table-booker/test/auth.e2e-spec.ts) недостающие сценарии для `email-or-phone auth`.

### Минимум

- register with `email` only;
- register with `phone` only;
- register with both `email` and `phone`;
- reject when both `email` and `phone` are missing;
- reject duplicate `phone`;
- login with `email`;
- login with `phone`;
- `GET /auth/me` возвращает `phone`, если он есть;
- `GET /auth/me` не ломается, если `email = null`.

### Почему это первый шаг

Потому что это формально закрывает `Roadmap 08`.
Сначала полезно зафиксировать уже завершённый auth-refactor тестами, и только потом идти глубже в notifications.

### Definition of Done

- `Roadmap 08` закрыт не только руками, но и тестами;
- auth-flow с `email` / `phone` перестаёт быть хрупким.

## Step 2. Add Booking Event Publishing Tests

### Что делаем

Добавляем тесты на то, что `booking-service` реально публикует события после:

- `PATCH /bookings/:id/confirm`;
- `PATCH /bookings/:id/cancel`.

### Что важно проверить

- publish вызывается на нужном exchange;
- используется правильный routing key;
- payload содержит:
  - `bookingId`;
  - `userId`;
  - `tableId`;
  - `status`;
  - `startAt`;
  - `endAt`;
  - `email`;
  - `phone`.

### Формат теста

Здесь не обязательно делать full e2e через реальный RabbitMQ consumer.
Достаточно интеграционного теста `booking-service` с замоканным `RabbitMqService`.

### Definition of Done

- confirm/cancel publish behavior зафиксирован тестами;
- event contract не сломается тихо при следующем refactor.

## Step 3. Add Notification Dispatcher Tests

### Что делаем

Покрываем [notification-dispatcher.service.ts](/Users/tapir/Programming/Restaurants/table-booker/apps/notification-service/src/modules/notifications/application/notification-dispatcher.service.ts) тестами.

### Что важно проверить

- при `booking.confirmed` вызывается нужный email method;
- при `booking.confirmed` вызывается нужный sms method;
- при `booking.cancelled` вызываются cancellation methods;
- если `email` отсутствует, email channel скипается;
- если `phone` отсутствует, SMS channel скипается;
- если отсутствуют оба канала, dispatch не падает;
- ошибка одного provider не ломает второй канал.

### Почему это важно

Именно здесь сейчас живёт core-логика graceful notifications.
Это один из самых ценных кусков для защиты от регрессий.

### Definition of Done

- dispatcher behavior полностью предсказуем тестами;
- graceful dispatch подтверждён не только вручную.

## Step 4. Add Provider-Level Tests

### Что делаем

Покрываем provider layer без реальных внешних запросов.

### Для `EmailService`

- письмо собирается с корректными полями;
- recipient берётся из payload;
- отсутствие `email` даёт ожидаемое поведение.

### Для `SmsService`

- destination берётся из payload;
- номер нормализуется к формату provider-а;
- отсутствие `phone` даёт ожидаемое поведение;
- ошибка provider response корректно превращается в ошибку сервиса.

### Что важно

Не нужно в тестах реально слать письма и SMS.
Нужно мокать transport / `fetch` и проверять поведение сервиса.

### Definition of Done

- provider layer покрыт unit/integration тестами;
- Mailtrap / Exolve интеграции становятся безопаснее для рефакторинга.

## Step 5. Add Notification Consumer Integration Test

### Что делаем

Добавляем один компактный интеграционный сценарий на `notification-service`.

### Что важно проверить

- consumer получает сообщение;
- передаёт его в dispatcher;
- успешная обработка приводит к `ack`;
- ошибка обработки приводит к `nack`.

### Что важно

Не обязательно строить здесь тяжёлый full e2e с реальным Mailtrap/Exolve.
Главная цель — зафиксировать transport-to-dispatcher flow внутри самого `notification-service`.

### Definition of Done

- consumer lifecycle подтверждён тестом;
- RabbitMQ handler logic не остаётся без защиты.

## Step 6. Review Existing E2E Suite For Duplication And Gaps

### Что делаем

После добавления новых тестов коротко пересматриваем весь каталог [test](/Users/tapir/Programming/Restaurants/table-booker/test).

### Что смотрим

- нет ли лишнего дублирования;
- можно ли вынести общие helper-функции;
- не расползлись ли test data factory patterns;
- нет ли сценариев, которые проверяют одно и то же слишком многословно.

### Почему это нужно

Сейчас у тебя уже `30` тестов, а после этого этапа будет заметно больше.
Важно не только добавить покрытие, но и не испортить читаемость suite.

### Definition of Done

- тестовый каталог остаётся понятным;
- рост test suite не превращает проект в тестовый хаос.

## Step 7. Run Full Local Test Suite And CI Verification

### Что делаем

Прогоняем:

- `yarn test:e2e`;
- при необходимости таргетные тесты новых notification/auth файлов;
- и проверяем `GitHub Actions`.

### Что важно

- тесты должны проходить локально;
- тесты должны проходить в CI;
- новая инфраструктура (`Redis`, `RabbitMQ`) не должна ломать пайплайн.

### Definition of Done

- полный test suite зелёный локально и в CI;
- backend можно считать стабилизированным.

## Step 8. Manual Sanity Check

### Что проверяем

1. Auth still works with `email` and `phone`.
2. Booking confirm/cancel still publish notifications.
3. Notification flow руками не регресснул после добавления тестов.
4. Набор тестов реально соответствует основным сценариям проекта.

### Definition of Done

- тесты и ручная проверка не противоречат друг другу;
- backend готов к переходу в следующий большой этап.

## Итог

После завершения этого roadmap проект получит:

- завершённый auth-testing слой для `Roadmap 08`;
- тестовую фиксацию notification architecture;
- более безопасный refactor-friendly backend;
- сильную финальную backend-базу перед переходом к следующему этапу.
