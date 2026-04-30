---
version: 1.0
date: 2026-04-30
category: business
---

# Services

> Version 1.0 · 2026-04-30 · [Business](../)

## Overview

The **Services** domain represents the treatment and procedure catalog that a salon owner offers to clients. Each service has a name, duration, price, color, and optional category. Services are referenced by appointments — a single appointment can include multiple services, and the appointment's total duration and price are automatically derived from the selected services.

There are two separate entities in this domain: `Service` and `ServiceCategory`. Categories are a flat, optional grouping layer; a service with no category is displayed under a catch-all "All services" label.

Services are user-scoped: every record belongs to a specific authenticated user via `user_id`, enforced at the database level by Row-Level Security policies.

---

## Data Model

### ServiceCategory

```typescript
interface ServiceCategory {
  id: string       // UUID, primary key
  name: string     // Display name
}
```

Database table: `service_category`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key, auto-generated |
| `user_id` | `UUID` | FK → auth.users, set from JWT |
| `name` | `TEXT` | Category name |
| `sort_order` | `INT` | Display order |
| `created_at` | `TIMESTAMPTZ` | Auto-set on insert |

### Service

```typescript
interface Service {
  id: string
  user_id: string
  category_id: string | null    // FK → service_category, nullable
  name: string
  description: string | null
  duration: number              // minutes: 15 | 30 | 45 | 60 | 90 | 120
  price: number                 // stored as NUMERIC(10,2)
  color: string                 // hex string, e.g. "#a78bfa"
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  category?: ServiceCategory | null  // joined on read, not a DB column
}

type CreateServiceDto = Omit<Service, 'id' | 'user_id' | 'created_at' | 'updated_at'>
type UpdateServiceDto = Partial<CreateServiceDto> & { id: string }
```

Database table: `service`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | Primary key, auto-generated |
| `user_id` | `UUID` | FK → auth.users |
| `category_id` | `UUID \| NULL` | FK → service_category |
| `name` | `TEXT` | Required |
| `description` | `TEXT \| NULL` | Optional |
| `duration` | `INT` | Minutes; allowed values: 15, 30, 45, 60, 90, 120 |
| `price` | `NUMERIC(10,2)` | Min 0 |
| `color` | `TEXT` | Hex string; default `#a78bfa` |
| `is_active` | `BOOLEAN` | Default `true` |
| `sort_order` | `INT` | Display order |
| `created_at` | `TIMESTAMPTZ` | Auto-set on insert |
| `updated_at` | `TIMESTAMPTZ` | Auto-updated by DB trigger |

> The `color` column was added in migration `20260430100000_add_color_to_services.sql`, after the initial schema `20260427120000_create_service_tables.sql`.

### Category join

When reading services, `category` is populated via a Supabase aliased join:

```typescript
supabase
  .from('service')
  .select('*, category:service_category(id, name)')
```

The TypeScript `category` field is present on `Service` only after a read — it is not part of `CreateServiceDto` or `UpdateServiceDto`.

---

## Architecture

The domain is split across two FSD layers following the project's Feature-Sliced Design conventions:

```
src/
  entities/
    service/
      api/services.api.ts               ← raw Supabase CRUD functions
      model/types.ts                    ← Service, CreateServiceDto, UpdateServiceDto
      model/service.queries.ts          ← Pinia Colada queries & mutations
      __tests__/services.api.spec.ts
      index.ts                          ← public barrel export
    service-category/
      api/service-categories.api.ts     ← listServiceCategories only (read-only)
      model/types.ts                    ← ServiceCategory
      model/service-category.queries.ts ← read-only query
      __tests__/service-categories.api.spec.ts
      index.ts
  features/
    service-form/
      ui/ServiceFormModal.vue           ← create/edit form modal
      index.ts
  pages/
    services/
      ui/ServicesPage.vue               ← full management page
      index.ts
```

**Intentional asymmetry:** `ServiceCategory` has no mutations in the query layer. Categories are managed separately (directly via DB or future admin flow) and treated as a read-only lookup from the client's perspective.

### Data flow

```
ServicesPage
  ├── useServicesQuery(userId)         → fetches & caches Service[]
  ├── useDeleteServiceMutation(userId) → deletes, invalidates cache
  └── ServiceFormModal
        ├── useServiceCategoriesQuery(userId) → category dropdown options
        ├── useCreateServiceMutation(userId)  → on new service submit
        └── useUpdateServiceMutation(userId)  → on edit submit
```

All mutations call `invalidateQueries(['services', userId])` on settle, causing `useServicesQuery` to refetch automatically.

---

## API

### services.api.ts

