---
version: 2.1
date: 2026-07-07
category: architecture
---

# Analytics & Home Dashboard

> Version 2.1 · 2026-07-07 · [Architecture](../)

## Overview

Two surfaces expose analytics to the master:

- **`/analytics`** — the full dashboard: a period toolbar (kind dropdown + jump-to-current + custom range + ← / → stepping + Compare), four stat cards, a revenue time-series chart, and three fixed-window widgets (top services, client mix, busiest days).
- **`/home`** — an action-oriented dashboard whose `HomeOverviewWidget` surfaces three headline metrics with its own Day / Week / Month switcher.

Both consume the `analytics` entity. The dashboard's filter-driven blocks use `useAnalyticsQueryV2`; the fixed-window widgets use `useAnalyticsWidgetsQueryV2`. See [Analytics Entity](../code/analytics-entity.md) for the data layer and [Analytics](../business/analytics.md) for the metric rules.

All analytics **presentation** lives in the `src/widgets/analytics/` slice (FSD widget layer) — the page component only orchestrates. Charts are rendered through a shared Chart.js wrapper in `src/shared/ui/chart/`. Chart.js and vue-chartjs are dependencies introduced with V2.

## Architecture

### Analytics page

```
AnalyticsPage.vue (src/pages/analytics/ui/)
├── period:  Ref<AnalyticsPeriodV2>   ← persisted to localStorage ('analytics:period'), default = current month ({ kind: 'month', date: today })
├── compare: Ref<boolean>
├── useAnalyticsQueryV2(period)        → data (current/previous/revenue_series), isPending, isPlaceholderData
├── useAnalyticsWidgetsQueryV2()       → widgets (top_services/client_mix/busiest_days/peak), widgetsPending
│
├── AnalyticsToolbar (v-model=period, v-model:compare)
│
├── ── dimming wrapper (opacity-50 + pointer-events-none while isPlaceholderData) ──
│   ├── AnalyticsStatCards   (:data :loading=isPending :compare :compare-label)
│   └── AnalyticsRevenueChart(:series :earned :period-label :period-kind :compare :loading)
│
└── ── grid lg:grid-cols-2 (outside the dimming wrapper) ──
    ├── AnalyticsTopServices (:services :loading=widgetsPending)
    └── column
        ├── AnalyticsClientMix   (:mix :loading)
        └── AnalyticsBusiestDays (:days :peak-from :peak-to :loading)
```

**Filter-driven vs fixed-window split.** The stat cards and revenue chart follow the period filter and sit inside a wrapper that dims (not skeletons) while the next period loads — `placeholderData` in the query keeps the old values on screen. The three widgets deliberately sit **outside** that wrapper: their query is keyed by the local calendar day, so switching the period never refetches or dims them.

**Period switching** is owned entirely by `AnalyticsToolbar` through `v-model`. Changing `period` changes the query key and triggers a refetch (or a cache hit). The period is written to `localStorage` on every change and restored on mount.

### Home page

```
HomePage.vue (src/pages/home/ui/)
├── header-left:  HomeUserWidget
├── header-right: HomeTodayWidget
├── HomeOverviewWidget           ← analytics: 3 headline metrics, Day/Week/Month tabs
└── grid xl:[2fr / 0.8fr]
    ├── HomeNextUpWidget          ← upcoming appointments (see Appointments docs)
    └── HomeScheduleWidget        ← day schedule timeline (see Appointments docs)
```

Only `HomeOverviewWidget` touches analytics. It calls `useAnalyticsQueryV2` with a period derived from its local `day`/`week`/`month` tab — each mapped to the matching anchored kind anchored at today (`{ kind: 'day'|'week'|'month', date: today }`) — and reads `data.current` for earned, appointments, and hours. It intentionally omits clients-served, deltas, the revenue chart, and the fixed-window widgets. The appointment/schedule widgets fetch their own data and are documented with the appointments feature.

---

## Components

### Analytics widgets (`src/widgets/analytics/ui/`)

#### `AnalyticsToolbar.vue`

`defineModel<AnalyticsPeriodV2>` + `defineModel<boolean>('compare')`. Renders:

