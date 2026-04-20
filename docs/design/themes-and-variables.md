---
version: 1.0
date: 2026-04-20
category: design
---

# Themes and Variables (@nuxt/ui v4)

> Version 1.0 · 2026-04-20 · [Design](../)

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
@import "tailwindcss";   /* Tailwind first */
@import "@nuxt/ui";      /* then UI (registers --ui-* and utilities) */
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
      primary: 'blue',       // main color — buttons, links, accents
      secondary: 'violet',   // secondary color
      success: 'green',
      warning: 'yellow',
      error: 'red',
      info: 'sky',
      neutral: 'slate',      // text, borders, backgrounds
    },
  },
})
```

Accepted values: any Tailwind palette color (`blue`, `red`, `emerald`, `zinc`, etc.). For custom colors, all shades from `50` to `950` are required.

### Overriding CSS variables (`main.css`)

```css
/* src/app/styles/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

:root {
  --ui-primary: var(--ui-color-primary-700);
}
.dark {
  --ui-primary: var(--ui-color-primary-300);
}
```

### Radius, container, header height

```css
:root {
  --ui-radius: 0.375rem;       /* border radius, affects all rounded-* utilities */
  --ui-container: 72rem;       /* width of <UContainer> */
  --ui-header-height: 4rem;    /* height of <UHeader> */
}
```

## Usage

### Text colors

| Class              | CSS variable              | Value (light / dark)            |
|--------------------|---------------------------|---------------------------------|
| `text-dimmed`      | `--ui-text-dimmed`        | neutral-400 / neutral-500       |
| `text-muted`       | `--ui-text-muted`         | neutral-500 / neutral-400       |
| `text-toned`       | `--ui-text-toned`         | neutral-600 / neutral-300       |
| `text-default`     | `--ui-text`               | neutral-700 / neutral-200       |
| `text-highlighted` | `--ui-text-highlighted`   | neutral-900 / neutral-50        |
| `text-inverted`    | `--ui-text-inverted`      | white / neutral-900             |

```html
<!-- Correct -->
<p class="text-muted">Hint text</p>
<h1 class="text-highlighted">Heading</h1>

<!-- Wrong — never do this -->
<p class="text-(--ui-text-muted)">Hint text</p>
```

### Background colors

| Class          | CSS variable          | Value (light / dark)      |
|----------------|-----------------------|---------------------------|
| `bg-default`   | `--ui-bg`             | white / neutral-900       |
| `bg-muted`     | `--ui-bg-muted`       | neutral-50 / neutral-800  |
| `bg-elevated`  | `--ui-bg-elevated`    | white / neutral-800       |
| `bg-accented`  | `--ui-bg-accented`    | neutral-100 / neutral-700 |
| `bg-inverted`  | `--ui-bg-inverted`    | neutral-900 / white       |

```html
<div class="bg-muted rounded-lg p-4">
  <div class="bg-elevated border border-default p-3">...</div>
</div>
```

### Border colors

| Class              | CSS variable            | Value (light / dark)      |
|--------------------|-------------------------|---------------------------|
| `border-default`   | `--ui-border`           | neutral-200 / neutral-800 |
| `border-muted`     | `--ui-border-muted`     | neutral-200 / neutral-700 |
| `border-accented`  | `--ui-border-accented`  | neutral-300 / neutral-700 |
| `border-inverted`  | `--ui-border-inverted`  | neutral-900 / white       |

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
@import "tailwindcss";
@import "@nuxt/ui";

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

## File Structure

```
src/app/styles/
├── main.css       # Entry point: @import "tailwindcss" + @import "@nuxt/ui"
│                  # Override --ui-* variables and @theme tokens here
└── base.css       # Legacy Vue template variables (--vt-c-*, --color-*)
                   # Do not use in new components — replace with --ui-* utilities

vite.config.ts     # ui({ ui: { colors: {...} } }) — semantic color configuration
```

> **Note on `base.css`:** this file contains legacy variables from the Vue CLI template (`--vt-c-*`, `--color-background`, etc.). Do not use them in new components — write `text-default` instead of `var(--color-text)`.
