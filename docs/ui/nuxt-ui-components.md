---
version: 1.0
date: 2026-04-20
category: ui
---

# Nuxt UI v4 — Component Catalog

> Version 1.0 · 2026-04-20 · [UI](../)

## Overview

The project uses `@nuxt/ui v4`, which ships 125+ production-ready components. Building custom replacements for components that already exist in the library is prohibited — always use what the library provides.

**Core rule:** before writing any template markup, check whether Nuxt UI already has the component. If it does, use it.

## Architecture

All components are available globally after `@import "@nuxt/ui"` in `main.css` and the plugin registration in `vite.config.ts`. Components use the `<U...>` prefix (e.g., `<UButton>`, `<UModal>`).

To look up up-to-date docs for any component, use the context7 MCP:

```
1. mcp__context7__resolve-library-id  →  query: "@nuxt/ui"
2. mcp__context7__query-docs          →  libraryId: <result>, topic: "Button"
```

## Component Catalog

### Layout — Page structure

| Component | Purpose |
|-----------|---------|
| `<UApp>` | Root provider (toast, tooltip, modal) — must wrap the entire app |
| `<UContainer>` | Centers content, sets max-width via `--ui-container` |
| `<UHeader>` | Site header with navigation |
| `<UFooter>` | Site footer |
| `<USidebar>` | Side navigation panel |
| `<UMain>` | Main content area |

---

### Element — Base UI elements

| Component | Purpose |
|-----------|---------|
| `<UAlert>` | Notifications / warnings with icon and title |
| `<UAvatar>` | User avatar (photo or initials) |
| `<UAvatarGroup>` | Stacked avatars |
| `<UBadge>` | Small label / tag |
| `<UButton>` | Button — all variants (solid, outline, ghost, link) |
| `<UCard>` | Card with header / body / footer slots |
| `<UChip>` | Indicator overlaid on another element (notification dot, status) |
| `<UCollapsible>` | Collapsible content block |
| `<UIcon>` | SVG icon from lucide, heroicons, and other Iconify sets |
| `<UKbd>` | Keyboard key |
| `<UProgress>` | Progress bar |
| `<USeparator>` | Horizontal / vertical divider |
| `<USkeleton>` | Loading placeholder |

---

### Form — Forms and inputs

| Component | Purpose |
|-----------|---------|
| `<UForm>` | Form wrapper with validation (Zod / Valibot / Yup / Joy) |
| `<UFormField>` | Form field: label, hint, error message |
| `<UInput>` | Text input |
| `<UInputNumber>` | Numeric input with increment/decrement |
| `<UInputDate>` | Date picker input |
| `<UInputTime>` | Time picker input |
| `<UInputTags>` | Multi-tag input |
| `<UInputMenu>` | Input + dropdown (combobox) |
| `<UTextarea>` | Multi-line text |
| `<USelect>` | Dropdown select |
| `<USelectMenu>` | Extended select with search and multi-select |
| `<UCheckbox>` | Single checkbox |
| `<UCheckboxGroup>` | Group of checkboxes |
| `<URadioGroup>` | Radio button group |
| `<USwitch>` | On/off toggle |
| `<USlider>` | Range slider |
| `<UPinInput>` | PIN / OTP code input |
| `<UColorPicker>` | Color picker |
| `<UFileUpload>` | File upload |

---

### Data — Data display

| Component | Purpose |
|-----------|---------|
| `<UTable>` | Table with columns, sorting, pagination |
| `<UAccordion>` | Accordion (expandable sections) |
| `<UCarousel>` | Image / content carousel |
| `<UEmpty>` | Empty state (illustration + text) |
| `<UScrollArea>` | Custom scrollbar container |
| `<UTimeline>` | Chronological timeline |
| `<UTree>` | Tree view |
| `<UUser>` | User card (avatar + name + meta) |
| `<UMarquee>` | Scrolling ticker / marquee |

---

### Navigation

| Component | Purpose |
|-----------|---------|
| `<UBreadcrumb>` | Breadcrumb trail |
| `<UCommandPalette>` | Command palette (⌘K) |
| `<ULink>` | Smart link (router-link + external) |
| `<UNavigationMenu>` | Horizontal / vertical navigation menu |
| `<UPagination>` | Pagination controls |
| `<UStepper>` | Step-by-step wizard |
| `<UTabs>` | Tab panels |

