import { describe, expect, it } from 'vitest'
import type { MasterSchedule } from '@entities/master'
import { useWorkingHours } from '../model/use-working-hours'

describe('useWorkingHours', () => {
  it('seeds a full week and reports validity for a clean default', () => {
    const wh = useWorkingHours()
    wh.seed(null)

    expect(wh.dayViews.value).toHaveLength(7)
    expect(wh.dayViews.value[0]?.key).toBe('monday')
    expect(wh.state.value.days.monday.enabled).toBe(true)
    expect(wh.state.value.days.sunday.enabled).toBe(false)
    expect(wh.isValid.value).toBe(true)
  })

  it('adds a default 13:00–14:00 break when it fits the day', () => {
    const wh = useWorkingHours()
    wh.seed(null) // monday 10:00–19:00

    wh.addBreak('monday')

    expect(wh.state.value.days.monday.breaks).toEqual([{ start: '13:00', end: '14:00' }])
    expect(wh.isValid.value).toBe(true)
  })

  it('clamps the default break into a short working window', () => {
    const schedule: MasterSchedule = {
      days: { monday: { enabled: true, start: '10:00', end: '10:30', breaks: [] } },
    }
    const wh = useWorkingHours()
    wh.seed(schedule)

    wh.addBreak('monday')

    expect(wh.state.value.days.monday.breaks).toEqual([{ start: '10:00', end: '10:30' }])
  })

  it('removes a break by index', () => {
    const wh = useWorkingHours()
    wh.seed(null)
    wh.addBreak('monday')
    wh.addBreak('monday')

    wh.removeBreak('monday', 0)

    expect(wh.state.value.days.monday.breaks).toHaveLength(1)
  })

  it('copies a day onto enabled days only, leaving the source and days off untouched', () => {
    const schedule: MasterSchedule = {
      days: {
        monday: { enabled: true, start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
        tuesday: { enabled: true, start: '10:00', end: '19:00', breaks: [] },
        saturday: { enabled: false, start: '11:00', end: '15:00', breaks: [] },
      },
    }
    const wh = useWorkingHours()
    wh.seed(schedule)

    wh.copyDayToAll('monday')

    // Enabled day adopts the source hours + a cloned break.
    expect(wh.state.value.days.tuesday).toMatchObject({
      enabled: true,
      start: '09:00',
      end: '17:00',
      breaks: [{ start: '12:00', end: '13:00' }],
    })
    // The clone is independent of the source.
    wh.state.value.days.monday.breaks[0]!.start = '11:00'
    expect(wh.state.value.days.tuesday.breaks[0]?.start).toBe('12:00')
    // Days off are left alone.
    expect(wh.state.value.days.saturday).toMatchObject({ enabled: false, start: '11:00', end: '15:00' })
  })

  it('exposes setters that mutate the bound state', () => {
    const wh = useWorkingHours()
    wh.seed(null)

    wh.setEnabled('sunday', true)
    wh.setStart('monday', '08:00')
    wh.setEnd('monday', '20:00')
    wh.addBreak('monday')
    wh.setBreak('monday', 0, 'start', '12:30')

    expect(wh.state.value.days.sunday.enabled).toBe(true)
    expect(wh.state.value.days.monday.start).toBe('08:00')
    expect(wh.state.value.days.monday.end).toBe('20:00')
    expect(wh.state.value.days.monday.breaks[0]?.start).toBe('12:30')
  })

  it('flags invalidity when an enabled day has end before start', () => {
    const wh = useWorkingHours()
    wh.seed(null)

    wh.setEnd('monday', '08:00') // start is 10:00

    expect(wh.isValid.value).toBe(false)
    expect(wh.dayViews.value[0]?.errors).toContainEqual({ code: 'endBeforeStart' })
  })

  it('returns a detached storable schedule', () => {
    const wh = useWorkingHours()
    wh.seed(null)

    const stored = wh.toStored()
    wh.setStart('monday', '07:00')

    expect(stored.days?.monday?.start).toBe('10:00') // snapshot not affected
  })
})
