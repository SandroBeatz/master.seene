import { describe, expect, it } from 'vitest'
import {
  addDateInputDays,
  getCalendarDateTimeString,
  getDateTimeInputValue,
  toUtcIsoFromCalendarDateString,
  toUtcIsoFromZonedDateTime,
} from '../index'

describe('time-zone helpers', () => {
  it('formats an absolute instant for a target timezone input', () => {
    expect(getDateTimeInputValue('2026-05-02T04:30:00.000Z', 'Asia/Bishkek')).toEqual({
      date: '2026-05-02',
      time: '10:30',
    })
  })

  it('converts a timezone date and time input to UTC', () => {
    expect(toUtcIsoFromZonedDateTime('2026-05-02', '10:30', 'Asia/Bishkek')).toBe(
      '2026-05-02T04:30:00.000Z',
    )
  })

  it('treats FullCalendar named-zone strings as wall time in the selected timezone', () => {
    expect(toUtcIsoFromCalendarDateString('2026-05-02T10:30:00', 'Asia/Bishkek')).toBe(
      '2026-05-02T04:30:00.000Z',
    )
  })

  it('formats an absolute instant as a calendar wall time in the selected timezone', () => {
    expect(getCalendarDateTimeString('2026-05-02T02:00:00.000Z', 'Asia/Bishkek')).toBe(
      '2026-05-02T08:00:00',
    )
  })

  it('adds calendar days to date input values', () => {
    expect(addDateInputDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDateInputDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})
