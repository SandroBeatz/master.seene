# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install          # Install dependencies
bun dev              # Dev server (Vite)
bun run build        # Type-check + production build
bun test:unit        # Run Vitest unit tests
bun test:unit --reporter=verbose <path>  # Run a single test file
bun lint             # oxlint then eslint (both with --fix)
bun format           # Prettier format src/
```

## Stack

- **Vue 3 beta (Vapor)** — uses `<script setup lang="ts">` SFCs throughout
- **Vue Router 5** — file-based routing in `src/router/index.ts`; lazy-load non-home views
- **Pinia** — stores live in `src/stores/`
- **@nuxt/ui v4 + Tailwind CSS v4** — UI component library; prefer Nuxt UI components over hand-rolling. CSS entry (`src/app/styles/main.css`) must have `@import "tailwindcss"` before `@import "@nuxt/ui"`. Theme colors are configured via `ui({ ui: { colors: {...} } })` in `vite.config.ts` (no `app.config.ts` in Vue non-Nuxt projects).
- **Vite 8** with `@` alias pointing to `src/`
- **Vitest + jsdom** — tests colocated in `__tests__/` next to components; environment is jsdom
- **Linting**: oxlint runs first (fast), then eslint; config in `.oxlintrc.json` and `eslint.config.ts`

## Architecture

Feature-Sliced Design (FSD). Layers in import-order (upper layers can import from lower):

```
src/
  app/             # Bootstrap: main.ts, App.vue, router/, styles/
  pages/           # Route-level components — each page in pages/<name>/ui/<Name>Page.vue
  widgets/         # Composite UI blocks (no business logic)
  features/        # Business-logic slices
  entities/        # Domain entities
  shared/          # Pure reusables — ui/, assets/, lib/, api/, config/
  stores/          # Pinia stores (to be migrated into entities/features slices)
```

**Aliases** (both Vite and TypeScript): `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`, `@` (→ src/).

Router is in `src/app/router/index.ts`; `AboutPage` is lazy-loaded. Tests live next to code in `__tests__/` subdirectories.
