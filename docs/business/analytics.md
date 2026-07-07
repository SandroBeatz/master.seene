---
version: 2.1
date: 2026-07-07
category: business
---

# Analytics

> Version 2.1 · 2026-07-07 · [Business](../)

## Overview

Analytics gives the master a view of their business performance across a flexible date filter, with optional comparison against the equal-length preceding period. The dashboard is split into two conceptual halves:

- **Filter-driven blocks** — four headline metrics (earned, clients served, hours worked, appointments) and a revenue time-series chart. These follow the toolbar's period filter (Today / This week / Last week / This month / Last month / Custom range) and, when *Compare* is on, each shows a % delta versus the previous period.
- **Fixed-window widgets** — Top services, Client mix (new vs returning), and Busiest days + peak hours. These deliberately **ignore** the period filter and each run over their own rolling window, because short periods make them meaningless (top services over a single day is noise; repeat-rate and weekday distribution need weeks of data).

Analytics is read-only and fully server-side — no client-side aggregation. Metrics are computed by two Postgres RPCs (`get_analytics_v2` and `get_analytics_widgets_v2`) and returned as JSON snapshots. The master cannot edit or annotate analytics data.

---

## Business Rules

### Periods

The period filter is built from **anchored kinds** plus a free custom range. Each anchored kind carries an *anchor date* (`YYYY-MM-DD`) that can land anywhere inside the unit; the concrete window is derived from it. All boundaries are computed in the **master's local timezone** (the browser's system zone via JavaScript's `Date`), then passed to the RPC as `TIMESTAMPTZ` instants.

| Kind | Window |
|---|---|
| **Day** | 00:00:00 → 23:59:59 of the anchor day |
| **Week** | Monday 00:00:00 → Sunday 23:59:59 of the anchor week |
| **Month** | 1st 00:00:00 → last day 23:59:59 of the anchor month |
| **Year** | Jan 1 00:00:00 → Dec 31 23:59:59 of the anchor year |
| **Custom** | Start-of-from-day 00:00:00 → end-of-to-day 23:59:59, picked in a calendar capped at today |

Week starts on **Monday**. Sunday belongs to the *preceding* week, not the current one.

The toolbar exposes three controls:

- A **kind dropdown** (Day / Week / Month / Year / Custom). Picking a kind jumps to the *current* unit of that kind (e.g. "Week" → this week); "Custom" opens a calendar modal.
- A **jump-to-current** button ("Today" / "This week" / "This month" / "This year"), shown only when the selection isn't already the current period.
- **← / →** stepping that shifts the selection to the adjacent unit of the same kind (day↔day, month↔month, …); custom ranges shift by their own length in days. The kind never collapses — stepping back from this week yields last week *as a week selection*, not a preset. Forward stepping is disabled once the next period would start in the future.

The last selected period is persisted to `localStorage` under `analytics:period` and restored on reload; the default on first visit is the **current month**.

### Comparison and deltas

When *Compare* is toggled on, every headline metric shows a percentage delta against the **equal-length previous period**:

| Current period | Compared against |
|---|---|
| Day | The previous day |
| Week | The previous week |
| Month | The previous month |
| Year | The previous year |
| Custom (length *N*) | The *N*-length block ending immediately before the start |

The delta is `ROUND((current − previous) / previous × 100)`. When the previous value is `0` there is no baseline, so instead of an infinite percentage the card shows a neutral **"new"** badge. A positive delta is rendered green with an up-arrow, negative red with a down-arrow. The revenue chart additionally overlays a second (previous-period) series when comparing.

### Metric definitions

All metrics come from the current-period block unless noted. The previous-period block has the identical shape and is used only for deltas.

#### Earned

The sum of `sale.amount` for all sales whose `paid_at` falls within the period. `paid_at` defaults to the moment the sale is created (checkout confirm), **not** the appointment date. Revenue is attributed to the day the sale was recorded.

#### Appointments

The count of `appointments` rows where `status = 'completed'` and `start_at` is within the period. This uses the **appointment date** (`start_at`), not the payment date — the master wants to know how many sessions they worked on a given day. (In V1 this metric was called "completed count".)

#### Clients served

`COUNT(DISTINCT client_id)` over the same completed appointments used for the Appointments metric. Counts unique clients, so a client with two sessions in the period counts once.

#### Hours worked

The sum of `appointments.duration` (minutes) for the completed appointments in the period. Rendered as `Xh Ym` (e.g. `2 h 30 min`); the minutes part is dropped when zero (`3 h`); zero appointments render `0 h`.

#### Average check

`earned / appointments`, rounded to two decimals; `null` when appointments = 0 (division by zero avoided server-side), rendered as an em dash `—`. In the V2 card layout the average check is **secondary text under the Total earned card**, not a standalone card.

Because earned uses `paid_at` and appointments uses `start_at`, the average check is not an average over a homogeneous dataset — it can drift if payments are recorded out of order.

### Fixed-window widget rules

These three widgets run over rolling windows computed client-side (in local calendar days including today), independent of the period filter:

| Widget | Window | Source |
|---|---|---|
| Top services | last **30 days** | `sale_item` → `sale` |
| Client mix | last **90 days** | completed `appointments` |
| Busiest days + peak hours | last **56 days** (8 full weeks) | completed `appointments` |

56 days is chosen so every weekday is sampled exactly 8 times.

#### Top services

