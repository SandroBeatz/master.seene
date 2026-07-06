---
version: 2.0
date: 2026-07-06
category: business
---

# Analytics

> Version 2.0 · 2026-07-06 · [Business](../)

## Overview

Analytics gives the master a view of their business performance across a flexible date filter, with optional comparison against the equal-length preceding period. The dashboard is split into two conceptual halves:

- **Filter-driven blocks** — four headline metrics (earned, clients served, hours worked, appointments) and a revenue time-series chart. These follow the toolbar's period filter (Today / This week / Last week / This month / Last month / Custom range) and, when *Compare* is on, each shows a % delta versus the previous period.
- **Fixed-window widgets** — Top services, Client mix (new vs returning), and Busiest days + peak hours. These deliberately **ignore** the period filter and each run over their own rolling window, because short periods make them meaningless (top services over a single day is noise; repeat-rate and weekday distribution need weeks of data).

Analytics is read-only and fully server-side — no client-side aggregation. Metrics are computed by two Postgres RPCs (`get_analytics_v2` and `get_analytics_widgets_v2`) and returned as JSON snapshots. The master cannot edit or annotate analytics data.

---

## Business Rules

### Periods

The period filter offers five presets plus a custom range. All boundaries are computed in the **master's local timezone** (the browser's system zone via JavaScript's `Date`), then passed to the RPC as `TIMESTAMPTZ` instants.

| Preset | Window |
|---|---|
| **Today** | 00:00:00 → 23:59:59 of the current calendar day |
| **This week** | Monday 00:00:00 → Sunday 23:59:59 of the current week |
| **Last week** | The Monday→Sunday week immediately before this week |
| **This month** | 1st 00:00:00 → last day 23:59:59 of the current month |
| **Last month** | 1st → last day of the previous calendar month |
| **Custom** | Start-of-from-day 00:00:00 → end-of-to-day 23:59:59, picked in a calendar capped at today |

Week starts on **Monday**. Sunday belongs to the *preceding* week, not the current one.

The toolbar also supports **← / → stepping**: the arrows shift the selection to the adjacent period. Full calendar months step by one month; every other selection shifts by its own length in days. Forward stepping is disabled once the next period would start in the future. Stepping collapses back to a preset chip when the resulting range exactly matches one (e.g. stepping back from *This week* highlights *Last week*).

The last selected period is persisted to `localStorage` under `analytics:period` and restored on reload; the default on first visit is **This month**.

### Comparison and deltas

When *Compare* is toggled on, every headline metric shows a percentage delta against the **equal-length previous period**:

| Current period | Compared against |
|---|---|
| Today | Yesterday |
| This week | Last week |
| Last week | The week before last |
| This month | Last month |
| Last month | The month before last |
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

Of the clients served in the 90-day window, each is classified by their **earliest completed appointment ever**:

- **New** — the client's first-ever completed appointment falls inside the window.
- **Returning** — the client's first-ever completed appointment predates the window.

Returns `{ new, returning, total }`. The doughnut shows the **returning share** in its center. Note the classification looks at the client's entire history, not just the window, so "new" genuinely means first-time.

#### Busiest days + peak hours

A 7-element array of completed-appointment counts per ISO weekday, ordered **Monday→Sunday** (index 0 = Monday), over the 56-day window. The busiest weekday's bar is highlighted. Peak hours are the single hour-of-day with the most completed appointments, returned as `[peak_hour_from, peak_hour_to]` where `to = from + 1` (e.g. `10 → 11` renders "10:00 – 11:00"); both `null` when there are no appointments. Weekday and hour extraction happen in the master's local timezone (`p_tz`).

### Revenue over time

The `revenue_series` is the period bucketed by a granularity chosen from the period length:

| Period | Granularity |
|---|---|
| Today | hour |
| This / Last week | day |
| This / Last month | week |
| Custom ≤ 2 days | hour |
| Custom ≤ 31 days | day |
| Custom ≤ 92 days | week |
| Custom > 92 days | month |

Each bucket carries a server-formatted `label` (e.g. `08:00`, `05 Mar`, `W24`, `Mar 2026`), the `current` revenue, and the `previous`-period revenue aligned to the same bucket (shifted back by the offset between the two periods). The chart draws the previous series only when *Compare* is on.

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
| Client mix | `appointments` | first-ever `start_at` vs window | new/returning | 90 days |
| Busiest days / peak | `appointments` | `start_at` (status=completed) | ISODOW / hour | 56 days |

---

## Business Surfaces

### Analytics page (`/analytics`)

The dedicated dashboard: toolbar (period presets + custom range + ← / → stepper + Compare switch + Export button), four stat cards, the revenue chart, and the three fixed-window widgets. **Export is a stub** — the button shows a "coming soon" toast; CSV/PDF export is tracked as a separate backlog task.

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
- **Export** — CSV/PDF export is not yet implemented (stub button only).

---

## Cross-references

- [Appointments](./appointments.md) — appointment lifecycle; only `completed` appointments affect analytics metrics
- [Checkout](./checkout.md) — the workflow that creates sales; all earned revenue and top-services data comes from checkout
- [Payment Types](./payment-types.md) — payment method recorded on each sale; not surfaced in analytics metrics
- [Data Model](./data-model.md) — `sale`, `sale_item`, `appointments`, `service` tables the RPCs query
- [Analytics Entity](../code/analytics-entity.md) — TypeScript types, period-v2 helpers, `useAnalyticsQueryV2`, RPC signatures and JSON blocks
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — page and widget architecture, component tree, Chart.js wrapper
