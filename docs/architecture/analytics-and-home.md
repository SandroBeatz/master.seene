---
version: 1.0
date: 2026-05-15
category: architecture
---

# Analytics & Home Dashboard

> Version 1.0 · 2026-05-15 · [Architecture](../)

## Overview

Two surfaces expose analytics and appointment management to the master:

- **`/analytics`** — full metrics view with a period switcher (Today / Week / Month)
- **`/home`** — action-oriented dashboard with inline appointment management and today's stats

Both surfaces share the same `useAnalyticsQuery` composable from `@entities/analytics`. When both pages are open simultaneously and showing `today`, @pinia/colada serves a single cached result under the key `['analytics', 'today']`.

## Architecture

### Analytics page

```
AnalyticsPage.vue
├── period: Ref<AnalyticsPeriod>           ← local ref, defaults to 'today'
├── useAnalyticsQuery(period)              ← single fetch for all metrics
│
├── AnalyticsPeriodTabs (v-model="period") ← changes period → triggers refetch
├── AnalyticsStatCards  (:data :loading)   ← 4 stat cards
└── AnalyticsTopServices (:services)       ← progress bar list
```

**Period switching** is handled entirely in `AnalyticsPage.vue`. The `period` ref is passed as a `Ref` into `useAnalyticsQuery`. Changing its value changes the query key `['analytics', period.value]`, causing @pinia/colada to issue a new request (or return a cached result for that key).

### Home page

```
HomePage.vue
├── period = ref<AnalyticsPeriod>('today') ← fixed, no switcher
├── useAnalyticsQuery(period)              ← today's stats only
│
├── Left column
│   ├── UpcomingAppointmentsWidget         ← fetches its own data
│   └── ActionAppointmentsWidget           ← fetches its own data
│
└── Right column (280px fixed)
    ├── HomeEarnedTodayCard   (:earned :loading)    ← links to /analytics
    ├── HomeCompletedCountCard (:count :loading)
    └── HomeWorkingHoursCard  (:minutes :loading)
```

**Grid layout:** `grid-cols-1 lg:grid-cols-[1fr_280px] gap-6`. On mobile both columns stack vertically — widgets appear above stat cards.

---

## Components

### Analytics page (`src/pages/analytics/ui/`)

#### `AnalyticsPeriodTabs.vue`

`defineModel<AnalyticsPeriod>`. Renders three buttons in a pill container. Active tab: `bg-default text-highlighted shadow-sm`. Uses `v-model` binding — parent owns the period state.

#### `AnalyticsStatCards.vue`

Receives `data: AnalyticsResult | null | undefined` and `loading: boolean`. Renders four `UPageCard` components in a 2/4-column grid:

| Card | Field | Empty state | Format |
|------|-------|-------------|--------|
| Earned | `data.earned` | `₽0` | `formats.price()` |
| Completed | `data.completed_count` | `0` | integer |
| Working hours | `data.working_minutes` | `0 ч` | `Xh Ymin`, drops minutes if 0 |
| Avg check | `data.avg_check` | `—` | `formats.price()`, `null` → `—` |

During loading: `animate-pulse` skeleton replaces the value (label and icon remain visible).

#### `AnalyticsTopServices.vue`

Receives `services: TopService[]`. Renders up to 5 progress bars. Bar width is `service.percentage`% via inline style. Key is `service.name` — guaranteed unique because the SQL groups by `name_snapshot` before applying `LIMIT 5`. Empty state: i18n key `analytics.noTopServices`.

---

### Home page stat cards (`src/pages/home/ui/`)

These three components receive already-resolved fields from `AnalyticsResult` as optional props (the parent passes `data?.field`, which is `undefined` while loading).

#### `HomeEarnedTodayCard.vue`

Wrapped in `<RouterLink to="/analytics">` inside a `UPageCard as-child`. Arrow icon has `aria-hidden="true"` (decorative). Shows `formats.price(earned ?? 0)`.

#### `HomeCompletedCountCard.vue`

Shows `completed_count` as a plain integer.

#### `HomeWorkingHoursCard.vue`

Same hours/minutes formatting as `AnalyticsStatCards`. Prop type is `number | undefined` (not `null`) — matches `data?.working_minutes` optional chaining output.

---

### Widgets

#### `ActionAppointmentsWidget` (`src/widgets/action-appointments/ui/`)

Fetches the "actionable" appointment list: appointments that need immediate action from the master.

**Query:** `useActionableAppointmentsQuery` — calls `listActionableAppointments` which uses a Supabase OR filter:

```
status = 'pending'
OR (status = 'confirmed' AND start_at < now())
```

Ordered by `start_at` ascending (most urgent first).

