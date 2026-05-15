# Analytics & Dashboard Widgets — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

---

## Overview

Implement analytics on two surfaces:
1. **Analytics page** (`/analytics`) — full metrics view with period switcher
2. **Home page** (`/home`) — action-oriented dashboard widgets

---

## 1. Database Layer

### New RPC: `get_analytics(p_from, p_to)`

Single PostgreSQL function returning all analytics metrics for a given time range.

**Returns:**
```json
{
  "earned": 2450.00,
  "completed_count": 8,
  "working_minutes": 390,
  "avg_check": 306.25,
  "top_services": [
    { "name": "Стрижка", "revenue": 1200.00, "percentage": 65 },
    { "name": "Укладка", "revenue": 450.00, "percentage": 24 }
  ]
}
```

**Computation rules:**
- `earned` — `SUM(sale.amount)` filtered by `sale.paid_at BETWEEN p_from AND p_to`
- `completed_count` — `COUNT(appointments)` where `status = 'completed'` and `start_at BETWEEN p_from AND p_to`
- `working_minutes` — `SUM(appointments.duration)` for completed appointments in period
- `avg_check` — `earned / completed_count`, returns `NULL` when count is 0
- `top_services` — join `sale_item` → `sale` filtered by period, GROUP BY `name_snapshot`, top 5 by revenue descending, `percentage = ROUND(service_revenue / total_earned * 100)`

**Security:** `SECURITY DEFINER`, filters by `auth.uid() = user_id`.

---

## 2. FSD Entity: `analytics`

New slice at `src/entities/analytics/`:

```
analytics/
  api/analytics.api.ts          # calls get_analytics RPC
  model/types.ts                # AnalyticsResult, AnalyticsPeriod, TopService
  model/analytics.queries.ts    # useAnalytics(period) via @pinia/colada useQuery
  index.ts                      # public API exports
```

**Types:**
```ts
type AnalyticsPeriod = 'today' | 'week' | 'month'

interface TopService {
  name: string
  revenue: number
  percentage: number
}

interface AnalyticsResult {
  earned: number
  completed_count: number
  working_minutes: number
  avg_check: number | null
  top_services: TopService[]
}
```

**Period → date range conversion** (done in `analytics.api.ts`):
- `today` → start of today .. end of today (local timezone)
- `week` → start of current week (Monday) .. end of Sunday
- `month` → start of current month .. end of last day

**Query key** includes period so switching period triggers automatic refetch: `['analytics', period]`.

---

## 3. Analytics Page (`/analytics`)

### Components (`src/pages/analytics/ui/`)

| Component | Responsibility |
|-----------|---------------|
| `AnalyticsPage.vue` | Root; holds `period` ref, passes to children |
| `AnalyticsPeriodTabs.vue` | Period switcher using `UTabsList` (Today / Week / Month) |
| `AnalyticsStatCards.vue` | 4 metric cards: earned, completed, hours, avg check |
| `AnalyticsTopServices.vue` | Top services list with progress bars |

### Layout

```
[Сегодня] [Неделя] [Месяц]

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Заработано│ │ Записей  │ │  Часов   │ │ Ср. чек  │
│  ₽2 450  │ │    8     │ │   6.5    │ │   ₽306   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Топ услуг по доходу
───────────────────────────────────────────────────
Стрижка       ₽1 200  ████████████░░░░  65%
Укладка        ₽450   █████░░░░░░░░░░░  24%
Окрашивание    ₽200   ██░░░░░░░░░░░░░░  11%
```

### Behavior

- Period switch updates `period` ref → `useQuery` key changes → auto-refetch
- Skeleton placeholders during loading on each card
- Empty state values: `₽0`, `0`, `0 ч`, `—` (no empty boxes)
- Working hours displayed as `X ч Y мин` or just `X ч` if no remainder
- `avg_check = null` displays as `—`

---

## 4. Home Page Widgets (`/home`)

### Layout

```
┌──────────────────────────────────┬─────────────────────┐
│  Предстоящие записи              │  Заработано сегодня  │
│  [Пн][Вт][Ср][Чт][Пт][Сб][Вс]   │      ₽2 450  →       │
│  ─────────────────────────────   ├─────────────────────┤
│  10:00  Иван Петров · Стрижка    │  Завершено записей   │
│  12:30  Анна · Укладка           │          8           │
│                                  ├─────────────────────┤
├──────────────────────────────────│  Рабочих часов       │
│  Нужно подтвердить / завершить   │        6.5 ч         │
│  ┌──────────────────────────┐    └─────────────────────┘
│  │ Иван · 09:00 · Стрижка  │
│  │   [Подтвердить] [✓ Завершить] │
│  └──────────────────────────┘
└──────────────────────────────────┘
```

### Stat Cards (`src/pages/home/ui/`)

Three small components sharing the same `useAnalytics('today')` query (same cache key — one request):
- `HomeEarnedTodayCard.vue` — clickable (`<NuxtLink to="/analytics">`), shows earned + arrow icon
- `HomeCompletedCountCard.vue` — completed appointments today
- `HomeWorkingHoursCard.vue` — working hours today

### Widget: ActionAppointmentsWidget

**Location:** `src/widgets/action-appointments/ui/`

**Files:**
- `ActionAppointmentsWidget.vue` — list container, query, empty state
- `ActionAppointmentCard.vue` — single card with inline actions

**Query logic:**
```
status = 'pending'
OR (status = 'confirmed' AND start_at < now())
```
Requires a new `listActionableAppointments(userId)` function in `src/entities/appointment/api/appointments.api.ts` — existing `listAppointments` does not support OR-filters across status + time.

**"Подтвердить" button:**
- Calls `updateAppointment({ id, status: 'confirmed' })`
- If `appointment.start_at > now()` → card leaves the list (optimistic remove or refetch)
- If `appointment.start_at <= now()` → card stays, now shows only "Завершить"

**"Завершить" button:**
- Opens existing `AppointmentCheckoutModal` passing `appointmentId`
- On successful checkout → invalidate the actionable appointments query

**Empty state:** "Нет записей требующих действий" with a checkmark icon.

### Widget: UpcomingAppointmentsWidget

**Location:** `src/widgets/upcoming-appointments/ui/`

**Files:**
- `UpcomingAppointmentsWidget.vue` — root, holds `selectedDate` ref
- `WeekDayStrip.vue` — horizontal 7-day strip starting from today
- `AppointmentTimeline.vue` — chronological list of appointments for selected day

**WeekDayStrip behavior:**
- Shows 7 days: today through today+6
- Selected day highlighted (amber, matching theme)
- Today is selected by default

**AppointmentTimeline behavior:**
- Fetches `listAppointments({ from: startOfDay(selectedDate), to: endOfDay(selectedDate) })`
- Shows only `pending`, `confirmed`, `completed` statuses (excludes `cancelled`, `no_show`)
- Each item: time (`10:00`) + client name + service name(s)
- Empty state: "Нет записей на этот день"

---

## 5. i18n Keys

New keys needed in `en`, `fr`, `ru` locales:

```
analytics.period.today
analytics.period.week
analytics.period.month
analytics.earned
analytics.completedCount
analytics.workingHours
analytics.avgCheck
analytics.topServices

home.earnedToday
home.completedCount
home.workingHours
home.actionAppointments.title
home.actionAppointments.empty
home.actionAppointments.confirm
home.actionAppointments.complete
home.upcoming.title
home.upcoming.empty
```

---

## 6. Out of Scope (explicitly deferred)

- Cancelled/no-show widget on home page
- Widget customization/reordering
- Date range custom picker on analytics page
- Charts beyond progress bars (line chart, etc.)
