---
version: 2.1
date: 2026-06-20
category: business
---

# Payment Types

> Version 2.1 · 2026-06-20 · [Business](../)

## Overview

The **Payment Types** domain provides the list of payment methods a master accepts from clients (e.g. Cash, Card, Kaspi). Payment types are surfaced in **Settings → Payment methods** and used when recording an appointment checkout to indicate how a client paid.

Each master has their own set of payment types, user-scoped via `user_id`. Two methods are **system** methods — **cash** and **card** — seeded automatically for every master. System methods cannot be deleted; they can only be activated or deactivated. On top of those, a master can add any number of **custom** methods (e.g. Kaspi, MBank), each with its own name and color.

Every method has an `is_active` toggle that applies immediately ("toggles apply right away"). Only active methods are offered at checkout. This lets a master keep a method configured but temporarily switched off without losing it.

---

## Data Model

### `PaymentType`

```typescript
type PaymentTypeKind = 'cash' | 'card' | 'custom'

interface PaymentType {
  id: string              // UUID, primary key
  user_id: string         // FK → auth.users.id; every record is user-scoped
  name: string            // Display name (max 50 chars). For system methods the
                          // visible name comes from i18n, not this column.
  color: string           // Hex color string (e.g. '#4ade80')
  kind: PaymentTypeKind   // 'cash' | 'card' = system (undeletable); 'custom' = user-added
  is_default: boolean     // Pre-selected method at checkout (cash by default)
  is_active: boolean      // Enable/disable toggle; inactive methods are hidden at checkout
  sort_order: number      // Zero-based integer; lower = higher in the list
  created_at: string      // ISO 8601 timestamp, set by the database
  updated_at: string      // ISO 8601 timestamp, updated by the database
}

/** System methods (cash/card) are seeded automatically and cannot be deleted. */
function isSystemPaymentType(pt: Pick<PaymentType, 'kind'>): boolean {
  return pt.kind !== 'custom'
}
```

### DTOs

```typescript
// Used for create; kind, is_default, is_active and sort_order are supplied by the caller
type CreatePaymentTypeDto = Omit<PaymentType, 'id' | 'user_id' | 'created_at' | 'updated_at'>

// Used for update; id is required, all other fields are optional
type UpdatePaymentTypeDto = Partial<CreatePaymentTypeDto> & { id: string }
```

Source: `src/entities/payment-type/model/types.ts`

### Database table: `payment_type`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NO | Primary key, `gen_random_uuid()` |
| `user_id` | `uuid` | NO | FK → `auth.users.id`, RLS owner check |
| `name` | `text` | NO | Max 50 chars |
| `color` | `text` | NO | Hex color string, default `#4ade80` |
| `kind` | `text` | NO | `'cash' | 'card' | 'custom'`, default `'custom'`, CHECK-constrained |
| `is_default` | `boolean` | NO | Checkout pre-selection (cash) |
| `is_active` | `boolean` | NO | Enable/disable toggle, default `true` |
| `sort_order` | `integer` | NO | Display order |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Row-Level Security is enabled. Users can only read and write their own rows.

Migrations:
- `supabase/migrations/20260513120000_create_payment_types.sql` — original table
- `supabase/migrations/20260620170555_payment_type_kind_active.sql` — adds `kind` + `is_active`, backfills system methods (see below)

---

## Business Rules

### 1. System methods and delete protection

Methods are classified by `kind`. `kind IN ('cash', 'card')` are **system** methods; `kind = 'custom'` are user-added. System methods are protected from deletion at two layers:

- **Database layer**: `deletePaymentType` adds `.eq('kind', 'custom')` to the delete query — a system row never matches, so it is never deleted (no error thrown).
- **UI layer**: system rows render no delete (trash) button at all; only custom rows do.

System methods can be activated/deactivated but not removed. Their display name and subtitle come from i18n (`settings.paymentTypes.system.cash.*` / `...card.*`), not from the stored `name`, so a legacy stored name (e.g. "Наличка") is harmless after conversion.

