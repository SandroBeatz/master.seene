# Checkout Flow Design

**Date:** 2026-05-15  
**Status:** Approved  
**Topic:** Master checkout when completing an appointment

---

## Overview

When a master completes an appointment they see a checkout modal where they confirm the final amount and select a payment method. The result is atomically written to new `sale` and `sale_item` tables via a Postgres RPC, and the appointment status is set to `completed` in the same transaction.

---

## Data Model

### `sale`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK auth.users` | RLS anchor |
| `appointment_id` | `uuid FK appointments UNIQUE` | 1:1 with appointment |
| `client_id` | `uuid FK client` | denormalized for analytics |
| `payment_type_id` | `uuid nullable FK payment_type` | nullable — type may be deleted |
| `amount` | `numeric(10,2) NOT NULL` | actual amount paid (may differ from sum of items if master gave a discount) |
| `paid_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

RLS: `auth.uid() = user_id` (ALL operations).

### `sale_item`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `sale_id` | `uuid FK sale ON DELETE CASCADE` | |
| `service_id` | `uuid nullable` | not a FK — service may have been deleted |
| `name_snapshot` | `text NOT NULL` | service name at time of sale |
| `price_snapshot` | `numeric(10,2) NOT NULL` | service price at time of sale |

No RLS needed — access is governed through `sale` via `sale_id`.

### RPC: `complete_appointment`

```sql
complete_appointment(
  p_appointment_id  uuid,
  p_amount          numeric,
  p_payment_type_id uuid,
  p_items           jsonb  -- [{service_id, name, price}, ...]
) RETURNS uuid            -- sale.id
```

Executed in a single transaction:
1. `UPDATE appointments SET status = 'completed' WHERE id = p_appointment_id AND user_id = auth.uid()`
2. `INSERT INTO sale (...) RETURNING id`
3. `INSERT INTO sale_item (...)` for each item in `p_items`
4. Returns `sale.id`

If the appointment is already `completed`, the function raises an exception (caught on the client as a toast).

---

## Frontend Architecture

### New FSD slices

**`src/entities/sale/`**
- `model/types.ts` — `Sale`, `SaleItem`, `CompletedSaleInfo`
- `api/sale.api.ts` — `completeSale()` calls RPC, `getSaleByAppointment()` fetches sale+items for a given appointment
- `model/sale.queries.ts` — Colada query `useSaleByAppointmentQuery(appointmentId)`
- `index.ts`

**`src/features/appointment-checkout/`**
- `ui/AppointmentCheckoutModal.vue` — the modal
- `model/use-checkout.ts` — composable managing form state, default amount, payment type selection, submit
- `index.ts`

### Integration point

`AppointmentPreviewPanel` already emits `complete`. The calendar page (parent) intercepts this emit and opens `AppointmentCheckoutModal`, passing the current `appointment` and resolved `services[]`.

On successful checkout:
- Invalidate `useAppointmentsQuery` (Colada) so the appointment re-fetches with `status: 'completed'`
- Close the modal
- Preview panel re-renders showing the payment info section

---

## Modal UI

```
┌─ Завершить запись / Complete appointment ───┐
│                                              │
│  Services:                                   │
│  ┌────────────────────────────────────────┐ │
│  │ Маникюр                       1 200 ₽  │ │
│  │ Покрытие                        800 ₽  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Total:  [ 2 000 ← editable number input ]  │
│                                              │
│  Payment method:                             │
│  [ Cash ] [ Card ] [ QR ] [ ... ]           │
│  (tile buttons from master's payment_types,  │
│   colored per payment_type.color,            │
│   default pre-selected)                      │
│                                              │
│  [ Cancel ]           [ Confirm ✓ ]         │
└──────────────────────────────────────────────┘
```

**Amount field:** pre-filled with sum of service prices (or `appointment.price` if overridden). Editable — master can apply a discount. `sale.amount` stores what was entered; `sale_item.price_snapshot` stores original service prices unchanged.

**Payment method:** required. Tile buttons from `payment_type` table (already loaded in cache). Pre-selects `is_default` type.

**Confirm button:** enabled when `amount > 0` and a payment method is selected.

---

## Completed Appointment — Preview Panel

A new "Payment" section appears in `AppointmentPreviewPanel` when `appointment.status === 'completed'`. Data loaded via `useSaleByAppointmentQuery(appointmentId)` (separate query, lazy).

```
ОПЛАТА / PAYMENT
─────────────────────────────
Amount paid:   2 000 ₽
Payment via:   💳 Card
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| RPC error (generic) | Toast with error message; modal stays open |
| Appointment already completed | Toast "Already completed"; modal closes |
| No payment types configured | Show inline warning in modal with link to Settings |

---

## i18n Keys

New keys added to `en.ts`, `fr.ts`, `ru.ts`:

```
checkout.title
checkout.services
checkout.total
checkout.paymentMethod
checkout.noPaymentTypes
checkout.confirm
checkout.cancel
checkout.paymentInfo
checkout.paidAmount
checkout.paidVia
```

---

## Analytics

`sale` and `sale_item` are the sole source of truth for financial analytics. The `appointments` table is not queried for revenue figures. Example analytics queries:

- Revenue by day/week/month → `GROUP BY date_trunc('day', paid_at)`
- Revenue by payment method → `GROUP BY payment_type_id`
- Top services by revenue → `JOIN sale_item GROUP BY name_snapshot`

The `analytics` page (already scaffolded at `src/pages/analytics/`) will consume these tables in a future iteration.

---

## Migration File

`supabase/migrations/20260515120000_create_sale_tables.sql`

Contains: `CREATE TABLE sale`, `CREATE TABLE sale_item`, RLS policies, indexes, `CREATE FUNCTION complete_appointment(...)`.
