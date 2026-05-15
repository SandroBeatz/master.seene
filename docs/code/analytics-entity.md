---
version: 1.0
date: 2026-05-15
category: code
---

# Analytics Entity

> Version 1.0 · 2026-05-15 · [Code](../)

## Overview

The `analytics` entity (`src/entities/analytics/`) is the data layer for all revenue and appointment metrics in Seene. It exposes three public exports: TypeScript types, a pure `periodToDateRange` utility, and a `useAnalyticsQuery` composable backed by a single Supabase RPC call.

All metric computation happens server-side in the `get_analytics` PostgreSQL function. The frontend is purely a rendering layer — no client-side aggregation.

## Architecture

### Data flow

```
AnalyticsPeriod ('today' | 'week' | 'month')
       │
       ▼
periodToDateRange(period)  ←─ pure function, testable in isolation
       │  returns { from: ISO string, to: ISO string }
       ▼
getAnalytics(period)  ←─ API call, calls supabase.rpc('get_analytics', { p_from, p_to })
       │  returns AnalyticsResult
       ▼
useAnalyticsQuery(period: Ref<AnalyticsPeriod>)  ←─ @pinia/colada useQuery wrapper
       │  reactive key: ['analytics', period.value]
       ▼
components receive { data, isLoading }
```

### Period → date range conversion

`periodToDateRange` computes ISO 8601 timestamps in the **user's local timezone** (via JavaScript's `Date` constructor, not UTC). This is intentional — a master works in their local timezone.

| Period | `from` | `to` |
|--------|--------|------|
| `today` | 00:00:00.000 today | 23:59:59.999 today |
| `week` | 00:00:00.000 Monday of current week | 23:59:59.999 Sunday of same week |
| `month` | 00:00:00.000 1st of current month | 23:59:59.999 last day of current month |

Week always starts on Monday. Sunday is treated as the last day of the previous week (offset `−6` instead of `1 − 0`).

```typescript
// src/entities/analytics/model/period.ts
const day = now.getDay() // 0 = Sun
const toMonday = day === 0 ? -6 : 1 - day
```

Month end uses the "day 0 of next month" trick — `new Date(y, mo + 1, 0)` — which resolves to the last calendar day of the current month without needing a lookup table.

### Query caching

`useAnalyticsQuery` uses `@pinia/colada`'s `useQuery` with a reactive key:

```typescript
key: () => ['analytics', period.value]
```

When `period.value` changes, the key changes, and @pinia/colada fetches fresh data. Results for each period are cached independently — switching back from `week` to `today` reuses the cached `today` result rather than re-fetching.

### Database function

The `get_analytics(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)` PostgreSQL function:
- `SECURITY DEFINER` — runs with owner privileges, filters data by `auth.uid()`
- Access is restricted: `EXECUTE` granted to `authenticated` role only, revoked from `anon` and `PUBLIC`
- Returns a single JSON object (not a set of rows), so `supabase.rpc()` returns the object directly in `data`

Metric computations (simplified):

```sql
-- Earned: sum of sale.amount for sales paid in period
SELECT COALESCE(SUM(amount), 0) FROM sale
WHERE user_id = auth.uid() AND paid_at BETWEEN p_from AND p_to

-- Completed count + working minutes: from completed appointments
SELECT COUNT(*), COALESCE(SUM(duration), 0) FROM appointments
WHERE user_id = auth.uid() AND status = 'completed' AND start_at BETWEEN p_from AND p_to

-- Avg check: earned / completed_count, NULL when count = 0

-- Top services: sale_item joined to sale, grouped by name_snapshot, top 5 by revenue
```

Note: `earned` uses `sale.paid_at` (payment date), while `completed_count` and `working_minutes` use `appointments.start_at` (appointment date). These can differ if a client pays on a different day than the appointment.

## Types

```typescript
// src/entities/analytics/model/types.ts

type AnalyticsPeriod = 'today' | 'week' | 'month'

interface TopService {
  name: string       // service name at time of sale (name_snapshot)
  revenue: number    // total revenue from this service in period
  percentage: number // revenue / total_earned * 100, rounded to integer
}

interface AnalyticsResult {
  earned: number
  completed_count: number
  working_minutes: number      // always ≥ 0, even when no completed appointments
  avg_check: number | null     // null when completed_count = 0
  top_services: TopService[]   // up to 5 items, sorted by revenue DESC; [] when none
}
```

## Usage

### Analytics page (period selector)

```typescript
// src/pages/analytics/ui/AnalyticsPage.vue
import { ref } from 'vue'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'

const period = ref<AnalyticsPeriod>('today')
const { data, isLoading } = useAnalyticsQuery(period)
// data is Ref<AnalyticsResult | null | undefined>
// changing period.value triggers an automatic refetch
```

### Home page (always today)

```typescript
// src/pages/home/ui/HomePage.vue
const period = ref<AnalyticsPeriod>('today')
const { data, isLoading } = useAnalyticsQuery(period)
// same cache key ['analytics', 'today'] as AnalyticsPage when on 'today' tab
// — no duplicate request if both pages were rendered simultaneously
```

### Rendering working hours

`working_minutes` is always an integer number of minutes. Display helper:

```typescript
const h = Math.floor(working_minutes / 60)
const m = working_minutes % 60
// e.g. 390 minutes → "6 h 30 min" (en) / "6 ч 30 мин" (ru)
// if m === 0 → "6 h" / "6 ч"
```

### Rendering avg_check

`avg_check` is `null` when there are no completed appointments. Always guard:

```typescript
props.data?.avg_check != null ? formats.price(props.data.avg_check) : '—'
```

## File structure

```
src/entities/analytics/
├── api/
│   └── analytics.api.ts          # getAnalytics(period) — Supabase RPC call
├── model/
│   ├── types.ts                  # AnalyticsPeriod, AnalyticsResult, TopService
│   ├── period.ts                 # periodToDateRange(period, now?) — pure function
│   ├── analytics.queries.ts      # useAnalyticsQuery(period: Ref) — @pinia/colada
│   └── __tests__/
│       └── period.spec.ts        # 6 unit tests for period boundary cases
└── index.ts                      # public barrel: types + periodToDateRange + useAnalyticsQuery

supabase/migrations/
├── 20260515130000_add_get_analytics_rpc.sql    # creates get_analytics function
└── 20260515140000_secure_get_analytics_rpc.sql # REVOKE/GRANT privilege restriction
```

## Cross-references

- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — pages and widgets that consume this entity
- [Data Model](../business/data-model.md) — `sale`, `sale_item`, `appointments` tables that the RPC queries
- [Supabase Integration](../integrations/supabase.md) — RPC calling conventions and client setup
