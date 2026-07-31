---
version: 1.2
date: 2026-07-31
category: ui
---

# OptionsDrawer — Reusable Bottom-Sheet Option List

> Version 1.2 · 2026-07-31 · [UI](../)

## Overview

`OptionsDrawer` is a shared, mobile-first bottom sheet that renders a list of **options** —
each a tappable action or a row with a trailing switch. It replaces the ad-hoc "`UDrawer` + a
stack of `UButton`s" pattern that was being hand-rolled per screen (e.g. the home overview period
picker, the analytics header menu).

You feed it a translated `items` array and bind `v-model:open`; the component handles layout,
icons, descriptions, the trailing switch, and closing behaviour. It holds **no business logic** and
**no i18n** — every label/description/title is passed in already translated by the caller.

Under the hood it is a thin container: Nuxt UI's [`UDrawer`](https://ui.nuxt.com/docs/components/drawer)
wrapping [`OptionsList`](./options-list.md), the reusable row list that actually renders the icons,
labels, switches, and selection state. `OptionsDrawer` only adds the sheet chrome, the open/close
model, and closing behaviour.

Lives in `@shared/ui` (slice `src/shared/ui/overlays/`).

## Architecture

### Composition over OptionsList

The row rendering — the vertical `UNavigationMenu`, the leading icon, label/description, and the
trailing switch/check/chevron — was extracted into [`OptionsList`](./options-list.md). `OptionsDrawer`
now renders `<OptionsList :items @select @toggle>` inside the drawer body and layers three drawer-only
concerns on top:

1. the `UDrawer` shell (rounded top, safe-area bottom padding, header `title`);
2. the `open` model (`v-model:open`), the only state the component owns;
3. **close-on-select** — after a `select`/`toggle` it dismisses the sheet when
   `item.closeOnSelect ?? closeOnSelect` is truthy (per-row override beats the drawer default).

For the row model itself — the `action` / `switch` / selection behaviours, the display-only switch
tap-target trick, and icon-colour resolution — see [`options-list.md`](./options-list.md).

### Data flow

```
caller state ──items──▶ OptionsDrawer ──▶ OptionsList ──renders──▶ UNavigationMenu rows
     ▲                        │  (may close the drawer)
     │                        │ tap
     └── select / toggle ◀────┘   (caller mutates its own state)
```

The drawer owns only the open/closed state (via `defineModel`). Option values (`checked`) are owned
by the caller — neither `OptionsDrawer` nor `OptionsList` mutates them.

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

Since the refactor, `OptionsDrawerItem` is a **back-compat alias** of `OptionsListItem` (and
`optionsDrawerIconClass` aliases `optionsListIconClass`) — existing imports keep working unchanged.
The canonical definition, including the `active` selection field, lives in
[`options-list.md`](./options-list.md#optionslistitem):

```ts
type OptionsDrawerItem = OptionsListItem

interface OptionsListItem {
  id: string                        // stable id, echoed back in select/toggle
  label: string                     // primary text (already translated)
  description?: string              // secondary line under the label
  icon?: string                     // leading icon, e.g. 'i-lucide-calendar-range'
  iconColor?: SemanticColor | string // semantic color OR raw text-* class; defaults to text-default
  type?: 'action' | 'switch'        // default 'action'
  checked?: boolean                 // switch rows only — current on/off state
  active?: boolean                  // selection row (check when true, blank when false)
  disabled?: boolean                // greys out and blocks interaction
  closeOnSelect?: boolean           // per-row override of the drawer-level setting
}
```

> `DialogColor` (from the `overlays` slice) is itself now an alias of `SemanticColor`, so
> `iconColor: 'primary' | 'error' | …` continues to type-check exactly as before.

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
  OptionsDrawer.vue   # the UDrawer shell wrapping <OptionsList>
  types.ts            # OptionsDrawerProps + back-compat aliases (OptionsDrawerItem,
                      #   optionsDrawerIconClass, DialogColor) re-exported from options-list
  index.ts            # public API (re-exported from @shared/ui)

src/shared/ui/options-list/
  OptionsList.vue     # the actual row list (see options-list.md)
  types.ts            # canonical OptionsListItem, SemanticColor, optionsListIconClass()
```

## Cross-references

- [`options-list.md`](./options-list.md) — the reusable row list this drawer wraps; owns the item model, row behaviours, and icon-colour resolution
- [`overlays.md`](./overlays.md) — the programmatic Confirm/Alert dialogs that share the `overlays` slice and `DialogColor`
- [`nuxt-ui-components.md`](./nuxt-ui-components.md) — Drawer, NavigationMenu and Switch component catalog
- [`themes-and-variables.md`](../design/themes-and-variables.md) — color utilities used by `iconColor` and the global overlay scrim