### 2. Auto-seeding on first use

`ensureSystemPaymentTypes(userId)` is called when the Payment Types settings page mounts. It guarantees both system methods exist and is **idempotent** — it only inserts the methods that are missing:

- If no `kind='cash'` row exists → insert `{ name: 'Cash', color: '#94a3b8', kind: 'cash', is_default: true, is_active: true, sort_order: 0 }`
- If no `kind='card'` row exists → insert `{ name: 'Card', color: '#94a3b8', kind: 'card', is_default: false, is_active: true, sort_order: 1 }`

A fresh account therefore always has cash + card available with no onboarding step.

Source: `src/entities/payment-type/api/payment-type.api.ts` → `ensureSystemPaymentTypes`

#### Migration backfill for existing users

The `20260620170555` migration brought existing data into this model:

1. Rows with the legacy `is_default = true` flag were set to `kind = 'cash'` (until then `is_default` was only ever set on the seeded cash method).
2. For users whose cash row was never flagged default, a single name-matching row (`наличка`/`наличные`/`нал`/`cash`) was converted to `kind = 'cash'`.
3. Any user still lacking a cash or card method got one inserted, so every existing user ends up with exactly one cash + one card.

### 3. Active / inactive toggle

Each method has `is_active`. The switch on each row flips it instantly via `useSetPaymentTypeActiveMutation`, which performs an **optimistic** cache update in `onMutate` (and reverts in `onError`) so the UI responds immediately without waiting for the round-trip. Inactive rows are visually dimmed.

