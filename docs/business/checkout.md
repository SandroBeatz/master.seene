---
version: 1.1
date: 2026-07-14
category: business
---

# Checkout

> Version 1.1 · 2026-07-14 · [Business](../)

## Overview

Checkout is the payment collection workflow that finalises a completed appointment. When the master marks an appointment as complete, they are prompted to review services, edit per-service amounts if needed, select a payment method, and confirm. A single atomic database operation then transitions the appointment to `completed` and records the sale.

The checkout workflow is intentionally narrow: it does not handle refunds, partial payments, or split billing. One appointment → one sale, always.

---

## Rules

### When checkout is available

Checkout can be triggered for any appointment in `confirmed` status. Attempting to complete an appointment that already has a sale raises `already_completed` and the UI surfaces a warning toast without crashing.

### What is recorded

A successful checkout writes three things atomically:

1. `appointments.status` → `'completed'`
2. A `sale` row — total amount, payment type, `paid_at` timestamp
3. One `sale_item` row per service — snapshotting the service name and price **at the moment of checkout**

The snapshot approach means changes to a service's name or price after checkout do not retroactively alter historical sale data.

### Amount editing rules

- **Single service** — the master edits the total amount directly in the checkout modal. The default is `service.price`.
- **Multiple services** — each service gets its own editable amount field. The total is computed as the sum of all per-service amounts.
- **Constraint** — all amounts must be ≥ 0 and the total must be > 0 for the confirm button to become active.

### Payment type selection

The modal pre-selects the master's default payment type (the one with `is_default = true`). If no default is set, the first available payment type is pre-selected. If no payment types exist at all, a message is shown and the confirm button remains disabled.

### Error handling

| Error | Cause | UI response |
|---|---|---|
| `already_completed` | Sale already exists for this appointment | Warning toast; modal closes |
| Any other error | Network, DB constraint, or unexpected failure | Error toast; modal stays open |

After a successful checkout, the appointment is updated optimistically in the local cache (`status` set to `'completed'`) before the query cache is invalidated.

---

## Data Model

### sale

One financial record per completed appointment.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `auth.users` (CASCADE delete) |
| `appointment_id` | `uuid` | FK → `appointments` (UNIQUE, **CASCADE delete**) |
| `client_id` | `uuid` | FK → `client` (RESTRICT delete) |
| `payment_type_id` | `uuid` | FK → `payment_type` (SET NULL on delete) |
| `amount` | `numeric(10,2)` | Total amount paid |
| `paid_at` | `timestamptz` | Defaults to `now()` at insert time |
| `created_at` | `timestamptz` | Auto-set on insert |

**Key constraint:** `UNIQUE (appointment_id)` — one appointment can have at most one sale.

**Delete behavior:** since a sale is 1:1 with its appointment (`NOT NULL UNIQUE`) it
cannot be orphaned, so `appointment_id` uses **`ON DELETE CASCADE`** (changed from the
original `RESTRICT` in `20260714120000_sale_appointment_delete_cascade.sql`). Deleting an
appointment removes its sale (and `sale_item` rows cascade from `sale`). The appointment
preview panel warns the master that revenue will be removed before confirming a delete
(`appointments.delete.messageWithSale`).

**RLS:** `auth.uid() = user_id` — owner-only access on all operations.

### sale_item

One row per service line within a sale.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `sale_id` | `uuid` | FK → `sale` (CASCADE delete) |
| `service_id` | `uuid \| null` | No FK — service may be deleted |
| `name_snapshot` | `text` | Service name at checkout time |
| `price_snapshot` | `numeric(10,2)` | Service amount at checkout time |

`service_id` is nullable: if the service has been deleted after checkout, the row is preserved with `service_id = null` but the snapshot fields retain the historical name and price.

**RLS:** Indirect — access is allowed only when `sale.user_id = auth.uid()` (checked via `EXISTS` subquery).

---

## The `complete_appointment` RPC

The checkout operation is performed by a single Postgres function. It is called via Supabase RPC — not via row-level inserts — to guarantee atomicity.

```sql
complete_appointment(
  p_appointment_id  UUID,
  p_amount          NUMERIC,
  p_payment_type_id UUID,
  p_items           JSONB   -- array of {service_id, name, price}
) RETURNS UUID              -- the new sale.id
```

**Execution sequence (all within one transaction):**

```
1. SELECT appointment WHERE id = p_appointment_id AND user_id = auth.uid()
   → NOT FOUND: RAISE 'appointment_not_found'

2. SELECT 1 FROM sale WHERE appointment_id = p_appointment_id
   → EXISTS: RAISE 'already_completed'

3. UPDATE appointments SET status = 'completed', updated_at = now()

4. INSERT INTO sale (user_id, appointment_id, client_id, payment_type_id, amount)
   → captures v_sale_id

5. FOR each item in p_items:
   INSERT INTO sale_item (sale_id, service_id, name_snapshot, price_snapshot)
```