Up to **6** services ranked by revenue in the 30-day window. Revenue is summed from `sale_item.price_snapshot` (checkout-time price). Each entry carries its **count** (number of sale items) and **color** (the service's current `service.color`, falling back to neutral grey `#a1a1aa` when the service was deleted). Grouping is by `name_snapshot` — renaming a service splits historical rows under the old name. Percentage is `ROUND(service_revenue / window_earned × 100)`; integers, may not sum to 100. Empty array when the window has no revenue.

#### Client mix (new vs returning)

Of the clients served (a completed appointment) in the 90-day window, each is classified by their **total number of completed appointments over their entire history**:

- **New** — exactly **1** completed appointment all-time (a genuine first-timer).
- **Returning** — **2 or more** completed appointments all-time (they have come back).

Returns `{ new, returning, total }`, where `total` is the count of distinct clients served in the window (`new + returning`). The doughnut shows the **returning share** in its center. The visit count spans the client's whole history, not just the window — so a client whose first-ever visit predates the window but who was served inside it counts as returning.

> Prior to this rule (docs v2.0) a client counted as returning only when their first-ever visit predated the window, which mislabeled every client as "new" for masters whose clients all first appeared within 90 days. The classification is now by lifetime visit count.

#### Busiest days + peak hours

A 7-element array of completed-appointment counts per ISO weekday, ordered **Monday→Sunday** (index 0 = Monday), over the 56-day window. The busiest weekday's bar is highlighted. Peak hours are the single hour-of-day with the most completed appointments, returned as `[peak_hour_from, peak_hour_to]` where `to = from + 1` (e.g. `10 → 11` renders "10:00 – 11:00"); both `null` when there are no appointments. Weekday and hour extraction happen in the master's local timezone (`p_tz`).

### Revenue over time

The `revenue_series` buckets the period by a granularity derived from the period:

| Period | Granularity |
|---|---|
| Day | hour |
| Week | day |
| Month | day |
| Year | month |
| Custom ≤ 2 days | hour |
| Custom ≤ 31 days | day |
| Custom ≤ 92 days | week |
| Custom > 92 days | month |

Buckets run from `date_trunc(granularity, from)` up to **`LEAST(to, now())`** — an ongoing period (the current week/month) stops at the present bucket instead of trailing empty future buckets. Each bucket carries the `current` revenue and the `previous`-period revenue aligned to the same bucket (shifted back by the offset between the two periods). The previous series is drawn only when *Compare* is on.

Each bucket also carries a server-formatted `label` (`08:00`, `05 Mar`, `W24`, `Mar 2026`). For **week** and **month** views the x-axis labels are re-formatted client-side from the bucket timestamp into the master's locale — week → short weekday + day-of-month ("Mon 7"), month → day-of-month ("7"); other granularities keep the server label. The chart renders as a **line chart by default**, with a line/bar toggle in the card header.

### Security

Both RPCs are `SECURITY DEFINER` with `search_path = public`, filter every query by `auth.uid()`, and grant `EXECUTE` to the `authenticated` role only (revoked from `anon` and `PUBLIC`). A master can only ever see their own metrics. The internal scalar-metrics helper (`analytics_period_metrics`) is not granted to any role and is callable only from within the RPCs.

---

## Metric Attribution Summary

| Metric | Source table | Filtering field | Filter value | Window |
|---|---|---|---|---|
| Earned | `sale` | `paid_at` | within period | filter |
| Appointments | `appointments` | `start_at` (status=completed) | within period | filter |
| Clients served | `appointments` | `start_at` (status=completed) | distinct client_id | filter |
| Working minutes | `appointments` | `start_at` (status=completed) | sum duration | filter |
| Avg check | derived | — | earned / appointments | filter |
| Revenue series | `sale` | `paid_at` | bucketed | filter |
| Top services | `sale_item` → `sale` | `sale.paid_at` | within window | 30 days |
| Client mix | `appointments` | lifetime completed-visit count | new (1) / returning (≥2) | 90 days |
| Busiest days / peak | `appointments` | `start_at` (status=completed) | ISODOW / hour | 56 days |

---

## Business Surfaces

### Analytics page (`/analytics`)

The dedicated dashboard: toolbar (kind dropdown + jump-to-current + ← / → stepper + Compare switch), four stat cards, the revenue chart (with a line/bar type toggle), and the three fixed-window widgets. The **Export** control is currently **hidden** — CSV/PDF export is tracked as a separate backlog task.

### Home page (`/home`)

The `HomeOverviewWidget` shows three headline metrics (earned, appointments, hours worked) with its own compact Day / Week / Month tab switcher, mapping to `today` / `this_week` / `this_month`. It reads the same `current` block from `get_analytics_v2` as the full page. Home does **not** show clients-served, comparison deltas, the revenue chart, or the fixed-window widgets.

Both surfaces share `useAnalyticsQueryV2`; @pinia/colada caches per period key, so overlapping periods are fetched once.

---

## What Analytics Does Not Cover

- **Cancelled and no-show appointments** — excluded from every metric (no sale, status not `completed`).
- **Pending and confirmed appointments** — only `completed` appointments affect appointment-based metrics; revenue requires a checkout sale.
- **Refunds** — no refund or credit-note concept; a recorded sale permanently contributes to earned.
- **Per-client drill-down** — beyond the aggregate new/returning mix, there is no per-client breakdown.
- **Service category aggregation** — Top services groups by individual service name, not category.
- **Export** — CSV/PDF export is not yet implemented (the toolbar button is hidden).

---

## Cross-references

- [Appointments](./appointments.md) — appointment lifecycle; only `completed` appointments affect analytics metrics
- [Checkout](./checkout.md) — the workflow that creates sales; all earned revenue and top-services data comes from checkout
- [Payment Types](./payment-types.md) — payment method recorded on each sale; not surfaced in analytics metrics
- [Data Model](./data-model.md) — `sale`, `sale_item`, `appointments`, `service` tables the RPCs query
- [Analytics Entity](../code/analytics-entity.md) — TypeScript types, period-v2 helpers, `useAnalyticsQueryV2`, RPC signatures and JSON blocks
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — page and widget architecture, component tree, Chart.js wrapper
