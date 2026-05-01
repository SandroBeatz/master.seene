---
version: 1.0
date: 2026-05-01
category: code
---

# Master Entity

> Version 1.0 · 2026-05-01 · [Code](../code/)

## Overview

The `master` entity centralizes runtime preferences for the authenticated master. It reads the
master's profile schedule and display settings from Supabase, normalizes them into a small
application-facing object, and exposes that object through Pinia Colada and a Pinia snapshot store.

The entity exists because several low-level consumers need the same global data: the calendar needs
timezone and clock format, and `$f.time()` needs the selected clock format without importing feature
or entity code from `shared/`. The canonical database sources remain `master_profile.schedule` and
`master_settings.time_format`.

## Architecture

The data flow is intentionally split into three concerns:

```text
Supabase tables
  ├─ master_profile(id, user_id, schedule)
  └─ master_settings(user_id, time_format)
        │
        ▼
src/entities/master/api/master.api.ts
        │
        ▼
Pinia Colada query: ['master', 'preferences', userId]
        │
        ▼
useMasterPreferencesStore()
        │
        ├─ CalendarPage → CalendarWidget
        └─ formatsPlugin → $f.time()
```

`src/App.vue` is the preload bridge. It derives the current auth user id from
`useSessionStore()`, calls `useMasterPreferencesQuery(userId)`, and mirrors the query result into
`useMasterPreferencesStore()`. When there is no authenticated user, it resets the store to defaults.

This keeps data fetching in Pinia Colada while giving non-query consumers a stable synchronous
snapshot. The snapshot is especially useful for `src/shared/lib/formats/index.ts`, because `shared`
must not import from `entities` under the project's Feature-Sliced Design dependency rules. Instead,
`src/main.ts` injects a callback into `formatsPlugin`:

```ts
app.use(formatsPlugin, {
  getTimeFormat: () => useMasterPreferencesStore().timeFormat,
})
```

## Configuration

No environment configuration is required. The entity uses the existing Supabase client from
`@shared/lib/supabase` and the authenticated user's RLS context.

Runtime defaults:

| Constant | Value | Purpose |
|---|---:|---|
| `DEFAULT_TIME_FORMAT` | `24` | Fallback when `master_settings` is missing or invalid |
| `DEFAULT_TIME_ZONE` | `'local'` | FullCalendar-compatible local timezone marker |

Query defaults:

| Option | Value | Purpose |
|---|---:|---|
| `enabled` | `Boolean(userId.value)` | Prevents fetching without an authenticated user |
| `initialData` | `createMasterPreferences(null, null)` | Provides a safe fallback before the query resolves |
| `staleTime` | `60_000` | Keeps preferences fresh enough without refetching on every mount |
| `gcTime` | `false` | Keeps the global preferences query cached for the app lifetime |

## Usage

### Reading preferences in app-level bootstrap

`src/App.vue` owns query activation and store synchronization:

```ts
const userId = computed(() => sessionStore.session?.user.id ?? '')
const { data: masterPreferences } = useMasterPreferencesQuery(userId)

watch([userId, masterPreferences], ([currentUserId, preferences]) => {
  if (!currentUserId) {
    masterPreferencesStore.reset()
    return
  }

  masterPreferencesStore.setPreferences(preferences)
})
```

Pages and widgets should usually read the store, not recreate the query, unless they need query
status, error state, or an explicit refetch.

### Applying preferences to the calendar

`src/pages/calendar/ui/CalendarPage.vue` reads `useMasterPreferencesStore()` and passes the resolved
values into `CalendarWidget`:

```vue
<CalendarWidget
  :events="calendarEvents"
  :time-format="masterPreferencesStore.timeFormat"
  :time-zone="masterPreferencesStore.timeZone"
/>
```

`src/widgets/calendar/ui/CalendarWidget.vue` then applies them to FullCalendar:

- `timeZone` receives the profile schedule timezone or `'local'`.
- `slotLabelFormat` and `eventTimeFormat` switch between 12-hour and 24-hour display.
- Custom slot labels use `Intl.DateTimeFormat` with the same time format and timezone.

### Formatting time outside the calendar

`src/shared/lib/formats/index.ts` exposes `$f.time(value, overrideFormat?)`. It uses the injected
`getTimeFormat` callback and falls back to 24-hour formatting if preferences are not initialized:

```ts
const fmt = overrideFormat ?? options.getTimeFormat?.() ?? 24
```

Use `overrideFormat` only for one-off display requirements. Normal application UI should rely on the
master preference.

### Invalidating preferences after future settings changes

The query key is exported as `masterPreferencesQueryKey(userId)` and the invalidation helper is
exported as `useInvalidateMasterPreferences(userId)`. Settings update flows should call the helper
after saving `master_settings` or profile schedule data so the global cache and snapshot can refresh.

## Cross-references

- [Data Model](../business/data-model.md) — Supabase schema for `master_profile` and
  `master_settings`.
- [Auth and Onboarding](../business/auth-and-onboarding.md) — how profile schedule and time format
  are collected and persisted during onboarding.
- [Auth Guard & Session Store](../architecture/auth-guard.md) — session bootstrap and onboarding
  gate that provide the authenticated user id used by the master query.
- [Supabase](../integrations/supabase.md) — Supabase client and RLS usage patterns.
- [Services](../business/services.md) — services and appointment data that calendar events combine
  with master display preferences.

## File Structure

| File | Description |
|---|---|
| `src/entities/master/index.ts` | Public API for helpers, query hooks, store, and types |
| `src/entities/master/api/master.api.ts` | Supabase reads for profile, settings, and combined preferences |
| `src/entities/master/model/types.ts` | `TimeFormat`, profile, settings, schedule, and preference types |
| `src/entities/master/model/master-preferences.ts` | Defaults and normalization helpers |
| `src/entities/master/model/master.queries.ts` | Pinia Colada query key, query hook, and invalidation helper |
| `src/entities/master/model/master-preferences.store.ts` | Pinia snapshot store for synchronous consumers |
| `src/entities/master/__tests__/master-preferences.spec.ts` | Unit coverage for defaults and normalization |
| `src/App.vue` | Query preload and store synchronization |
| `src/main.ts` | Injects master time format into `formatsPlugin` |
| `src/shared/lib/formats/index.ts` | `$f.time()` consumer of the injected time format callback |
| `src/pages/calendar/ui/CalendarPage.vue` | Passes master preferences into the calendar widget |
| `src/widgets/calendar/ui/CalendarWidget.vue` | Applies timezone and time format to FullCalendar |
