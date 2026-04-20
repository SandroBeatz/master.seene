---
name: fsd
description: |
  Feature-Sliced Design (FSD) architecture skill for this Vue 3 + Vite project.
  ALWAYS invoke this skill before creating, moving, or modifying any file in src/ — even for "small" additions like a new component, store, utility, type, or API call. Also invoke when the user asks where something should live, how to structure a feature, or when organizing code. This skill ensures every file lands in the correct FSD layer with the correct folder structure and mandatory index.ts public API. Invoke even if the task seems trivial — placing one file wrong creates architectural debt.

  Trigger phrases: add component, create feature, new page, add store, add utility, add type, add API, create entity, add widget, organize code, refactor structure, move file, where does X go, /fsd --check
---

# FSD Architecture Guide — Seene Project

## Layer Overview (strict import order — upper imports from lower only)

```
app/        Bootstrap only: main.ts, App.vue, router/, styles/
pages/      Route-level views — one component per route
widgets/    Composite UI blocks combining features/entities
features/   Business logic slices (user actions, use-cases)
entities/   Domain objects (data models + their UI/API)
shared/     Pure reusables with no business logic
stores/     ⚠️ Legacy — migrate into entities/ or features/
```

**The golden rule**: A layer may only import from layers *below* it. `features` can import from `entities` and `shared`. `entities` cannot import from `features`. Violations break the architecture.

---

## Slice Structure

Every slice in `pages/`, `widgets/`, `features/`, and `entities/` follows the same internal layout:

```
<layer>/<slice-name>/
  ui/          # Vue components (.vue files)
  model/       # Pinia stores, composables, types, business logic
  api/         # API calls (fetch/axios/supabase queries)
  lib/         # Slice-private utilities
  config/      # Slice-level constants
  index.ts     # ← PUBLIC API — the ONLY allowed import entry point
```

**Not every segment is required** — only create subdirectories that the slice actually needs. A simple entity might only have `ui/` and `model/`. But `index.ts` is ALWAYS required.

### index.ts — Public API Contract

The `index.ts` at the slice root is the contract for everything outside the slice. External code may ONLY import from `index.ts`, never from internal paths:

```ts
// ✅ Correct
import { UserCard } from '@entities/user'

// ❌ Wrong — bypasses public API
import { UserCard } from '@entities/user/ui/UserCard.vue'
```

Export only what other layers actually need — keep the internal surface small.

---

## Layer-by-Layer Rules

### `app/` — Bootstrap
- `main.ts`: plugin registration only
- `router/index.ts`: route definitions, lazy-load all non-home pages
- `styles/`: global CSS entry points
- Nothing from `app/` is imported by other layers

### `pages/` — Route Components
Structure: `pages/<page-name>/ui/<PageName>Page.vue` + `pages/<page-name>/index.ts`

```ts
// pages/clients/index.ts
export { default as ClientsPage } from './ui/ClientsPage.vue'
```

Pages orchestrate widgets and features. They hold no business logic themselves. Child routes get their own entry in index.ts.

### `widgets/` — Composite Blocks
Structure: `widgets/<widget-name>/ui/<WidgetName>.vue` + `widgets/<widget-name>/index.ts`

Widgets combine multiple features/entities into a cohesive UI block (e.g., `DashboardLayout`, `ClientSidebar`). They may have their own model/ for local state.

```ts
// widgets/dashboard-layout/index.ts
export { default as DashboardLayout } from './ui/DashboardLayout.vue'
```

### `features/` — Business Logic Slices
Structure: `features/<feature-name>/` with ui/, model/, api/ as needed.

A feature is a specific user action or use-case: `book-appointment`, `toggle-theme`, `send-message`. Features use entities but don't know about pages or widgets.

```ts
// features/book-appointment/index.ts
export { BookingForm } from './ui/BookingForm.vue'
export { useBookingStore } from './model/booking.store'
```

### `entities/` — Domain Objects
Structure: `entities/<entity-name>/` with ui/, model/, api/ as needed.

Entities are domain-level objects: `client`, `appointment`, `service`, `staff`. They hold the canonical types, API calls, and display components for a domain object.

```ts
// entities/client/index.ts
export type { Client } from './model/types'
export { useClientStore } from './model/client.store'
export { ClientCard } from './ui/ClientCard.vue'
export { fetchClients } from './api/client.api'
```

#### Cross-Entity Imports via `@x`

Entities cannot import from each other through their public API (that would create circular dependencies). Instead, use the `@x` cross-import pattern when entity A legitimately needs a type from entity B:

```ts
// entities/appointment/model/types.ts
import type { Client } from '@entities/client/@x/appointment'
```

