import { describe, expect, it } from 'vitest'
import { APPOINTMENT_STATUS_VIEW, type AppointmentStatus } from '@entities/appointment'

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'expired',
]

describe('APPOINTMENT_STATUS_VIEW', () => {
  it('defines visual config for every appointment status', () => {
    expect(Object.keys(APPOINTMENT_STATUS_VIEW).sort()).toEqual([...APPOINTMENT_STATUSES].sort())
  })

  it('uses the expected no-show icon and error UI color', () => {
    expect(APPOINTMENT_STATUS_VIEW.no_show).toMatchObject({
      icon: 'i-lucide-user-x',
      color: 'error',
    })
  })

  it('exposes an i18n label key for every status', () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(APPOINTMENT_STATUS_VIEW[status].labelKey).toBe(`appointments.status.${status}`)
    }
  })
})
