---
version: 1.0
date: 2026-06-20
category: business
---

# Online Booking Settings & Their Application

> Version 1.0 · 2026-06-20 · [Business](../business/)

## Overview

The **Booking** settings page (Settings → Booking) lets a master control how clients
self-book online: whether online booking is accepted at all, what status incoming
requests get, how much cleanup time to reserve after each booking, and how far in
advance clients must book.

As of this version those four settings are **persisted and editable only** — they are
not yet consumed by any booking flow. There is no public client-facing booking page
yet, and the in-app appointment creation form does not read them. This document is the
blueprint for wiring them in: it specifies exactly how slot search and appointment
creation should honour each setting once an online booking flow is built, so the work
can be done without rediscovering the data model.

The settings live in the `master_settings` table and are surfaced through the master
entity. See [Master Entity](../code/master-entity.md) for the entity's full API and
[Appointments](./appointments.md) for the appointment domain model.

## Rules

### Settings source

The four fields are columns on `public.master_settings` (one row per master, keyed by
`user_id`), added in migration
`supabase/migrations/20260620120000_add_booking_settings_to_master_settings.sql`:

| Column | Type | Default | Meaning |
|---|---|---|---|
| `online_booking_enabled` | `boolean` | `false` | Master switch — online booking is accepted only when `true`. |
| `booking_default_status` | `text` (`'pending'` \| `'confirmed'`) | `'pending'` | Status applied to a new online booking. `'confirmed'` = auto-confirmed, `'pending'` = needs the master's confirmation. CHECK-constrained. |
| `booking_buffer_minutes` | `smallint` (0–240) | `0` | Free time reserved **after** each booking for cleanup. CHECK-constrained to `0..240`. |
| `booking_min_notice_minutes` | `integer` (≥ 0) | `0` | Minimum lead time — clients cannot book a slot starting sooner than `now + this`. CHECK-constrained to `≥ 0`. |

Defaults are deliberately conservative: a master who never opens the page has online
booking **off**, so existing behaviour is unchanged.

#### Reading the settings

The master entity exposes them in two forms — use whichever fits the call site:

- **Reactive (UI / colada):** `useMasterPreferencesQuery(userId)` returns a
  `MasterPreferences` object with camelCase convenience fields:
  `onlineBookingEnabled`, `bookingDefaultStatus`, `bookingBufferMinutes`,
  `bookingMinNoticeMinutes`.
- **Imperative (server / one-off):** `getMasterSettings(userId)` returns the raw
  `MasterSettings` (snake_case columns). `getMasterPreferences(userId)` combines
  profile + settings and runs everything through `createMasterPreferences`, which
  normalizes any out-of-range or malformed values back to the safe defaults
  (`normalizeOnlineBookingEnabled`, `normalizeBookingDefaultStatus`,
  `normalizeBookingBufferMinutes`, `normalizeBookingMinNoticeMinutes`).

All of these are exported from `@entities/master`
(`src/entities/master/index.ts`). Constants `DEFAULT_BOOKING_STATUS`,
`DEFAULT_BOOKING_BUFFER_MINUTES`, `DEFAULT_BOOKING_MIN_NOTICE_MINUTES`,
`DEFAULT_ONLINE_BOOKING_ENABLED`, and `MAX_BOOKING_BUFFER_MINUTES` are exported too.

