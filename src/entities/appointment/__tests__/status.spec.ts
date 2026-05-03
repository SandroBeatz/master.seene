import { describe, expect, it } from 'vitest'
import { APPOINTMENT_STATUS_VIEW, type AppointmentStatus } from '@entities/appointment'

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

describe('APPOINTMENT_STATUS_VIEW', () => {
  it('defines visual config for every appointment status', () => {
    expect(Object.keys(APPOINTMENT_STATUS_VIEW).sort()).toEqual([...APPOINTMENT_STATUSES].sort())
  })

  it('uses the expected no-show icon and neutral UI color', () => {
    expect(APPOINTMENT_STATUS_VIEW.no_show).toMatchObject({
      icon: 'i-lucide-ban',
      color: 'neutral',
    })
  })
})
