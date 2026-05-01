import { describe, expect, it } from 'vitest'
import type { CalendarDateRange } from '../model/calendar-controls'
import { formatCalendarRangeTitle } from '../model/calendar-title'

const weekRange: CalendarDateRange = {
  from: '2026-04-26T00:00:00.000Z',
  to: '2026-05-03T00:00:00.000Z',
  currentFrom: '2026-04-26T00:00:00.000Z',
  currentTo: '2026-05-03T00:00:00.000Z',
  title: 'Apr 26 – May 2, 2026',
  viewType: 'timeGridWeek',
}

describe('formatCalendarRangeTitle', () => {
  it('formats week ranges in the active locale', () => {
    expect(formatCalendarRangeTitle(weekRange, 'en')).toContain('Apr')
    expect(formatCalendarRangeTitle(weekRange, 'fr')).toContain('mai')
    expect(formatCalendarRangeTitle(weekRange, 'ru')).toContain('мая')
  })

  it('formats month views from the current range instead of the active grid range', () => {
    expect(
      formatCalendarRangeTitle(
        {
          ...weekRange,
          from: '2026-04-26T00:00:00.000Z',
          to: '2026-06-07T00:00:00.000Z',
          currentFrom: '2026-05-01T00:00:00.000Z',
          currentTo: '2026-06-01T00:00:00.000Z',
          title: 'May 2026',
          viewType: 'dayGridMonth',
        },
        'ru',
      ),
    ).toContain('май')
  })

  it('formats day views as a single localized date', () => {
    expect(
      formatCalendarRangeTitle(
        {
          ...weekRange,
          currentFrom: '2026-05-02T00:00:00.000Z',
          currentTo: '2026-05-03T00:00:00.000Z',
          title: 'May 2, 2026',
          viewType: 'timeGridDay',
        },
        'fr',
      ),
    ).toContain('mai')
  })
})