- A **kind `USelect`** (Day / Week / Month / Year / Custom). Picking a kind jumps to the current unit of that kind; "Custom" opens a `UModal` with a range `UCalendar` capped at today.
- A **jump-to-current** `UButton` ("Today" / "This week" / "This month" / "This year"), shown only when the selection isn't already the current period.
- **← / →** stepper buttons around a center caption showing the resolved period. Forward is disabled once the next period would start in the future. When comparing, the `… vs <previous range>` caption sits directly under the center label.
- A **Compare** `USwitch`. (The **Export** button is currently hidden until export is implemented.)

Stepping/range math is delegated to the pure `model/period-step.ts` (built on `@internationalized/date`): `resolveRange`, `previousRange`, `shiftRange`, `stepPeriod`, `canStepForward`, `currentPeriod`, `isCurrentPeriod`. Stepping keeps the selection's kind — there is no collapsing to presets.

#### `AnalyticsStatCards.vue`

`:data :loading :compare :compareLabel`. Four `UCard` cards with colored icon tiles:

| Card | Field | Format | Secondary |
|---|---|---|---|
| Total earned | `current.earned` | `formats.price()` | avg check (`current.avg_check`, `null`→`—`) |
| Clients served | `current.clients_served` | integer | — |
| Hours worked | `current.working_minutes` | `Xh Ym` (drops 0 min) | — |
| Appointments | `current.appointments_count` | integer | — |

When `compare` is on and data is loaded, each card shows a delta badge: green up / red down via `deltaPct`, or a neutral **"new"** badge when the previous value is 0. The compare caption replaces the secondary text. During loading a `USkeleton` replaces each value. Delta/hours logic is the pure `lib/stat-format.ts` (`deltaPct`, `workingHoursLabel`), unit-tested independently.

#### `AnalyticsRevenueChart.vue`

`:series :earned :periodLabel :periodKind :compare :loading`. Maps `RevenuePoint[]` to either a `BaseLineChart` (default) or `BaseBarChart`, switched by a **line/bar `UFieldGroup`** toggle in the card header (icon buttons, persisted to `localStorage` under `analytics:chartType`). The `current` values are the primary (amber) dataset; a second (`previous`, zinc-soft) dataset is added only when `compare` is on. X-axis labels are re-formatted client-side from the bucket timestamp for week (short weekday + day) and month (day-of-month) views, otherwise the server label is used. The legend sits **below** the chart with dot colors matching the series. Shows the earned total and period caption above; a skeleton while loading.

#### `AnalyticsTopServices.vue`

`:services :loading`. Ranked rows (up to 6) with a colored progress bar whose width is `service.percentage`% and color is `service.color`, plus revenue and appointment count. Subtitle notes the 30-day window. Empty state `analytics.noTopServices`; row skeletons while loading.

#### `AnalyticsClientMix.vue`

`:mix :loading`. A `BaseDoughnutChart` of `[returning, new]` with the returning share shown as a percentage in the center, and a legend with both counts. Empty mix renders a single muted placeholder slice and `0%`. Subtitle notes the 90-day window.

#### `AnalyticsBusiestDays.vue`

`:days :peakFrom :peakTo :loading`. A `BaseBarChart` of the 7 weekday counts (Mon→Sun), with the busiest bar highlighted and all others muted. Peak hours render as `HH:MM – HH:MM` in the master's 12/24h format (`formats.time`), or `—` when unknown. Subtitle notes the 8-week window.

### Shared chart wrapper (`src/shared/ui/chart/`)

`BaseBarChart.vue`, `BaseLineChart.vue`, `BaseDoughnutChart.vue` wrap vue-chartjs's `Bar` / `Line` / `Doughnut`. Each takes `data` and optional `options`, deep-merging the caller's options over a themed base (`baseChartOptions` + `cartesianScales`) via `mergeDeep`.

- `register.ts` — registers the required Chart.js controllers/elements exactly once (vue-chartjs v5 does not auto-register) and sets rounded-bar and font defaults.
- `theme.ts` — `useChartTheme()` returns reactive brand colors (amber primary / zinc neutral) plus mode-aware chrome colors read from CSS variables; recomputes on color-mode change.

### Home overview widget (`src/widgets/home/ui/HomeOverviewWidget.vue`)