**`ActionAppointmentCard`** renders each appointment with conditional action buttons:

| Condition | Buttons shown |
|-----------|---------------|
| `status = 'pending'` and `start_at > now()` | Confirm + Complete |
| `status = 'pending'` and `start_at ≤ now()` | Complete only |
| `status = 'confirmed'` and `start_at < now()` | Complete only |

**Confirm flow:**
1. Calls `updateAppointment({ id, status: 'confirmed' })`
2. If `start_at > now()` → `refresh()` (card leaves the list)
3. If `start_at ≤ now()` → no refresh (card stays, now shows only Complete)

**Complete flow:**
1. Opens `AppointmentCheckoutModal` (existing feature from `@features/appointment-checkout`)
2. On successful sale → `refresh()` + success toast
3. On `already_completed` error → warning toast, modal closes (idempotent)

Also fetches clients, services, and payment types to display card content and populate the checkout modal.

#### `UpcomingAppointmentsWidget` (`src/widgets/upcoming-appointments/ui/`)

Shows a scrollable day selector and a chronological appointment list for the selected day.

**`WeekDayStrip.vue`** (`defineModel<Date>`):
- Renders 7 days: today through today+6
- Today is selected by default
- Selected day: `bg-primary text-white`; uses `day.date.toISOString()` as `:key` to avoid collisions when the 7-day window spans two months
- Does not gate on same-day clicks — parent's computed normalises dates

**`AppointmentTimeline.vue`** (pure presentational):
- Receives `appointments`, `clients`, `services` as props — no fetch of its own
- Filters to `['pending', 'confirmed', 'completed']` only (excludes `cancelled`, `no_show`)
- Time formatted with `Intl.DateTimeFormat` (locale-aware, `hour12: false`)
- Empty state with `i-lucide-calendar-x` icon

**`UpcomingAppointmentsWidget.vue`** owns the fetch:
- `selectedDate: Ref<Date>` — passed as `v-model` to `WeekDayStrip`
- `dateRange` computed: midnight-to-midnight ISO range for `selectedDate`
- `useAppointmentsQuery(userId, dateRange)` — reactive to date changes
- Also fetches clients and services to resolve names in the timeline

---

## State ownership

| State | Owner | How updated |
|-------|-------|-------------|
| Analytics period | `AnalyticsPage.vue` | `AnalyticsPeriodTabs` via `v-model` |
| Selected day (upcoming) | `UpcomingAppointmentsWidget.vue` | `WeekDayStrip` via `v-model` |
| Actionable appointments | `ActionAppointmentsWidget.vue` | `refresh()` after mutation |
| Checkout modal open | `ActionAppointmentsWidget.vue` | `handleComplete` / `handleCheckoutConfirm` |

---

## i18n keys

All keys exist in `en`, `fr`, `ru` locales.

```
analytics.period.today / .week / .month
analytics.earned / .completedCount / .workingHours / .avgCheck
analytics.topServices / .noTopServices
analytics.hoursUnit / .minutesUnit

home.earnedToday / .completedCount / .workingHours
home.actionAppointments.title / .empty / .confirm / .complete
home.upcoming.title / .empty
```

---

## File structure

```
src/
├── pages/
│   ├── analytics/ui/
│   │   ├── AnalyticsPage.vue          # root, owns period ref
│   │   ├── AnalyticsPeriodTabs.vue    # today/week/month tab switcher
│   │   ├── AnalyticsStatCards.vue     # 4-card grid (earned/completed/hours/avg)
│   │   └── AnalyticsTopServices.vue   # top 5 services with progress bars
│   └── home/ui/
│       ├── HomePage.vue               # 2-col layout, always 'today' period
│       ├── HomeEarnedTodayCard.vue    # clickable → /analytics
│       ├── HomeCompletedCountCard.vue
│       └── HomeWorkingHoursCard.vue
│
└── widgets/
    ├── action-appointments/ui/
    │   ├── ActionAppointmentsWidget.vue  # orchestrator: fetches, handles mutations
    │   └── ActionAppointmentCard.vue     # single card with confirm/complete buttons
    └── upcoming-appointments/ui/
        ├── UpcomingAppointmentsWidget.vue # orchestrator: fetches, owns selectedDate
        ├── WeekDayStrip.vue               # horizontal 7-day selector
        └── AppointmentTimeline.vue        # presentational: list of time+client+service
```

## Cross-references

- [Analytics Entity](../code/analytics-entity.md) — types, `useAnalyticsQuery`, `periodToDateRange`
- [Data Model](../business/data-model.md) — `sale`, `appointments` tables
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — `UPageCard`, `UPageHeader`, `UPage`, `UButton` used throughout
