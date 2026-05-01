# Repository Guidelines

## Project Structure & Module Organization

This is a Bun-powered Vue 3/Vite app using Feature-Sliced Design. Bootstrap code lives in
`src/app/` (`main.ts`, router, global styles). Route pages are in
`src/pages/<name>/ui/`, page sections in `src/widgets/`, user actions in `src/features/`,
domain API/model code in `src/entities/`, and shared UI/assets/helpers in `src/shared/`.
Tests are colocated in `__tests__/`, for example
`src/entities/service/__tests__/services.api.spec.ts`. Static files are in `public/`,
docs in `docs/`, and schema changes in `supabase/migrations/`.

## Build, Test, and Development Commands

- `bun install`: install dependencies from `bun.lock`.
- `bun dev`: start the Vite development server.
- `bun run build`: run `vue-tsc --build` and create a production build.
- `bun test:unit`: run Vitest unit tests.
- `bun test:unit --reporter=verbose <path>`: run a focused test file.
- `bun lint`: run oxlint and ESLint with automatic fixes.
- `bun format`: format `src/` with Prettier.

## Coding Style & Naming Conventions

Use TypeScript and Vue SFCs with `<script setup lang="ts">`. Indent with 2 spaces, use
LF/UTF-8, and keep lines near 100 characters. Prettier uses no semicolons and single
quotes. Prefer aliases (`@app`, `@pages`, `@widgets`, `@features`, `@entities`,
`@shared`, `@`) over long relative imports. Export slice public APIs from `index.ts`.
Name page components `<Name>Page.vue`; keep entity types in `model/types.ts`, queries in
`model/*.queries.ts`, and API clients in `api/*.api.ts`.

## Testing Guidelines

Vitest runs in jsdom via `vitest.config.ts` and `tsconfig.vitest.json`. Place specs next
to code under `__tests__/` and name them `*.spec.ts`. Cover API/query behavior and
business logic added to entities or features. Run `bun test:unit` before opening a PR;
add focused tests for Supabase-backed data operations.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style prefixes, mainly `feat:` followed by a
concise summary, often with a short explanatory phrase. Keep commits scoped, for example
`feat: add client search filters` or `fix: handle empty service category list`.
Pull requests should include a clear description, linked issue or task when available,
test results (`bun test:unit`, `bun lint`, `bun run build` as applicable), screenshots for
UI changes, and matching migration files for schema changes.

## Security & Configuration

Keep secrets out of git. Use `.env.local` for local values and update `.env.example` when
adding required variables. Supabase schema edits should be committed as timestamped files
in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
