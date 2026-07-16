---
version: 1.2
date: 2026-07-14
category: business
---

# Quick Appointment & Time Off Creation

> Version 1.2 · 2026-07-14 · [Business](../business/)

> **Implementation status.** This document began as the implementation plan. The
> appointment flow shipped under `src/features/appointment-wizard/` (not the
> planned `features/quick-create/` name), opened via `useAppointmentWizard()`. The
> **Date & time step (Step 3)** was reworked past the original plan — see
> [Step 3 date and time UX](#step-3-date-and-time-ux).
> The pure availability math lives in `src/shared/lib/scheduling/` as planned
> ([Scheduling Library](../code/scheduling.md)).

## Overview

Today a master can only create an appointment through the calendar's create menu
(`CalendarPage.vue` → `AppointmentFormDialog`), a single flat form. For a working master,
creating an appointment is one of the most frequent daily operations, so it must be
possible **directly from the home page in 20–30 seconds**.

This document is the implementation plan for a new **guided, availability-aware creation
flow** with two branches:

1. **New appointment** — a 4-step wizard (Client → Services → Date & time → Confirm) that
   only offers **free** slots, computed from the master's working hours, existing
   appointments, and time offs.
2. **Time off** (internally `time_block`) — a short flow (Date → available time / all day →
   Confirm) that warns when the chosen day already has appointments and only lets the master
   block genuinely free time.

The flow is reached from **three entry points**, all opening the **same** components:

| # | Entry point | Location | Prefill behaviour |
|---|---|---|---|
| 1 | Home "+" button | `ScheduleTimeline.vue` header (replaces the `i-lucide-ellipsis` button, lines 212–218) | none — full flow |
| 2 | Calendar "+" button | `CalendarPage.vue` header (lines 131–139, `openCreateMenu`) | none — full flow |
| 3 | Calendar **slot click** | `CalendarWidget` `@slot-click` (`CalendarPage.vue:82 onSlotClick`) | Appointment: Step 3 date+time pre-filled → after Services, **skip Step 3**, go straight to Confirm. Time off: date + start time pre-filled, end time empty. |

The new flow **supersedes** the current `AppointmentFormDialog` / `TimeBlockFormDialog`
create paths from these entry points. It is deliberately a *fast create* flow, not a
replacement for the full edit form (edit still happens via the appointment preview panel).

This is a large, high-priority feature. It must ship with a solid unit-test suite for the
availability math and component tests for the wizard branching.

## Rules

The heart of this feature is **availability computation**. All of it is pure, timezone-safe
minute math so it can be unit-tested exhaustively and reused by the future public
[online booking](./online-booking.md) page and its server validation.

### Inputs (resolved once per open day/month)

- **Working window** for the weekday — from `master_profile.schedule` via
  `normalizeSchedule` + `toMinutes` + `DAY_ORDER`
  (`src/entities/master/model/master-schedule.ts`). A disabled day → no availability.
  Breaks are treated as busy intervals.
- **Busy intervals** — the union of, all mapped to *minutes-since-midnight in the master's
  timezone*:
  - existing **appointments** for the day whose status is not `cancelled` / `no_show` /
    `expired` → `[start, start + duration]`;
  - existing **time offs** (`time_block`) overlapping the day → `[start, end]` (all-day →
    whole window);
  - schedule **breaks**.
- **Duration** — sum of selected services' `duration` (Step 2). A candidate slot must fit
  `[t, t + duration]` fully inside the working window and overlap no busy interval.
- **Step granularity** — `MasterPreferences.calendarSlotStepMinutes` (default 15).

> **Master flow vs. online booking.** The master is a trusted actor creating appointments
> in-app, so — unlike the public flow — the master flow does **not** apply the
> `online_booking_enabled` gate, `booking_min_notice_minutes`, or `booking_buffer_minutes`.
> The pure core takes these as options so both callers share one implementation. See
> [online-booking.md → Slot search](./online-booking.md#slot-search).

### Timezone

All comparisons happen in the master's timezone. Appointment `start_at` / time-off
`start_at`/`end_at` are UTC ISO in the DB; convert to wall-clock minutes with
`getCalendarDateTimeString(iso, timeZone)` and parse `HH:mm` → minutes. "Today / now" for
disabling past slots uses the same conversion. Never compare raw `Date` objects across
zones. `timeZone` comes from `masterPreferencesStore.timeZone`.

### Three derived queries

```
# 1. Slots for a day (Appointment Step 3, after a date is picked)
findAvailableSlots({ workStart, workEnd, breaks, busy, stepMinutes, durationMinutes, earliest })
  -> number[]           # candidate start minutes that fit and are free

# 2. Day availability for the month calendar (which days to disable)
hasAnyFreeSlot(day)     # true when >= 1 slot of `durationMinutes` fits that day
  # computed per visible day from the same inputs; a day with no working hours,
  # or fully booked, is disabled in the UCalendar.

# 3. Free intervals for Time off (gaps, not step-grid slots)
findFreeIntervals({ workStart, workEnd, breaks, busy })
  -> Array<[start, end]>  # merged free gaps within the working window
```

`findAvailableSlots` mirrors the algorithm already blueprinted in
[online-booking.md](./online-booking.md#slot-search) (overlap test on a step grid). `earliest`
defaults to `workStart`, and to `max(workStart, nowMinutes)` when the day is today so past
times are not offered. `findFreeIntervals` is the complement of `busy` inside
`[workStart, workEnd]`, used to render "Free time: 09:00–11:00 …" and to bound the manual
From/To pickers.

### Step 3 date and time UX

The implemented `StepDateTime.vue` goes beyond "disabled days + a flat slot list".
It treats the calendar as informative and always leaves an escape hatch, so a
master can book **any day at any time** (force majeure). Backed by three helpers —
`classifyDayState` (`@entities/master`), `groupSlotsByPartOfDay` and
`buildDayTimeOptions` (`@shared/lib/scheduling`), see
[Scheduling Library](../code/scheduling.md).

- **No disabled future days.** `UCalendar` uses `:year-controls="false"` (month
  navigation only) and no longer disables days. Every day is selectable; each is
  **marked** by `classifyDayState` → a dot: free (`available`), fully booked
  (`full`), or day off (hollow marker). Past days are dimmed and un-marked.
- **Grouped slots.** Free slots render in labeled sections —
  morning (`< 12:00`) / day (`12:00–16:59`) / evening (`>= 17:00`) — via
  `groupSlotsByPartOfDay`. Empty groups are hidden.
- **Empty state.** A day off or a fully-booked day shows an icon + reason
  (`dayOff` / `noSlots`) in place of the slot list, not just a bare message.
- **Always-available manual time.** A "set time manually" control is present on
  every day (not only when slots are missing). It opens a `USelect` of the whole
  day at `calendarSlotStepMinutes` (`buildDayTimeOptions`). A manual pick that
  overlaps an existing booking shows a **non-blocking** conflict warning.
- **Time off on the day.** Time offs (`time_block`) touching the selected day are
  listed with their period (or "All day") + notes, so the master sees why time is
  missing and can still book around/over them.
- **Past days.** Past days are selectable. Selecting one replaces the slot list
  with a "Past day" alert; the master sets the time manually. Such a booking is
  written as **`confirmed`** (it happened) — the master then completes it via
  [checkout](./checkout.md), which records the sale. It is deliberately **not**
  auto-`completed`: a `completed` appointment without a sale is inconsistent with
  the checkout model and skews analytics.

### Time off branching

| Day state | UI |
|---|---|
| No appointments/time offs that day | Manual **From** / **To** + **All day** switch (reuse existing `TimeBlockFormDialog` semantics: all-day spans `00:00`→next `00:00`). |
| Has appointments, ≥1 free gap | Warning banner + list of free intervals (`findFreeIntervals`). Master picks an interval or sets From/To **within** a gap. |
| Has appointments, no free gap | Message: "No free time for a time off on this date." Create disabled. |

### Appointment confirm & write

Confirm shows client, services, date, time, **total duration**, **price** (sum of service
prices, editable/optional per current form), and an optional **comment**. Create writes via
the existing `useCreateAppointmentMutation` with:

```ts
{ client_id, service_ids, start_at, duration, price, notes, source: 'manual', status }
```

`source: 'manual'`. `status` is `'pending'` for a today/future booking (matching the
current form) and **`'confirmed'`** when the selected day is in the past (see
[Step 3 date and time UX](#step-3-date-and-time-ux)). The mutation
already invalidates `appointments`, `appointments-actionable`, and `appointment-day-counts`
query keys, so the new appointment appears on **home** (`HomeScheduleWidget`) and the
**calendar** automatically. Time off writes via `useCreateTimeBlockMutation` (invalidates
`time-blocks`), so it shows on the calendar and blocks the time for future slot computation.

## Data Model

**No schema changes.** Every table and column already exists:

- `appointments` — `client_id`, `service_ids[]`, `start_at`, `duration`, `price`, `status`,
  `source`, `notes` ([data-model.md](./data-model.md), [appointments.md](./appointments.md)).
- `time_block` — `start_at`, `end_at`, `all_day`, `notes`.
- `clients`, `services`, `master_profile.schedule`, `master_settings` (slot step) — all in place.

The only DB-adjacent concern is **read volume** in Step 3: the wizard must load a month of
appointments and time offs. Reuse `useAppointmentsQuery(userId, range)` and
`useTimeBlocksQuery(userId, range)` with a month `{ from, to }` range; both already accept a
reactive date range and are cached by colada.

## Architecture

### Layering decision — pure math in `shared`

FSD forbids sibling-entity imports, so a function needing **both** appointment and time-off
data cannot live in either entity. The pure availability math therefore lives in
**`src/shared/lib/scheduling/`** and operates only on primitives (minute integers, busy
intervals, a resolved working window). The feature layer resolves the schedule (via
`@entities/master`) and maps appointments + time offs into busy intervals, then calls the
pure core. This refines the "put it in `entities/appointment/lib`" suggestion in
online-booking.md, which would require an entity→entity import.

> Validate this placement with the **`fsd`** skill during implementation before creating files.

### New / changed slices

```
src/
  shared/lib/scheduling/                    # NEW — pure, unit-tested
    index.ts
    find-available-slots.ts                 # slot grid within a day
    find-free-intervals.ts                  # merged free gaps (Time off)
    day-availability.ts                     # hasAnyFreeSlot / month map
    __tests__/                              # exhaustive edge cases

  features/quick-create/                    # NEW — quick-create user action
    index.ts                                # exports useQuickCreate()
    model/
      use-quick-create.ts                   # openMenu / openAppointment(prefill) / openTimeOff(prefill)
      busy-intervals.ts                     # appointment|time_block -> minute intervals (in tz)
      appointment-wizard.ts                 # step, client, serviceIds, date, slot, notes, prefill/skip
    ui/
      QuickCreateOverlay.vue                # mounted once; hosts menu + both wizards; mobile full-screen
      QuickCreateMenu.vue                   # "New appointment" / "Time off"
      AppointmentWizard.vue                 # UStepper shell (numbers only) + back nav
      steps/
        StepClient.vue                      # search + list + "+ Add client"
        StepServices.vue                    # multi-select service list
        StepDateTime.vue                    # UCalendar (disabled days) -> compact week strip + slots
        StepConfirm.vue                     # summary + comment + Create
      TimeOffWizard.vue                     # Date -> availability branch -> Confirm

  features/client-form/ui/ClientFormDialog.vue   # CHANGED — emit created client
```

### Orchestration (`useQuickCreate`)

Mirror `useAppointmentPreview` (`@widgets/appointment-preview-panel`): a composable that
lazily mounts a single `QuickCreateOverlay` and returns imperative openers. All three entry
points call the same composable:

```ts
const quickCreate = useQuickCreate()
quickCreate.openMenu()                                   // entry points 1 & 2 ("+")
quickCreate.openAppointment({ startAt })                 // calendar slot click (skip Step 3)
quickCreate.openTimeOff({ date, startTime })             // calendar slot click, Time off
```

`ScheduleTimeline.vue` replaces its ellipsis button with a `+` that emits `create`;
`HomeScheduleWidget` wires it to `openMenu`. `CalendarPage.vue` replaces the current
`isCreateMenuOpen` `UModal` + `AppointmentFormDialog`/`TimeBlockFormDialog` create path with
`useQuickCreate`, and routes `onSlotClick` to `openAppointment`.

### Wizard state & step gating

`appointment-wizard.ts` (plain `reactive`, scoped to the overlay — no global Pinia
needed) holds `step`, `client`, `serviceIds`, `date`, `slotMinutes`, `notes`, and a
`prefill`/`skipDateTime` flag. Rules:

- Step 1 → 2 requires a selected client.
- Step 2 → 3 requires ≥1 service; **Next** hidden/disabled otherwise.
- Step 3 → 4 requires a selected slot.
- Back navigation to any earlier step is always allowed (UStepper items clickable for
  completed steps; forward locked until the step is valid).
- Slot-click prefill sets `date`+`slotMinutes` and `skipDateTime = true`, so Step 2 **Next**
  jumps to Step 4.

### UI building blocks (Nuxt UI v4.6.1)

- **Container**: `UModal` with `:fullscreen="isMobile"` (`useMediaQuery('(max-width: 640px)')`)
  so mobile fills the screen; desktop is a modal. `USlideover` is an alternative (already used
  in the project) — decide with the **`nuxt-ui`** skill.
- **Steps indicator**: `UStepper` (numbers only).
- **Month calendar**: `UCalendar` (already used in `AnalyticsToolbar.vue:203`) with disabled
  days via its date-matcher; collapse to a horizontal week strip after a date is chosen.
- **Client / service pickers**: lists + search (reuse `USelectMenu`/`UInput` patterns from
  the current `AppointmentFormDialog`).
- **Add client**: existing `ClientFormDialog` (mode `create`), opened over the wizard.

> All visible text must go through vue-i18n (**`i18n`** skill); all markup through the
> **`nuxt-ui`** skill; all file placement through the **`fsd`** skill.

### Client quick-create integration

`ClientFormDialog` currently emits `saved: []`. To auto-select a newly created client
(spec requirement 6), change the create branch to return the row from
`createMutation.mutateAsync(dto)` and emit `saved: [client]`. Existing callers
(`@saved="..."` with no arg) stay compatible. `StepClient` listens and selects the client,
then advances.

## Usage

Wiring an entry point:

```vue
<script setup lang="ts">
import { useQuickCreate } from '@features/quick-create'
const quickCreate = useQuickCreate()
</script>

<template>
  <UButton icon="i-lucide-plus" :aria-label="t('quickCreate.open')" @click="quickCreate.openMenu()" />
</template>
```

Calendar slot click (prefilled Step 3):

```ts
function onSlotClick(dateStr: string) {
  quickCreate.openAppointment({ startAt: dateStr })
}
```

Pure availability call (feature layer, after mapping busy intervals):

```ts
import { findAvailableSlots } from '@shared/lib/scheduling'

const slots = findAvailableSlots({
  workStart, workEnd, breaks,          // minutes, from normalizeSchedule
  busy,                                // minutes, appointments + time offs + breaks
  stepMinutes: masterPreferencesStore.calendarSlotStepMinutes,
  durationMinutes: totalServiceDuration,
  earliest: isToday ? nowMinutes : workStart,
})
```

## Testing strategy

**Unit (Vitest, colocated `__tests__/`) — the critical layer:**

- `find-available-slots`: fits within window; excludes overlaps with appointments, time
  offs, and breaks; respects step grid; `duration` overflow at window end; today vs. future
  (`earliest`/past-slot exclusion); disabled/empty working day → `[]`; back-to-back bookings.
- `find-free-intervals`: complement correctness; merges adjacent gaps; day fully booked → `[]`;
  empty day → whole window; breaks split the window.
- `day-availability`: day disabled when no working hours or fully booked; enabled with one
  fitting gap; sensitive to `durationMinutes`.
- `busy-intervals` mapper: appointment/time-block → correct minutes in a non-local timezone;
  all-day time off; multi-day time off clipped to the day; cancelled/no_show/expired excluded.

**Component (jsdom):**

- Wizard step gating: Step 2 **Next** disabled with 0 services; Step 3 **Next** disabled with
  no slot; back navigation restores prior selections.
- Slot-click prefill skips Step 3 (Services **Next** → Confirm).
- Time off branching: has-appointments → warning + intervals; no-appointments → From/To +
  All day; no-free-time → message + Create disabled.
- `ClientFormDialog` emits the created client and `StepClient` auto-selects it.
- Confirm summary renders client/services/date/time/duration/price and passes the correct
  `CreateAppointmentDto` (incl. `source: 'manual'`).

## Task breakdown (for beads)

Suggested epics and their dependencies (→ = depends on):

- **A. Scheduling core** — `shared/lib/scheduling/*` + unit tests. *(no deps; do first)*
- **B. Data plumbing** — month-range `useAppointmentsQuery`/`useTimeBlocksQuery` wiring +
  `busy-intervals.ts` mapper + tests. → A
- **C. Quick-create shell** — `features/quick-create` overlay, `useQuickCreate`,
  `QuickCreateMenu`, mobile full-screen; wire entry points (home "+", calendar "+", calendar
  slot click). → (can start UI shell in parallel; wiring → D/F)
- **D. Appointment wizard** — `AppointmentWizard` + 4 steps, UStepper, back nav,
  prefill/skip. → A, B, C
- **E. Client quick-create** — change `ClientFormDialog` emit; integrate into `StepClient`. → D
- **F. Time off wizard** — date → availability branch → confirm. → A, B, C
- **G. i18n** — `quickCreate.*` keys in `en`/`fr`/`ru`. → runs alongside D/F
- **H. Component tests** — wizard gating, prefill/skip, time-off branching, client auto-select. → D, E, F
- **I. Integration & verification** — confirm new records appear on home + calendar, remove
  the superseded create paths from `CalendarPage.vue`, run the app. → all

## Acceptance criteria

1. Home page has a **"+"** button (replacing the ellipsis in `ScheduleTimeline`).
2. Clicking **"+"** opens a menu: *New appointment* / *Time off*.
3. *New appointment* opens the larger wizard popup; on mobile it is full-screen.
4. Master can search/select a client and **add a new client** in-flow (auto-selected).
5. Master can select one or more services; **Next** appears only with ≥1 service.
6. Step 3 shows a month calendar with **days lacking free slots disabled**; picking a date
   collapses the calendar and reveals free time slots.
7. Selecting a slot enables **Next** → Confirm, which shows client, services, date, time,
   total duration, price, and an optional comment.
8. Master can go **back to any step** and change data.
9. Creating writes a `manual` appointment that appears on **home** and the **calendar**.
10. *Time off* opens its own flow: pick a date; if the day has appointments, show a warning +
    available intervals; otherwise From/To or **All day**; Confirm creates a `time_block`
    that shows on the calendar and **blocks that time** for new slots.
11. Calendar **"+"** and calendar **slot click** use the same flow (slot click prefills
    Step 3 for appointments; date + start time for time off).
12. Availability math and wizard branching are covered by unit and component tests.

## Cross-references

- [Scheduling Library](../code/scheduling.md) — the pure `shared/lib/scheduling/` helpers (slots, free intervals, day-time options, grouping) and `classifyDayState` this wizard consumes.
- [Online Booking](./online-booking.md) — the `findAvailableSlots` blueprint this feature
  implements and will share with the public page and server validation.
- [Appointments](./appointments.md) — appointment lifecycle, status, `source`, and the
  existing `AppointmentFormDialog` this flow supersedes for creation.
- [Checkout](./checkout.md) — downstream flow for completing/paying created appointments.
- [Data Model](./data-model.md) — `appointments`, `time_block`, `clients`, `services` schemas.
- [Services](./services.md) — service `duration`/`price` that drive slot fitting and totals.
- [Settings](./settings.md) — working hours / schedule and `calendar_slot_step_minutes`.
- [Calendar architecture](../architecture/calendar.md) — `CalendarWidget`, `@slot-click`,
  schedule display, and the create-menu entry point being replaced.
- [Analytics & Home](../architecture/analytics-and-home.md) — `HomeScheduleWidget` /
  `ScheduleTimeline` where entry point 1 lives.
- [Nuxt UI components](../ui/nuxt-ui-components.md) — `UModal`, `UStepper`, `UCalendar`,
  `USelectMenu`, `USlideover` usage.
- [Overlays](../ui/overlays.md) — the mounted-overlay + composable pattern
  (`useAppointmentPreview`) that `useQuickCreate` mirrors.

## File Structure

| Path | Role |
|---|---|
| `src/shared/lib/scheduling/find-available-slots.ts` | NEW — pure slot grid for a day |
| `src/shared/lib/scheduling/find-free-intervals.ts` | NEW — merged free gaps (Time off) |
| `src/shared/lib/scheduling/day-availability.ts` | NEW — `hasAnyFreeSlot` / month day map |
| `src/shared/lib/scheduling/__tests__/` | NEW — unit tests for the above |
| `src/features/quick-create/model/use-quick-create.ts` | NEW — orchestrator composable |
| `src/features/quick-create/model/busy-intervals.ts` | NEW — appointment/time-block → minute intervals |
| `src/features/quick-create/model/appointment-wizard.ts` | NEW — wizard state + gating |
| `src/features/quick-create/ui/QuickCreateOverlay.vue` | NEW — mounted host, mobile full-screen |
| `src/features/quick-create/ui/QuickCreateMenu.vue` | NEW — action chooser |
| `src/features/quick-create/ui/AppointmentWizard.vue` | NEW — stepper shell + back nav |
| `src/features/quick-create/ui/steps/Step*.vue` | NEW — Client / Services / DateTime / Confirm |
| `src/features/quick-create/ui/TimeOffWizard.vue` | NEW — availability-aware time-off flow |
| `src/features/client-form/ui/ClientFormDialog.vue` | CHANGED — emit created client |
| `src/widgets/home/ui/ScheduleTimeline.vue` | CHANGED — "+" replaces ellipsis, emits `create` |
| `src/widgets/home/ui/HomeScheduleWidget.vue` | CHANGED — wire "+" to `useQuickCreate` |
| `src/pages/calendar/ui/CalendarPage.vue` | CHANGED — route "+" and slot click to `useQuickCreate` |
| `src/shared/lib/i18n/locales/{en,fr,ru}.ts` | CHANGED — `quickCreate.*` keys |
