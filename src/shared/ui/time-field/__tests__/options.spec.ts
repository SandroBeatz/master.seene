import { describe, expect, it } from 'vitest'
import { DESKTOP_STEP_MINUTES, NATIVE_STEP_SECONDS, buildTimeOptions } from '../options'

describe('time-field option steps', () => {
  it('uses a 15-minute desktop grid and a 5-minute native step', () => {
    expect(DESKTOP_STEP_MINUTES).toBe(15)
    expect(NATIVE_STEP_SECONDS).toBe(300)
  })
})

describe('buildTimeOptions', () => {
  it('generates the full 15-minute grid with no bounds', () => {
    const options = buildTimeOptions()
    expect(options).toHaveLength((24 * 60) / 15) // 96
    expect(options[0]).toBe('00:00')
    expect(options[1]).toBe('00:15')
    expect(options[options.length - 1]).toBe('23:45')
  })

  it('clamps options to an inclusive [min, max] range', () => {
    const options = buildTimeOptions({ min: '09:00', max: '11:00' })
    expect(options).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00'])
  })

  it('keeps an off-grid current value selectable and sorted', () => {
    const options = buildTimeOptions({ min: '09:00', max: '10:00', current: '09:35' })
    expect(options).toContain('09:35')
    expect(options).toEqual(['09:00', '09:15', '09:30', '09:35', '09:45', '10:00'])
  })

  it('keeps an out-of-range current value rather than dropping it', () => {
    const options = buildTimeOptions({ min: '12:00', max: '13:00', current: '08:00' })
    expect(options[0]).toBe('08:00')
    expect(options).toContain('12:00')
  })

  it('ignores an invalid current value', () => {
    const options = buildTimeOptions({ min: '09:00', max: '09:30', current: 'nope' })
    expect(options).toEqual(['09:00', '09:15', '09:30'])
  })
})
