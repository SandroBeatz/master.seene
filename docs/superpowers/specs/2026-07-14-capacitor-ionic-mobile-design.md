# Дизайн: мобильная версия на Capacitor + Ionic (монорепо)

- **Дата:** 2026-07-14
- **Статус:** План / дизайн (реализация НЕ начата)
- **Область:** архитектура разделения desktop / mobile, обёртка в Capacitor, нативная навигация через Ionic

---

## 1. Задача

Завернуть проект в **Capacitor** и дать мобильной версии **нативное ощущение**: анимации переходов роутинга, нижний таб-бар, хедер со стрелками «назад», нативные модалки (confirmation и часть обычных). Механику навигации хотим взять из **Ionic** (стек `IonPage`, `IonRouterOutlet`, `IonTabs`, свайп-назад, hardware back).

Требования:

- **Desktop** — текущая версия (Tailwind v4 + Nuxt UI v4), без изменений поведения.
- **Mobile** — отдельный вход через Ionic; свои страницы и блоки на страницах.
- Стили Ionic и Nuxt UI / Tailwind **не должны конфликтовать**.

## 2. Текущее состояние (факты по коду)

- **Entry:** `src/main.ts` → `createApp(App)` → `App.vue` = `<UApp><RouterView/></UApp>`.
- **Vue:** `3.6.0-beta.10`. **Vapor-пакеты присутствуют** через `overrides`, но рантайм **не активирован**: в коде нет `createVaporApp`, `vaporInteropPlugin`, `<template vapor>` (grep пуст). Сейчас это **обычный VDOM-рантайм**.
- **Router:** `vue-router` `^5.0.4` (`createWebHistory`), layout-переключение через `meta.layout`, auth-гард `beforeEach` завязан на `useSessionStore`.
- **UI:** Nuxt UI v4 + Tailwind v4; тема через CSS-переменные `--ui-*` в `src/app/styles/main.css`; оверрайды компонентов в `vite.config.ts`.
- **Данные:** Pinia + `@pinia/colada`, Supabase (`@shared/lib/supabase`).
- **Архитектура:** FSD (`app / pages / widgets / features / entities / shared`), алиасы `@app @pages @widgets @features @entities @shared @`.

## 3. Анализ рисков совместимости

Ключевой риск — **Ionic Vue против текущего стека Vue/Router**.

| Конфигурация | Оценка |
| --- | --- |
| Vue 3.6 beta, обычный VDOM, Router 5, Ionic Vue | Может заработать, но router-интеграция не подтверждена |
| Vue 3.6 beta, Router 4, Ionic Vue | Вероятность выше, но всё ещё beta Vue |
| Full Vapor + Router 5 + Ionic Vue | Высокий риск, не для production |
| Stable Vue 3 + Router 4 + Ionic Vue 8 | Поддерживаемый, предсказуемый вариант |
| Vapor + Capacitor без Ionic Vue | Нормально, но нет готового navigation stack |

Существенные детали:

- **Vapor.** Vue 3.6 явно помечает Vapor как нестабильный: требует `vaporInteropPlugin` для VDOM-библиотек, имеет rough edges с VDOM-компонентами, не рекомендует мешать Vapor и VDOM в одних регионах, а interop затягивает VDOM-рантайм (обесценивает выгоду Vapor по размеру бандла). Ionic Vue — это как раз VDOM-библиотека поверх Ionic Web Components, поэтому lifecycle `IonPage` / router outlet / slots / teleports — самая рискованная зона.
- **Router 5.** `@ionic/vue-router` разрабатывается против `vue-router ^4`, а не 5. Жёсткого `peerDependency` на Router 4 нет → Bun поставит Ionic рядом с Router 5, TypeScript соберётся, но **проблема проявится только в рантайме** (back stack, tabs, транзишены, lifecycle, hardware back). **Успешная установка ничего не доказывает.**
- **Durable-аргумент.** Даже зелёный POC не гарантирует стабильность: связка Ionic + Router 5 официально не поддерживается — любой патч Ionic может её сломать.
- **Capacitor тут ни при чём.** Capacitor нормально завернёт любой готовый web-бандл (в т.ч. Vapor/Router 5). Проблемная часть — именно `@ionic/vue`, `@ionic/vue-router`, `IonRouterOutlet`, `IonTabs`, lifecycle `IonPage`.

## 4. Принятые решения

