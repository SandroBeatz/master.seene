---
version: 1.0
date: 2026-05-14
category: business
---

# Payment Types

> Version 1.0 · 2026-05-14 · [Business](../)

## Overview

The **Payment Types** domain provides the list of payment methods a master accepts from clients (e.g. Cash, Card, Bank Transfer). Payment types are used when recording or reviewing appointments to indicate how a client paid.

Each master has their own set of payment types, user-scoped via `user_id`. The list is ordered and color-coded for quick visual identification. One payment type is always designated as the default and is protected from deletion.

On first use, the system automatically seeds one default payment type ("Наличка" / Cash) so the master always has at least one option without any manual setup.

---

## Data Model

### `PaymentType`

```typescript
interface PaymentType {
  id: string           // UUID, primary key
  user_id: string      // FK → auth.users.id; every record is user-scoped
  name: string         // Display name, max 50 characters
  color: string        // Hex color string (e.g. '#4ade80')
  is_default: boolean  // Exactly one record per user must be true
  sort_order: number   // Zero-based integer; lower = higher in the list
  created_at: string   // ISO 8601 timestamp, set by the database
  updated_at: string   // ISO 8601 timestamp, updated by the database
}
```

### DTOs

```typescript
// Used for create; is_default and sort_order must be supplied by the caller
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
| `color` | `text` | NO | Hex color string |
| `is_default` | `boolean` | NO | One per user must be `true` |
| `sort_order` | `integer` | NO | Display order |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

Row-Level Security is enabled. Users can only read and write their own rows.

---

## Business Rules

### 1. Default protection

Every user must always have exactly one default payment type. The default cannot be deleted:

- **Database layer**: `deletePaymentType` adds `.eq('is_default', false)` to the delete query — if the target row has `is_default: true`, the filter finds nothing and no row is deleted without throwing an error.
- **UI layer**: the delete button is disabled for any item where `pt.is_default === true`, and a tooltip explains why (`settings.paymentTypes.deleteDisabledTooltip`).

The default flag is set only during auto-seeding (see below) and currently cannot be reassigned through the UI.

### 2. Auto-seeding on first use

`ensureDefaultPaymentType(userId)` is called when the Payment Types settings page mounts. It checks whether the user has any payment types at all:

- If the `payment_type` table has zero rows for this user → inserts a single default record:
  - `name`: `'Наличка'` (Russian for "Cash")
  - `color`: `'#4ade80'` (green)
  - `is_default`: `true`
  - `sort_order`: `0`
- If at least one row exists → does nothing.

This means a fresh account always has at least one method available, and no onboarding step is needed.

Source: `src/entities/payment-type/api/payment-type.api.ts` → `ensureDefaultPaymentType`

### 3. Drag-and-drop ordering

The list on the settings page uses `vuedraggable`. When the user drops an item in a new position:

1. A local `sortedList` ref is updated immediately (optimistic UI).
2. `updatePaymentTypeSortOrders` fires — it re-assigns `sort_order` to every item's array index (0, 1, 2 …) and sends **one update request per item** in a sequential `for` loop.
3. On error, `sortedList` is reverted to the last server state and a toast is shown.

> **Note**: The sequential loop approach (one Supabase request per row) works fine for small lists but will become slow if a user has many payment types. A future improvement would batch the updates in a single `upsert` call.

Source: `src/entities/payment-type/api/payment-type.api.ts` → `updatePaymentTypeSortOrders`  
Source: `src/pages/settings/ui/SettingsPaymentTypesPage.vue` → `onDragEnd`

### 4. Color palette

Payment types have a fixed 10-color palette (not a freeform picker). The palette is defined in the form modal:

```typescript
const COLOR_PALETTE = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green (default for new records)
  '#34d399', // emerald
  '#60a5fa', // blue
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#f472b6', // pink
  '#94a3b8', // slate
]
```

The first color in the palette (`#f87171`) is the pre-selected default when opening the create form. The auto-seeded "Наличка" record uses `#4ade80`.

