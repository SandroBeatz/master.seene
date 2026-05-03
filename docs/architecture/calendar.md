---
version: 1.0
date: 2026-05-03
category: architecture
---

# Calendar Feature

> Version 1.0 · 2026-05-03 · [Architecture](../)

## Overview

The calendar is the central scheduling view of the Seene master dashboard. It displays appointments and time blocks on a FullCalendar v6 grid, supports three view modes (month/week/day), respects the master's timezone and locale, and allows creating, editing, cancelling, and drag-dropping events without leaving the page.

The feature spans four FSD layers — `pages`, `widgets`, `features`, and `entities` — with a clean boundary at each transition. Business data is fetched via `@pinia/colada` queries and never duplicated; the calendar derives its event list from the same shared query cache used by other parts of the app.

---

## Architecture

### Rendering Pipeline

```
Browser URL /calendar
        │
        ▼
  Vue Router (lazy import)
        │
        ▼
  CalendarPage.vue          ← pages/calendar/ui/
  ┌─────────────────────────────────────────────────┐
  │  Manages all modal/slideover state              │
  │  Owns calendarRange, calendarViewType           │
  │  Reads masterPreferences (timezone, firstDay…)  │
  │                                                 │
  │   ┌────────────────────────────────────────┐   │
  │   │  CalendarToolbar.vue                   │   │
  │   │  (prev/next/today + view toggle)       │   │
  │   └────────────────────────────────────────┘   │
  │                                                 │
  │   ┌────────────────────────────────────────┐   │
  │   │  CalendarWidget.vue                    │   │
  │   │  FullCalendar wrapper                  │   │
  │   │  ┌──────────────────────────────────┐  │   │
  │   │  │  useCalendarEvents()             │  │   │
  │   │  │  ├── useAppointmentsQuery()      │  │   │
  │   │  │  ├── useTimeBlocksQuery()        │  │   │
  │   │  │  ├── useClientsQuery()           │  │   │
  │   │  │  └── useServicesQuery()          │  │   │
  │   │  │  buildCalendarEvents()           │  │   │
  │   │  │  buildCalendarScheduleDisplay()  │  │   │
  │   │  └──────────────────────────────────┘  │   │
  │   └────────────────────────────────────────┘   │
  │                                                 │
  │  Overlays (conditional):                        │
  │   • AppointmentForm  (USlideover)              │
  │   • TimeBlockForm    (USlideover)              │
  │   • AppointmentPreviewPanel (USlideover)        │
  │   • Cancel confirm  (UModal)                   │
  │   • Create menu     (UModal)                   │
  └─────────────────────────────────────────────────┘
```

### FSD Layer Responsibilities

| Layer | Location | Role |
|---|---|---|
| `pages` | `src/pages/calendar/` | Route entry point; orchestrates all interactions and overlays |
| `widgets` | `src/widgets/calendar/` | FullCalendar wrapper + toolbar; no direct API calls |
| `widgets` | `src/widgets/appointment-preview-panel/` | Read-only appointment detail panel |
| `features` | `src/features/appointment-form/` | Create/edit appointment form |
| `features` | `src/features/time-block-form/` | Create/edit time block form |
| `entities` | `src/entities/appointment/`, `client/`, `service/`, `time-block/`, `master/` | Queries, mutations, types |

### Data Flow

```
Supabase DB
    │  (query per entity)
    ▼
useAppointmentsQuery / useTimeBlocksQuery / useClientsQuery / useServicesQuery
    │  (reactive arrays from @pinia/colada cache)
    ▼
useCalendarEvents()   ← composable inside CalendarWidget
    │  (transforms + merges into EventInput[])
    ▼
buildCalendarEvents()
    │  (FullCalendar-ready event objects with colors, titles, extended props)
    ▼
<FullCalendar :events="calendarEvents" />
```

Mutations (create/update/cancel) invalidate the relevant query, which triggers automatic reactive re-renders of the calendar.

---

## Key Files

