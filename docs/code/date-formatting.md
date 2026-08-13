---
version: 1.0
date: 2026-07-24
category: code
---

# Date Formatting

> Version 1.0 · 2026-07-24 · [Code](../code/)

## Overview

Application UI must format reusable date labels through `useFormats()` from
`@shared/lib/formats`. The shared API keeps locale handling, relative-day wording, date preference
handling, empty values, and invalid values consistent across pages, widgets, features, and shared
components.

Do not introduce a component-local `Intl.DateTimeFormat` for a display format that already exists
in `Formats`. When a reusable UI format is missing, add a named method to `Formats`, cover it with
unit tests, and reuse it at every call site. Direct `Intl.DateTimeFormat` remains appropriate for
low-level timezone conversion, extracting date parts, or configuring third-party calendar
libraries; those are calculations rather than shared display presets.

## Architecture

The formats plugin is registered once in `src/main.ts` and exposed through both `useFormats()` and
the global component property `$f`:

```text
master preferences + vue-i18n locale
               │
               ▼
        formatsPlugin options
               │
               ▼
    @shared/lib/formats Formats API
               │
      ┌────────┴────────┐
      ▼                 ▼
 useFormats()           $f
 script setup           templates/components
```

`Formats` accepts `string | Date | null | undefined` for every date method. Empty and invalid
values return the shared placeholder `—`.

There are two date-formatting families:

1. `date()` and `dateTime()` use the master's configured token format from
   `master_settings.date_format`, with an optional per-call override.
2. `dateDay()`, `dateDayYear()`, and `monthYear()` use the active UI locale and native
   `Intl.DateTimeFormat` conventions. They intentionally do not use the numeric date preference
   because they are human-readable labels containing month and weekday names.

`dateDay()` and `dateDayYear()` compare local calendar dates rather than elapsed milliseconds. This
keeps yesterday/today/tomorrow correct across daylight-saving transitions. Their relative words
come from `formats.dateDay.{yesterday,today,tomorrow}` in all three locale files.

### Date API

| Method                             | Output purpose                                | Example in `ru`                   |
| ---------------------------------- | --------------------------------------------- | --------------------------------- |
| `date(value, overrideFormat?)`     | Preference-driven numeric date                | `24.07.2026`                      |
| `dateTime(value, overrideFormat?)` | Preference-driven numeric date plus `HH:mm`   | `24.07.2026 14:30`                |
| `dateDay(value)`                   | Relative day or short weekday, day, and month | `Сегодня 24 июл.` / `пн, 27 июл.` |
| `dateDayYear(value)`               | Same as `dateDay`, including year             | `Сегодня 24 июл. 2026 г.`         |
| `monthYear(value)`                 | Full localized month and year                 | `июль 2026 г.`                    |

Relative-day branches are:

- previous calendar day → localized `Yesterday`;
- current calendar day → localized `Today`;
- next calendar day → localized `Tomorrow`;
- every other date → localized short weekday.

## Configuration

`src/main.ts` injects live preference and locale readers:

```ts
app.use(formatsPlugin, {
  getTimeFormat: () => useMasterPreferencesStore().timeFormat,
  getCurrency: () => useMasterPreferencesStore().currency,
  getDateFormat: () => useMasterPreferencesStore().dateFormat,
  getLocale: () => i18n.global.locale.value,
})
```

Date-related options:

| Option          | Source                        | Used by                               |
| --------------- | ----------------------------- | ------------------------------------- |
| `getDateFormat` | `master_settings.date_format` | `date`, `dateTime`                    |
| `getLocale`     | active vue-i18n locale        | `dateDay`, `dateDayYear`, `monthYear` |

Supported numeric date tokens are defined in `@shared/config/date-formats`. The default is
`DD.MM.YYYY`.

The human-readable methods use the JavaScript runtime's local calendar date. They do not convert a
timestamp into the master's configured timezone. A caller that needs a master-timezone wall-clock
date must perform that conversion with `@shared/lib/time-zone` before formatting.

## Usage

### Relative appointment date

`HomeNextUpWidget.vue` uses `dateDay()` for desktop cards, mobile cards, and the mobile actions
drawer:

```vue
<Typography variant="endnote">
  {{ formats.dateDay(appt.start_at) }}
</Typography>
```

For 24 July, the Russian output is:

```text
Вчера 23 июл.
Сегодня 24 июл.
Завтра 25 июл.
пн, 27 июл.
```

### Mobile schedule labels

`MobileScheduleCard.vue` delegates both reusable labels to shared formats:

```ts
const formats = useFormats()

const selectedDateLabel = computed(() => formats.dateDay(model.value))
const monthYearLabel = computed(() => formats.monthYear(leadingCalendarDate.value))
```

The component must not import `useLocaleStore` or create local `Intl.DateTimeFormat` instances for
these labels.

### Date with year

Use `dateDayYear()` when the surrounding UI does not already establish the year:

```ts
const label = formats.dateDayYear(appointment.start_at)
```

### Adding another reusable date format

When a new repeated UI date shape is needed:

1. Add a clearly named method to the `Formats` interface.
2. Implement it in `createFormats()` using `parseDate()` and the injected locale or date-format
   preference.
3. Return `—` for empty or invalid input.
4. Add locale keys to `en.ts`, `fr.ts`, and `ru.ts` if the format contains relative or authored
   words.
5. Cover every branch and locale-sensitive output in
   `src/shared/lib/formats/__tests__/date-day.spec.ts` or a focused sibling spec.
6. Replace component-local formatting with the shared method.

## Cross-references

- [Master Entity](./master-entity.md) — runtime preference store injected into `formatsPlugin`.
- [Application Settings](../business/settings.md) — persisted language and numeric date-format
  preferences.
- [Scheduling Library](./scheduling.md) — date/time calculations that remain separate from display
  formatting.
- [i18n Text Guard](../skills/i18n.md) — locale-key requirements for authored UI text.

## File Structure

| File                                                | Responsibility                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `src/shared/lib/formats/index.ts`                   | `Formats` contract, plugin, parsing, and all shared formatters   |
| `src/shared/lib/formats/__tests__/date-day.spec.ts` | Relative-day, year, locale, placeholder, and month/year coverage |
| `src/shared/lib/i18n/locales/{en,fr,ru}.ts`         | Relative-day words                                               |
| `src/shared/config/date-formats/index.ts`           | Supported numeric date preference tokens and default             |
| `src/main.ts`                                       | Injects live locale and master preferences into `formatsPlugin`  |
| `src/vue-reactivity.d.ts`                           | Types the global `$f` component property as `Formats`            |
| `src/widgets/home/ui/HomeNextUpWidget.vue`          | `dateDay()` consumer for appointment labels                      |
| `src/widgets/home/ui/shared/MobileScheduleCard.vue` | `dateDay()` and `monthYear()` consumer                           |
