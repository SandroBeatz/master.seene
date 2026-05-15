---
version: 1.0
date: 2026-05-15
category: business
---

# Appointments

> Version 1.0 · 2026-05-15 · [Business](../)

## Overview

An **appointment** is the core scheduling unit in Seene. It represents a booked session between a master (service provider) and a client for one or more services at a specific date and time.

Appointments have a lifecycle governed by a status state machine: they start as `pending`, move to `confirmed`, and ultimately resolve as `completed`, `cancelled`, or `no_show`. Completing an appointment triggers a sale record that captures payment details.

**Time blocks** are a companion concept: they mark periods of unavailability on the master's calendar (personal errands, breaks, closures) and are displayed alongside appointments but carry no client or service data.

---

## Data Model

### appointments

The primary table. One row = one scheduled session.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NO | Primary key, auto-generated |
| `user_id` | `uuid` | NO | FK → `auth.users` (ON DELETE CASCADE) |
| `client_id` | `uuid` | NO | FK → `client` (ON DELETE RESTRICT) |
| `service_ids` | `uuid[]` | NO | Denormalized service IDs — no FK enforcement |
| `start_at` | `timestamptz` | NO | UTC start time |
| `duration` | `integer` | YES | Duration in minutes |
| `price` | `numeric(10,2)` | YES | Expected total price |
| `status` | `text` | NO | Enum: `pending`, `confirmed`, `completed`, `cancelled`, `no_show` |
| `notes` | `text` | YES | Free-text notes |
| `created_at` | `timestamptz` | NO | Auto-set on insert |
| `updated_at` | `timestamptz` | NO | Auto-maintained by trigger |

**Constraints:**
- `status` is enforced by a `CHECK` constraint on the five allowed values
- `client_id` uses `ON DELETE RESTRICT` — a client cannot be deleted while they have appointments

**Indexes:** `user_id`, `client_id`, `start_at` (calendar queries), `status`

**RLS:** Each row is accessible only to its owner — `auth.uid() = user_id`. All CRUD operations respect this policy.

---

### time_block

Represents a period the master is unavailable. Displayed on the calendar as blocked time.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NO | Primary key |
| `user_id` | `uuid` | NO | FK → `auth.users` |
| `start_at` | `timestamptz` | NO | UTC start |
| `end_at` | `timestamptz` | NO | UTC end; must be > `start_at` |
| `all_day` | `boolean` | NO | Default `false`; renders as all-day calendar block |
| `notes` | `text` | YES | Optional description |
| `created_at` | `timestamptz` | NO | Auto-set |
| `updated_at` | `timestamptz` | NO | Auto-maintained |

**Constraint:** `CHECK (end_at > start_at)`

**Indexes:** `user_id`, `start_at`, `end_at`

**RLS:** Same owner-scoped policy as appointments.

---

### Relationship to other entities

```
auth.users
    │
    ├── appointments ──── client       (RESTRICT delete)
    │         │
    │         └── sale ──── sale_item  (CASCADE delete)
    │         │     └── payment_type   (SET NULL on delete)
    │         │
    │         └── service_ids[]        (denormalized, no FK)
    │
    └── time_block
```

- A **client** cannot be deleted while they have any appointment.
- A **sale** has a UNIQUE constraint on `appointment_id` — one appointment can have at most one sale.
- An appointment cannot be deleted if a sale exists for it (`ON DELETE RESTRICT` on `sale.appointment_id`).
- Services are stored as a `uuid[]` array without a junction table or FK constraints — services can be deleted without breaking historical appointments.

---

## Status Lifecycle

```
             [create]
                │
             pending
            /       \
       confirm     cancel
          │            │
       confirmed   cancelled
       /     \
   complete  no_show
      │
   completed
```

| Status | Meaning | Allowed transitions |
|---|---|---|
| `pending` | Newly created, awaiting confirmation | → `confirmed`, `cancelled` |
| `confirmed` | Master confirmed the appointment | → `completed`, `cancelled`, `no_show` |
| `completed` | Appointment done; sale recorded | Terminal |
| `cancelled` | Cancelled by master or client | Terminal |
| `no_show` | Client did not show up | Terminal |