```
src/
├── pages/calendar/
│   ├── index.ts                        # Barrel export
│   └── ui/CalendarPage.vue             # Page orchestrator
│
└── widgets/calendar/
    ├── index.ts                        # Barrel export
    ├── ui/
    │   ├── CalendarWidget.vue          # FullCalendar integration
    │   └── CalendarToolbar.vue         # Navigation + view toggle
    ├── model/
    │   ├── calendar-controls.ts        # View type constants + CalendarDateRange type
    │   ├── use-calendar-events.ts      # Composable: fetch + transform events
    │   ├── calendar-events.ts          # Pure: build EventInput[] from domain objects
    │   ├── calendar-schedule.ts        # Pure: derive business hours + break slots
    │   ├── calendar-title.ts           # Pure: format date range as human string
    │   └── calendar-locale.ts          # Pure: map app locale to FullCalendar locale
    ├── config/
    │   └── event-colors.ts             # Color constants + CalendarEventColorSet type
    └── __tests__/
        ├── calendar-events.spec.ts
        ├── calendar-schedule.spec.ts
        ├── calendar-title.spec.ts
        └── calendar-locale.spec.ts
```

---

## Configuration

All calendar behaviour is driven by `MasterPreferences` stored in Supabase (`master_settings` table) and exposed via `useMasterPreferencesStore()`.

| Setting | Type | Default | Effect |
|---|---|---|---|
| `timeFormat` | `12 \| 24` | `24` | Hour display format in time grid |
| `timeZone` | `string` | `'local'` | Timezone for event display and creation |
| `calendarFirstDay` | `0–6` | `1` (Monday) | Which day starts the week column |
| `calendarSlotStepMinutes` | `number` | `15` | Slot grid granularity |
| `defaultCalendarView` | `'dayGridMonth' \| 'timeGridWeek' \| 'timeGridDay'` | `'timeGridWeek'` | View on first open |

Changing timezone or time format triggers a `calendarRenderKey` increment in `CalendarWidget`, which unmounts and remounts FullCalendar to guarantee correct slot rendering.

---

## CalendarPage.vue

**Path:** `src/pages/calendar/ui/CalendarPage.vue`

The page component has no props. It owns all mutable UI state:

| State | Type | Purpose |
|---|---|---|
| `calendarRef` | `Ref<CalendarWidgetExpose>` | Imperative calendar API (prev/next/today/changeView) |
| `calendarRange` | `Ref<CalendarDateRange>` | Current visible date range (updated on every `dates-set` event) |
| `calendarViewType` | `Ref<CalendarViewType>` | Drives toolbar toggle + query range |
| `selectedStartAt` | `Ref<string>` | ISO datetime pre-filled in appointment form on slot click |
| `selectedAppointment` | `Ref<Appointment \| null>` | Appointment open in preview/edit |
| `selectedTimeBlock` | `Ref<TimeBlock \| null>` | Time block open in edit form |
| `is*Open` flags | `Ref<boolean>` | Controls five overlays |

**Key interactions:**

| User action | Handler | What happens |
|---|---|---|
| Click empty time slot | `onSlotClick(dateStr)` | Sets `selectedStartAt`, opens appointment form |
| Click appointment event | `onEventClick(appt)` | Sets `selectedAppointment`, opens preview panel |
| Click time block event | `onTimeBlockClick(tb)` | Sets `selectedTimeBlock`, opens time block form |
| Click "+ Create" | `isCreateMenuOpen = true` | Modal with Appointment / Block time options |
| Change view (toolbar) | `changeCalendarView(view)` | Calls `calendarRef.changeView()` |
| Drag appointment | (inside widget) | Calls `updateAppointment` mutation, reverts on error |
| Cancel appointment | `confirmCancelAppointment()` | Calls `updateAppointmentStatus('cancelled')` |

---

## CalendarWidget.vue

**Path:** `src/widgets/calendar/ui/CalendarWidget.vue`

### Props

```typescript
interface Props {
  events?: EventInput[]
  schedule?: MasterSchedule | null
  timeFormat?: TimeFormat            // 12 | 24
  timeZone?: string
  firstDay?: CalendarFirstDay        // 0–6
  slotStepMinutes?: number
  defaultView?: MasterCalendarViewType
}
```

### Emits

```typescript
'slot-click'       (dateStr: string)       // User clicked an empty slot
'event-click'      (appointment: Appointment)
'time-block-click' (timeBlock: TimeBlock)
'dates-set'        (range: CalendarDateRange)
```

### Exposed API

```typescript
interface CalendarWidgetExpose {
  moveToPrevious: () => void
  moveToNext:     () => void
  moveToToday:    () => void
  changeView:     (viewType: CalendarViewType) => void
}
```

### FullCalendar plugins used

