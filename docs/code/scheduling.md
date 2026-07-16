---
version: 1.0
date: 2026-07-14
category: code
---

# Scheduling Library

> Version 1.0 · 2026-07-14 · [Code](../code/)

## Overview

`src/shared/lib/scheduling/` is a pure, timezone-safe library of scheduling
primitives. Everything is expressed in **minutes since midnight** in the master's
timezone — never `Date` objects — so the math is deterministic and exhaustively
unit-testable. The caller (a feature/widget) is responsible for converting DB
timestamps into these minutes; the library never touches the clock, the DB, or
the DOM.

It powers the appointment-creation wizard's date/time step (which slots are free,
how days are marked, the manual time picker) and is shared with the future public
[online booking](../business/online-booking.md) page so both apply the same slot
logic. Because FSD forbids sibling-entity imports, math that needs both
appointment and time-off data cannot live in either entity — hence a `shared`
library operating on primitives only.

A closely related classifier, `classifyDayState`, lives one layer up in
`@entities/master` because it needs `resolveDayWindow` (schedule resolution); it
is documented here since it composes directly with `hasAnyFreeSlot`.

## Architecture

### Core type — `Interval`

```ts
/** A half-open interval [start, end) in minutes since midnight. */
type Interval = readonly [start: number, end: number]
```

Busy time (appointments, time offs, breaks) and free gaps are all `Interval`s.
Degenerate intervals (`start >= end`) never match and are harmless.

### Availability inputs

```ts
interface AvailabilityInput {
  workStart: number      // working window start, minutes
  workEnd: number        // working window end, minutes
  breaks?: Interval[]    // schedule breaks (treated as busy)
  busy?: Interval[]      // appointments + time offs, mapped to minutes
}

interface FindAvailableSlotsInput extends AvailabilityInput {
  stepMinutes: number    // grid granularity (e.g. 15)
  durationMinutes: number
  earliest?: number      // earliest allowed start; defaults to workStart
}
```

`earliest` defaults to `workStart`, and callers pass `max(workStart, nowMinutes)`
when the day is today so past times are not offered.

### Function map

```
find-available-slots.ts   findAvailableSlots(input)   -> number[]   step-grid starts that fit & are free
day-availability.ts       hasAnyFreeSlot(input)       -> boolean    ">= 1 slot fits" (calendar day enable)
find-free-intervals.ts    findFreeIntervals(input)    -> Interval[] merged free gaps (time-off pickers)
day-time-options.ts       buildDayTimeOptions(input)  -> number[]   whole-day grid, ignores availability
group-slots.ts            groupSlotsByPartOfDay(nums) -> SlotGroup[] bucket by morning/day/evening
intervals.ts              intervalsOverlap / mergeIntervals         interval helpers
calendar-date.ts          calendarDateToInput / inputToCalendarDate / minutesToTimeInput / timeInputToMinutes
```

And the schedule-aware classifier (in `@entities/master`):

```
model/classify-day-state.ts  classifyDayState(input) -> 'available' | 'day-off' | 'full'
```

### How `findAvailableSlots` works

Walks the step grid anchored to midnight from `earliest`, keeping every start `t`
where `[t, t + durationMinutes)` fits fully inside `[workStart, workEnd]` and
overlaps no busy interval (`busy ∪ breaks`). Returns `[]` for a non-working day, a
non-positive step/duration, or when nothing fits. `hasAnyFreeSlot` is defined as
`findAvailableSlots(input).length > 0`, so the month calendar and the slot list can
never disagree.

### `buildDayTimeOptions` — the manual escape hatch

Unlike `findAvailableSlots`, this ignores the working window and busy time. It
emits **every** start time in the day on the step grid (`0 … <1440`), from
`earliest` (default `0`, so past times on today are included). It backs the
wizard's always-available "set time manually" picker, which lets a master place a
booking on any day at any time (force-majeure). Non-positive step → `[]`; a
negative `earliest` is clamped to `0`.

### `groupSlotsByPartOfDay` — sectioned rendering