```typescript
// src/entities/service/api/services.api.ts

listServices(userId: string): Promise<Service[]>
// SELECT * FROM service WHERE user_id = userId
// Joins category:service_category(id, name)
// Ordered by sort_order

createService(userId: string, dto: CreateServiceDto): Promise<Service>
// INSERT INTO service { ...dto, user_id: userId }
// Returns inserted row with category joined

updateService(dto: UpdateServiceDto): Promise<Service>
// UPDATE service SET {...dto} WHERE id = dto.id
// Returns updated row with category joined

deleteService(id: string): Promise<void>
// DELETE FROM service WHERE id = id
```

### service-categories.api.ts

```typescript
// src/entities/service-category/api/service-categories.api.ts

listServiceCategories(userId: string): Promise<ServiceCategory[]>
// SELECT id, name FROM service_category WHERE user_id = userId
// Ordered by sort_order
```

---

## Pinia Colada queries

```typescript
// src/entities/service/model/service.queries.ts

useServicesQuery(userId: Ref<string>)
// Query key: ['services', userId.value]
// Reactive: re-fetches automatically when userId changes

useCreateServiceMutation(userId: Ref<string>)
// mutate(dto: CreateServiceDto) | mutateAsync(dto)
// On settle: invalidates ['services', userId.value]

useUpdateServiceMutation(userId: Ref<string>)
// mutate(dto: UpdateServiceDto) | mutateAsync(dto)
// On settle: invalidates ['services', userId.value]

useDeleteServiceMutation(userId: Ref<string>)
// mutate(id: string)
// On settle: invalidates ['services', userId.value]
```

```typescript
// src/entities/service-category/model/service-category.queries.ts

useServiceCategoriesQuery(userId: Ref<string>)
// Query key: ['service-categories', userId.value]
// Read-only; no mutations
```

---

## Usage

### Display services list (ServicesPage pattern)

```typescript
// src/pages/services/ui/ServicesPage.vue
import { useServicesQuery, useDeleteServiceMutation } from '@entities/service'

const userId = computed(() => user.value!.id)
const { data: services, isLoading, error } = useServicesQuery(userId)
const { mutate: deleteService } = useDeleteServiceMutation(userId)
```

### Build a service lookup map (CalendarPage pattern)

```typescript
// src/pages/calendar/ui/CalendarPage.vue
import { useServicesQuery } from '@entities/service'

const { data: services } = useServicesQuery(userId)

const serviceMap = computed(() =>
  new Map(services.value?.map(s => [s.id, { name: s.name, color: s.color }]) ?? [])
)
```

### Use in appointment form (multi-select + auto-totals)

```typescript
// src/features/appointment-form/ui/AppointmentFormDialog.vue
import { useServicesQuery, type Service } from '@entities/service'

const { data: services } = useServicesQuery(userId)

// Watch selected IDs, derive totals
watch(selectedServiceIds, (ids) => {
  const selected = services.value?.filter(s => ids.includes(s.id)) ?? []
  form.duration = selected.reduce((sum, s) => sum + s.duration, 0)
  form.price    = selected.reduce((sum, s) => sum + s.price, 0)
})
```

---

## Business rules

| Rule | Detail |
|---|---|
| **Duration values** | Must be one of: 15, 30, 45, 60, 90, 120 (minutes). Enforced by Joi in the form. |
| **Price** | Non-negative number. Appointments may override the auto-calculated total. |
| **Color** | Hex string from a fixed palette of 10 colors. Default `#a78bfa`. Used for calendar event rendering. |
| **category_id** | Nullable. Services without a category display under "All services" in the UI. |
| **is_active** | Soft toggle. Inactive services are still stored and joinable but hidden in appointment selection. |
| **User isolation** | RLS policies on both `service` and `service_category` restrict all reads/writes to `auth.uid() = user_id`. |
| **Multi-service appointments** | Appointment stores `service_ids: string[]`. Total duration and price are the sum of all selected services; the user can manually override both after auto-population. |

---

## Validation (ServiceFormModal)

Implemented with Joi (`src/features/service-form/ui/ServiceFormModal.vue`):

```
name        — required, string, 1–100 chars
description — optional, string, max 500 chars
duration    — required, valid(15, 30, 45, 60, 90, 120)
price       — required, number, min 0
```

Color, category, and `is_active` are UI-controlled (color picker, dropdown, toggle) and not separately Joi-validated.

---

## Cross-references

- [Data Model](./data-model.md) — full ER diagram and schema overview for all entities including `service` and `service_category`
- [Auth and Onboarding](./auth-and-onboarding.md) — how `user_id` is established; RLS context
- [Supabase Integration](../integrations/supabase.md) — Supabase client setup, query patterns, and migration workflow used by the services API layer