- `dayGridPlugin` — month view
- `timeGridPlugin` — week/day time grid
- `interactionPlugin` — click and drag-drop

### Re-render key

```typescript
const calendarRenderKey = computed(() =>
  `${props.timeZone}-${props.timeFormat}-${props.defaultView}`
)
```

When this computed value changes, the `<FullCalendar :key="calendarRenderKey" …>` triggers a full remount. This is necessary because FullCalendar does not reactively update its timezone or time format after initialization.

### Drag-and-drop

Both appointments and time blocks are draggable (`editable: true`). On drop:

1. `handleEventDrop(info)` fires
2. Reads `info.event.extendedProps.type` to distinguish appointment vs. time block
3. Calls `updateAppointment()` or `updateTimeBlock()` with new ISO start (and end for time blocks)
4. On API error: calls `info.revert()` to restore the event's original position and shows an error toast

---

## CalendarToolbar.vue

**Path:** `src/widgets/calendar/ui/CalendarToolbar.vue`

```
┌──────────────────────────────────────────────────────┐
│  ◀  Today  ▶   May 2026          Month  Week  Day   │
└──────────────────────────────────────────────────────┘
```

Pure presentational component — emits events upward, holds no state. `title` is a formatted string computed in the page layer via `formatCalendarRangeTitle()`.

---

## Model Layer (Pure Functions)

### `useCalendarEvents()` — `model/use-calendar-events.ts`

Composable used inside `CalendarWidget`. Manages the query date range and assembles all events.

```typescript
function useCalendarEvents(
  userId:              Ref<string>,
  unknownClientLabel:  Ref<string>,
  timeBlockLabel:      Ref<string>,
  timeZone:            Ref<string>,
): {
  calendarEvents: ComputedRef<EventInput[]>
  dateRange:      Ref<AppointmentDateRange>
  onDatesSet:     (range: AppointmentDateRange) => void
}
```

Default `dateRange` spans 1 month before → 1 month after today. Updates when the user navigates the calendar (`onDatesSet`).

---

### `buildCalendarEvents()` — `model/calendar-events.ts`

Pure function. Takes domain objects, returns `EventInput[]` for FullCalendar.

**Appointment event shape:**
```typescript
{
  id:               appointment.id,
  title:            'Client Name — Service1, Service2',
  start:            /* wall-time ISO in calendar timezone */,
  end:              /* start + duration_minutes */,
  borderColor:      /* service color if confirmed, else status color */,
  backgroundColor:  /* borderColor + '33' (20% opacity) */,
  textColor:        '#1e293b',
  extendedProps: {
    type:        'appointment',
    appointment: Appointment,
  },
}
```

**Time block event shape:**
```typescript
{
  id:               `time-block-${timeBlock.id}`,
  title:            timeBlock.notes || timeBlockLabel,
  start, end:       /* wall-time ISO */,
  allDay:           timeBlock.is_all_day,
  borderColor:      '#64748b',
  backgroundColor:  '#f1f5f9',
  textColor:        '#1e293b',
  extendedProps: {
    type:      'time-block',
    timeBlock: TimeBlock,
  },
}
```

**Color priority for appointments:**
1. Confirmed + has service with a color → use service color
2. Otherwise → use `CALENDAR_STATUS_COLORS[status]`

---

### `buildCalendarScheduleDisplay()` — `model/calendar-schedule.ts`

Pure function. Derives FullCalendar business hours and break background events from a `MasterSchedule`.

```typescript
function buildCalendarScheduleDisplay(
  schedule: MasterSchedule | null | undefined
): {
  slotMinTime?:      string          // "HH:MM:SS" — earliest visible slot
  slotMaxTime?:      string          // "HH:MM:SS" — latest visible slot
  businessHours?:    BusinessHoursInput
  backgroundEvents:  EventInput[]    // One per break, class 'fc-schedule-break'
}
```

**Visible range padding:** The grid expands ±2 hours around the earliest start / latest end across all enabled days, clamped to `00:00–24:00`.

**Break detection:** `isCalendarScheduleBreakSlot(schedule, dayOfWeek, minutes)` is called per slot lane mount to assign the CSS class `fc-schedule-break-slot` which styles the slot background.

---

### `formatCalendarRangeTitle()` — `model/calendar-title.ts`

```typescript
function formatCalendarRangeTitle(
  range:     CalendarDateRange | undefined,
  locale:    string,
  timeZone?: string,
): string
```