> ⚠️ **Never trust the client.** For any public booking flow these checks must be
> re-run server-side (see [Server-side validation](#server-side-validation)) — a
> hostile client can submit any payload regardless of what the UI allowed.

### Slot search

Slot search produces the list of bookable start times offered to a client for a given
master, service (hence duration), and day. It does not exist yet. When built, the
recommended home is a pure function in the appointment entity
(`src/entities/appointment/lib/`, e.g. `find-available-slots.ts`) so it is unit-testable
and reusable by both a future public page and any server validation. It needs four
inputs: the master's `schedule` (working hours), existing `appointments` for the day,
the requested service `duration`, and the four booking settings.

Algorithm (conceptual):

```
findAvailableSlots(date, durationMin, schedule, appointments, settings, now):
  # 0. Gate
  if not settings.onlineBookingEnabled: return []

  # 1. Working window for this weekday (Mon-first; see DAY_ORDER)
  day = normalizeSchedule(schedule).days[weekdayKey(date)]
  if not day.enabled: return []
  workStart = toMinutes(day.start); workEnd = toMinutes(day.end)
  breaks   = day.breaks.map(b => [toMinutes(b.start), toMinutes(b.end)])

  # 2. Busy intervals = existing appointments EXTENDED by the buffer AFTER each one
  #    so a new booking never butts up against the previous one's cleanup time.
  busy = []
  for a in appointments where a.status not in (cancelled, no_show, expired):
      s = minutesSinceMidnight(a.start_at)
      e = s + a.duration + settings.bookingBufferMinutes   # buffer trails the booking
      busy.push([s, e])
  busy += breaks

  # 3. Earliest allowed start, honouring minimum notice
  earliest = max(workStart, minutesSinceMidnight(now + settings.bookingMinNoticeMinutes)
                            if date == today else workStart)

  # 4. Walk the grid by calendar_slot_step_minutes; keep slots that fit and are free
  slots = []
  for t = ceilToStep(earliest, settings.calendarSlotStepMinutes); t + durationMin <= workEnd;
          t += settings.calendarSlotStepMinutes:
      candidate = [t, t + durationMin]
      if candidate overlaps nothing in busy: slots.push(t)
  return slots
```

Key points and the settings each one implements:

- **`online_booking_enabled`** — step 0. When `false`, the master is not bookable
  online at all; return no slots (and, in a real page, show an "online booking
  unavailable" state rather than an empty calendar).
- **`booking_min_notice_minutes`** — step 3. Slots starting before `now + min_notice`
  are excluded. Only relevant when `date` is today (future days always clear it).
- **`booking_buffer_minutes`** — step 2. The buffer is added **after** the booking's
  end (`start_at + duration + buffer`), matching the UI copy "Free time added after each
  booking for cleanup." It shrinks the free gap that follows every appointment, not the
  one before it.
- **Working hours** come from `master_profile.schedule` (JSONB). Use the helpers in
  `src/entities/master/model/master-schedule.ts`: `normalizeSchedule` to get a
  fully-resolved `NormalizedSchedule`, `DAY_ORDER` for weekday mapping, `toMinutes`
  for `'HH:mm'` → minutes. Day breaks are treated as busy intervals.
- **`calendar_slot_step_minutes`** (from the same `master_settings` row, surfaced as
  `MasterPreferences.calendarSlotStepMinutes`, default 15) is the grid granularity for
  candidate start times.

Timezone: working hours and `now` must be compared in the master's timezone, read from
`schedule.timezone` via `getTimeZoneFromSchedule` (falls back to the browser/local zone).
See [Open questions](#open-questions--future-work).

### Appointment creation

A booking created through an online flow becomes a row in `appointments` via the
existing `createAppointment(userId, dto)`
(`src/entities/appointment/api/appointments.api.ts`) /
`useCreateAppointmentMutation`. The `CreateAppointmentDto`
(`src/entities/appointment/model/types.ts`) already carries both fields needed:

- **`source: 'online_booking'`** — distinguishes self-booked appointments from
  `'manual'` ones created by the master in the app. The column and its CHECK constraint
  already exist (`supabase/migrations/20260613120000_add_appointment_source.sql`).
- **`status`** = the master's `booking_default_status`. Map directly: `'confirmed'`
  (auto-confirmed) or `'pending'` (needs confirmation). Both are valid members of
  `AppointmentStatus` and need no new enum value.

```ts
import { useMasterPreferencesQuery } from '@entities/master'
import { useCreateAppointmentMutation } from '@entities/appointment'

// inside the online booking flow, with a validated slot:
await createMutation.mutateAsync({
  client_id,
  service_ids,
  start_at,                         // the chosen, server-validated slot
  duration,
  source: 'online_booking',
  status: preferences.value.bookingDefaultStatus, // 'confirmed' | 'pending'
})
```

`'pending'` appointments already render distinctly on the calendar (orange/clock styling
in `APPOINTMENT_STATUS_VIEW`, `src/entities/appointment/config/status.ts`) and are
auto-aged by the scheduled job in
`supabase/migrations/20260613130000_expire_stale_pending_appointments.sql` — so the
"needs confirmation" path is already visually and operationally supported.

### Server-side validation

The current in-app form runs entirely client-side, which is fine because the actor is
the trusted master. A **public** booking flow has an untrusted actor, so the same
constraints must be enforced where the write happens (an Edge Function or RPC, not the
browser):

1. Re-read the master's `master_settings` and `master_profile.schedule` server-side.
2. Reject if `online_booking_enabled` is `false`.
3. Reject if `start_at < now + booking_min_notice_minutes`.
4. Re-run the overlap/buffer/working-hours check for the submitted `start_at` +
   `duration` (reuse the same pure slot function).
5. Force `source = 'online_booking'` and `status = booking_default_status` server-side;
   ignore any client-supplied values for these.

This keeps the pure slot-search function as the single source of truth, shared between
the UI (to show options) and the server (to verify the chosen one).

## Usage

Settings-only as of v1.0. The editing surface:

- **Form:** `src/features/booking-settings-form/` (`BookingSettingsForm.vue` +
  `use-booking-settings.ts`), mounted by
  `src/pages/settings/ui/SettingsBookingPage.vue`.
- **Persistence:** `updateMasterBookingSettings(userId, payload)` /
  `useUpdateMasterBookingSettingsMutation` (upsert on the unique `user_id`, so the first
  save creates the row).

The slot-search and appointment-creation integrations described above are **not yet
implemented** — this document is their specification.

## Open questions / future work

- **Public booking page.** No client-facing route exists yet. The natural identifier is
  `master_profile.username` (unique), e.g. `/book/:username`. Out of scope here.
- **Timezone correctness.** `schedule.timezone` may be unset for older masters
  (`getTimeZoneFromSchedule` falls back to local). A public page serving clients in other
  zones must convert display/comparison times explicitly; decide whether slots are shown
  in the master's zone or the visitor's.
- **Booking horizon (max advance).** Deliberately not added in this iteration. If added
  later it pairs naturally with `booking_min_notice_minutes` as an upper bound in slot
  search step 4.
- **Buffer & manual bookings.** Decide whether the buffer should also block the master's
  own manual bookings in `appointment-form`, or only online slot search. Current spec
  applies it to online slot search only.
- **Pending surface.** Online `pending` requests likely need a dedicated
  "requests to confirm" inbox beyond the calendar styling that exists today.

## Cross-references

- [Master Entity](../code/master-entity.md) — types, queries, and API for `master_settings`/`master_profile`, including the booking settings fields and mutation.
- [Appointments](./appointments.md) — appointment domain model, statuses, and creation flow that online booking feeds into.
- [Data Model](./data-model.md) — overall table relationships.
- [Calendar](../architecture/calendar.md) — how appointments (including `pending`) render on the calendar grid.
- [Supabase Integration](../integrations/supabase.md) — RLS, migrations, and the Edge Function / RPC options for server-side validation.

## File Structure

| Path | Role |
|---|---|
| `supabase/migrations/20260620120000_add_booking_settings_to_master_settings.sql` | Adds the four booking columns + CHECK constraints. |
| `src/entities/master/model/types.ts` | `MasterSettings`, `MasterPreferences`, `BookingDefaultStatus`, `MasterBookingSettingsUpdate`. |
| `src/entities/master/model/master-preferences.ts` | Defaults + normalizers for the booking fields. |
| `src/entities/master/api/master.api.ts` | `getMasterSettings`, `updateMasterBookingSettings` (upsert). |
| `src/entities/master/model/master-schedule.ts` | Working-hours helpers (`normalizeSchedule`, `DAY_ORDER`, `toMinutes`) the slot search depends on. |
| `src/features/booking-settings-form/` | The Booking settings editing UI. |
| `src/entities/appointment/api/appointments.api.ts` | `createAppointment` — the write target for online bookings. |
| `src/entities/appointment/model/types.ts` | `CreateAppointmentDto` (`status`, `source`), `AppointmentStatus`, `AppointmentSource`. |
| `src/entities/appointment/lib/` | Suggested home for the future `find-available-slots` pure function. |