Buckets start minutes into `morning` (`< 12:00`), `day` (`12:00–16:59`), and
`evening` (`>= 17:00`). Returns only non-empty buckets, ordered morning → day →
evening, preserving input order within each bucket. Used to render the slot list
as labeled sections.

```ts
type PartOfDay = 'morning' | 'day' | 'evening'
interface SlotGroup { part: PartOfDay; slots: number[] }
```

### `classifyDayState` — day markers (in `@entities/master`)

Classifies a calendar day so the wizard's `UCalendar` can **mark** days (free /
fully booked / day off) instead of disabling them:

- `day-off` — `resolveDayWindow(schedule, date).enabled === false`;
- `available` — a working day with `hasAnyFreeSlot(...) === true`;
- `full` — a working day where no slot fits.

Pass `nowMinutes` **only when the date is today** so past times are excluded
(`earliest = max(workStart, nowMinutes)`); omit it for any other day.

## Configuration

No configuration. All behavior is driven by call-site inputs. The step granularity
in practice comes from `MasterPreferences.calendarSlotStepMinutes` (default 15), and
the working window from `master_profile.schedule` via `resolveDayWindow` — both
passed in by the caller.

## Usage

Slots for one day (wizard Step 3), after mapping busy intervals:

```ts
import { findAvailableSlots } from '@shared/lib/scheduling'

const slots = findAvailableSlots({
  workStart, workEnd, breaks,          // minutes, from resolveDayWindow
  busy,                                // minutes, appointments + time offs
  stepMinutes: masterPreferencesStore.calendarSlotStepMinutes,
  durationMinutes: totalServiceDuration,
  earliest: isToday ? nowMinutes : workStart,
})
```

Group them for the UI, and build the manual full-day list:

```ts
import { buildDayTimeOptions, groupSlotsByPartOfDay } from '@shared/lib/scheduling'

const groups = groupSlotsByPartOfDay(slots)               // [{ part, slots }, …]
const manual = buildDayTimeOptions({ stepMinutes })       // every time in the day
```

Mark a calendar day (feature/widget layer):

```ts
import { classifyDayState } from '@entities/master'

const state = classifyDayState({
  schedule, date, busy, stepMinutes, durationMinutes,
  nowMinutes: date === todayStr ? nowMinutes : undefined,
}) // 'available' | 'day-off' | 'full'
```

## Cross-references

- [Quick Appointment & Time Off Creation](../business/quick-appointment-creation.md) — the wizard that consumes this library for its date/time step.
- [Online Booking](../business/online-booking.md) — public flow that will share the same slot search with server-side validation.
- [Master Entity](./master-entity.md) — `resolveDayWindow`, `normalizeSchedule`, and where `classifyDayState` lives.
- [Settings](../business/settings.md) — working hours / schedule and `calendar_slot_step_minutes` that feed the inputs.

## File Structure

| Path | Role |
|---|---|
| `src/shared/lib/scheduling/index.ts` | Public barrel — all exports below |
| `src/shared/lib/scheduling/types.ts` | `Interval`, `AvailabilityInput`, `FindAvailableSlotsInput` |
| `src/shared/lib/scheduling/find-available-slots.ts` | `findAvailableSlots` — step-grid slots for a day |
| `src/shared/lib/scheduling/day-availability.ts` | `hasAnyFreeSlot` — calendar day enable/mark |
| `src/shared/lib/scheduling/find-free-intervals.ts` | `findFreeIntervals` — merged free gaps (time off) |
| `src/shared/lib/scheduling/day-time-options.ts` | `buildDayTimeOptions` — whole-day manual grid |
| `src/shared/lib/scheduling/group-slots.ts` | `groupSlotsByPartOfDay` — morning/day/evening buckets |
| `src/shared/lib/scheduling/intervals.ts` | `intervalsOverlap`, `mergeIntervals` |
| `src/shared/lib/scheduling/calendar-date.ts` | `CalendarDate` ⇄ `YYYY-MM-DD` and minute ⇄ `HH:mm` helpers |
| `src/shared/lib/scheduling/__tests__/` | Unit tests for the above |
| `src/entities/master/model/classify-day-state.ts` | `classifyDayState` — schedule-aware day classifier |