Three metric cards (earned / appointments / hours) with icon tiles and a pill Day/Week/Month `UTabs`. Reads `data.current` from `useAnalyticsQueryV2`; `USkeleton` per value while `isPending`. Hours use the same `Xh Ym` formatting as the stat cards (inlined here).

---

## State ownership

| State | Owner | How updated |
|---|---|---|
| Analytics period | `AnalyticsPage.vue` | `AnalyticsToolbar` via `v-model` (persisted to localStorage) |
| Compare toggle | `AnalyticsPage.vue` | `AnalyticsToolbar` via `v-model:compare` |
| Custom-range draft | `AnalyticsToolbar.vue` | `UCalendar` in the modal, applied on confirm |
| Revenue chart type (line/bar) | `AnalyticsRevenueChart.vue` | header `UFieldGroup` toggle (persisted to localStorage) |
| Home overview period | `HomeOverviewWidget.vue` | its Day/Week/Month `UTabs` |

---

## i18n keys

All keys exist in `en`, `fr`, `ru`.

```
analytics.title / .description
analytics.period.day / .week / .month / .year / .custom   ·   .today / .thisWeek / .thisMonth / .thisYear (jump labels)
analytics.toolbar.compare / .export / .exportComingSoon / .apply / .prevPeriod / .nextPeriod / .vs
analytics.totalEarned / .clientsServed / .hoursWorked / .appointments / .avgCheckInline / .deltaNew
analytics.compareVs.{yesterday,lastWeek,prevWeek,lastMonth,prevMonth,prevPeriod}
analytics.hoursUnit / .minutesUnit
analytics.topServicesTitle / .topServicesSubtitle / .noTopServices / .serviceAppointments
analytics.clientMix.title / .returning / .new / .uniqueClients
analytics.busiest.title / .peakHours   ·   analytics.weekdaysShort.{mon…sun}
analytics.revenue.title / .thisPeriod / .previous / .chartTypeLine / .chartTypeBar
analytics.windows.last30Days / .last90Days / .last8Weeks

home.overview.title / .earnedToday / .appointments / .workingHours
home.overview.period.{day,week,month} / .subtext.{today,thisWeek,thisMonth,bookedToday,…}
```

---

## File structure

```
src/
├── pages/analytics/ui/
│   └── AnalyticsPage.vue                 # orchestrator: owns period + compare, both queries
├── widgets/analytics/
│   ├── ui/
│   │   ├── AnalyticsToolbar.vue           # kind dropdown + jump + custom range + ←/→ + compare
│   │   ├── AnalyticsStatCards.vue         # 4 cards with deltas
│   │   ├── AnalyticsRevenueChart.vue      # line/bar chart (toggle), current vs previous
│   │   ├── AnalyticsTopServices.vue       # ranked colored bars (30d)
│   │   ├── AnalyticsClientMix.vue         # doughnut new/returning (90d)
│   │   └── AnalyticsBusiestDays.vue       # weekday bars + peak hours (8wk)
│   ├── lib/stat-format.ts                 # deltaPct, workingHoursLabel (+ tests)
│   ├── model/period-step.ts               # ←/→ range stepping (+ tests)
│   └── __tests__/                         # component + helper specs
│
├── widgets/home/ui/
│   └── HomeOverviewWidget.vue             # 3 metrics, day/week/month tabs (uses useAnalyticsQueryV2)
│
└── shared/ui/chart/
    ├── BaseBarChart.vue / BaseLineChart.vue / BaseDoughnutChart.vue
    ├── register.ts                        # one-time Chart.js registration + defaults
    └── theme.ts                           # useChartTheme, baseChartOptions, cartesianScales, mergeDeep
```

## Cross-references

- [Analytics Entity](../code/analytics-entity.md) — types, period-v2 helpers, `useAnalyticsQueryV2` / `useAnalyticsWidgetsQueryV2`, RPC signatures
- [Analytics](../business/analytics.md) — metric definitions, period and window rules, comparison semantics
- [Data Model](../business/data-model.md) — `sale`, `appointments`, `service` tables
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — `UCard`, `USelect`, `UModal`, `UCalendar`, `USwitch`, `UFieldGroup`, `UTabs`, `UBadge` used throughout
