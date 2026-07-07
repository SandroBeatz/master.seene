---
version: 2.1
date: 2026-07-07
category: code
---

# Analytics Entity

> Version 2.1 · 2026-07-07 · [Code](../)

## Overview

The `analytics` entity (`src/entities/analytics/`) is the data layer for all revenue and appointment metrics in Seene. It exposes the V2 period model, pure period helpers, TypeScript result types, and two `@pinia/colada` query composables backed by two Supabase RPCs.

All metric computation happens server-side in PostgreSQL (`get_analytics_v2` and `get_analytics_widgets_v2`). The frontend is purely a rendering layer — no client-side aggregation. The V1 API (`AnalyticsPeriod`, `periodToDateRange`, `useAnalyticsQuery`, `AnalyticsResult`) has been fully removed from the frontend; the legacy `get_analytics` RPC still exists in the database but is no longer called by any code.

## Architecture

The entity splits into two independent data paths: the **filter-driven** path (follows the dashboard period) and the **fixed-window** path (rolling windows, period-independent).

### Filter-driven data flow

```
AnalyticsPeriodV2  ({ kind: 'day'|'week'|'month'|'year', date } | { kind: 'custom', range })
       │
       ├─ periodToDateRangeV2(period)   → { from, to }             current window
       ├─ previousPeriodRange(period)   → { from, to }             comparison window
       └─ periodGranularity(period)     → 'hour'|'day'|'week'|'month'
       │
       ▼
getAnalyticsV2(period)  ← supabase.rpc('get_analytics_v2', { p_from, p_to, p_prev_from, p_prev_to, p_granularity, p_tz })
       │  returns AnalyticsResultV2 { current, previous, revenue_series }
       ▼
useAnalyticsQueryV2(period: Ref<AnalyticsPeriodV2>)  ← useQuery, key ['analytics-v2', periodKey]
       │  placeholderData keeps previous data on screen while the next loads
       ▼
AnalyticsStatCards · AnalyticsRevenueChart · HomeOverviewWidget
```

### Fixed-window data flow

```
ANALYTICS_WIDGET_WINDOWS { topServicesDays: 30, clientMixDays: 90, busiestDaysDays: 56 }
       │
       └─ rollingWindowRange(days)  → { from, to }   (one per widget, computed client-side)
       │
       ▼
getAnalyticsWidgetsV2()  ← supabase.rpc('get_analytics_widgets_v2', { p_top_from/to, p_mix_from/to, p_days_from/to, p_tz })
       │  returns AnalyticsWidgetsV2 { top_services, client_mix, busiest_days, peak_hour_from, peak_hour_to }
       ▼
useAnalyticsWidgetsQueryV2()  ← useQuery, key ['analytics-widgets-v2', localDayKey]
       │  keyed by local calendar day only — never refetches on period switch
       ▼
AnalyticsTopServices · AnalyticsClientMix · AnalyticsBusiestDays
```

### Period → date range conversion (`model/period-v2.ts`)

Three pure functions, all computing boundaries in the **master's local timezone** (native `Date`, not UTC). Week starts Monday; Sunday belongs to the previous week.

- **`periodToDateRangeV2(period)`** → `{ from, to }` ISO instants for the selected period. Anchored kinds resolve to the calendar unit around their `date`; custom ranges normalize to start-of-from-day and end-of-to-day.
- **`previousPeriodRange(period)`** → the comparison window. Anchored kinds map to the matching preceding unit (day→previous day, week→previous week, month→previous month, year→previous year); custom ranges become an equal-length block ending 1 ms before `from`.
- **`periodGranularity(period)`** → the revenue-series bucket size. Anchored kinds are fixed (day→hour, week→day, month→day, year→month); custom ranges pick by length (≤2d hour, ≤31d day, ≤92d week, else month).
- **`rollingWindowRange(days, now?)`** → a window of the last `days` local calendar days including today (`from` = start of `today − (days−1)`, `to` = end of today). Used by the fixed-window widgets.

```typescript
// Monday-start week math (period-v2.ts)
const day = d.getDay() // 0 = Sun
const toMonday = day === 0 ? -6 : 1 - day
```

### Query caching

`useAnalyticsQueryV2` keys on the period; custom ranges get a stable key fragment from their from/to so distinct ranges cache separately:

```typescript
key: () => ['analytics-v2', periodKey(period.value)]  // periodKey → 'today' | 'custom:2026-03-05:2026-03-20'
placeholderData: (previousData) => previousData        // no skeleton flash on period switch
```