**Actionable appointments** — a concept used in the dashboard — are those requiring the master's immediate attention:
- Status is `pending`, OR
- Status is `confirmed` AND `start_at < now()`

---

## Business Rules

### Creating an appointment

Required fields: `client_id`, at least one `service_id`, `start_at`, `duration ≥ 1 minute`.

`price` and `notes` are optional. The form auto-calculates `duration` and `price` from the selected services but allows manual override.

`status` defaults to `pending` when not provided.

### Service denormalization

Services are stored as a plain `uuid[]` in `service_ids`. This is a deliberate trade-off:

- **Pro:** Deleting a service does not break historical appointments. The appointment retains the IDs even if the service no longer exists.
- **Con:** Stale IDs must be handled gracefully in the UI — if a service ID no longer resolves, the UI shows a fallback.

The application resolves service details at query time by joining the `service` table; stale IDs result in null/missing entries.

### Timezone handling

All timestamps are stored in UTC (`timestamptz`). The calendar and forms display times in the master's configured timezone (from `master_settings` or `master_profile.schedule.timezone`).

Conversion helpers live in `@shared/lib/time-zone`:
- `getDateTimeInputValue(isoString, timeZone)` — converts a UTC ISO string to local date and time strings for form inputs
- `toUtcIsoFromZonedDateTime(date, time, timeZone)` — converts local date + time strings back to a UTC ISO string for storage

### Completing an appointment (checkout)

Completing an appointment is an atomic operation performed via the `complete_appointment` Postgres RPC function. In a single transaction it:

1. Verifies that `auth.uid()` owns the appointment
2. Verifies the appointment is not already completed (raises `already_completed` otherwise)
3. Sets `appointments.status = 'completed'`
4. Inserts a `sale` row with the total amount and payment type
5. Inserts `sale_item` rows — one per service, snapshotting name and price at the time of checkout

The snapshot approach means that changing a service's name or price later does not alter historical sale records.

If the appointment does not exist, the RPC raises `appointment_not_found`.

### Cancellation

Cancellation is a status update (`status = 'cancelled'`). No sale is created. A cancelled appointment cannot be uncancelled; the master must create a new appointment if rescheduling is needed.

---

## Query Patterns

### Date-range filtering

The calendar fetches appointments within a window — default: one month before today to one month after today.

```sql
-- appointments: match by start_at
WHERE user_id = auth.uid()
  AND start_at >= :from
  AND start_at <= :to

-- time_blocks: match if block overlaps window
WHERE user_id = auth.uid()
  AND end_at >= :from
  AND start_at <= :to
```

### Actionable appointments (dashboard widget)

```sql
WHERE user_id = auth.uid()
  AND (
    status = 'pending'
    OR (status = 'confirmed' AND start_at < now())
  )
```

---

## API Surface

All functions are in `src/entities/appointment/api/appointments.api.ts` and `src/entities/time-block/api/time-blocks.api.ts`.

### Appointments

| Function | Description |
|---|---|
| `listAppointments(userId, { from?, to? })` | List appointments, optionally filtered by date range |
| `getAppointmentById(id)` | Single appointment by ID |
| `createAppointment(userId, dto)` | Create new appointment |
| `updateAppointment(dto)` | Update fields; `id` required |
| `removeAppointment(id)` | Delete appointment (blocked if sale exists) |
| `listActionableAppointments(userId)` | Appointments needing attention (dashboard) |

### Time Blocks

| Function | Description |
|---|---|
| `listTimeBlocks(userId, { from?, to? })` | List time blocks overlapping a date range |
| `createTimeBlock(userId, dto)` | Create new time block |
| `updateTimeBlock(dto)` | Update time block; `id` required |
| `removeTimeBlock(id)` | Delete time block |

### Sales / Checkout

| Function | Description |
|---|---|
| `completeSale(dto: CompleteSaleDto)` | Atomically complete appointment + record sale (via RPC) |
| `getSaleByAppointmentId(appointmentId)` | Fetch sale with payment type and items |

---

## Reactive Queries (Pinia Colada)

Query hooks live in `src/entities/appointment/model/appointment.queries.ts`.

