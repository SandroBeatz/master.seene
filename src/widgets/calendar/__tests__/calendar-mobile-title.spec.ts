import { describe, expect, it } from 'vitest'
import type { CalendarDateRange } from '../model/calendar-controls'
import { formatMobileCalendarTitle, isCurrentCalendarPeriod } from '../model/calendar-mobile-title'

function range(
  viewType: CalendarDateRange['viewType'],
  currentFrom: string,
  currentTo: string,
): CalendarDateRange {
  return { from: currentFrom, to: currentTo, currentFrom, currentTo, title: 'raw', viewType }
}

describe('formatMobileCalendarTitle', () => {
  it('shows the month with the year as caption', () => {
    expect(
      formatMobileCalendarTitle(
        range('dayGridMonth', '2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'),
        'ru',
        'UTC',
      ),
    ).toEqual({ title: 'Октябрь', caption: '2026' })
  })

  it('shows the week month and its span; a month-crossing week names both', () => {
    const inside = formatMobileCalendarTitle(
      range('timeGridWeek', '2026-10-05T00:00:00.000Z', '2026-10-12T00:00:00.000Z'),
      'en',
      'UTC',
    )
    expect(inside.title).toBe('October')
    expect(inside.caption).toMatch(/Oct 5\s*–\s*11, 2026/)

    const crossing = formatMobileCalendarTitle(
      range('timeGridWeek', '2026-09-28T00:00:00.000Z', '2026-10-05T00:00:00.000Z'),
      'en',
      'UTC',
    )
    expect(crossing.title).toBe('Sep – Oct')
  })

  it('shows the date with weekday and year for a day', () => {
    expect(
      formatMobileCalendarTitle(
        range('timeGridDay', '2026-10-05T00:00:00.000Z', '2026-10-06T00:00:00.000Z'),
        'ru',
        'UTC',
      ),
    ).toEqual({ title: '5 октября', caption: 'Понедельник, 2026' })
  })

  it('reads the period in the master zone, not UTC', () => {
    // Midnight 6 Oct in Tokyo is 15:00 UTC on the 5th.
    const title = formatMobileCalendarTitle(
      range('timeGridDay', '2026-10-05T15:00:00.000Z', '2026-10-06T15:00:00.000Z'),
      'en',
      'Asia/Tokyo',
    )
    expect(title.title).toBe('October 6')
  })
})

describe('isCurrentCalendarPeriod', () => {
  const week = range('timeGridWeek', '2026-10-05T00:00:00.000Z', '2026-10-12T00:00:00.000Z')

  it('is true when today falls inside the visible period', () => {
    expect(isCurrentCalendarPeriod(week, 'UTC', new Date('2026-10-11T23:00:00.000Z'))).toBe(true)
    expect(isCurrentCalendarPeriod(week, 'UTC', new Date('2026-10-12T00:30:00.000Z'))).toBe(false)
    expect(isCurrentCalendarPeriod(undefined, 'UTC')).toBe(true)
  })
})