`useAnalyticsWidgetsQueryV2` keys on the **local calendar day** (`localDayKey()` → `'2026-07-06'`). The rolling windows only move once a day, so switching the dashboard period never refetches the widgets, and the result is reused all day.

### Database functions

Both RPCs are `STABLE SECURITY DEFINER SET search_path = public`, filter by `auth.uid()`, and grant `EXECUTE` to `authenticated` only (revoked from `anon` / `PUBLIC`). Each returns a single JSON object, so `supabase.rpc()` yields the object directly in `data`. Both call `set_config('timezone', p_tz, true)` so `date_trunc` / `EXTRACT` / `to_char` run in the master's local zone (weekday, hour, bucket alignment); period filtering itself uses absolute instants and is timezone-independent.

**`get_analytics_v2(p_from, p_to, p_prev_from, p_prev_to, p_granularity DEFAULT 'day', p_tz DEFAULT 'UTC')`** returns:

```json
{ "current": { …metrics }, "previous": { …metrics }, "revenue_series": [ …points ] }
```

**`get_analytics_widgets_v2(p_top_from, p_top_to, p_mix_from, p_mix_to, p_days_from, p_days_to, p_tz DEFAULT 'UTC')`** returns:

```json
{ "top_services": [ … ], "client_mix": { "new", "returning", "total" },
  "busiest_days": [7 ints Mon..Sun], "peak_hour_from": int|null, "peak_hour_to": int|null }
```

Both delegate the scalar metrics to a private helper:

**`analytics_period_metrics(p_uid, p_from, p_to)`** → JSON `{ earned, appointments_count, clients_served, working_minutes, avg_check }`. `SECURITY DEFINER` but **not granted to any role** — callable only from within the two RPCs (which run as the function owner). Computes:

```sql
earned              = COALESCE(SUM(sale.amount), 0)      WHERE paid_at BETWEEN p_from AND p_to
appointments_count  = COUNT(*)              \
working_minutes     = COALESCE(SUM(duration),0) > FROM appointments
clients_served      = COUNT(DISTINCT client_id) /  WHERE status='completed' AND start_at BETWEEN …
avg_check           = ROUND(earned / appointments_count, 2)  -- NULL when count = 0
```

Note the asymmetry: `earned` filters on `sale.paid_at`; the appointment-based metrics filter on `appointments.start_at`.

The **revenue series** buckets `[date_trunc(granularity, p_from) … LEAST(p_to, now())]` by a step interval, summing `sale.amount` per bucket for the current period and for the previous period shifted back by `p_from − p_prev_from`. Capping the upper bound at `now()` keeps an in-progress period (current week/month) from emitting empty future buckets. Labels are server-formatted per granularity (`HH24:00`, `DD Mon`, `"W"IW`, `Mon YYYY`); the chart re-formats week/month x-axis labels client-side from `RevenuePoint.bucket` into the master's locale.

## Types

```typescript
// src/entities/analytics/model/types.ts

type AnalyticsPeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom'
interface AnalyticsCustomRange { from: string; to: string }        // 'YYYY-MM-DD' local dates
type AnalyticsPeriodV2 =
  | { kind: 'day'; date: string }        // anchor date (YYYY-MM-DD) anywhere inside the unit
  | { kind: 'week'; date: string }
  | { kind: 'month'; date: string }
  | { kind: 'year'; date: string }
  | { kind: 'custom'; range: AnalyticsCustomRange }
type AnalyticsAnchoredKind = Exclude<AnalyticsPeriodKind, 'custom'>  // day | week | month | year
type AnalyticsGranularity = 'hour' | 'day' | 'week' | 'month'       // revenue-chart bucket size

interface AnalyticsMetrics {          // shared by current + previous
  earned: number
  appointments_count: number
  clients_served: number
  working_minutes: number
  avg_check: number | null            // null when appointments_count = 0
}

interface RevenuePoint {
  bucket: string                       // ISO bucket start
  label: string                        // pre-formatted server-side
  current: number
  previous: number
}

interface AnalyticsResultV2 {          // get_analytics_v2 — follows the period filter
  current: AnalyticsMetrics
  previous: AnalyticsMetrics
  revenue_series: RevenuePoint[]
}

interface TopServiceV2 {
  name: string                         // name_snapshot at sale time
  revenue: number
  percentage: number                   // ROUND(revenue / window_earned * 100)
  count: number                        // sale-item count
  color: string                        // service.color, or '#a1a1aa' fallback
}
interface ClientMix { new: number; returning: number; total: number }

interface AnalyticsWidgetsV2 {         // get_analytics_widgets_v2 — fixed rolling windows
  top_services: TopServiceV2[]         // up to 6
  client_mix: ClientMix
  busiest_days: number[]               // 7 counts, index 0 = Monday
  peak_hour_from: number | null
  peak_hour_to: number | null          // from + 1, or null
}

// Rolling windows (days), computed client-side:
const ANALYTICS_WIDGET_WINDOWS = { topServicesDays: 30, clientMixDays: 90, busiestDaysDays: 56 }
```

