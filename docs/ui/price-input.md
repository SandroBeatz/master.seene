---
version: 1.0
date: 2026-07-13
category: ui
---

# PriceInput

> Version 1.0 · 2026-07-13 · [UI](../ui/)

## Overview

`PriceInput` is a shared, currency-aware money field. It replaces raw `<UInput type="number">` for price entry so every form gets consistent behaviour: a telephone-style numeric keyboard on mobile (`type="tel"`), rejection of non-numeric input, fraction handling that respects the currency's decimal places, and the correct currency **symbol shown in the correct position** (before or after the amount) for the master's active currency.

It lives in the `shared` FSD layer (`src/shared/ui/price-input/`) and carries **no business logic** — it reads the active currency purely through the `useFormats()` plugin, so it never imports an entity or store. It emits a clean `number | null`, keeping form validation (e.g. Joi `price` rules) unchanged.

First adopted by the service form; other money inputs (checkout, plans, onboarding) can migrate incrementally.

---

## Architecture

```
src/shared/ui/price-input/
  PriceInput.vue          ← UInput wrapper + local text mirror
  parse.ts                ← pure sanitize/parse helpers (unit-tested)
  __tests__/parse.spec.ts
  index.ts                ← barrel: PriceInput, sanitizePrice, priceToNumber
```

Exported from the `@shared/ui` barrel (`export * from './price-input'`).

### How the currency is resolved

The component calls `useFormats().currency(currencyOverride?)`, a method added to the formats plugin (`src/shared/lib/formats/index.ts`) that returns the active `CurrencyOption` — `{ code, symbol, position, decimals, label }` — from `@shared/config/currencies`, falling back to the default currency. The active currency code is wired in `src/main.ts`:

```typescript
app.use(formatsPlugin, {
  getCurrency: () => useMasterPreferencesStore().currency,
  // …
})
```

Because the plugin holds the store accessor, `shared/ui` gets the live currency without an upward FSD import.

### Input flow

```
user types → UInput @update:model-value(raw)
  → sanitizePrice(raw, currency.decimals)   // strip junk, clamp fractions
  → text.value = cleaned                      // local mirror (allows "12." mid-typing)
  → emit update:modelValue(priceToNumber(cleaned))  // clean number | null to parent
```

A `watch` on the incoming `modelValue` re-syncs the text mirror when the parent sets a value that differs from the current parsed text (e.g. edit-mode seeding).

### Symbol placement

The symbol renders through a `UInput` slot chosen by `currency.position`:

- `prefix` (e.g. `$`, `€`) → `#leading` slot
- `suffix` (e.g. `₸`, `₽`, `сом`) → `#trailing` slot

`inputmode` adapts to the currency: `'decimal'` when `decimals > 0`, else `'numeric'`.

---

## Configuration

Props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `modelValue` | `number \| null` | `null` | The numeric value (v-model). |
| `currency` | `string` | `undefined` | ISO code override; otherwise the master's active currency. |
| `disabled` | `boolean` | `false` | Passes through to `UInput`. |
| `placeholder` | `string` | `'0'` | Passes through to `UInput`. |

Emits: `update:modelValue: [number | null]`.

### Pure helpers (`parse.ts`)

```typescript
sanitizePrice(raw: string, decimals: number): string
// - strips anything that isn't a digit or separator
// - decimals <= 0 → drops the fraction entirely (KZT, RUB, …)
// - normalises a decimal comma to a dot, keeps ONE separator, clamps fraction digits

priceToNumber(cleaned: string): number | null
// '' or '.' → null; otherwise Number(cleaned) or null when NaN
```

These are exported for reuse and are covered by `__tests__/parse.spec.ts`.

---

## Usage

```vue
<script setup lang="ts">
import { PriceInput } from '@shared/ui'
const state = reactive({ price: null as number | null })
</script>

<template>
  <UFormField :label="$t('services.form.price')" name="price" required>
    <PriceInput v-model="state.price" :placeholder="$t('services.form.pricePlaceholder')" class="w-full" />
  </UFormField>
</template>
```

Real adoption: `src/features/service-form/ui/ServiceFormModal.vue` (replaced the previous `type="number"` input; the Joi `price` rule was left intact because the component still emits a `number | null`).

---

## Cross-references

- [Services](../business/services.md) — the service form that first adopted `PriceInput`.
- [Themes and Variables](../design/themes-and-variables.md) — `text-muted` and other tokens used for the symbol slot.
- [Nuxt UI Components](./nuxt-ui-components.md) — `UInput` slots (`#leading`/`#trailing`) this component builds on.

---

## File Structure

| Path | Description |
|---|---|
| `src/shared/ui/price-input/PriceInput.vue` | The component: `UInput` wrapper, text mirror, symbol slot |
| `src/shared/ui/price-input/parse.ts` | `sanitizePrice` / `priceToNumber` pure helpers |
| `src/shared/ui/price-input/__tests__/parse.spec.ts` | Unit tests for the helpers |
| `src/shared/ui/price-input/index.ts` | Barrel export |
| `src/shared/lib/formats/index.ts` | `useFormats().currency()` — resolves the active `CurrencyOption` |
| `src/shared/config/currencies/index.ts` | Currency catalogue (`symbol`, `position`, `decimals`) |