```typescript
// Fetch appointments for a date range (reactive)
useAppointmentsQuery(userId, dateRange?)
// Cache key: ['appointments', userId, from, to]

// Fetch appointments needing action (dashboard)
useActionableAppointmentsQuery(userId)
// Cache key: ['appointments-actionable', userId]

// Mutations — all invalidate ['appointments', userId] on success
useCreateAppointmentMutation(userId)
useUpdateAppointmentMutation(userId)
useRemoveAppointmentMutation(userId)
```

Completing a sale (`useCompleteSaleMutation`) invalidates both `['appointments', userId]` and `['sale-by-appointment', appointmentId]` to keep the UI consistent.

---

## UI Components

| Component | Path | Role |
|---|---|---|
| `AppointmentFormDialog` | `src/features/appointment-form/ui/` | Create / edit / delete appointment |
| `AppointmentCheckoutModal` | `src/features/appointment-checkout/ui/` | Collect payment and complete appointment |
| `TimeBlockFormDialog` | `src/features/time-block-form/ui/` | Create / edit / delete time block |
| `CalendarWidget` | `src/widgets/calendar/ui/` | FullCalendar view with appointments + time blocks |
| `AppointmentPreviewPanel` | `src/widgets/appointment-preview-panel/ui/` | Read-only appointment details with action buttons |

### AppointmentFormDialog

- Supports create, edit, and delete in one component
- Auto-calculates `duration` and `price` from selected services (both overridable)
- Validates with Joi: client required, ≥ 1 service, date + time required, duration ≥ 1 min
- Timezone-aware: uses `initialStartAt` (UTC) and converts for display

### AppointmentCheckoutModal

- Displays services with editable per-service amounts
- Computes total; disables confirm if total ≤ 0 or no payment type selected
- Emits a `CompleteSaleDto` payload; parent calls `completeSale()`
- Defaults to the master's marked-default payment type

### AppointmentPreviewPanel

- Read-only panel showing client, services, status, duration, price, notes
- Action buttons based on current status:
  - `pending` → Confirm button
  - `confirmed` → Complete (opens checkout modal), Cancel
  - Terminal statuses → no actions

---

## File Structure

```
src/entities/appointment/
├── api/appointments.api.ts       — Supabase CRUD + actionable query
├── config/status.ts              — Status display config (icon, color, calendar style)
├── model/
│   ├── types.ts                  — Appointment, CreateAppointmentDto, UpdateAppointmentDto
│   └── appointment.queries.ts    — Pinia Colada query/mutation hooks
└── index.ts                      — Public API barrel

src/entities/time-block/
├── api/time-blocks.api.ts
├── model/
│   ├── types.ts                  — TimeBlock, CreateTimeBlockDto, UpdateTimeBlockDto
│   └── time-block.queries.ts
└── index.ts

src/entities/sale/
├── api/sale.api.ts               — completeSale (RPC), getSaleByAppointmentId
├── model/
│   ├── types.ts                  — Sale, SaleItem, CompleteSaleDto
│   └── sale.queries.ts
└── index.ts

src/features/appointment-form/
├── ui/AppointmentFormDialog.vue
└── index.ts

src/features/appointment-checkout/
├── model/use-checkout.ts         — Checkout state composable
├── ui/AppointmentCheckoutModal.vue
└── index.ts

src/features/time-block-form/
├── ui/TimeBlockFormDialog.vue
└── index.ts

src/widgets/calendar/             — Full calendar integration (see calendar.md)
src/widgets/appointment-preview-panel/

supabase/migrations/
├── 20260430000000_create_appointments.sql
├── 20260502010000_create_time_blocks.sql
└── 20260515120000_create_sale_tables.sql
```

---

## Cross-references

- [Data Model](./data-model.md) — Full schema reference including `client`, `service`, and `master_profile` tables
- [Services](./services.md) — Service and category management; pricing and duration that feed into appointment defaults
- [Payment Types](./payment-types.md) — Available payment methods selected during checkout
- [Calendar Architecture](../architecture/calendar.md) — How appointments and time blocks are rendered in FullCalendar
