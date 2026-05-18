---
version: 1.0
date: 2026-05-15
category: business
---

# Analytics

> Version 1.0 · 2026-05-15 · [Business](../)

## Overview

Analytics gives the master a real-time view of their business performance over three selectable periods: today, the current week, and the current month. Five metrics are surfaced: revenue earned, number of completed appointments, working hours, average check, and a top-5 services breakdown by revenue.

Analytics is read-only and fully server-side — no client-side aggregation. All metrics are computed by a single Postgres RPC call (`get_analytics`) and returned as a JSON snapshot. The master cannot edit or annotate analytics data.

---

## Business Rules

### Periods

| Period | Window |
|---|---|
| **Today** | 00:00:00 → 23:59:59 of the current calendar day |
| **Week** | Monday 00:00:00 → Sunday 23:59:59 of the current ISO week |
| **Month** | 1st 00:00:00 → last day 23:59:59 of the current calendar month |

All period boundaries are computed in the **master's local timezone** (the browser's system timezone via JavaScript's `Date` constructor). The resulting timestamps are passed to the RPC as `TIMESTAMPTZ` values. This ensures that "today" means today as the master experiences it, regardless of the server's UTC offset.

Week starts on **Monday**. Sunday belongs to the *preceding* week, not the current one.

### Metric definitions

#### Earned

The sum of `sale.amount` for all sales whose `paid_at` timestamp falls within the selected period.

`paid_at` defaults to the moment the sale is created (i.e., the moment the master taps "Confirm" in the checkout modal). It is not the appointment date.

**Important:** If a master completes an appointment on Monday but the appointment itself was scheduled for Sunday, the revenue is attributed to Monday (when the sale was recorded), not Sunday.

#### Completed count

The count of `appointments` rows where:
- `status = 'completed'`
- `start_at` is within the selected period

Unlike earned, completed count uses the **appointment date** (`start_at`), not the payment date. This is intentional: the master wants to know how many sessions they worked on a given day, not how many they invoiced.

This creates a deliberate asymmetry: **earned uses `paid_at`; completed count uses `start_at`**. In typical usage these coincide (the master checks out immediately after the appointment), but they can diverge if a master delays recording payment.

#### Working hours

The sum of `appointments.duration` (in minutes) for all completed appointments in the period. Uses the same `start_at` filter as completed count.

Displayed as hours and minutes: e.g., `2 h 30 min`. If the minute component is zero, only hours are shown: `3 h`. If zero appointments were completed, the value is `0 h`.

#### Average check

`earned / completed_count`, rounded to two decimal places. Returns `null` when `completed_count = 0` (division by zero is avoided server-side). The UI renders `null` as an em dash `—`.

Note that because earned and completed count use different date fields (`paid_at` vs `start_at`), the average check is not a simple average over a homogeneous dataset — it can produce unexpected values if payments are recorded out of order.

#### Top services

Up to 5 services ranked by revenue within the period. Revenue is summed from `sale_item.price_snapshot` — the price at the moment of checkout, not the service's current price.

Services are grouped by `name_snapshot` (the service name at checkout time). If the master renames a service, past sales appear under the old name in historical analytics.

Percentage is computed as `ROUND(service_revenue / total_earned * 100)`. Values are integers and may not sum to 100 due to rounding. When total earned is zero, top_services returns an empty array.

### Security

The `get_analytics` RPC is restricted to the `authenticated` Supabase role. Unauthenticated requests receive a permission error. The function filters all data by `auth.uid()` — a master can only see their own metrics.

---

## Metric Attribution Summary

| Metric | Source table | Filtering field | Filter value |
|---|---|---|---|
| Earned | `sale` | `paid_at` | within period |
| Completed count | `appointments` | `start_at` | within period |
| Working minutes | `appointments` | `start_at` | within period |
| Avg check | derived | — | earned / completed_count |
| Top services | `sale_item` → `sale` | `sale.paid_at` | within period |

---

## Business Surfaces

Analytics data is exposed in two places in the UI:

### Analytics page (`/analytics`)

The dedicated analytics page. The master can switch between Today, Week, and Month using a tab bar. All five metrics are shown: four stat cards (earned, completed, working hours, avg check) and a top-services progress bar list.

### Home page (`/home`)

Three summary cards showing **today's** metrics only (no period switcher): earned today, completed count, and working hours. The earned card is a link to the full analytics page.

Both surfaces use the same underlying query (`useAnalyticsQuery`). When both are mounted simultaneously, @pinia/colada serves a single cached result for the `'today'` period — no duplicate requests.

---

## What Analytics Does Not Cover

- **Cancelled and no-show appointments** — these are not counted in any metric. A `no_show` appointment has no sale and its status is not `'completed'`, so it contributes zero to all metrics.
- **Pending and confirmed appointments** — only `completed` appointments affect working hours and completed count. Revenue requires a sale, which only exists after checkout.
- **Refunds** — the system has no concept of refund or credit note. Once a sale is recorded, it permanently contributes to earned revenue.
- **Historical period comparison** — the UI provides no previous-period comparison (e.g., "this week vs last week"). Only the current period is shown.
- **Per-client analytics** — no breakdown by client. Top services is the only dimension available beyond the aggregate.
- **Service category aggregation** — top services groups by individual service name, not by category.

---

## Cross-references

- [Appointments](./appointments.md) — appointment lifecycle; only `completed` appointments affect analytics metrics
- [Checkout](./checkout.md) — the workflow that creates sales; all earned revenue and top-services data comes from checkout
- [Payment Types](./payment-types.md) — payment method recorded on each sale; not currently surfaced in analytics metrics
- [Analytics Entity](../code/analytics-entity.md) — TypeScript types, `periodToDateRange`, `useAnalyticsQuery`, RPC calling convention
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — page and widget architecture, component tree, state ownership