Only active methods are offered at checkout (see [Cross-references](#cross-references)).

Source: `src/entities/payment-type/api/payment-type.api.ts` → `setPaymentTypeActive`
Source: `src/entities/payment-type/model/payment-type.queries.ts` → `useSetPaymentTypeActiveMutation`

### 4. Ordering

Every method — system and custom alike — is reorderable via `vuedraggable`; the drag handle is always visible on each row:

1. A local `sortedList` ref holding the full list is updated immediately (optimistic UI).
2. `updatePaymentTypeSortOrders` re-assigns `sort_order` to each item's array index (0, 1, 2 …) and sends **one update request per item** in a sequential loop.
3. On error, `sortedList` is reverted to the last server state and a toast is shown.

> **Note**: The sequential loop (one Supabase request per row) is fine for small lists but should be replaced with a batch `upsert` if a master accumulates many custom methods.

Source: `src/pages/settings/ui/SettingsPaymentTypesPage.vue` → `onDragEnd`
Source: `src/entities/payment-type/api/payment-type.api.ts` → `updatePaymentTypeSortOrders`

### 5. Icons and color

Each row shows a rounded icon tile. The icon is chosen by `kind`:

- `cash` → `i-lucide-banknote`
- `card` → `i-lucide-credit-card`
- `custom` → `i-lucide-circle-dollar-sign` (universal)

The tile background differs by kind: system methods use a neutral (`bg-elevated`) tile with a muted icon; custom methods tint the tile with their chosen color (`backgroundColor: \`${color}1a\`` ≈ 10% alpha) and render the icon in the full color. Custom methods have **no subtitle** — only their name. System methods show a fixed i18n subtitle.

Custom methods pick from a fixed 10-color palette (not a freeform picker), defined in the form modal:

```typescript
const COLOR_PALETTE = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399',
  '#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#94a3b8',
]
```

The create form shows a live preview tile reflecting the selected color.

Source: `src/features/payment-type-form/ui/PaymentTypeFormModal.vue`

---

## Architecture

```
pages/settings/SettingsPaymentTypesPage.vue
  │  imports
  ├── entities/payment-type          ← data layer (types, queries, api)
  │     ├── model/types.ts           ← PaymentType, PaymentTypeKind, DTOs, isSystemPaymentType
  │     ├── model/payment-type.queries.ts  ← Pinia Colada hooks (incl. optimistic toggle)
  │     ├── api/payment-type.api.ts  ← Supabase calls
  │     └── index.ts                 ← public API
  │
  └── features/payment-type-form     ← create/edit modal (custom methods only)
        ├── ui/PaymentTypeFormModal.vue
        └── index.ts
```

**Data flow:**

1. `SettingsPaymentTypesPage` mounts → calls `ensureSystemPaymentTypes` → `usePaymentTypesQuery(userId)`.
2. Pinia Colada fetches `payment_type` rows ordered by `sort_order` then `name`.
3. The page keeps a local `sortedList` ref of the full list (draggable; system rows render no trash button and aren't click-to-edit).
4. The toggle calls `useSetPaymentTypeActiveMutation` (optimistic). Create/edit opens `PaymentTypeFormModal` (custom only).
5. On mutation settle, the query cache key `['payment-types', userId]` is invalidated → list refreshes.

---

## Usage

### Reading the list in a component

```typescript
import { usePaymentTypesQuery } from '@entities/payment-type'
import { computed } from 'vue'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: paymentTypes } = usePaymentTypesQuery(userId)
// paymentTypes.value → PaymentType[] ordered by sort_order, then name
```

### Ensuring system methods exist (call on mount)

```typescript
import { ensureSystemPaymentTypes } from '@entities/payment-type'

onMounted(async () => {
  if (userId.value) {
    await ensureSystemPaymentTypes(userId.value)
  }
})
```

### Toggling a method active/inactive

```typescript
import { useSetPaymentTypeActiveMutation } from '@entities/payment-type'

const setActive = useSetPaymentTypeActiveMutation(userId)
await setActive.mutateAsync({ id: pt.id, is_active: false })
```

### Creating a custom payment type

```typescript
import { useCreatePaymentTypeMutation } from '@entities/payment-type'

const createMutation = useCreatePaymentTypeMutation(userId)

await createMutation.mutateAsync({
  name: 'Kaspi',
  color: '#60a5fa',
  kind: 'custom',
  is_default: false,
  is_active: true,
  sort_order: 0,   // re-sorted by drag-and-drop later
})
```

---

## Known issues

| Issue | Location | Description |
|---|---|---|
| Default flag is immutable via UI | `SettingsPaymentTypesPage.vue` | `is_default` (checkout pre-selection) is only set during seeding/migration; there is no UI to reassign it. |
| Sequential sort update | `payment-type.api.ts` | `updatePaymentTypeSortOrders` sends one request per row. Acceptable now; replace with a batch upsert for larger lists. |

---

## File Structure

| File | Description |
|---|---|
| `src/entities/payment-type/model/types.ts` | `PaymentType`, `PaymentTypeKind`, DTOs, `isSystemPaymentType` |
| `src/entities/payment-type/model/payment-type.queries.ts` | Pinia Colada query and mutation hooks, incl. optimistic toggle |
| `src/entities/payment-type/api/payment-type.api.ts` | Supabase calls: list, create, update, delete, sort, `setPaymentTypeActive`, `ensureSystemPaymentTypes` |
| `src/entities/payment-type/index.ts` | Public API barrel — only import from here |
| `src/features/payment-type-form/ui/PaymentTypeFormModal.vue` | Create/edit modal (custom methods) with color picker + live preview |
| `src/features/payment-type-form/index.ts` | Feature barrel exporting `PaymentTypeFormModal` |
| `src/pages/settings/ui/SettingsPaymentTypesPage.vue` | List view: pinned system rows, draggable custom rows, toggles, delete confirm |

---

## Cross-references

- [Data Model](./data-model.md) — overall schema overview; note that `payment_type` should be added there
- [Services](./services.md) — similar user-scoped entity structure (list + CRUD)
- [Supabase Integration](../integrations/supabase.md) — database client, RLS policies, migration workflow
- **Appointment checkout** (`src/features/appointment-checkout`) — consumes payment types; only `is_active` methods are offered, with `is_default` pre-selected
