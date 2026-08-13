---
version: 1.0
date: 2026-07-31
category: ui
---

# OptionsList — Reusable Option / Selection List

> Version 1.0 · 2026-07-31 · [UI](../)

## Overview

`OptionsList` is a shared, presentational list of **option rows** — each a tappable navigation
action, a row with a trailing switch, or a single-choice selection row. It is the reusable core that
was extracted from [`OptionsDrawer`](./options-drawer.md) so the same row styling can be used outside
a bottom sheet — for example inside a `UModal` (the analytics granularity picker) or any other
container.

You feed it a translated `items` array and listen for `select` / `toggle`. The component renders the
icon, label, description, trailing switch/check/chevron, and the active-row highlight. It holds **no
business logic**, **no i18n**, and **no open/close state** — every label/description is passed in
already translated, and the container (modal, drawer, popover) owns visibility.

Under the hood it composes a vertical
[`UNavigationMenu`](https://ui.nuxt.com/docs/components/navigation-menu), so it inherits the design
system's spacing, focus, and keyboard behaviour for free.

Lives in `@shared/ui` (slice `src/shared/ui/options-list/`).

## Architecture

### Three row presentations

Each row's appearance is driven by two fields — `type` and `active`:

| `type`     | `active`       | Leading      | Trailing                         | On tap                              |
| ---------- | -------------- | ------------ | -------------------------------- | ----------------------------------- |
| `'action'` (default) | `undefined` | optional icon | chevron (`i-lucide-chevron-right`) | emits `select(item)`            |
| `'action'` | `true`         | optional icon | check (`i-lucide-check`, primary) | emits `select(item)`               |
| `'action'` | `false`        | optional icon | *(blank)*                        | emits `select(item)`                |
| `'switch'` | —              | optional icon | display-only `USwitch`           | emits `toggle(item, nextChecked)`   |

The `active` field is what distinguishes a **navigation** row from a **selection** row:

- `active === undefined` → a plain navigation/action row, rendered with a trailing chevron.
- `active` set to `true`/`false` → a single-choice selection row. The chosen row shows a check and
  its label turns `text-primary`; the others render a blank trailing slot.

Omitting `icon` renders an **icon-less** list (used by the period picker).

### The whole row is the tap target

For `switch` rows the `USwitch` is rendered **display-only** — `pointer-events-none`,
`tabindex="-1"`, `aria-hidden`. The interactive element is the navigation-menu row itself, whose
`onSelect` fires the event. This avoids the classic conflict where tapping the switch and tapping the
row both fire (double toggle). The switch merely *reflects* state the caller owns; the caller updates
its own boolean in response to `toggle`, which flows back through `items` and animates the switch.

### Data flow

```
caller state ──items──▶ OptionsList ──renders──▶ UNavigationMenu rows
     ▲                       │
     │                       │ tap
     └── select / toggle ◀───┘   (caller mutates its own state)
```

`OptionsList` is stateless — it owns nothing. `checked` and `active` are computed by the caller from
its own source of truth; the component never mutates them.

### Icon colour resolution

`iconColor` accepts either a semantic `SemanticColor` (`'primary'`, `'error'`, …) or any raw class
string (`'text-pink-500'`). `optionsListIconClass()` maps semantic colors to their `text-*` utility
via the static `semanticColorText` map and passes raw classes through unchanged; omitting `iconColor`
falls back to `text-default`. The map is kept explicit so Tailwind's scanner can detect the classes.

## Configuration

### Props (`OptionsListProps`)

| Prop    | Type                | Default | Description        |
| ------- | ------------------- | ------- | ------------------ |
| `items` | `OptionsListItem[]` | —       | The rows to render. |

### Emits

| Event    | Payload                             | Fires when                                               |
| -------- | ----------------------------------- | -------------------------------------------------------- |
| `select` | `(item: OptionsListItem)`           | a non-switch row is tapped                               |
| `toggle` | `(item: OptionsListItem, checked)`  | a `switch` row is tapped; `checked` is the **new** value |

### `OptionsListItem`

```ts
interface OptionsListItem {
  id: string                        // stable id, echoed back in select/toggle
  label: string                     // primary text (already translated)
  description?: string              // secondary line under the label
  icon?: string                     // leading icon; omit for an icon-less list
  iconColor?: SemanticColor | string // semantic color OR raw text-* class; defaults to text-default
  type?: 'action' | 'switch'        // default 'action'
  checked?: boolean                 // switch rows only — current on/off state
  active?: boolean                  // set → selection row (check when true, blank when false)
  disabled?: boolean                // greys out and blocks interaction
  closeOnSelect?: boolean           // hint for containers (e.g. drawer); the list ignores it
}
```

`closeOnSelect` is a hint the list itself does not act on — it exists so container components such as
[`OptionsDrawer`](./options-drawer.md) can decide whether to dismiss after a tap.

### `SemanticColor`

```ts
type SemanticColor =
  | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
```

`optionsListIconClass(color)` and the `semanticColorText` map are exported alongside the component for
callers that need the same color-to-utility resolution.

## Usage

### Selection list (icon-less) — single choice with active row

From the analytics period picker (`src/pages/analytics/ui/AnalyticsPage.vue`), rendered inside a
`UModal`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { OptionsList, type OptionsListItem } from '@shared/ui'

// kindItems: { value, label }[] — the granularities (day / week / month / …)
const periodOptions = computed<OptionsListItem[]>(() =>
  kindItems.value.map((item) => ({
    id: item.value,
    label: item.label,
    active: item.value === period.value.kind, // marks the current choice
  })),
)

function onPeriodSelect(item: OptionsListItem) {
  selectKind(item.id as AnalyticsPeriodKind)
}
</script>

<template>
  <UModal v-model:open="isPeriodModalOpen" :title="t('analytics.period.title')">
    <template #body>
      <OptionsList :items="periodOptions" @select="onPeriodSelect" />
    </template>
  </UModal>
</template>
```

The active row shows a check and a `text-primary` label; the rest render blank trailing slots.

### Mixed action + switch rows

When rows carry icons and a mix of navigation + toggles (the shape `OptionsDrawer` passes through):

```ts
const items = computed<OptionsListItem[]>(() => [
  {
    id: 'period',
    icon: 'i-lucide-calendar-range',
    iconColor: 'primary',
    label: t('analytics.period.title'),
    description: activePeriodLabel.value, // caption under the label → chevron (navigation)
  },
  {
    id: 'compare',
    icon: 'i-lucide-chart-candlestick',
    iconColor: 'warning',
    label: t('analytics.options.compare'),
    description: t('analytics.options.compareDescription'),
    type: 'switch',
    checked: compare.value, // → display-only USwitch
  },
])
```

## i18n

The component is text-agnostic: every `label` / `description` must be passed in already translated via
`t(...)`. There are **no** default strings resolved inside `OptionsList`. Keys live in
`src/shared/lib/i18n/locales/{en,fr,ru}.ts`.

## File Structure

```
src/shared/ui/options-list/
  OptionsList.vue   # the vertical UNavigationMenu + leading/label/trailing slots
  types.ts          # OptionsListItem, OptionsListProps, SemanticColor,
                    #   semanticColorText, optionsListIconClass()
  index.ts          # public API (re-exported from @shared/ui)
```

## Cross-references

- [`options-drawer.md`](./options-drawer.md) — the bottom-sheet container that wraps `OptionsList` and adds open/close + `closeOnSelect`
- [`overlays.md`](./overlays.md) — the programmatic Confirm/Alert dialogs that re-export `SemanticColor` as `DialogColor`
- [`nuxt-ui-components.md`](./nuxt-ui-components.md) — NavigationMenu and Switch component catalog
- [`themes-and-variables.md`](../design/themes-and-variables.md) — color utilities used by `iconColor` and the active-row highlight
