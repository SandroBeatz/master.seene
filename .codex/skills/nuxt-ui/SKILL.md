---
name: nuxt-ui
description: >
  Nuxt UI v4 component and markup expert for this Vue project. ALWAYS use this skill before writing
  any template/HTML markup, adding UI elements, building layouts, forms, modals, tables, navigation,
  overlays, or any visual component. Use whenever the user mentions: button, card, modal, form,
  input, table, badge, avatar, tabs, dropdown, sidebar, drawer, toast, tooltip, accordion,
  pagination, select, checkbox, radio, switch, progress, skeleton, alert, or any other UI element.
  Also triggers on: "верстка", "разметка", "компонент", "форма", "таблица", "модал", layout work,
  styling questions, or any task touching .vue template sections. The rule is simple: if it renders
  on screen, use this skill first.
---

# Nuxt UI v4 — Component Expert

This project uses **@nuxt/ui v4** with Tailwind CSS v4. The library ships 125+ production-ready
components. Before writing any template markup, you must determine whether Nuxt UI already provides
what's needed — and use it if it does.

## Core Rule

**Do not hand-roll components that Nuxt UI provides.** Writing a custom `<button>`, `<input>`,
`<table>`, modal, dropdown, or any other element that has a Nuxt UI equivalent wastes time,
introduces inconsistency, and bypasses the design system.

## Step 1 — Look up the component

Before writing any markup, check if Nuxt UI has a component for the task. Use the context7 MCP
in this order:

```
1. mcp__context7__resolve-library-id  query: "@nuxt/ui"
2. mcp__context7__query-docs          libraryId: <result>, tokens: 4000, topic: "<component name>"
```

Always run the lookup — don't rely on memory. The docs include props, slots, variants, emits, and
live examples. Read them before writing code.

## Step 2 — Apply what you found

Write the component using the exact API from the docs:
- Use the `<U{ComponentName}>` prefix (e.g., `<UButton>`, `<UModal>`, `<UTable>`)
- Use props for variants: `color`, `variant`, `size` — not custom CSS classes
- Use slots for custom content, not wrapping divs
- Use theme utilities (`text-muted`, `bg-elevated`, `border-default`) — see `docs/themes-and-variables.md`

## Component Reference

125+ components across 12 categories. When in doubt, look it up.

| Category    | Key components |
|-------------|----------------|
| **Layout**  | App, Container, Header, Footer, Sidebar, Main |
| **Element** | Alert, Avatar, AvatarGroup, Badge, Button, Card, Chip, Collapsible, Icon, Kbd, Progress, Separator, Skeleton |
| **Form**    | Checkbox, CheckboxGroup, ColorPicker, FileUpload, Form, FormField, Input, InputDate, InputMenu, InputNumber, InputTags, InputTime, PinInput, RadioGroup, Select, SelectMenu, Slider, Switch, Textarea |
| **Data**    | Accordion, Carousel, Empty, Marquee, ScrollArea, Table, Timeline, Tree, User |
| **Navigation** | Breadcrumb, CommandPalette, Link, NavigationMenu, Pagination, Stepper, Tabs |
| **Overlay** | ContextMenu, Drawer, DropdownMenu, Modal, Popover, Slideover, Toast, Tooltip |
| **Page**    | Page, PageHeader, PageHero, PageSection, PageCard, PageGrid, PageCTA, PageFeature, AuthForm, BlogPost, PricingPlan |
| **Dashboard** | DashboardGroup, DashboardNavbar, DashboardPanel, DashboardSidebar, DashboardSearch |
| **AI**      | ChatMessage, ChatMessages, ChatPrompt, ChatPalette |
| **Color Mode** | ColorModeButton, ColorModeSwitch, ColorModeSelect |

Full list: https://ui.nuxt.com/docs/components

## Common Patterns

### Button
```vue
<UButton color="primary" variant="solid" size="md" @click="handler">
  Save
</UButton>
<UButton color="neutral" variant="ghost" leading-icon="i-lucide-x">
  Cancel
</UButton>
```

### Form + FormField + Input
```vue
<UForm :schema="schema" :state="state" @submit="onSubmit">
  <UFormField label="Email" name="email">
    <UInput v-model="state.email" type="email" placeholder="you@example.com" />
  </UFormField>
  <UButton type="submit">Submit</UButton>
</UForm>
```

### Modal
```vue
<UModal v-model:open="isOpen" title="Confirm action">
  <template #body>Are you sure?</template>
  <template #footer>
    <UButton color="error" @click="confirm">Delete</UButton>
    <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
  </template>
</UModal>
```

### Table
```vue
<UTable :data="rows" :columns="columns" />
```
Columns define `key`, `label`, and optional slot names for cell renderers.

### Toast (notifications)
```vue
<script setup lang="ts">
const toast = useToast()
toast.add({ title: 'Saved', color: 'success' })
</script>
```

### Icons
Use the `i-lucide-*` or `i-heroicons-*` prefix with `<UIcon>` or the `icon` / `leading-icon` /
`trailing-icon` props on components:
```vue
<UIcon name="i-lucide-check" class="text-success" />
<UButton leading-icon="i-lucide-plus">Add item</UButton>
```

## What NOT to do

```vue
<!-- Bad: hand-rolling what Nuxt UI provides -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
<div class="fixed inset-0 bg-black/50 flex items-center justify-center">...</div>
<input class="border rounded px-3 py-2 w-full" />

<!-- Good: use Nuxt UI -->
<UButton color="primary">Save</UButton>
<UModal v-model:open="open">...</UModal>
<UInput v-model="value" />
```

```vue
<!-- Bad: wrapping with custom CSS instead of using variants -->
<UButton class="bg-green-600 text-white">Save</UButton>

<!-- Good: use the prop system -->
<UButton color="success" variant="solid">Save</UButton>
```

## Troubleshooting

- **Component not rendering**: ensure `@import "@nuxt/ui"` comes after `@import "tailwindcss"` in `main.css`
- **Color not working**: semantic colors (`primary`, `error`, etc.) must be registered in `vite.config.ts` under `ui.colors`
- **Slot not found**: always check current docs via MCP — slot names change between versions
- **Missing prop**: same — look up via context7 before assuming a prop exists

## Related docs

- `docs/design/themes-and-variables.md` — CSS variables, color utilities (`text-muted`, `bg-elevated`, etc.)
- `docs/ui/nuxt-ui-components.md` — full component catalog with links