**Security:** `SECURITY DEFINER` with `search_path = public`. The function checks `auth.uid()` ownership explicitly — it cannot be called on another master's appointment.

**Returns:** the `sale.id` UUID of the newly created sale.

---

## Checkout Flow (end to end)

```
Master taps "Complete" on an appointment
        │
        ▼
Parent component resolves services from appointment.service_ids
        │
        ▼
AppointmentCheckoutModal opens
  useCheckout() initialises:
  - serviceAmounts[] = service prices (or appointment.price if no services)
  - selectedPaymentTypeId = default payment type id
        │
   Master reviews / edits amounts, selects payment method
        │
        ▼
Master taps "Confirm" (canSubmit must be true)
  - all amounts ≥ 0
  - total > 0
  - paymentTypeId selected
        │
        ▼
buildPayload() constructs CompleteSaleDto:
  { appointment_id, amount: total, payment_type_id, items[] }
        │
        ▼
emit('confirm', payload) → parent calls completeSaleMutation.mutateAsync(payload)
        │
        ▼
completeSale(dto) → supabase.rpc('complete_appointment', {...})
        │
   ┌────┴────┐
success     error
   │           │
   ▼           ▼
invalidate    'already_completed' → warning toast
cache:        other → error toast
['appointments', userId]
['sale-by-appointment', appointmentId]
   │
   ▼
Optimistic update: selectedAppointment.status = 'completed'
Modal closes, success toast
```

---

## TypeScript Types

```typescript
// src/entities/sale/model/types.ts

interface CompleteSaleItemDto {
  service_id: string | null
  name: string
  price: number
}

interface CompleteSaleDto {
  appointment_id: string
  amount: number
  payment_type_id: string
  items: CompleteSaleItemDto[]
}

interface SaleItem {
  id: string
  sale_id: string
  service_id: string | null
  name_snapshot: string
  price_snapshot: number
}

interface Sale {
  id: string
  user_id: string
  appointment_id: string
  client_id: string
  payment_type_id: string | null
  amount: number
  paid_at: string
  created_at: string
  payment_type?: { name: string; color: string } | null
  items?: SaleItem[]
}
```

---

## API & Query Hooks

All in `src/entities/sale/`:

```typescript
// api/sale.api.ts
completeSale(dto: CompleteSaleDto): Promise<string>
  // Calls RPC, returns the new sale.id

getSaleByAppointmentId(appointmentId: string): Promise<(Sale & { items: SaleItem[] }) | null>
  // Fetches sale joined with payment_type and sale_item[]

// model/sale.queries.ts
useSaleByAppointmentQuery(appointmentId: Ref<string | undefined>)
  // key: ['sale-by-appointment', appointmentId]
  // enabled only when appointmentId is defined

useCompleteSaleMutation(userId: Ref<string>)
  // On settled: invalidates ['appointments', userId] and ['sale-by-appointment', appointmentId]
```

The mutation invalidates on `onSettled` (not `onSuccess`) to ensure the cache is always refreshed even if the mutation throws — preventing stale `pending` status from lingering in the UI after an `already_completed` error.

---

## Integration Points

Checkout is currently embedded in two places:

| Location | Trigger |
|---|---|
| `src/pages/calendar/ui/CalendarPage.vue` | "Complete" button in `AppointmentPreviewPanel` on the calendar page |
| `src/widgets/action-appointments/ui/ActionAppointmentsWidget.vue` | "Complete" button in the dashboard action-appointments widget |

Both follow the same pattern:
1. Resolve services from `appointment.service_ids` against the loaded services list
2. Open `AppointmentCheckoutModal` with the resolved data
3. Pass `completeSaleMutation.isLoading` as `:loading` prop to show a spinner on the confirm button
4. Handle `@confirm` with the same `handleCheckoutConfirm` function

---

## File Structure

```
src/
├── features/appointment-checkout/
│   ├── model/use-checkout.ts          — Checkout state: amounts, total, payment selection, canSubmit
│   ├── ui/AppointmentCheckoutModal.vue — Modal UI (services list, total, payment buttons)
│   └── index.ts                       — Barrel: exports AppointmentCheckoutModal, useCheckout
│
├── entities/sale/
│   ├── api/sale.api.ts                — completeSale() + getSaleByAppointmentId()
│   ├── model/
│   │   ├── types.ts                   — Sale, SaleItem, CompleteSaleDto, CompleteSaleItemDto
│   │   └── sale.queries.ts            — useCompleteSaleMutation, useSaleByAppointmentQuery
│   └── index.ts
│
└── supabase/migrations/
    └── 20260515120000_create_sale_tables.sql — sale, sale_item tables + complete_appointment RPC
```

---

## Cross-references

- [Appointments](./appointments.md) — Appointment lifecycle; checkout is the terminal step of `confirmed → completed`
- [Payment Types](./payment-types.md) — Payment method entities selected during checkout; default payment type behaviour
- [Calendar Architecture](../architecture/calendar.md) — How the calendar page integrates the checkout modal
