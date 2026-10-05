import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Interval } from '@shared/lib/scheduling'
import { createTimeOffWizard, DEFAULT_TIME_OFF_DURATION } from '../time-off-wizard-mobile'

const DAY = '2026-10-06'

function setup(busyByDay: Record<string, Interval[]> = {}) {
  return createTimeOffWizard({
    date: DAY,
    timeZone: ref('UTC'),
    dayBusy: (date) => busyByDay[date] ?? [],
  })
}

describe('createTimeOffWizard', () => {
  it('starts on the given day with the default duration and nothing picked', () => {
    const wizard = setup()
    expect(wizard.state.date).toBe(DAY)
    expect(wizard.state.durationMinutes).toBe(DEFAULT_TIME_OFF_DURATION)
    expect(wizard.isWhenValid.value).toBe(false)
  })

  it('is valid once a free start is picked', () => {
    const wizard = setup()
    wizard.state.startMinutes = 13 * 60
    expect(wizard.range.value).toEqual([780, 840])
    expect(wizard.isWhenValid.value).toBe(true)
  })

  it('rejects a range overlapping a booking', () => {
    const wizard = setup({ [DAY]: [[13 * 60 + 30, 14 * 60 + 30]] })
    wizard.state.startMinutes = 13 * 60
    expect(wizard.overlapsBusy.value).toBe(true)
    expect(wizard.isWhenValid.value).toBe(false)
  })

  it('offers all day only while the day has no bookings', () => {
    const busy = setup({ [DAY]: [[600, 660]] })
    busy.setAllDay(true)
    expect(busy.canBeAllDay.value).toBe(false)
    expect(busy.state.allDay).toBe(false)

    const free = setup()
    free.setAllDay(true)
    expect(free.state.allDay).toBe(true)
    expect(free.isWhenValid.value).toBe(true)
  })

  it('clears the start and a no-longer-allowed all day when the day changes', () => {
    const wizard = setup({ '2026-10-07': [[600, 660]] })
    wizard.setAllDay(true)
    wizard.state.startMinutes = 600
    wizard.setDate('2026-10-07')
    expect(wizard.state.startMinutes).toBeNull()
    expect(wizard.state.allDay).toBe(false)
  })

  it('drops the start when a longer duration would hit a booking', () => {
    const wizard = setup({ [DAY]: [[14 * 60, 15 * 60]] })
    wizard.state.startMinutes = 13 * 60
    wizard.setDuration(60)
    expect(wizard.state.startMinutes).toBe(780)
    wizard.setDuration(90)
    expect(wizard.state.startMinutes).toBeNull()
  })

  it('applies a manual range only when it is ordered and free', () => {
    const wizard = setup({ [DAY]: [[16 * 60, 17 * 60]] })
    expect(wizard.setRange(900, 840)).toBe('invalid')
    expect(wizard.setRange(15 * 60 + 30, 16 * 60 + 30)).toBe('overlap')
    expect(wizard.state.startMinutes).toBeNull()

    expect(wizard.setRange(12 * 60 + 10, 13 * 60 + 25)).toBe('ok')
    expect(wizard.state.startMinutes).toBe(730)
    expect(wizard.state.durationMinutes).toBe(75)
  })

  it('appends quick reasons without duplicating them', () => {
    const wizard = setup()
    wizard.addReason('Обед')
    wizard.addReason('Обед')
    wizard.addReason('Личные дела')
    expect(wizard.state.notes).toBe('Обед, Личные дела')
  })

  it('builds the DTO for a timed and an all-day time off', () => {
    const timed = setup()
    timed.state.startMinutes = 13 * 60
    timed.state.notes = '  Обед  '
    expect(timed.toDto()).toEqual({
      start_at: '2026-10-06T13:00:00.000Z',
      end_at: '2026-10-06T14:00:00.000Z',
      all_day: false,
      notes: 'Обед',
    })

    const allDay = setup()
    allDay.setAllDay(true)
    expect(allDay.toDto()).toEqual({
      start_at: '2026-10-06T00:00:00.000Z',
      end_at: '2026-10-07T00:00:00.000Z',
      all_day: true,
      notes: null,
    })
  })
})