1. **Split-стратегия:** build-time (не runtime-детект). Desktop и mobile — раздельные сборки, ноль общих UI-бандлов.
2. **Vapor:** проект остаётся на обычном VDOM; никакой ставки на Vapor в мобильной части.
3. **Риск Ionic:** сначала **POC-спайк**, только потом масштабная миграция. Не строить мобильную архитектуру «на надежде».
4. **Структура репозитория:** **монорепо** — `apps/web` + `apps/mobile` + `packages/core`. Это единственный способ дать mobile его собственную, поддерживаемую связку **stable Vue 3 + Router 4 + Ionic Vue 8**, не трогая desktop (Vue 3.6 / Router 5 / Nuxt UI). В одном `package.json` нельзя одновременно держать Router 5 и Router 4.

Монорепо разом решает: несовместимость Vapor/Ionic, конфликт Router 5/4, конфликт CSS, независимые mobile/desktop страницы, независимые релиз-циклы, возможность обновлять Ionic без риска для web.

## 5. Раскладка монорепо

Инструментарий: **Bun workspaces** (Bun уже используется — нативно, без лишних зависимостей). Turborepo — опционально позже, для кэша тасков.

```
seene/
├── package.json                # { "workspaces": ["apps/*", "packages/*"] }
├── apps/
│   ├── web/                     # ← текущий проект целиком переезжает сюда
│   │   ├── Vue 3.6 beta, Router 5, Nuxt UI v4, Tailwind v4
│   │   └── app/ pages/ widgets/ features(ui)/  (десктоп-шелл как сейчас)
│   └── mobile/
│       ├── stable Vue 3, Router 4, @ionic/vue 8, Capacitor
│       └── app/ pages/ widgets/ features(ui)/  (Ionic-шелл: IonTabs, IonRouterOutlet, IonPage)
└── packages/
    └── core/                    # НЕ содержит Vue-UI
        ├── entities/            # model (stores/queries), api, lib, types
        ├── api + supabase client
        ├── i18n dictionaries (en/fr/ru)
        ├── formats / scheduling / validation
        └── session store
        # Vue, Pinia, @pinia/colada → peerDependencies (одна копия Vue на app)
```

**Правило разреза:**

- Всё, что импортирует `.vue` и UI-фреймворк → живёт в `apps/*`.
- Чистая логика / данные / типы / словари → `packages/core`.
- FSD сохраняется **внутри каждого app**; `core` — это вынесенные `entities` + `shared/lib` + `shared/api`.
- `features/*` смешивают `model|api|lib` (логика) и `ui` (Vue): при переезде сегменты логики уходят в `core`, `ui` остаётся в app. **Это самая кропотливая часть миграции.**
- Vue / Pinia / `@pinia/colada` в `core` — **peerDependencies**, чтобы у каждого app не появилась вторая копия Vue.

## 6. Декомпозиция на под-проекты

Проект крупный — режем на под-проекты, каждый = отдельный спек → план → реализация. Порядок:

1. **POC / спайк.** Изолированное `apps/mobile` на поддерживаемой связке (stable Vue 3 + Router 4 + Ionic Vue 8 + Capacitor). Собрать `IonApp` + `IonTabs` + 2 страницы. Проверить: анимации переходов, свайп-назад, hardware back, tab-stack, поведение модалок. **Гейт: не взлетает → пересматриваем подход (Konsta UI / свой transition-слой на Nuxt UI / другое).**
2. **Каркас монорепо.** Bun workspaces; перенос текущего проекта в `apps/web` **без изменения поведения** (только пути/алиасы). Отдельный PR, желательно **после мержа текущей `feature/appointment-creation`**.
3. **Вынос `packages/core`.** Вытащить `entities` + `shared/lib|api` из `apps/web`, настроить peerDeps, переключить алиасы (`@core/*`). Без изменения UI-поведения.
4. **Ionic-шелл mobile.** Реальные `IonTabs` / хедеры / back, подключение к `core`, auth-гард, i18n.
5. **Экраны mobile.** По одному спеку на группу страниц (home, calendar, clients, services, settings, …).

## 7. Следующий шаг

Сделать детальный спек **под-проекта №1 (POC)** и по его результату решать про масштабную миграцию (№2–3), чтобы не резать монорепо «на надежде».

## 8. Открытые вопросы (на потом)

- Точный список сегментов `features/*`, уходящих в `core` (инвентаризация при спеке №3).
- Версия stable Vue для `apps/mobile` (последняя стабильная 3.x на момент старта POC).
- Нужен ли общий пакет типов Supabase (генерация через MCP) и где он живёт в `core`.
- Стратегия shared-i18n словарей: единый источник в `core`, отдельные инстансы `vue-i18n` в каждом app.
- Какие именно модалки идут через Ionic, а какие остаются в текущей реализации (для web).