| View | Output format | Example |
|---|---|---|
| `dayGridMonth` | Month Year | `May 2026` |
| `timeGridDay` | Full date | `May 2, 2026` |
| `timeGridWeek` | Date range | `Apr 26 – May 2, 2026` |

Uses `Intl.DateTimeFormat` with the app locale. Omits timezone from `Intl` options when `timeZone === 'local'`.

---

### `normalizeCalendarLocale()` — `model/calendar-locale.ts`

```typescript
function normalizeCalendarLocale(locale: string): 'en' | 'fr' | 'ru'
```

Maps app locale strings (including regional variants like `'fr-FR'`) to the three FullCalendar locale imports. Unknown locales default to `'en'`.

---

## Styles

The calendar uses standard FullCalendar CSS with two custom utility classes applied via FullCalendar's `dayCellClassNames` / `slotLaneDidMount` callbacks:

| Class | Applied to | Effect |
|---|---|---|
| `fc-schedule-break` | Background events (breaks) | Rendered as background event with muted color |
| `fc-schedule-break-slot` | Slot lanes during break times | Adds a dimmed background to every slot row in a break period |

Event colors are set inline via `borderColor` / `backgroundColor` / `textColor` on each `EventInput` — no CSS overrides needed for event coloring.

Nuxt UI + Tailwind CSS v4 handle all page chrome (toolbar buttons, modals, slideoveres).

---

## i18n Keys

All user-visible calendar text is in `src/shared/lib/i18n/locales/{en,fr,ru}.ts`:

```
calendar.title                  Page heading
calendar.description            Page subheading
calendar.create.open            "+" button tooltip
calendar.create.title           Create-menu modal title
calendar.create.description     Modal description text
calendar.create.appointment     "New appointment" option
calendar.create.timeBlock       "Block time" option
calendar.controls.previous      Previous button tooltip
calendar.controls.next          Next button tooltip
calendar.controls.today         Today button label
calendar.views.month            Month toggle label
calendar.views.week             Week toggle label
calendar.views.day              Day toggle label
calendar.allDay                 All-day row label in FullCalendar
calendar.dragError              Toast message on drag-drop failure

timeBlocks.calendarTitle        Default title for time blocks without notes
appointments.unknownClient      Fallback when client record not found
```

---

## Tests

All test files are in `src/widgets/calendar/__tests__/` and run under **Vitest + jsdom**.

### `calendar-events.spec.ts`
Covers `buildCalendarEvents()`:
- Correct title format ("Name — Svc1, Svc2")
- Color assignment by appointment status
- Service color priority for confirmed appointments
- UTC → wall-time conversion for start/end
- Duration calculation from `duration_minutes`
- Missing client → `unknownClientLabel` fallback
- Time block events: notes as title, `is_all_day` flag, gray colors
- Edge: appointment with no services

### `calendar-schedule.spec.ts`
Covers `buildCalendarScheduleDisplay()` and `isCalendarScheduleBreakSlot()`:
- Slot min/max padding (+2 h, clamped to 0–24)
- Disabled days excluded from business hours
- Break events generated per enabled day
- Break events clipped to work-hour boundaries
- Invalid schedule (end before start) returns empty result
- `isCalendarScheduleBreakSlot` returns true/false correctly

### `calendar-title.spec.ts`
Covers `formatCalendarRangeTitle()`:
- Week view cross-month range ("Apr 26 – May 2, 2026")
- Month view uses `currentFrom`/`currentTo` (not raw `from`/`to`)
- Day view single date format

### `calendar-locale.spec.ts`
Covers `normalizeCalendarLocale()`:
- Exact matches ('en', 'fr', 'ru')
- Regional tag normalization ('fr-FR' → 'fr')
- Unknown locale fallback to 'en'

---

## Cross-references

- [Master Entity](../code/master-entity.md) — `MasterPreferences`, `MasterSchedule`, `MasterSettings` types and store used by the calendar
- [Data Model](../business/data-model.md) — `Appointment`, `TimeBlock`, `Client`, `Service` entity schemas
- [Supabase Integration](../integrations/supabase.md) — how queries and mutations reach the database
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — `UModal`, `USlideover`, `UButton`, `UPage*` used in CalendarPage
- [Auth Guard](../architecture/auth-guard.md) — route protection that gates access to `/calendar`