## Usage

### Analytics page

```typescript
// src/pages/analytics/ui/AnalyticsPage.vue
import { useAnalyticsQueryV2, useAnalyticsWidgetsQueryV2 } from '@entities/analytics'

const period = ref<AnalyticsPeriodV2>(loadStoredPeriod())   // persisted to localStorage
const { data, isPending, isPlaceholderData } = useAnalyticsQueryV2(period)
const { data: widgets, isPending: widgetsPending } = useAnalyticsWidgetsQueryV2()
```

`isPlaceholderData` is used to dim (not skeleton) the filter-driven blocks while a new period loads; the fixed-window widgets sit outside that wrapper and never react to period changes.

### Home page

```typescript
// src/widgets/home/ui/HomeOverviewWidget.vue
// Home anchors every kind at today's date (anchorISO = 'YYYY-MM-DD').
const periodToAnalytics: Record<'day' | 'week' | 'month', AnalyticsPeriodV2> = {
  day: { kind: 'day', date: anchorISO },
  week: { kind: 'week', date: anchorISO },
  month: { kind: 'month', date: anchorISO },
}
const analyticsPeriod = computed(() => periodToAnalytics[activeTab.value])
const { data, isPending } = useAnalyticsQueryV2(analyticsPeriod)
const metrics = computed(() => data.value?.current)   // earned / appointments_count / working_minutes
```

### Delta and hours helpers

The pure presentation helpers live in the analytics widget slice, not the entity, so they can be unit-tested without a component:

```typescript
// src/widgets/analytics/lib/stat-format.ts
deltaPct(current, previous)        // ROUND((cur-prev)/prev*100), null when prev === 0 (→ "new" badge)
workingHoursLabel(minutes, t)      // "0 h" | "8 h" | "7 h 30 min"
```

`avg_check` is `null` when there are no completed appointments — always guard: `cur?.avg_check != null ? formats.price(cur.avg_check) : '—'`.

## File structure

```
src/entities/analytics/
├── api/
│   └── analytics.api.ts          # getAnalyticsV2, getAnalyticsWidgetsV2 — RPC calls + p_tz
├── model/
│   ├── types.ts                  # period model + result types + ANALYTICS_WIDGET_WINDOWS
│   ├── period-v2.ts              # periodToDateRangeV2 / previousPeriodRange / periodGranularity / rollingWindowRange
│   ├── analytics.queries.ts      # useAnalyticsQueryV2, useAnalyticsWidgetsQueryV2
│   └── __tests__/
│       └── period-v2.spec.ts     # boundary, comparison, granularity, rolling-window cases
└── index.ts                      # public barrel (V2 only)

src/widgets/analytics/            # presentation (see architecture doc)
├── lib/stat-format.ts            # deltaPct, workingHoursLabel (+ __tests__/stat-format.spec.ts)
└── model/period-step.ts          # toolbar ←/→ stepping (+ __tests__/period-step.spec.ts)

src/shared/ui/chart/             # Chart.js + vue-chartjs wrappers + theme (see architecture doc)

supabase/migrations/
├── 20260515130000_add_get_analytics_rpc.sql          # V1 get_analytics (legacy, orphaned)
├── 20260515140000_secure_get_analytics_rpc.sql       # V1 privilege restriction
├── 20260629230000_add_get_analytics_v2_rpc.sql       # get_analytics_v2 + analytics_period_metrics
├── 20260706120000_split_analytics_widgets_rpc.sql    # slims v2, adds get_analytics_widgets_v2
├── 20260707120000_fix_client_mix_returning.sql       # client mix: returning = ≥2 lifetime visits
└── 20260707130000_analytics_series_cap_today.sql     # revenue series capped at LEAST(p_to, now())
```

## Cross-references

- [Analytics](../business/analytics.md) — metric definitions, period rules, comparison and window semantics
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — pages, widgets, and the Chart.js wrapper that consume this entity
- [Data Model](../business/data-model.md) — `sale`, `sale_item`, `appointments`, `service` tables the RPCs query
- [Supabase Integration](../integrations/supabase.md) — RPC calling conventions and client setup
