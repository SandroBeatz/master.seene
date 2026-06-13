---
version: 1.0
date: 2026-06-13
category: ui
---

# Global Overlays — Confirm & Alert Dialogs

> Version 1.0 · 2026-06-13 · [UI](../)

## Overview

Two reusable, app-wide dialogs live in `@shared/ui` and are opened **programmatically** — no
template markup, no local `open` ref, no per-screen modal component. They are built on Nuxt UI's
[`useOverlay`](https://ui.nuxt.com/docs/components/modal#programmatic-usage) and return a promise
you `await`, so calling them reads like a plain async question:

```ts
if (await confirm({ title: 'Delete?', color: 'error' })) {
  // user confirmed
}
```

| Helper        | Component       | Buttons            | Resolves to                          |
| ------------- | --------------- | ------------------ | ------------------------------------ |
| `useConfirm()` | `ConfirmDialog` | Cancel + Confirm   | `boolean` — `true` if confirmed      |
| `useAlert()`   | `AlertDialog`   | OK (single)        | `void` — once acknowledged           |

Use **Confirm** for a yes/no decision (especially destructive actions). Use **Alert** to surface a
message the user must acknowledge (single button).

## Requirements

- `useConfirm()` / `useAlert()` call `useOverlay()` internally, so they **must be called from a
  component `setup()`** (not inside a handler, not in a plain module). Call them at the top of
  `<script setup>` and store the returned opener.
- The app is already wrapped in `<UApp>` (`src/App.vue`), which provides the overlay host. No extra
  setup needed.

## API

### `useConfirm()`

Returns `(props: ConfirmDialogProps) => Promise<boolean>`.

```ts
interface ConfirmDialogProps {
  title: string          // header text (required)
  description?: string   // body text
  confirmLabel?: string  // confirm button label — defaults to common.confirm
  cancelLabel?: string   // cancel button label — defaults to common.cancel
  color?: DialogColor    // confirm button + icon color — defaults to 'primary'
  icon?: string          // optional body icon, e.g. 'i-lucide-triangle-alert'
}
```

Resolves `true` when confirmed, `false` when cancelled or dismissed (X / backdrop / Esc).

### `useAlert()`

Returns `(props: AlertDialogProps) => Promise<void>`.

```ts
interface AlertDialogProps {
  title: string          // header text (required)
  description?: string   // body text
  label?: string         // acknowledge button label — defaults to common.ok
  color?: DialogColor    // acknowledge button + icon color — defaults to 'primary'
  icon?: string          // optional body icon
}
```

Resolves once the user acknowledges or dismisses.

### `DialogColor`

`'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'` — the semantic
colors registered for Nuxt UI in `vite.config.ts`.

## Usage

### Confirm (destructive action)

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@shared/ui'

const { t } = useI18n()
const confirm = useConfirm() // ← at setup top, NOT inside the handler

async function deleteClient(client: Client) {
  const confirmed = await confirm({
    title: t('clients.deleteConfirmTitle'),
    description: t('clients.deleteConfirmDescription', { name: client.first_name }),
    confirmLabel: t('common.delete'),
    color: 'error',
    icon: 'i-lucide-triangle-alert',
  })
  if (!confirmed) return

  await removeClient(client.id)
}
</script>
```

### Alert (acknowledgement)

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAlert } from '@shared/ui'

const { t } = useI18n()
const alert = useAlert()

async function onQuotaReached() {
  await alert({
    title: t('billing.limitTitle'),
    description: t('billing.limitDescription'),
    color: 'warning',
    icon: 'i-lucide-circle-alert',
  })
  // continue after acknowledgement
}
</script>
```

## i18n

All visible text is passed in by the caller and must come from `t(...)`. Default button labels
(`common.cancel`, `common.confirm`, `common.ok`) are resolved inside the dialog components, so
omitting `confirmLabel` / `cancelLabel` / `label` still yields translated buttons. Keys live in
`src/shared/lib/i18n/locales/{en,fr,ru}.ts`.

## How it works

`useConfirm` / `useAlert` create a single overlay instance via `overlay.create(...)` and call
`.open(props)` per invocation. The dialog emits `close(value)`; the helper awaits
`instance.result` and returns it. This is the canonical Nuxt UI programmatic-overlay pattern — the
calling code never touches template state.

## Authoring your own overlay component

The `OverlayProvider` renders every overlay with `v-model:open="overlay.isOpen"` and listens for
`@after:leave`. For a **single-root** component (e.g. a `UModal` as the root element) these fall
through automatically via `inheritAttrs` — `ConfirmDialog` / `AlertDialog` rely on this.

A **multi-root** overlay (e.g. a `USlideover` with sibling modals/dialogs) has no fallthrough
target, so you must wire the contract explicitly or it will open once and never reopen:

```vue
<script setup lang="ts">
// Driven by useOverlay through the provider — do NOT use a local `ref(true)`.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()
</script>

<template>
  <USlideover v-model:open="open" @after:leave="emit('after:leave')">…</USlideover>
  <!-- sibling modals/dialogs with their own local open refs -->
</template>
```

Forwarding `after:leave` lets the provider unmount the instance after the close transition, so the
next `.open()` re-mounts it fresh. `useAppointmentPreview` follows this pattern.

## Files

```
src/shared/ui/overlays/
  ConfirmDialog.vue   # yes/no modal, emits close(boolean)
  AlertDialog.vue     # single-button modal, emits close(boolean)
  use-confirm.ts      # useConfirm() → Promise<boolean>
  use-alert.ts        # useAlert() → Promise<void>
  types.ts            # ConfirmDialogProps, AlertDialogProps, DialogColor
  index.ts            # public API (re-exported from @shared/ui)
```

## Related docs

- [`nuxt-ui-components.md`](./nuxt-ui-components.md) — full component catalog
- [`themes-and-variables.md`](../design/themes-and-variables.md) — color utilities used by the dialogs
