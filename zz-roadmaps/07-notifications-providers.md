# Roadmap 07. Notifications Providers

Следующий этап после `Notifications + RabbitMQ MVP`.

## Цель

Подключить реальные каналы доставки уведомлений в `notification-service`, используя уже готовую событийную архитектуру.

На этом этапе хотим получить:

- реальную отправку email;
- реальную отправку SMS;
- сохранение текущего event-driven flow;
- отделение provider-логики от consumer-логики.

## Что уже есть

На предыдущем этапе уже сделано:

- `booking-service` публикует события;
- `RabbitMQ` доставляет сообщения;
- `notification-service` получает события;
- общий контракт событий зафиксирован;
- ручная проверка end-to-end flow выполнена.

То есть сейчас не нужно заново строить transport.
Теперь нужно подключить реальные providers к уже существующему `notification-service`.

## Какие providers используем

### Email

Используем:

- `Mailtrap`

Почему:

- удобно тестировать email flow;
- есть sandbox;
- подходит для transactional notifications;
- хорошо подходит для dev/demo этапа.

### SMS

Используем:

- `Exolve`

Почему:

- подходит для SMS-интеграции;
- уместен для локального рынка;
- достаточно реалистичный provider для production-like архитектуры.

## Архитектурная идея

После этого этапа хотим получить такую схему:

- `booking-service` публикует событие;
- `RabbitMQ` доставляет сообщение;
- `notification-service` получает событие;
- `notification-service` решает, какой provider вызвать;
- email уходит через `Mailtrap`;
- SMS уходит через `Exolve`.

То есть:

- `booking-service` по-прежнему не знает ничего о провайдерах;
- вся интеграция с внешними notification providers живёт в `notification-service`.

## Что пока не делаем

На этом этапе сознательно не добавляем:

- retry policy со сложной стратегией;
- DLQ/requeue сценарии;
- template engine;
- очередь приоритизации;
- user notification preferences;
- отключение отдельных каналов пользователем;
- полноценный fallback с email на SMS или наоборот.

Сначала хотим получить рабочий MVP с реальной доставкой.

## Step 1. Define Provider Responsibilities

### Что делаем

Фиксируем, за что отвечают email- и SMS-провайдеры внутри `notification-service`.

### На первом этапе

- email provider отвечает только за отправку email;
- SMS provider отвечает только за отправку SMS;
- consumer решает, когда какой provider вызывать;
- provider не знает ничего о RabbitMQ.

### Definition of Done

- понятно, где заканчивается consumer-логика;
- понятно, где начинается provider-логика.

## Step 2. Add Provider Env Variables

### Что делаем

Добавляем env-переменные для `Mailtrap` и `Exolve`.

### Что обычно понадобится

Для email:

- API token;
- sender email;
- sender name.

Для SMS:

- API token;
- sender name / alpha name;
- base URL, если нужен отдельно.

### Definition of Done

- все секреты и настройки лежат в env;
- в коде нет захардкоженных токенов и адресов.

## Step 3. Add Email Infrastructure In Notification Service

### Что делаем

Создаём email provider/service внутри `notification-service`.

### Что важно

На первом этапе достаточно:

- отдельного email service;
- одного метода вроде `sendBookingConfirmationEmail(...)`;
- одного метода вроде `sendBookingCancellationEmail(...)`.

### Definition of Done

- `notification-service` умеет вызывать `Mailtrap`;
- email logic изолирована в отдельном service.

## Step 4. Add SMS Infrastructure In Notification Service

### Что делаем

Создаём SMS provider/service внутри `notification-service`.

### Что важно

На первом этапе достаточно:

- отдельного sms service;
- одного метода вроде `sendBookingConfirmationSms(...)`;
- одного метода вроде `sendBookingCancellationSms(...)`.

### Definition of Done

- `notification-service` умеет вызывать `Exolve`;
- SMS logic изолирована в отдельном service.

## Step 5. Send Email For Booking Events

### Что делаем

После получения событий в consumer вызываем email provider.

### Минимум

- при `booking.confirmed` отправляем email;
- при `booking.cancelled` отправляем email.

### Что важно

- consumer не должен отправлять HTTP-запросы сам;
- он должен делегировать это email service.

### Definition of Done

- email реально отправляется через `Mailtrap`;
- consumer использует provider, а не содержит provider-логику внутри себя.

## Step 6. Send SMS For Booking Events

### Что делаем

После получения событий в consumer вызываем SMS provider.

### Минимум

- при `booking.confirmed` отправляем SMS;
- при `booking.cancelled` отправляем SMS.

### Что важно

- SMS не должна быть встроена прямо в consumer;
- consumer должен вызывать отдельный sms service.

### Definition of Done

- SMS реально отправляется через `Exolve`;
- SMS provider отделён от consumer и от email provider.

## Step 7. Handle Provider Errors Gracefully

### Что делаем

Обрабатываем ошибки внешних providers предсказуемо.

### Что важно

- ошибка provider не должна ломать процесс без логов;
- нужно логировать, какой provider упал;
- нужно логировать, на каком событии это произошло.

### На первом этапе достаточно

- `try/catch`;
- понятного `logger.error(...)`;
- без silent failure.

### Definition of Done

- ошибки email и SMS видны в логах;
- поведение на ошибках предсказуемо.

## Step 8. Manual Verification With Real Providers

### Что проверяем

1. событие `booking.confirmed` приводит к email-отправке;
2. событие `booking.confirmed` приводит к SMS-отправке;
3. событие `booking.cancelled` приводит к email-отправке;
4. событие `booking.cancelled` приводит к SMS-отправке;
5. `notification-service` логирует успешную отправку;
6. `notification-service` логирует ошибки provider, если они возникают.

### Definition of Done

- email и SMS реально проходят через provider layer;
- end-to-end flow подтверждён вручную;
- архитектура остаётся разделённой и чистой.

## Итог

После завершения этого roadmap проект получит:

- event-driven notifications flow;
- реальную email-интеграцию;
- реальную SMS-интеграцию;
- более production-like `notification-service`;
- сильный следующий шаг после RabbitMQ MVP.
