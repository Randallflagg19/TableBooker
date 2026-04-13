# Roadmap 12. Localization And HttpOnly Cookie Auth

Следующий этап после frontend testing и стабилизации MVP.

## Цель

Сделать интерфейс более зрелым в двух направлениях:

- добавить переключение языка в UI;
- перевести auth-flow на более production-like схему с `httpOnly` cookies.

На этом этапе хотим получить:

- понятный language toggle;
- централизованные UI-тексты;
- базовую русификацию и англоязычный режим;
- auth-flow без хранения чувствительных токенов в `localStorage`.

## Почему это следующий шаг

Сейчас MVP уже работает, но у него есть два заметных ограничения:

- тексты частично смешаны по языкам;
- refresh-token flow сделан в упрощённом виде через client-side storage.

Для MVP это было разумно.
Для следующего уровня зрелости уже хочется:

- сделать интерфейс более аккуратным и управляемым;
- улучшить security model auth-flow.

## Что не хотим делать

На этом этапе не хотим:

- строить слишком тяжёлую enterprise i18n-систему;
- переводить вообще все будущие строки заранее;
- превращать auth-refactor в недельный security-rewrite без понятного результата;
- ломать уже работающий MVP ради “идеальной” схемы.

Нужен спокойный и практичный upgrade.

## Общая идея

Этап логично делится на две части:

1. localization / text layer;
2. auth refactor to `httpOnly` cookies.

Они связаны тем, что обе задачи поднимают продукт на более зрелый уровень, но реализовывать их лучше отдельными подшагами.

## Step 1. Introduce Centralized UI Text Layer

### Что делаем

Убираем тексты из случайных мест по компонентам и собираем их в понятную структуру.

### Что входит

- вынос пользовательских строк;
- структура словарей для `ru` и `en`;
- базовый helper для получения текста;
- подготовка к language switch.

### Что важно

- не тащить сразу полноценную CMS или сложную translation platform;
- сначала нужен простой и понятный способ хранить UI copy;
- строки должны быть легко редактируемы.

### Definition of Done

- тексты не разбросаны хаотично по всему UI;
- у приложения есть базовый словарь;
- новый текст можно добавить без боли.

## Step 2. Add Language Toggle In The UI

### Что делаем

Добавляем маленький переключатель языка, например `RU / EN`.

### Что входит

- UI switch в header;
- сохранение выбранного языка;
- применение языка на всех основных экранах;
- базовый fallback language.

### Что важно

- переключение должно быть простым и очевидным;
- не нужен большой settings-screen ради одной настройки;
- локализация должна затронуть именно пользовательский интерфейс, а не только пару кнопок.

### Definition of Done

- пользователь может переключать язык;
- выбор языка сохраняется;
- основные страницы приложения переключаются между `ru` и `en`.

## Step 3. Complete MVP Localization Coverage

### Что делаем

Доводим локализацию до состояния, когда интерфейс не ощущается смешанным.

### Что входит

- auth screens;
- restaurants screens;
- booking form;
- my bookings;
- loading / error / empty states;
- labels, buttons, success messages.

### Что важно

- не оставить полупереведённый UI;
- не смешивать языки в одном и том же flow;
- переводы должны быть понятными, а не машинно-формальными.

### Definition of Done

- MVP UI выглядит целостно на русском;
- MVP UI выглядит целостно на английском;
- language switch имеет заметную практическую ценность.

## Step 4. Redesign Auth Flow Around HttpOnly Cookies

### Что делаем

Переводим auth-flow с client-side token storage на `httpOnly` cookie based approach.

### Что входит

- backend changes for cookie issuance;
- refresh flow через cookie, а не через `localStorage`;
- logout cleanup через cookie invalidation;
- пересмотр frontend auth helpers.

### Что важно

- это уже касается и backend, и frontend;
- переход нужно делать аккуратно, чтобы не сломать уже работающий flow;
- auth UX должен остаться простым для пользователя.

### Definition of Done

- refresh token больше не хранится в `localStorage`;
- access / refresh lifecycle работает через cookies;
- logout действительно завершает сессию.

## Step 5. Align Frontend With Cookie-Based Session Model

### Что делаем

Убираем старые client-side assumptions из frontend кода.

### Что входит

- removal or simplification of token storage helpers;
- пересмотр `auth-session` logic;
- обновление protected requests;
- проверка login / refresh / logout flows в UI.

### Что важно

- не тащить старую и новую модели параллельно слишком долго;
- желательно получить одну понятную схему auth, а не гибрид.

### Definition of Done

- frontend больше не зависит от `localStorage` токенов;
- авторизация ощущается стабильнее и чище;
- ручные auth-сценарии проходят без регрессий.

## Step 6. Update Docs And Developer Notes

### Что делаем

После локализации и cookie-based auth обновляем документацию.

### Что входит

- `README.md`;
- notes по language toggle;
- notes по auth cookie behavior;
- env / domain / cookie settings guidance.

### Что важно

- особенно важно зафиксировать cookie-related нюансы:
  - same-site policy
  - secure flag
  - local dev behavior
  - domain setup for deployment

### Definition of Done

- документация объясняет новый auth-flow;
- локализация и cookie auth описаны понятно;
- следующий вход в проект не требует заново разбираться “как это теперь работает”.
