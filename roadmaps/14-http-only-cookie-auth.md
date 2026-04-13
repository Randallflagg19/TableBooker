# Roadmap 14. HttpOnly Cookie Auth

Временный рабочий roadmap для отдельной проработки auth через `httpOnly` cookies.

После завершения этот roadmap можно убрать и считать соответствующую часть [12-i18n-and-http-only-cookies.md](./12-i18n-and-http-only-cookies.md) закрытой.

## Цель

Перевести текущий auth-flow с client-side token storage на более production-like модель, где чувствительные токены не живут в `localStorage`, а auth строится вокруг `httpOnly` cookies.

На этом этапе хотим получить:

- backend, который умеет выдавать и читать cookies;
- frontend, который больше не зависит от хранения токенов в `localStorage`;
- рабочий login / refresh / logout flow через cookie-based session;
- более зрелую auth-модель перед тестами и деплоем.

## Почему это стоит делать отдельно

Сейчас auth уже работает, но в упрощённой MVP-схеме:

- `accessToken` хранится на клиенте;
- `refreshToken` хранится на клиенте;
- refresh flow уже рабочий, но не production-like.

Это было разумно для быстрого MVP.
Но дальше лучше:

- повысить безопасность;
- упростить client-side auth logic;
- подготовить проект к деплою и более серьёзному тестированию.

## Что не хотим делать

На этом этапе не хотим:

- переписать половину проекта без плана;
- тащить старую и новую auth-модели параллельно слишком долго;
- сразу решать все deployment edge cases для cookies на всех доменах мира;
- превращать этот шаг в бесконечную security-теорию.

Нужен понятный и реалистичный переход.

## Общая стратегия

Этот этап логично идти так:

1. сначала backend;
2. потом frontend;
3. потом end-to-end ручная проверка;
4. затем уже тесты и деплой.

Это важно, потому что frontend не сможет перейти на cookie-based auth, пока backend не начнёт выдавать и принимать cookies в нужной форме.

## Step 1. Design The Target Cookie Model

### Что делаем

Сначала фиксируем, какой именно auth-flow хотим получить.

### Что решаем

- где живёт `accessToken`;
- где живёт `refreshToken`;
- какой токен возвращается в body, а какой только в cookie;
- как будет работать refresh;
- как будет работать logout;
- какие cookie flags нужны.

### Практичный вариант

Спокойный production-like вариант обычно такой:

- `refreshToken` хранится в `httpOnly` cookie;
- `accessToken` либо:
  - тоже передаётся cookie-based способом,
  - либо остаётся короткоживущим токеном в response body на первом этапе;
- frontend больше не хранит `refreshToken` в `localStorage`.

### Что важно

Нельзя идти в реализацию, пока не выбрана итоговая модель.

### Definition of Done

- понятна целевая схема auth;
- понятно, какие backend endpoints меняются;
- понятно, что должен ожидать frontend.

## Step 2. Update Backend Login And Refresh Contract

### Что делаем

Переделываем backend auth endpoints под cookie-based flow.

### Что входит

- `login` должен выставлять cookie;
- `refresh` должен читать refresh token из cookie, а не из body;
- `logout` должен очищать cookie;
- при необходимости обновляется shape response body.

### Что важно

- это основа всего перехода;
- пока backend работает по старому контракту, frontend нельзя честно перевести на новую схему;
- надо не забыть про cookie options:
  - `httpOnly`
  - `secure`
  - `sameSite`
  - `path`
  - `maxAge`

### Definition of Done

- backend выставляет refresh cookie;
- refresh endpoint больше не требует refresh token из JSON body;
- logout очищает cookie;
- контракт зафиксирован и понятен.

## Step 3. Configure Backend CORS And Cookie Delivery

### Что делаем

Настраиваем backend так, чтобы браузер вообще начал отправлять и принимать cookies.

### Что входит

- `credentials: true` в CORS where needed;
- корректный origin whitelist;
- dev-friendly настройки для localhost;
- понимание отличий между local dev и production domain setup.

### Что важно

Без этого cookie auth “вроде написан”, но фактически не работает в браузере.

### Definition of Done

- браузер получает cookie на login;
- браузер отправляет cookie на refresh / logout;
- локально сценарий работает в dev.

## Step 4. Refactor Frontend Session Model

### Что делаем

Убираем с frontend старые assumptions про хранение токенов в `localStorage`.

### Что входит

- удаление или упрощение token-storage helpers;
- пересмотр `auth-session` logic;
- отказ от ручной работы с `refreshToken` на клиенте;
- пересмотр auth-dependent requests.

### Что важно

- frontend должен перестать “знать слишком много” о refresh token;
- новая модель должна быть проще, а не сложнее старой.

### Definition of Done

- frontend больше не хранит `refreshToken` в `localStorage`;
- auth helpers соответствуют новой backend-схеме;
- код auth-сессии стал чище.

## Step 5. Update Login, Refresh And Logout Flow In The UI

### Что делаем

Переводим реальные пользовательские сценарии на новую модель.

### Что входит

- login page;
- logout action;
- current user resolution;
- session continuation;
- protected requests after page reload.

### Что важно

- пользователь не должен ощущать, что auth-flow стал “ломаным”;
- after-refresh behavior должен остаться понятным и стабильным.

### Definition of Done

- login работает через новую cookie-model;
- logout реально завершает сессию;
- page reload не ломает session flow;
- protected pages продолжают открываться корректно.

## Step 6. Recheck Booking-Dependent Flows

### Что делаем

После auth refactor отдельно перепроверяем flows, которые опираются на текущую сессию.

### Что входит

- booking creation;
- my bookings;
- confirm / cancel;
- refresh after token expiration behavior;
- loading / unauthorized states.

### Что важно

Auth меняется глубоко, значит booking-flow легко может получить регрессию, даже если login отдельно работает.

### Definition of Done

- booking flows живы после auth refactor;
- не появилось новых unauthorized surprises;
- UI корректно обрабатывает session state.

## Step 7. Clean Up Legacy Auth Code

### Что делаем

Удаляем временные решения, которые были нужны только для MVP token-storage model.

### Что входит

- cleanup старых helper-функций;
- cleanup ненужного refresh plumbing;
- cleanup устаревших комментариев и README notes;
- финальное упрощение auth-related frontend code.

### Что важно

Этот шаг нужен, чтобы проект не застрял в гибридной модели “и cookies, и localStorage, и ещё немножко старого кода”.

### Definition of Done

- старая схема хранения токенов убрана;
- проект использует одну понятную auth-модель;
- лишние временные костыли удалены.

## Step 8. Document Cookie Auth Behavior

### Что делаем

Фиксируем новую auth-модель в документации.

### Что входит

- `README.md`;
- notes по dev setup;
- notes по CORS / cookies;
- notes по production domain behavior.

### Что важно

Особенно полезно зафиксировать:

- почему cookies требуют отдельной CORS-настройки;
- как это работает локально;
- что нужно будет учесть на деплое.

### Definition of Done

- документация отражает новую auth-схему;
- следующий проход по проекту не требует заново разбираться в auth;
- roadmap можно сворачивать обратно в общий `Roadmap 12`.