---

### Overlay — Modals and popovers

| Component | Purpose |
|-----------|---------|
| `<UModal>` | Modal dialog |
| `<UDrawer>` | Bottom sheet panel (mobile-friendly) |
| `<USlideover>` | Side panel (slide-over) |
| `<UDropdownMenu>` | Dropdown menu |
| `<UContextMenu>` | Context menu (right-click) |
| `<UPopover>` | Popover with rich content |
| `<UTooltip>` | Short hover tooltip |
| `<UToast>` | System notification via `useToast()` |

---

### Extended categories

Page, Dashboard, AI Chat, Editor, Content, Color Mode — extended component sets for specific use cases. Full reference: https://ui.nuxt.com/docs/components

---

## Usage

### Basic component template

```vue
<script setup lang="ts">
// props and state
</script>

<template>
  <!-- Use UCard instead of div.card -->
  <UCard>
    <template #header>
      <h2 class="text-highlighted font-semibold">Title</h2>
    </template>

    <p class="text-muted">Card content</p>

    <template #footer>
      <UButton color="primary">Action</UButton>
    </template>
  </UCard>
</template>
```

### Form with validation

```vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'At least 2 characters'),
})

const state = reactive({ email: '', name: '' })

async function onSubmit(event: FormSubmitEvent<typeof schema>) {
  console.log(event.data)
}
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-4">
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormField>
    <UButton type="submit" color="primary">Save</UButton>
  </UForm>
</template>
```

### Toast notifications

```vue
<script setup lang="ts">
const toast = useToast()

function onSave() {
  // ...
  toast.add({
    title: 'Saved',
    description: 'Changes applied successfully',
    color: 'success',
  })
}
</script>
```

`<UApp>` must be present at the root of the app (typically `App.vue`) — it mounts the toast portal.

### Table with custom cell slot

```vue
<script setup lang="ts">
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'actions', label: '' },
]

const rows = [
  { id: 1, name: 'Alexander', email: 'a@example.com' },
]
</script>

<template>
  <UTable :data="rows" :columns="columns">
    <template #actions-cell="{ row }">
      <UDropdownMenu :items="getActions(row)">
        <UButton icon="i-lucide-more-horizontal" variant="ghost" size="xs" />
      </UDropdownMenu>
    </template>
  </UTable>
</template>
```

### Icons

The project uses Iconify icon sets. Available prefixes: `lucide`, `heroicons`, `ph`, `mdi`, and others.

```vue
<!-- As a standalone component -->
<UIcon name="i-lucide-settings" class="size-5 text-muted" />

<!-- As a prop on Button -->
<UButton leading-icon="i-lucide-plus" trailing-icon="i-lucide-chevron-down">
  Add item
</UButton>
```

### What NOT to do

```vue
<!-- Wrong: hand-rolling what Nuxt UI already provides -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
<div class="fixed inset-0 bg-black/50 flex items-center justify-center">...</div>
<input class="border rounded px-3 py-2 w-full" />

<!-- Correct: use Nuxt UI -->
<UButton color="primary">Save</UButton>
<UModal v-model:open="open">...</UModal>
<UInput v-model="value" />
```

```vue
<!-- Wrong: overriding with raw CSS instead of using the prop system -->
<UButton class="bg-green-600 text-white">Save</UButton>

<!-- Correct: use the variant/color props -->
<UButton color="success" variant="solid">Save</UButton>
```

## Cross-references

- [Themes and Variables](../design/themes-and-variables.md) — CSS token system (`text-muted`, `bg-elevated`, `border-default`, etc.) consumed by these components

## File Structure

```
vite.config.ts           # ui({ ui: { colors: {...} } }) — semantic color registration
src/app/styles/main.css  # @import "tailwindcss" + @import "@nuxt/ui"
src/shared/ui/           # Custom components that have NO Nuxt UI equivalent
```

> **When to create a custom component:** only if Nuxt UI does not provide the needed functionality. Place it in `src/shared/ui/` and follow the same conventions — variants via props, theme tokens via utilities (`text-muted`, `bg-elevated`).
