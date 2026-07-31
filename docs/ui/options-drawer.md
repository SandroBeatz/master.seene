---
version: 1.0
date: 2026-07-31
category: ui
---

# OptionsDrawer — Reusable Bottom-Sheet Option List

> Version 1.0 · 2026-07-31 · [UI](../)

## Overview

`OptionsDrawer` is a shared, mobile-first bottom sheet that renders a list of **options** —
each a tappable action or a row with a trailing switch. It replaces the ad-hoc "`UDrawer` + a
stack of `UButton`s" pattern that was being hand-rolled per screen (e.g. the home overview period
picker, the analytics header menu).

You feed it a translated `items` array and bind `v-model:open`; the component handles layout,
icons, descriptions, the trailing switch, and closing behaviour. It holds **no business logic** and
**no i18n** — every label/description/title is passed in already translated by the caller.

Under the hood it composes Nuxt UI's [`UDrawer`](https://ui.nuxt.com/docs/components/drawer) with a
vertical [`UNavigationMenu`](https://ui.nuxt.com/docs/components/navigation-menu) for the rows, so
it inherits the design system's spacing, focus, and keyboard behaviour for free.

Lives in `@shared/ui` (slice `src/shared/ui/overlays/`).

## Architecture

### Two row behaviours

Each option declares a `type`:

| `type`     | Renders                                   | On tap                                  |
| ---------- | ----------------------------------------- | --------------------------------------- |
| `'action'` (default) | leading icon · label · description · trailing chevron | emits `select(item)`          |
| `'switch'` | leading icon · label · description · trailing `USwitch` | emits `toggle(item, nextChecked)` |

### The whole row is the tap target

For `switch` rows the `USwitch` is rendered **display-only** — `pointer-events-none`,
`tabindex="-1"`, `aria-hidden`. The interactive element is the navigation-menu row itself, whose
`onSelect` fires the `toggle` event. This deliberately avoids the classic conflict where tapping the
switch and tapping the row both fire (double toggle) or fight over the event. The switch merely
*reflects* state the caller owns; the caller updates its own boolean in response to `toggle`, which
flows back through `items` and animates the switch.

### Data flow

```
caller state ──items──▶ OptionsDrawer ──renders──▶ UNavigationMenu rows
     ▲                        │
     │                        │ tap
     └── select / toggle ◀────┘   (caller mutates its own state)
```

The component owns only the open/closed state (via `defineModel`). Option values (`checked`) are
owned by the caller — `OptionsDrawer` never mutates them.

### Icon colour resolution

`iconColor` accepts either a semantic `DialogColor` (`'primary'`, `'error'`, …) or any raw class
string (`'text-pink-500'`). `optionsDrawerIconClass()` maps semantic colors to their `text-*`
utility and passes raw classes through unchanged; omitting it falls back to `text-muted`.

## Configuration

### Props (`OptionsDrawerProps`)

| Prop            | Type                 | Default | Description                                  |
| --------------- | -------------------- | ------- | -------------------------------------------- |
| `title`         | `string`             | —       | Drawer header text (already translated).     |
| `items`         | `OptionsDrawerItem[]`| —       | The rows to render.                          |
| `closeOnSelect` | `boolean`            | `true`  | Close the drawer after any row is activated. |

### `v-model`

| Model  | Type      | Description                          |
| ------ | --------- | ----------------------------------- |
| `open` | `boolean` | Drawer open state (`v-model:open`). |

### Emits

| Event    | Payload                              | Fires when                    |
| -------- | ------------------------------------ | ----------------------------- |
| `select` | `(item: OptionsDrawerItem)`          | an `action` row is tapped     |
| `toggle` | `(item: OptionsDrawerItem, checked)` | a `switch` row is tapped; `checked` is the **new** value |

### `OptionsDrawerItem`

```ts
interface OptionsDrawerItem {
  id: string                        // stable id, echoed back in select/toggle
  label: string                     // primary text (already translated)
  description?: string              // secondary line under the label
  icon?: string                     // leading icon, e.g. 'i-lucide-calendar-range'
  iconColor?: DialogColor | string  // semantic color OR raw text-* class; defaults to text-muted
  type?: 'action' | 'switch'        // default 'action'
  checked?: boolean                 // switch rows only — current on/off state
  disabled?: boolean                // greys out and blocks interaction
  closeOnSelect?: boolean           // per-row override of the drawer-level setting
}
```

## Usage

### Basic — mixed action + switch rows

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OptionsDrawer, type OptionsDrawerItem } from '@shared/ui'

const { t } = useI18n()
const open = ref(false)
const compare = ref(false)

const items = computed<OptionsDrawerItem[]>(() => [
  {
    id: 'period',
    icon: 'i-lucide-calendar-range',
    iconColor: 'primary',
    label: t('analytics.period.title'),
    description: activePeriodLabel.value, // "current period" caption
  },
  {
    id: 'compare',
    icon: 'i-lucide-git-compare-arrows',
    iconColor: 'info',
    label: t('analytics.compare'),
    type: 'switch',
    checked: compare.value,
  },
])

function onSelect(item: OptionsDrawerItem) {
  if (item.id === 'period') openPeriodModal()
}

function onToggle(item: OptionsDrawerItem, checked: boolean) {
  if (item.id === 'compare') compare.value = checked
}
</script>

<template>
  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" @click="open = true" />

  <OptionsDrawer
    v-model:open="open"
    :title="t('common.options')"
    :items="items"
    @select="onSelect"
    @toggle="onToggle"
  />
</template>
```

### Keeping the drawer open after a tap

Set `closeOnSelect: false` on a single row (or on the whole drawer) — useful for rows that toggle a
setting without dismissing the sheet:

```ts
{ id: 'notifications', label: t('...'), type: 'switch', checked: notify.value, closeOnSelect: false }
```

## i18n

The component is text-agnostic: `title`, and every `label` / `description` must be passed in already
translated via `t(...)`. There are **no** default strings resolved inside `OptionsDrawer` (unlike
`ConfirmDialog`/`AlertDialog`, which fall back to `common.*`). Keys live in
`src/shared/lib/i18n/locales/{en,fr,ru}.ts`.

## File Structure

```
src/shared/ui/overlays/
  OptionsDrawer.vue   # the drawer + UNavigationMenu rows
  types.ts            # OptionsDrawerItem, OptionsDrawerProps, optionsDrawerIconClass()
  index.ts            # public API (re-exported from @shared/ui)
```

## Cross-references

- [`overlays.md`](./overlays.md) — the programmatic Confirm/Alert dialogs that share the `overlays` slice and `DialogColor`
- [`nuxt-ui-components.md`](./nuxt-ui-components.md) — Drawer, NavigationMenu and Switch component catalog
- [`themes-and-variables.md`](../design/themes-and-variables.md) — color utilities used by `iconColor` and the global overlay scrim
