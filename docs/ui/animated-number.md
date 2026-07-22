---
version: 1.0
date: 2026-07-22
category: ui
---

# AnimatedNumber

> Version 1.0 · 2026-07-22 · [UI](../ui/)

## Overview

`AnimatedNumber` is a shared, generic wrapper around [`@number-flow/vue`](https://number-flow.barvian.me/vue) (`NumberFlow`). It replaces a static `{{ value }}` text interpolation for headline numbers that change over time — switching a period filter, a query refetch, a live counter — so the digits roll/transition instead of jump-cutting.

It is deliberately **format-agnostic**: the component takes a raw `number` plus `Intl.NumberFormat`-shaped options and optional `prefix`/`suffix` strings. It does **not** know about money, currencies, or business units — it never accepts a pre-formatted string. This keeps it reusable for both money figures and plain counters, and pushes all domain formatting decisions (which currency, how many decimals, what unit suffix) to the caller.

It lives in the `shared` FSD layer (`src/shared/ui/animated-number/`) and carries no business logic — the only external dependency is `useLocaleStore()` (`@shared/lib/locale`), used purely to default the number-grouping locale to the app's active UI language.

First adopted across the July 2026 "animate the headline numbers" epic: `HomeOverviewWidget` (earned / appointments / hours) and the three money-bearing analytics widgets (`AnalyticsStatCards`, `AnalyticsRevenueChart`, `AnalyticsTopServices`).

---

## Architecture

```
src/shared/ui/animated-number/
  AnimatedNumber.vue   ← thin wrapper around <NumberFlow>
  index.ts             ← barrel: AnimatedNumber
```

Exported from the `@shared/ui` barrel (`export * from './animated-number'`).

### What it wraps

`@number-flow/vue`'s `NumberFlow` component renders a custom element (`<number-flow>`) that attaches a **shadow DOM** and animates digit-by-digit transitions whenever its `value` changes, using `Intl.NumberFormat` internally to turn the raw number into formatted parts (digits, group separators, decimal point). `AnimatedNumber` passes through only the subset of `NumberFlow`'s props this project needs:

```vue
<NumberFlow
  :value="props.value"
  :format="props.format"
  :locales="props.locales ?? localeStore.current"
  :prefix="props.prefix"
  :suffix="props.suffix"
/>
```

### Locale defaulting

`locales` defaults to `useLocaleStore().current` when the caller doesn't pass one explicitly. This mirrors exactly how `useFormats()` resolves its own locale in `src/main.ts` (`getLocale: () => i18n.global.locale.value`) — `useLocaleStore().current` is kept in sync with `i18n.global.locale.value` by the store itself (`src/shared/lib/locale/locale.store.ts`). So an `AnimatedNumber` with no explicit `locales` groups digits exactly the way `useFormats().price()` / `.decimal()` would for the same value.

### The `format` prop's type

`format` is typed as `Format`, imported from `@number-flow/vue` — **not** `Intl.NumberFormatOptions`. `Format` is a narrower type that restricts `notation` to `'standard' | 'compact'` (excludes `'scientific' | 'engineering'`, which the underlying digit-flip animation can't represent). Passing a plain `Intl.NumberFormatOptions` object type-checks fine as long as you don't set `notation` to `'scientific'`/`'engineering'` — vue-tsc will reject that specific case.

### A non-obvious gotcha: shadow DOM in tests

`NumberFlow` calls `this.attachShadow({ mode: 'open' })` unconditionally on first render. In real browsers, `Node.textContent` does not cross a shadow boundary — but in this project's jsdom-based Vitest setup, `wrapper.text()` (Vue Test Utils) still picks up the shadow-rendered digits in practice, so existing text assertions like `expect(wrapper.text()).toContain('15,000')` kept passing unmodified when `AnalyticsStatCards`/`AnalyticsRevenueChart`/`AnalyticsTopServices` were migrated to `AnimatedNumber`. This is jsdom behavior, not a spec guarantee — don't rely on it for anything beyond text-content assertions in tests.

### Test setup requirement

Because `AnimatedNumber` calls `useLocaleStore()` (a Pinia store) unconditionally, **any component that renders it needs an active Pinia instance in tests**, even if the test never touches locale directly:

```typescript
import { createPinia, setActivePinia } from 'pinia'

const pinia = createPinia()
setActivePinia(pinia)

mount(SomeWidget, { global: { plugins: [pinia, i18n, formatsPlugin] } })
```

Omitting this throws `"getActivePinia() was called but there was no active Pinia"` at mount time. See `src/widgets/analytics/__tests__/AnalyticsStatCards.spec.ts` for a worked example.

There is a second, unrelated pitfall the same migration surfaced: `src/shared/lib/i18n/index.ts` reads `localStorage.getItem('locale')` at **module scope** (import time). Some Vitest/Node environments expose a `localStorage` global that evaluates to `undefined` rather than being absent, which throws before any test body runs. It's now guarded (`typeof localStorage !== 'undefined' ? … : null`) — worth knowing about if a *new* test file that imports `@shared/lib/locale` (directly or transitively, e.g. via `AnimatedNumber`) fails at import time with `Cannot read properties of undefined (reading 'getItem')`.

---

## Configuration

Props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `number` | *required* | The raw number to display and animate. |
| `format` | `Format` (⊂ `Intl.NumberFormatOptions`) | `{}` | e.g. `{ minimumFractionDigits, maximumFractionDigits }`. No currency style — see [Money usage](#2-money-figures-priceparts) below. |
| `prefix` | `string` | `undefined` | Prepended, not animated as a number (e.g. a currency symbol). |
| `suffix` | `string` | `undefined` | Appended, not animated as a number (e.g. a unit label). |
| `locales` | `Intl.LocalesArgument` | `useLocaleStore().current` | Override only if you need a locale different from the active UI locale. |

No `v-model`, no emits — it's a pure display component.

---

## Usage

### 1. Plain counter (no formatting needed)

```vue
<script setup lang="ts">
import { AnimatedNumber } from '@shared/ui'
</script>

<template>
  <AnimatedNumber :value="appointmentsCount" />
</template>
```

Real usage: `src/widgets/home/ui/HomeOverviewWidget.vue` — the "appointments" card (`card.kind === 'count'`). No `format`/`prefix`/`suffix` needed; `Intl.NumberFormat`'s defaults (grouped, no forced decimals) are correct for a plain integer count.

### 2. Money figures (`priceParts`)

Money needs the same decimals-per-currency and symbol-prefix-or-suffix logic as `useFormats().price()`, decomposed into raw parts instead of a formatted string. `useFormats()` (`src/shared/lib/formats/index.ts`) exposes `priceParts(currencyOverride?)` for exactly this:

```typescript
export interface PriceParts {
  format: { minimumFractionDigits: number; maximumFractionDigits: number }
  prefix?: string
  suffix?: string
}
```

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useFormats } from '@shared/lib/formats'
import { AnimatedNumber } from '@shared/ui'

const formats = useFormats()
const priceParts = computed(() => formats.priceParts())
</script>

<template>
  <AnimatedNumber
    :value="earned"
    :format="priceParts.format"
    :prefix="priceParts.prefix"
    :suffix="priceParts.suffix"
  />
</template>
```

`priceParts()` reuses `currency()` internally, so it reads the master's active currency (`useMasterPreferencesStore().currency`, wired in `src/main.ts`) exactly like `price()` does, and renders **visually identical** output — same non-breaking space between symbol and amount, same decimal count per currency (e.g. `KGS`/`KZT`/`RUB` show 0 decimals, `USD`/`EUR` show 2).

Real usage (all three pass `currencyOverride` as `undefined`, i.e. the active currency):
- `src/widgets/home/ui/HomeOverviewWidget.vue` — "earned" card.
- `src/widgets/analytics/ui/AnalyticsStatCards.vue` — "Total earned" card (the `avg_check` secondary caption stays plain text via `formats.price()`, since it's a static caption, not a headline metric).
- `src/widgets/analytics/ui/AnalyticsRevenueChart.vue` — the chart header's `earned` total (not the chart itself — Chart.js renders its own tooltip labels via `formats.price()`, unrelated to this component).
- `src/widgets/analytics/ui/AnalyticsTopServices.vue` — each service row's `revenue`.

### 3. Composite values (duration split into parts)

`AnimatedNumber` only animates one number at a time. A value like "2h 30m" is rendered as **two adjacent `AnimatedNumber`s**, each with its own unit suffix, rather than trying to animate a formatted string:

```vue
<script setup lang="ts">
import { AnimatedNumber } from '@shared/ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <AnimatedNumber :value="hours" :suffix="t('analytics.hoursUnit')" />
  <AnimatedNumber v-if="minutes > 0" :value="minutes" :suffix="t('analytics.minutesUnit')" class="ml-1" />
</template>
```

Real usage: `src/widgets/home/ui/HomeOverviewWidget.vue` — the "hours" card. `workingHoursParts` (a local `computed`) decomposes `working_minutes` into `{ hours, minutes }`; the minutes `AnimatedNumber` is conditionally rendered only when `minutes > 0`, matching the previous static-string logic (`workingHoursLabel` in `src/widgets/analytics/lib/stat-format.ts`, which is *not* reused here — it produces a formatted string, not raw parts, so it isn't a fit for animation and stays in use for `AnalyticsStatCards`'s non-money "hours" card, which is intentionally left as plain text since only money figures were in scope for that migration).

### When *not* to reach for it

- Chart.js tooltips/axis labels — keep using `formats.price()` / `formats.decimal()`; there's no DOM node for `AnimatedNumber` to animate inside a canvas.
- Values that don't change after mount (static config, one-time totals with no refetch) — the animation has no payoff and it's extra DOM/JS for nothing.
- Secondary/caption text (e.g. `AnalyticsStatCards`'s "avg check" line) — reserved for headline metrics to avoid visual noise from too many simultaneously animating numbers.

---

## Cross-references

- [PriceInput](./price-input.md) — the other shared currency-aware component; same `useFormats()` dependency, same non-breaking-space convention between symbol and amount.
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — where the three analytics widgets and `HomeOverviewWidget` sit in the wider dashboard architecture.
- [Analytics](../business/analytics.md) — the metric definitions (`earned`, `working_minutes`, etc.) whose values this component animates.
- [Nuxt UI Components](./nuxt-ui-components.md) — `AnimatedNumber` is not a Nuxt UI component itself, but it's typically nested inside `Typography`/`UCard` markup built from Nuxt UI.

---

## File Structure

| Path | Description |
|---|---|
| `src/shared/ui/animated-number/AnimatedNumber.vue` | The component: thin `NumberFlow` wrapper + locale default |
| `src/shared/ui/animated-number/index.ts` | Barrel export |
| `src/shared/lib/formats/index.ts` | `useFormats().priceParts()` — money format/prefix/suffix builder used by every money call site |
| `src/shared/lib/locale/locale.store.ts` | `useLocaleStore()` — the default locale source |
| `src/shared/lib/i18n/index.ts` | Guarded `localStorage` read at module scope (see the testing gotcha above) |
| `src/widgets/home/ui/HomeOverviewWidget.vue` | Money, count, and split-duration usage in one file |
| `src/widgets/analytics/ui/AnalyticsStatCards.vue` | Money usage (single card among four, three stay plain text) |
| `src/widgets/analytics/ui/AnalyticsRevenueChart.vue` | Money usage (chart header total, not the chart itself) |
| `src/widgets/analytics/ui/AnalyticsTopServices.vue` | Money usage (per-row revenue) |