Source: `src/features/payment-type-form/ui/PaymentTypeFormModal.vue`

---

## Architecture

```
pages/settings/SettingsPaymentTypesPage.vue
  │  imports
  ├── entities/payment-type          ← data layer (types, queries, api)
  │     ├── model/types.ts           ← PaymentType, CreatePaymentTypeDto, UpdatePaymentTypeDto
  │     ├── model/payment-type.queries.ts  ← Pinia Colada hooks
  │     ├── api/payment-type.api.ts  ← Supabase calls
  │     └── index.ts                 ← public API
  │
  └── features/payment-type-form     ← create/edit modal
        ├── ui/PaymentTypeFormModal.vue
        └── index.ts
```

**Data flow:**

1. `SettingsPaymentTypesPage` mounts → calls `ensureDefaultPaymentType` → calls `usePaymentTypesQuery(userId)`.
2. Pinia Colada fetches `payment_type` rows ordered by `sort_order` then `name`.
3. The page keeps a local `sortedList` ref synced from the query result (needed for drag-and-drop).
4. Create / edit actions open `PaymentTypeFormModal`, which calls `useCreatePaymentTypeMutation` or `useUpdatePaymentTypeMutation`.
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

### Creating a payment type

```typescript
import { useCreatePaymentTypeMutation } from '@entities/payment-type'

const createMutation = useCreatePaymentTypeMutation(userId)

await createMutation.mutateAsync({
  name: 'Card',
  color: '#60a5fa',
  is_default: false,
  sort_order: 0,   // will be re-sorted if drag-and-drop is used later
})
```

### Ensuring a default exists (call on mount)

```typescript
import { ensureDefaultPaymentType } from '@entities/payment-type'

onMounted(async () => {
  if (userId.value) {
    await ensureDefaultPaymentType(userId.value)
  }
})
```

### Reordering after drag

```typescript
import { updatePaymentTypeSortOrders } from '@entities/payment-type'

// After the drag event, pass the full reordered array
await updatePaymentTypeSortOrders(
  sortedList.value.map((pt, i) => ({ id: pt.id, sort_order: i }))
)
```

---

## Known issues

| Issue | Location | Description |
|---|---|---|
| Error toast uses wrong i18n key | `PaymentTypeFormModal.vue:116–118` | Both create and edit errors show `settings.paymentTypes.deleteError` instead of a dedicated save-error key. |
| Default flag is immutable via UI | `SettingsPaymentTypesPage.vue` | There is no UI to reassign the default. If the business need arises, a separate "Set as default" action must be added. |
| Sequential sort update | `payment-type.api.ts:43–51` | `updatePaymentTypeSortOrders` sends one request per row. Acceptable now but should be replaced with a batch upsert for larger lists. |

---

## File Structure

| File | Description |
|---|---|
| `src/entities/payment-type/model/types.ts` | `PaymentType`, `CreatePaymentTypeDto`, `UpdatePaymentTypeDto` interfaces |
| `src/entities/payment-type/model/payment-type.queries.ts` | Pinia Colada query and mutation hooks |
| `src/entities/payment-type/api/payment-type.api.ts` | Raw Supabase calls: list, create, update, delete, sort, ensure-default |
| `src/entities/payment-type/index.ts` | Public API barrel — only import from here |
| `src/features/payment-type-form/ui/PaymentTypeFormModal.vue` | Create/edit modal with color picker and Joi validation |
| `src/features/payment-type-form/index.ts` | Feature barrel exporting `PaymentTypeFormModal` |
| `src/pages/settings/ui/SettingsPaymentTypesPage.vue` | List view with drag-and-drop, delete confirmation modal |

---

## Cross-references

- [Data Model](./data-model.md) — overall schema overview; note that `payment_type` table is not yet listed there and should be added
- [Services](./services.md) — similar entity structure (user-scoped, list + CRUD); payment types follow the same patterns
- [Supabase Integration](../integrations/supabase.md) — database client, RLS policies, migration workflow
