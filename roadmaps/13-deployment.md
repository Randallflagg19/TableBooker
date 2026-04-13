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
- собственный домен или хотя бы готовую схему его подключения.

## Почему это следующий шаг

Сейчас проект уже выглядит как полноценный MVP:

- backend работает;
- frontend работает;
- основные пользовательские сценарии уже собраны;
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
- backend services на `Render`;
- позже собственный домен поверх;
- разделение адресов по поддоменам:
  - `app.<domain>`
  - `api.<domain>`

### Почему именно так

Плюсы этой схемы:

- быстрый старт;
- deployment из Git;
- встроенный HTTPS;
- не нужно сразу управлять сервером вручную;
- удобно для портфолио;
- потом можно постепенно усложнять инфраструктуру, если это реально понадобится.

## Общий подход

Этап лучше проходить в таком порядке:

1. поднять backend в cloud;
2. проверить production API отдельно;
3. поднять frontend;
4. связать frontend с production API;
5. потом уже подключать собственный домен.

Это проще, чем пытаться сразу делать всё одновременно.

## Step 1. Prepare Production Deployment Inputs

### Что делаем

Готовим проект к тому, чтобы его вообще можно было безопасно и предсказуемо выкатывать.

### Что входит

- список production env variables;
- проверка build commands;
- проверка start commands;
- понимание, какие сервисы должны быть публичными;
- решение, какие `.env` значения допустимы для production, а какие нет.

### Что важно

- не утащить в production dev secrets;
- не полагаться на локальные `.env.local` как на “магический” источник настройки;
- заранее понимать, какой URL нужен frontend для API.

### Definition of Done

- есть список всех нужных production env vars;
- есть понятные build/start commands для frontend и backend;
- локальная конфигурация не путается с production.

## Step 2. Deploy Backend Services

### Что делаем

Поднимаем backend в облаке.

### Что входит

- deployment backend services на `Render`;
- настройка environment variables;
- настройка PostgreSQL / Redis / RabbitMQ в доступной production-like конфигурации;
- проверка health и доступности API.

### Что важно

- backend должен быть доступен раньше frontend;
- сначала нужно убедиться, что production API живой сам по себе;
- особенно важно проверить auth и booking endpoints.

### Definition of Done

- backend services подняты;
- production API отвечает;
- ключевые endpoints доступны;
- backend можно проверить отдельно от frontend.

## Step 3. Verify Backend In Production Manually

### Что делаем

Проходим базовые сценарии напрямую по production API.

### Что входит

- register;
- login;
- me;
- restaurants;
- create booking;
- my bookings;
- confirm / cancel.

### Что важно

До подключения frontend нужно убедиться, что backend environment не сломан сам по себе.

### Definition of Done

- production backend проходит ручную проверку;
- auth и booking flow живы в production;
- нет критичных surprises после выкладки.

## Step 4. Deploy Frontend

### Что делаем

Поднимаем `apps/web` в `Vercel`.

### Что входит

- настройка проекта в `Vercel`;
- production env vars для frontend;
- указание production API URL;
- build и deploy из Git.

### Что важно

- frontend должен ссылаться на production API, а не на localhost;
- frontend env должны храниться в настройках deployment platform, а не в коде.

### Definition of Done

- frontend доступен по live URL;
- production build проходит;
- приложение открывается и не падает на старте.

## Step 5. Connect Frontend And Backend In Production

### Что делаем

Связываем обе стороны в один публично доступный продукт.

### Что входит

- проверка CORS;
- проверка API base URL;
- проверка auth-flow в production;
- проверка booking-flow в production;
- проверка confirm / cancel в production UI.

### Что важно

- отдельно задеплоенные части ещё не означают, что продукт реально работает end-to-end;
- здесь важна именно финальная связка.

### Definition of Done

- frontend и backend работают вместе в production;
- ключевые пользовательские сценарии проходят через живой URL;
- deployment ощущается как единый продукт.

## Step 6. Add Custom Domain

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
- домен лучше подключать уже после того, как временные deployment URLs работают.

### Definition of Done

- проект доступен по собственному домену;
- frontend и backend разведены по понятным поддоменам;
- HTTPS работает корректно.

## Step 7. Document Deployment Setup

### Что делаем

Обновляем документацию после появления реального deployment.

### Что входит

- `README.md`;
- production URLs;
- список нужных env vars;
- notes по deployment platforms;
- notes по custom domain setup.

### Что важно

Deployment без документации быстро превращается в “работает, но непонятно как это потом повторить”.

### Definition of Done

- deployment instructions описаны;
- ссылки и env notes зафиксированы;
- проект можно повторно развернуть без угадывания.
