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
- **Vue Router 5** — router in `src/app/router/index.ts`; all routes lazy-load via `(await import('@pages/login')).LoginPage` pattern
- **Pinia + @pinia/colada** — stores live in `src/stores/` (to be migrated into FSD slices); colada handles async data fetching
- **@nuxt/ui v4 + Tailwind CSS v4** — prefer Nuxt UI components over hand-rolling. CSS entry (`src/app/styles/main.css`) must have `@import "tailwindcss"` before `@import "@nuxt/ui"`. Theme colors (primary: amber, neutral: zinc) and component overrides are in `vite.config.ts` via `ui({...})` (no `app.config.ts` in Vue non-Nuxt projects).
- **vue-i18n** — locales in `src/shared/lib/i18n/locales/{en,fr,ru}.ts`; locale persisted to localStorage; switch via `useLocaleStore` from `@shared/lib/locale`
- **Icons** — Lucide via iconify pattern: `i-lucide-<name>` in Nuxt UI's `icon` props
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

**Layouts**: Two layouts controlled by `meta.layout` on routes. Auth pages (`/login`, `/register`) render standalone with `meta: { layout: 'auth' }`. Dashboard pages (`/`, `/home`, `/calendar`, etc.) are nested under `DashboardLayout` widget which provides the sidebar nav. `App.vue` wraps everything in `<UApp><RouterView /></UApp>`.

**Slice exports**: Each FSD slice has a barrel `index.ts` that re-exports its public API. Router imports pages as `(await import('@pages/login')).LoginPage`.

Tests live next to code in `__tests__/` subdirectories.

## Database

Supabase project: `foxqkomqtpbxyeqqwzpm` (ap-southeast-1, Singapore)

### Workflow

Schema changes are tracked in `supabase/migrations/` — SQL files named `YYYYMMDDHHMMSS_description.sql`.

**Applying changes:**
1. Write SQL in a new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Apply via Supabase MCP `execute_sql` (project_id: `foxqkomqtpbxyeqqwzpm`)
3. Commit the migration file together with the code that depends on it

**Rules:**
- DDL changes (ALTER TABLE, CREATE TABLE) — use `execute_sql` MCP tool only
- Do **not** use `apply_migration` MCP tool — it requires a running local DB (`supabase start`) which is not used in this project
- All schema changes go directly to production via MCP
- One schema change = one SQL file in `supabase/migrations/`
- File names: UTC timestamp + snake_case description (e.g. `20260426120000_add_user_preferences.sql`)

**Inspect current schema:**
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```
