import { describe, expect, it } from 'vitest'
import type { AppointmentStatus } from '@entities/appointment'
import { APPOINTMENT_ACTION_CONFIG } from '../config/action-config'

const STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'expired',
]

describe('APPOINTMENT_ACTION_CONFIG', () => {
  it('defines an entry for every appointment status', () => {
    expect(Object.keys(APPOINTMENT_ACTION_CONFIG).sort()).toEqual([...STATUSES].sort())
  })

  it('offers confirm + decline for a pending request', () => {
    const config = APPOINTMENT_ACTION_CONFIG.pending
    expect(config.tags).toEqual(['online_booking', 'new_client'])
    expect(config.primary?.key).toBe('confirm')
    expect(config.secondary?.key).toBe('decline')
    expect(config.menu.map((a) => a.key)).toEqual(['edit', 'delete'])
  })

  it('offers complete + cancel and a no-show menu item for a confirmed appointment', () => {
    const config = APPOINTMENT_ACTION_CONFIG.confirmed
    expect(config.primary?.key).toBe('complete')
    expect(config.secondary?.key).toBe('cancel')
    expect(config.menu.map((a) => a.key)).toEqual(['edit', 'no_show', 'delete'])
  })

  it('shows the paid tag and no footer actions once completed', () => {
    const config = APPOINTMENT_ACTION_CONFIG.completed
    expect(config.tags).toEqual(['paid'])
    expect(config.primary).toBeUndefined()
    expect(config.secondary).toBeUndefined()
  })

  it.each<[AppointmentStatus]>([['cancelled'], ['no_show'], ['expired']])(
    'has no footer actions for the terminal status %s',
    (status) => {
      const config = APPOINTMENT_ACTION_CONFIG[status]
      expect(config.primary).toBeUndefined()
      expect(config.secondary).toBeUndefined()
    },
  )

  it('always allows deletion from the overflow menu', () => {
    for (const status of STATUSES) {
      const keys = APPOINTMENT_ACTION_CONFIG[status].menu.map((a) => a.key)
      expect(keys).toContain('delete')
    }
  })

  it('points every action label at an i18n key, never raw text', () => {
    for (const status of STATUSES) {
      const config = APPOINTMENT_ACTION_CONFIG[status]
      const actions = [config.primary, config.secondary, ...config.menu].filter(
        (a): a is NonNullable<typeof a> => Boolean(a),
      )
      for (const action of actions) {
        expect(action.labelKey).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/)
        expect(action.icon).toMatch(/^i-lucide-/)
      }
    }
  })
})
