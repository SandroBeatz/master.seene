---
version: 1.3
date: 2026-07-22
category: design
---

# Themes and Variables (@nuxt/ui v4)

> Version 1.3 · 2026-07-22 · [Design](../)

## Overview

The project uses `@nuxt/ui v4` on top of Tailwind CSS v4. The library generates a set of semantic CSS variables (`--ui-*`) and automatically registers short Tailwind utility classes for all of them.

**Core rule:** never write `text-(--ui-text-muted)` — use the short form `text-muted` instead. This applies to all `--ui-*` variables.

## Design Decisions

Nuxt UI registers CSS variables via `@theme` and exposes them as Tailwind classes without any wrapper syntax.

```
--ui-text-muted   →   text-muted
--ui-bg-elevated  →   bg-elevated
--ui-border       →   border-default
--ui-primary      →   text-primary / bg-primary
```

This mapping is activated in `src/app/styles/main.css` — import order is critical:

```css
@import 'tailwindcss'; /* Tailwind first */
@import '@nuxt/ui'; /* then UI (registers --ui-* and utilities) */
```

Theme colors are configured in `vite.config.ts` (not `app.config.ts` — that's Nuxt only):

```ts
// vite.config.ts
ui({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
  },
})
```

## Configuration

### Theme colors (`vite.config.ts`)

```ts
ui({
  ui: {
    colors: {
      primary: 'blue', // main color — buttons, links, accents
      secondary: 'violet', // secondary color
      success: 'green',
      warning: 'yellow',
      error: 'red',
      info: 'sky',
      neutral: 'slate', // text, borders, backgrounds
    },
  },
})
```

Accepted values: any Tailwind palette color (`blue`, `red`, `emerald`, `zinc`, etc.). For custom colors, all shades from `50` to `950` are required.

### Overriding CSS variables (`main.css`)

```css
/* src/app/styles/main.css */
@import 'tailwindcss';
@import '@nuxt/ui';

:root {
  --ui-primary: var(--ui-color-primary-700);
}
.dark {
  --ui-primary: var(--ui-color-primary-300);
}
```

### Canvas, radius, container, and elevation

```css
:root {
  --app-canvas: #efede9; /* background outside elevated surfaces */
  --ui-radius: 0.75rem; /* base Nuxt UI radius */
  --ui-container: 112rem; /* wide dashboard content */
}

@theme {
  --shadow-panel: 0 1px 2px rgb(24 24 27 / 0.04), 0 12px 32px rgb(24 24 27 / 0.08);
}
```

Use `shadow-panel` for top-level dashboard surfaces only. Nested cards use borders without a heavy
shadow. Put repeated Nuxt UI component structure in `vite.config.ts`; use the component `ui` prop
for isolated layout or visual exceptions.

### Nested card radius hierarchy

Use progressively smaller radii for nested cards so the inner surfaces do not compete visually
with their container. The responsive radius contract is:

| Viewport        | Outer card   | Inner cards  |
| --------------- | ------------ | ------------ |
| Mobile (`< md`) | `rounded-lg` | `rounded-md` |
| `md` and wider  | `rounded-xl` | `rounded-lg` |

Apply the radius through the Nuxt UI `root` slot. A nested metric group such as
`HomeOverviewWidget` should follow this pattern:

```ts
const hostUI = {
  root: 'rounded-lg md:rounded-xl',
}

const cardUI = {
  root: 'rounded-md md:rounded-lg',
}
```

This rule applies to a top-level card that visually owns a set of smaller cards. It does not require
every standalone `UCard` to use these exact classes.

### Global component overrides (`vite.config.ts`)

The `ui({ ui: { … } })` block also holds per-component slot overrides applied app-wide. Example: the
overlay backdrop. Nuxt UI's default scrim is `bg-elevated/75`, which is near-white in light mode and
reads as a washed-out dim. All overlay components are darkened to a proper scrim:

```ts
// vite.config.ts
modal: { slots: { overlay: 'fixed inset-0 bg-black/60!' } },
slideover: { slots: { overlay: 'fixed inset-0 bg-black/60!' } },
drawer: { slots: { overlay: 'fixed inset-0 bg-black/60!' } },
```

This covers every overlay at once — `UModal`, `USlideover`, `UDrawer`, and anything built on them
(confirm/alert dialogs, the appointment preview, checkout, forms).

> **Gotcha — the `!` is required.** App-config slot values are _merged_ with the component default,
> not replaced. `tailwind-merge` does not treat the semantic `bg-elevated` utility as conflicting
> with `bg-black`, so without the `!` important marker both classes survive and the default wins by
> stylesheet order. Tailwind v4's important marker is the trailing `!` (`bg-black/60!`). Changes to
> `vite.config.ts` also require a dev-server restart to take effect.

## Usage

### Text colors

| Class              | CSS variable            | Value (light / dark)      |
| ------------------ | ----------------------- | ------------------------- |
| `text-dimmed`      | `--ui-text-dimmed`      | neutral-400 / neutral-500 |
| `text-muted`       | `--ui-text-muted`       | neutral-500 / neutral-400 |
| `text-toned`       | `--ui-text-toned`       | neutral-600 / neutral-300 |
| `text-default`     | `--ui-text`             | neutral-700 / neutral-200 |
| `text-highlighted` | `--ui-text-highlighted` | neutral-900 / neutral-50  |
| `text-inverted`    | `--ui-text-inverted`    | white / neutral-900       |

```html
<!-- Correct -->
<p class="text-muted">Hint text</p>
<h1 class="text-highlighted">Heading</h1>

<!-- Wrong — never do this -->
<p class="text-(--ui-text-muted)">Hint text</p>
```

### Background colors

| Class         | CSS variable       | Value (light / dark)      |
| ------------- | ------------------ | ------------------------- |
| `bg-default`  | `--ui-bg`          | white / neutral-900       |
| `bg-muted`    | `--ui-bg-muted`    | neutral-50 / neutral-800  |
| `bg-elevated` | `--ui-bg-elevated` | white / neutral-800       |
| `bg-accented` | `--ui-bg-accented` | neutral-100 / neutral-700 |
| `bg-inverted` | `--ui-bg-inverted` | neutral-900 / white       |

```html
<div class="bg-muted rounded-lg p-4">
  <div class="bg-elevated border border-default p-3">...</div>
</div>
```

### Border colors

| Class             | CSS variable           | Value (light / dark)      |
| ----------------- | ---------------------- | ------------------------- |
| `border-default`  | `--ui-border`          | neutral-200 / neutral-800 |
| `border-muted`    | `--ui-border-muted`    | neutral-200 / neutral-700 |
| `border-accented` | `--ui-border-accented` | neutral-300 / neutral-700 |
| `border-inverted` | `--ui-border-inverted` | neutral-900 / white       |

### Semantic colors (primary, error, …)

Semantic colors work like regular Tailwind colors via their name:

```html
<!-- Text -->
<span class="text-primary">Accent</span>
<span class="text-error">Error message</span>

<!-- Background -->
<div class="bg-primary text-inverted">Button</div>
<div class="bg-error/10 text-error">Error banner</div>

<!-- Border -->
<div class="border border-primary">Highlighted field</div>
```

All Tailwind modifiers are supported: `bg-primary/20`, `hover:bg-primary`, `dark:text-primary`, etc.

### Typography

```css
/* src/app/styles/main.css */
@import 'tailwindcss';
@import '@nuxt/ui';

@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

After declaring fonts they are available as `font-sans` / `font-mono`.

### Custom breakpoints

```css
@theme {
  --breakpoint-3xl: 1920px;
  --breakpoint-4xl: 2560px;
}
```

Used like standard breakpoints: `3xl:grid-cols-4`.

## Cross-references

- [Nuxt UI Components](../ui/nuxt-ui-components.md) — component library that consumes these design tokens via `color`, `variant`, and `size` props
- [Global Overlays](../ui/overlays.md) — overlay components affected by the global backdrop scrim override
- [Analytics & Home Dashboard](../architecture/analytics-and-home.md) — dashboard widgets that use nested metric cards

## File Structure

```
src/app/styles/
├── main.css       # Entry point: @import "tailwindcss" + @import "@nuxt/ui"
│                  # Override --ui-* variables and @theme tokens here
└── base.css       # Browser reset and body application of semantic tokens

vite.config.ts     # ui({ ui: { colors: {...} } }) — semantic color configuration

src/widgets/home/ui/HomeOverviewWidget.vue
                   # Reference nested metric-card composition
```

Legacy Vue template variables (`--vt-c-*`, `--color-background`, etc.) are not used. Prefer
semantic utilities such as `text-default`, `bg-default`, and `border-default`.