This requires entity B to have a dedicated `@x/<consumer-name>/index.ts` that explicitly exposes only what entity A needs:

```
entities/client/
  @x/
    appointment/
      index.ts    ← exports only what appointment entity needs from client
```

```ts
// entities/client/@x/appointment/index.ts
export type { Client } from '../../model/types'
```

Only use `@x` when the cross-dependency is genuinely necessary. Prefer passing data as props or through a feature layer instead.

### `shared/` — Pure Reusables
No business logic, no slice imports. Organized by type:

```
shared/
  ui/        # Generic UI components (AppLogo, etc.) — index.ts required
  lib/       # Utilities, i18n, helpers — each sub-lib has its own index.ts
  api/       # HTTP client, base API setup
  config/    # App-wide constants
  assets/    # SVG, images
```

---

## Pinia Stores — Where They Live

Stores are NOT a layer — they live inside the slice that owns them:

| What it stores | Where it lives |
|---|---|
| Global UI state (theme, locale) | `shared/lib/<name>/` or `features/<feature>/model/` |
| Domain data (clients list) | `entities/client/model/client.store.ts` |
| Feature state (booking form) | `features/book-appointment/model/booking.store.ts` |

The `stores/` directory at the top level is a legacy location. New stores go into their slice. Existing ones in `stores/` should be migrated when touching that code.

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Vue components | PascalCase | `ClientCard.vue`, `BookingForm.vue` |
| TypeScript files | kebab-case | `client.store.ts`, `booking.api.ts` |
| Slice directories | kebab-case | `book-appointment/`, `dashboard-layout/` |
| Store composable | `use<Name>Store` | `useClientStore` |
| Types | PascalCase | `Client`, `Appointment` |

---

## Vite Aliases (use these in imports)

```ts
@app      → src/app/
@pages    → src/pages/
@widgets  → src/widgets/
@features → src/features/
@entities → src/entities/
@shared   → src/shared/
@         → src/
```

Always use aliases in cross-slice imports. Never use relative `../` paths to cross a slice boundary.

---

## Decision Flowchart — Where Does This Code Go?

```
Is it app bootstrap (plugins, router)?  → app/
Is it tied to a specific URL route?     → pages/
Combines multiple features into UI?     → widgets/
Is it a user action / use-case?         → features/<action-name>/
Is it a domain object with its own API? → entities/<entity-name>/
Is it reusable with zero business logic? → shared/
```

When in doubt, prefer a lower layer — shared > entities > features > widgets > pages.

---

## Before Writing Any Code — Checklist

1. Identify the correct layer for each new file
2. Ensure the slice directory exists with the right structure
3. Create/update `index.ts` to export the new item
4. Use only aliases (not relative cross-slice paths)
5. Verify no upward imports (e.g., entities importing from features)
6. For cross-entity types, create the `@x/<consumer>/index.ts` pattern

---

## `/fsd --check` — Project Audit

When the user runs `/fsd --check`, perform a full FSD audit of `src/`:

### What to check

**1. Missing public API files**
Every slice directory (`pages/*`, `widgets/*`, `features/*`, `entities/*`) must have `index.ts`. Flag any that don't.

**2. Layer violation imports**
Scan `*.ts` and `*.vue` files for imports that violate the layer order:
- `entities/` importing from `features/`, `widgets/`, or `pages/`
- `shared/` importing from any slice layer
- `features/` importing from `widgets/` or `pages/`

**3. Bypassed public API**
Flag imports that go directly into a slice's internals, e.g.:
`import X from '@entities/client/ui/ClientCard.vue'` (should be `@entities/client`)

**4. Cross-entity imports without `@x`**
Flag direct entity-to-entity imports that don't use the `@x` pattern.

**5. Stores in wrong location**
Flag store files in the top-level `stores/` directory (legacy). Suggest migration target.

**6. Shared with business logic**
Flag if `shared/` imports from any slice-level layer.

**7. Segment naming inside slices**
Warn if UI components are not in `ui/`, stores not in `model/`, etc.

### Output format

```
FSD Audit — <date>
==================

✅ No issues found — structure is clean!

OR

Issues found (N):

❌ VIOLATION  [description] — [file] → [file]
   Fix: [concrete suggestion]

⚠️  WARNING   [description] — [file]
   Fix: [concrete suggestion]

💡 SUGGESTION [description]
   Fix: [concrete suggestion]

Summary: N errors, N warnings, N suggestions
```

Run the audit by reading each relevant file with Grep/Read tools, then produce the report. Do NOT just describe what to check — actually check it.
